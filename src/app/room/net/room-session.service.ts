import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import { events } from 'aws-amplify/data';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { OutgoingMessage, PROTOCOL_VERSION, RoomMessage, parseMessage } from './protocol';

type EventsChannel = Awaited<ReturnType<typeof events.connect>>;
type ChannelSubscription = ReturnType<EventsChannel['subscribe']>;

export interface Profile {
  name: string;
  color: string;
}

export interface Peer extends Profile {
  id: string;
  lastSeen: number;
}

/** How often we announce we're still here. */
export const HEARTBEAT_MS = 2000;
/** A peer silent for this long is treated as gone. */
export const PEER_TIMEOUT_MS = 5000;
/** AppSync Events accepts at most 5 events per publish. */
const MAX_EVENTS_PER_PUBLISH = 5;

const DEFAULT_PROFILE: Profile = { name: 'Kitty', color: '#000000' };

/**
 * One realtime channel connection per room visit. Provided by RoomComponent, so it lives
 * exactly as long as the room page; lobby and game-room inject it and never connect themselves.
 */
@Injectable()
export class RoomSessionService implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly incoming = new Subject<RoomMessage>();
  private readonly peersSubject = new BehaviorSubject<ReadonlyMap<string, Peer>>(new Map());

  /** Every valid message from other players (own echoes are filtered out). */
  readonly messages$: Observable<RoomMessage> = this.incoming.asObservable();
  /** Other players currently connected to the room channel. */
  readonly peers$: Observable<ReadonlyMap<string, Peer>> = this.peersSubject.asObservable();

  private channel: EventsChannel | null = null;
  private subscription: ChannelSubscription | null = null;
  private timers: ReturnType<typeof setInterval>[] = [];
  private closed = false;
  private me = '';
  private profile: Profile = DEFAULT_PROFILE;
  /** Profiles survive a peer timing out and coming back. */
  private readonly profiles = new Map<string, Profile>();

  get userId(): string {
    return this.me;
  }

  get myProfile(): Profile {
    return this.profile;
  }

  get peers(): ReadonlyMap<string, Peer> {
    return this.peersSubject.value;
  }

  /** Name/colour for any player we've heard from this visit (including ourselves). */
  profileOf(id: string): Profile | undefined {
    return id === this.me ? this.profile : this.profiles.get(id);
  }

  async connect(roomId: string, userId: string, profile: Profile): Promise<void> {
    this.me = userId;
    this.profile = profile;

    const channel = await events.connect(`/default/rooms/${roomId}`);
    if (this.closed) {
      channel.close();
      return;
    }
    this.channel = channel;
    this.subscription = channel.subscribe({
      // Messages arrive outside Angular's zone; re-enter it so bound templates update.
      next: (data: { event?: unknown }) => this.zone.run(() => this.receive(data?.event)),
      error: (err: unknown) => console.error('Room channel error', err),
    });
    await this.subscription.ready.catch((err: unknown) => console.error('Room channel subscribe failed', err));
    if (this.closed) return;

    this.publish({ type: 'hello', ...this.profile });
    this.zone.runOutsideAngular(() => {
      this.timers.push(setInterval(() => this.publish({ type: 'heartbeat' }), HEARTBEAT_MS));
      this.timers.push(setInterval(() => this.prunePeers(), 1000));
    });
  }

  /** Fire-and-forget publish of one or more messages (batched up to the API limit). */
  publish(...messages: OutgoingMessage[]): void {
    void this.send(messages);
  }

  /** Says goodbye and closes the channel. Safe to call more than once. */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.timers.forEach(clearInterval);
    this.timers = [];

    const channel = this.channel;
    this.channel = null;
    if (channel) {
      // Give the bye a moment to go out, but never hang the caller on it.
      const timeout = new Promise((resolve) => setTimeout(resolve, 500));
      await Promise.race([this.send([{ type: 'bye' }], channel), timeout]);
      channel.close();
    }
    this.subscription = null;
    this.incoming.complete();
    this.peersSubject.complete();
  }

  ngOnDestroy(): void {
    void this.close();
  }

  private async send(messages: OutgoingMessage[], channel = this.channel): Promise<void> {
    if (!channel || messages.length === 0) return;
    const ts = Date.now();
    const stamped = messages.map((m) => ({ ...m, v: PROTOCOL_VERSION, from: this.me, ts }));
    try {
      for (let i = 0; i < stamped.length; i += MAX_EVENTS_PER_PUBLISH) {
        const batch = stamped.slice(i, i + MAX_EVENTS_PER_PUBLISH);
        await channel.publish(batch.length === 1 ? batch[0] : batch);
      }
    } catch (err) {
      console.error('Room channel publish failed', err);
    }
  }

  private receive(raw: unknown): void {
    const msg = parseMessage(raw);
    if (!msg || msg.from === this.me || this.closed) return;

    if (msg.type === 'bye') {
      this.removePeer(msg.from);
    } else {
      this.touchPeer(msg);
      if (msg.type === 'hello' && !msg.reply) {
        this.publish({ type: 'hello', ...this.profile, reply: true });
      }
    }
    this.incoming.next(msg);
  }

  private touchPeer(msg: RoomMessage): void {
    const peers = this.peersSubject.value;
    const known = peers.get(msg.from);
    const profile = msg.type === 'hello' ? { name: msg.name, color: msg.color } : null;
    if (profile) this.profiles.set(msg.from, profile);
    const peer: Peer = {
      id: msg.from,
      ...(this.profiles.get(msg.from) ?? DEFAULT_PROFILE),
      lastSeen: Date.now(),
    };

    if (!known || profile) {
      // Membership or profile changed: emit a new map.
      this.peersSubject.next(new Map(peers).set(msg.from, peer));
    } else {
      // Just a liveness bump; mutate in place to avoid churning subscribers.
      known.lastSeen = peer.lastSeen;
    }
  }

  private removePeer(id: string): void {
    const peers = this.peersSubject.value;
    if (!peers.has(id)) return;
    const next = new Map(peers);
    next.delete(id);
    this.peersSubject.next(next);
  }

  private prunePeers(): void {
    const cutoff = Date.now() - PEER_TIMEOUT_MS;
    const stale = [...this.peersSubject.value.values()].filter((p) => p.lastSeen < cutoff);
    if (stale.length) {
      this.zone.run(() => stale.forEach((p) => this.removePeer(p.id)));
    }
  }
}
