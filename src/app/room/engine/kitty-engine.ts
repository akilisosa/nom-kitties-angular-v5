import { NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { drawKitty } from '../components/game-room/draw-util';
import { RoomSessionService } from '../net/room-session.service';
import { StateMsg, Treat } from '../net/protocol';

// ---- Gameplay knobs -------------------------------------------------------
/** Simulation space. Everything on the wire is in these units; only drawing scales to pixels. */
export const WORLD_SIZE = 600;
export const KITTY_SIZE = 50;
/** World units per second (the old 5px/frame at 60 fps). */
export const KITTY_SPEED = 300;
export const TREAT_RADIUS = 10;
/** Min gap between `state` sends while moving (~15 Hz). Input changes send immediately. */
export const STATE_SEND_MS = 66;
/** Idle kitties still send their position this often, so late joiners see them. */
export const IDLE_SEND_MS = 1000;
/** Remote kitties are drawn this far in the past, interpolating between snapshots. */
export const INTERP_DELAY_MS = 100;
/** If snapshots run dry, keep extrapolating along the last velocity for at most this long. */
const MAX_EXTRAPOLATE_MS = 150;
/** Long frames (tab switch, GC) are clamped so kitties don't teleport. */
const MAX_FRAME_DT_S = 0.05;
// ---------------------------------------------------------------------------

export interface Keys {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

export interface Vec {
  x: number;
  y: number;
}

interface Snapshot extends Vec {
  /** local receive time (performance.now) */
  t: number;
  vx: number;
  vy: number;
}

const NO_KEYS: Keys = { w: false, a: false, s: false, d: false };
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export interface KittyEngineOptions {
  background: string;
  /** Spectators don't get a kitty and don't send state. */
  controllable: boolean;
  start?: Vec;
  /** Only draw remote kitties whose id passes this filter (e.g. current round's players). */
  showRemote?: (id: string) => boolean;
  /** Called after the local kitty moves each frame. */
  onMove?: (self: Vec) => void;
}

/**
 * Shared loop for lobby and game-room: keyboard/joystick input, delta-time movement in world
 * coordinates, throttled `state` publishing, interpolation of remote kitties, and drawing.
 */
export class KittyEngine {
  readonly self: Vec;
  treats: Treat[] = [];

  private keys: Keys = { ...NO_KEYS };
  private readonly remotes = new Map<string, Snapshot[]>();
  private ctx: CanvasRenderingContext2D | null = null;
  private scale = 1;
  private raf = 0;
  private lastFrame = 0;
  private lastSent = 0;
  private dirty = true;
  private readonly subs = new Subscription();
  private readonly onKeyDown = (e: KeyboardEvent) => this.onKey(e, true);
  private readonly onKeyUp = (e: KeyboardEvent) => this.onKey(e, false);

  constructor(
    private readonly session: RoomSessionService,
    private readonly zone: NgZone,
    private readonly options: KittyEngineOptions,
  ) {
    this.self = { ...(options.start ?? randomStart()) };

    this.subs.add(
      session.messages$.subscribe((msg) => {
        if (msg.type === 'state') this.pushSnapshot(msg);
        if (msg.type === 'bye') this.remotes.delete(msg.from);
      }),
    );
    this.subs.add(
      session.peers$.subscribe((peers) => {
        for (const id of this.remotes.keys()) {
          if (!peers.has(id)) this.remotes.delete(id);
        }
      }),
    );
  }

  attach(canvas: HTMLCanvasElement): void {
    this.ctx = canvas.getContext('2d');
    this.resize(canvas.width);
  }

  /** Canvas size in CSS pixels; the world is always drawn to fill it. */
  resize(px: number): void {
    this.scale = px > 0 ? px / WORLD_SIZE : 1;
  }

  start(): void {
    if (this.raf) return;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    });
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.setKeys(NO_KEYS);
  }

  destroy(): void {
    this.stop();
    this.subs.unsubscribe();
    this.remotes.clear();
  }

  /** Joystick or keyboard input. Sends state right away when the direction changes. */
  setKeys(keys: Keys): void {
    const changed = (Object.keys(NO_KEYS) as (keyof Keys)[]).some((k) => this.keys[k] !== keys[k]);
    this.keys = { ...keys };
    if (changed) this.dirty = true;
  }

  /** The newest position we've received for a remote player (not interpolated). */
  latestRemote(id: string): Vec | undefined {
    const snaps = this.remotes.get(id);
    return snaps?.[snaps.length - 1];
  }

  private onKey(event: KeyboardEvent, down: boolean): void {
    const key = event.key.toLowerCase();
    if (!(key in NO_KEYS)) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    event.preventDefault();
    this.setKeys({ ...this.keys, [key]: down });
  }

  private velocity(): Vec {
    const dx = (this.keys.d ? 1 : 0) - (this.keys.a ? 1 : 0);
    const dy = (this.keys.s ? 1 : 0) - (this.keys.w ? 1 : 0);
    const norm = dx && dy ? Math.SQRT1_2 : 1;
    return { x: dx * norm * KITTY_SPEED, y: dy * norm * KITTY_SPEED };
  }

  private readonly frame = (now: number) => {
    const dt = Math.min((now - this.lastFrame) / 1000, MAX_FRAME_DT_S);
    this.lastFrame = now;

    if (this.options.controllable) {
      const v = this.velocity();
      const max = WORLD_SIZE - KITTY_SIZE;
      this.self.x = clamp(this.self.x + v.x * dt, 0, max);
      this.self.y = clamp(this.self.y + v.y * dt, 0, max);
      this.options.onMove?.(this.self);
      this.maybeSendState(now, v);
    }

    this.draw(now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private maybeSendState(now: number, v: Vec): void {
    const moving = v.x !== 0 || v.y !== 0;
    const gap = now - this.lastSent;
    if (this.dirty || (moving && gap >= STATE_SEND_MS) || gap >= IDLE_SEND_MS) {
      this.dirty = false;
      this.lastSent = now;
      this.session.publish({
        type: 'state',
        x: Math.round(this.self.x * 10) / 10,
        y: Math.round(this.self.y * 10) / 10,
        vx: v.x,
        vy: v.y,
      });
    }
  }

  private pushSnapshot(msg: StateMsg): void {
    const snaps = this.remotes.get(msg.from) ?? [];
    snaps.push({ t: performance.now(), x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy });
    // Keep ~1 s of history; interpolation only needs the last couple.
    while (snaps.length > 20) snaps.shift();
    this.remotes.set(msg.from, snaps);
  }

  private remotePosition(snaps: Snapshot[], now: number): Vec {
    const renderAt = now - INTERP_DELAY_MS;
    const last = snaps[snaps.length - 1];
    if (renderAt >= last.t) {
      const ahead = Math.min(renderAt - last.t, MAX_EXTRAPOLATE_MS) / 1000;
      const max = WORLD_SIZE - KITTY_SIZE;
      return { x: clamp(last.x + last.vx * ahead, 0, max), y: clamp(last.y + last.vy * ahead, 0, max) };
    }
    for (let i = snaps.length - 1; i > 0; i--) {
      const a = snaps[i - 1];
      const b = snaps[i];
      if (renderAt >= a.t) {
        const f = (renderAt - a.t) / (b.t - a.t || 1);
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      }
    }
    return snaps[0];
  }

  private draw(now: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.fillStyle = this.options.background;
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    ctx.fillStyle = '#FF4E00';
    for (const treat of this.treats) {
      ctx.beginPath();
      ctx.arc(treat.x, treat.y, TREAT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const [id, snaps] of this.remotes) {
      if (!snaps.length || (this.options.showRemote && !this.options.showRemote(id))) continue;
      const pos = this.remotePosition(snaps, now);
      drawKitty(ctx, pos.x, pos.y, KITTY_SIZE, this.session.profileOf(id)?.color);
    }

    if (this.options.controllable) {
      drawKitty(ctx, this.self.x, this.self.y, KITTY_SIZE, this.session.myProfile.color);
    }
  }
}

function randomStart(): Vec {
  const max = WORLD_SIZE - KITTY_SIZE;
  return { x: Math.random() * max, y: Math.random() * max };
}

/** True if the kitty at `kitty` (top-left corner) overlaps the treat. `slack` widens the check. */
export function touchesTreat(kitty: Vec, treat: Vec, slack = 0): boolean {
  const cx = kitty.x + KITTY_SIZE / 2;
  const cy = kitty.y + KITTY_SIZE / 2;
  return Math.hypot(cx - treat.x, cy - treat.y) < KITTY_SIZE / 2 + TREAT_RADIUS + slack;
}
