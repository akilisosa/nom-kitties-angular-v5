import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { JoystickComponent } from '../joystick/joystick.component';
import {
  KITTY_SIZE,
  Keys,
  KittyEngine,
  TREAT_RADIUS,
  Vec,
  WORLD_SIZE,
  touchesTreat,
} from '../../engine/kitty-engine';
import { RoomSessionService } from '../../net/room-session.service';
import { OutgoingMessage, RoomMessage, Scores, Treat } from '../../net/protocol';
import {
  DEFAULT_SETTINGS,
  GameSettings,
  KITTY_SPEED_MULTIPLIERS,
  treatsPerSpawner,
} from '../../game-settings';

// ---- Gameplay knobs -------------------------------------------------------
// (Treats on floor and kitty speed are room settings; see ../../game-settings.ts.)
/** Extra distance the host allows on a claim, to cover network lag. Scales with kitty speed. */
const CLAIM_SLACK = 80;
/** A claim with no answer is retried after this long. */
const CLAIM_RETRY_MS = 1000;
/** Spawners re-send their treats (and the host its scores) this often, for late mounts. */
const TREATS_RESYNC_MS = 2000;
/** The host repeats `scored` for an already-eaten treat at most this often. */
const REANNOUNCE_MS = 1000;
// ---------------------------------------------------------------------------

/** Treat ids are `<userId>-<n>` and never reused within a page visit. */
let treatSeq = 0;

@Component({
  selector: 'app-game-room',
  imports: [JoystickComponent],
  standalone: true,
  templateUrl: './game-room.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './game-room.component.css',
})
export class GameRoomComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('gameCanvas') gameCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() size = 600;
  @Input() isModalOpen = false;
  @Input() isHost = false;
  /** The room owner; score messages from anyone else are ignored. */
  @Input() hostId = '';
  /** Players in this round (Room.currentPlayers). Everyone else spectates. */
  @Input() players: string[] = [];
  /** Epoch ms when the round ends; the host ignores claims after it. */
  @Input() endsAt = 0;
  /** This round's settings, fixed when the round started. Read once, in ngOnInit. */
  @Input() settings: GameSettings = DEFAULT_SETTINGS;

  /** Fires whenever the score table changes (host: locally, others: from the host). */
  @Output() scoresChange = new EventEmitter<Scores>();

  scores: Scores = {};

  private readonly session = inject(RoomSessionService);
  private readonly zone = inject(NgZone);
  private engine!: KittyEngine;
  private readonly subs = new Subscription();
  /** treat id -> when we asked for it */
  private readonly pendingClaims = new Map<string, number>();
  /** spawner id -> that spawner's treats still on the floor. The engine draws the union. */
  private readonly floor = new Map<string, Treat[]>();
  /** treat id -> who ate it. Filters stale lists so a treat can only ever be eaten once. */
  private readonly eaten = new Map<string, string>();
  /** Host only: treat id -> when we last repeated its `scored`. */
  private readonly reannounced = new Map<string, number>();
  /** Who may put treats on the floor this round. */
  private spawners: string[] = [];
  private treatsEach = 0;
  private claimSlack = CLAIM_SLACK;
  private viewReady = false;
  private resyncTimer: ReturnType<typeof setInterval> | null = null;

  get me(): string {
    return this.session.userId;
  }

  get scoreRows(): { id: string; name: string; color: string; score: number }[] {
    return this.players
      .map((id) => ({
        id,
        name: this.session.profileOf(id)?.name ?? 'Kitty',
        color: this.session.profileOf(id)?.color ?? '#000000',
        score: this.scores[id] ?? 0,
      }))
      .sort((a, b) => b.score - a.score);
  }

  private get isSpawner(): boolean {
    return this.spawners.includes(this.me);
  }

  ngOnInit(): void {
    const playing = this.players.includes(this.me);
    const speed = KITTY_SPEED_MULTIPLIERS[this.settings.kittySpeed];
    this.claimSlack = CLAIM_SLACK * speed;
    this.spawners = this.settings.treatSpawning === 'everyone' ? [...this.players] : [this.hostId];
    this.treatsEach = treatsPerSpawner(this.settings, this.spawners.length);

    this.engine = new KittyEngine(this.session, this.zone, {
      background: '#BBB8B2',
      controllable: playing,
      start: startPosition(this.players.indexOf(this.me)),
      speed,
      showRemote: (id) => this.players.includes(id),
      onMove: (self) => this.checkTreats(self),
    });

    this.subs.add(this.session.messages$.subscribe((msg) => this.handle(msg)));
    // A spawner who leaves or times out takes their treats with them.
    this.subs.add(
      this.session.peers$.subscribe((peers) => {
        for (const id of [...this.floor.keys()]) {
          if (id !== this.me && !peers.has(id)) this.dropSpawner(id);
        }
      }),
    );

    if (this.isSpawner) {
      this.floor.set(this.me, Array.from({ length: this.treatsEach }, () => this.spawnTreat()));
      this.refreshFloor();
    }
    if (this.isHost) {
      this.scores = Object.fromEntries(this.players.map((id) => [id, 0]));
      this.scoresChange.emit(this.scores);
    }
    this.broadcast();
    if (this.isSpawner || this.isHost) {
      this.zone.runOutsideAngular(() => {
        this.resyncTimer = setInterval(() => this.broadcast(), TREATS_RESYNC_MS);
      });
    }
  }

  ngAfterViewInit(): void {
    this.engine.attach(this.gameCanvas.nativeElement);
    this.viewReady = true;
    this.ngOnChanges();
  }

  ngOnChanges(): void {
    if (!this.viewReady) return;
    this.engine.resize(this.size);
    if (this.isModalOpen || this.size <= 0) {
      this.engine.stop();
    } else {
      this.engine.start();
    }
  }

  ngOnDestroy(): void {
    this.engine?.destroy();
    this.subs.unsubscribe();
    if (this.resyncTimer) clearInterval(this.resyncTimer);
  }

  onDirectionChange(keys: Keys): void {
    this.engine.setKeys(keys);
  }

  private handle(msg: RoomMessage): void {
    switch (msg.type) {
      case 'hello':
        // Late joiner or reconnect: bring them up to date.
        this.broadcast();
        break;
      case 'bye':
        this.dropSpawner(msg.from);
        break;
      case 'claim':
        if (this.isHost) this.resolveClaim(msg.from, msg.id);
        break;
      case 'treats':
        if (this.spawners.includes(msg.from)) this.onTreats(msg.from, msg.treats);
        break;
      case 'scores':
        if (!this.isHost && msg.from === this.hostId) this.setScores(msg.scores);
        break;
      case 'scored':
        if (!this.isHost && msg.from === this.hostId) {
          this.setScores(msg.scores);
          const ours = this.eat(msg.id, msg.by);
          if (ours) this.session.publish(ours);
        }
        break;
    }
  }

  private onTreats(spawner: string, treats: Treat[]): void {
    if (this.isHost) {
      // A spawner still listing an eaten treat missed its `scored`; tell them again.
      treats.filter((t) => this.eaten.has(t.id)).forEach((t) => this.reannounce(t.id));
    }
    this.floor.set(
      spawner,
      treats.filter((t) => !this.eaten.has(t.id)),
    );
    this.refreshFloor();
  }

  /** Runs every frame (outside Angular) after our kitty moves. */
  private checkTreats(self: Vec): void {
    const now = Date.now();
    for (const treat of this.engine.treats) {
      if (!touchesTreat(self, treat)) continue;
      const askedAt = this.pendingClaims.get(treat.id);
      if (askedAt && now - askedAt < CLAIM_RETRY_MS) continue;
      this.pendingClaims.set(treat.id, now);
      if (this.isHost) {
        this.zone.run(() => this.resolveClaim(this.me, treat.id));
      } else {
        this.session.publish({ type: 'claim', id: treat.id });
      }
    }
  }

  /** Host only: first valid claim wins. */
  private resolveClaim(by: string, treatId: string): void {
    if (Date.now() > this.endsAt || !this.players.includes(by)) return;
    if (this.eaten.has(treatId)) return this.reannounce(treatId);
    const treat = this.engine.treats.find((t) => t.id === treatId);
    if (!treat) return;
    const where = by === this.me ? this.engine.self : this.engine.latestRemote(by);
    if (!where || !touchesTreat(where, treat, this.claimSlack)) return;

    this.setScores({ ...this.scores, [by]: (this.scores[by] ?? 0) + 1 });
    const ours = this.eat(treatId, by);
    this.session.publish(
      { type: 'scored', id: treatId, by, scores: this.scores },
      ...(ours ? [ours] : []),
    );
  }

  /** Host only: repeat the verdict on a treat that was already eaten. */
  private reannounce(treatId: string): void {
    const by = this.eaten.get(treatId);
    const now = Date.now();
    if (!by || now - (this.reannounced.get(treatId) ?? 0) < REANNOUNCE_MS) return;
    this.reannounced.set(treatId, now);
    this.session.publish({ type: 'scored', id: treatId, by, scores: this.scores });
  }

  /**
   * Takes a treat off the floor for good. If it was one of ours, spawns a replacement and
   * returns our new list for the caller to publish. Safe to call twice for the same treat.
   */
  private eat(treatId: string, by: string): OutgoingMessage | null {
    this.eaten.set(treatId, by);
    this.pendingClaims.delete(treatId);
    let ours: OutgoingMessage | null = null;
    for (const [spawner, treats] of this.floor) {
      if (!treats.some((t) => t.id === treatId)) continue;
      const left = treats.filter((t) => t.id !== treatId);
      if (spawner === this.me) {
        left.push(this.spawnTreat());
        ours = { type: 'treats', treats: left };
      }
      this.floor.set(spawner, left);
    }
    this.refreshFloor();
    return ours;
  }

  private dropSpawner(id: string): void {
    if (this.floor.delete(id)) this.refreshFloor();
  }

  private refreshFloor(): void {
    this.engine.treats = [...this.floor.values()].flat();
  }

  /** Our own treat list (if we spawn) and, from the host, the scores. */
  private broadcast(): void {
    const messages: OutgoingMessage[] = [];
    const mine = this.floor.get(this.me);
    if (this.isSpawner && mine) messages.push({ type: 'treats', treats: mine });
    if (this.isHost) messages.push({ type: 'scores', scores: this.scores });
    this.session.publish(...messages);
  }

  private setScores(scores: Scores): void {
    this.scores = scores;
    this.scoresChange.emit(scores);
  }

  private spawnTreat(): Treat {
    const pad = TREAT_RADIUS + 5;
    return {
      id: `${this.me}-${treatSeq++}`,
      x: Math.round(pad + Math.random() * (WORLD_SIZE - 2 * pad)),
      y: Math.round(pad + Math.random() * (WORLD_SIZE - 2 * pad)),
    };
  }
}

/** Spread players around the edges so nobody starts on top of each other. */
function startPosition(index: number): Vec | undefined {
  if (index < 0) return undefined;
  const max = WORLD_SIZE - KITTY_SIZE;
  const spots: Vec[] = [
    { x: 20, y: 20 },
    { x: max - 20, y: max - 20 },
    { x: max - 20, y: 20 },
    { x: 20, y: max - 20 },
  ];
  return spots[index % spots.length];
}
