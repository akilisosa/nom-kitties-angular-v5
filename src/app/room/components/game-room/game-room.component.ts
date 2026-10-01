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
import { RoomMessage, Scores, Treat } from '../../net/protocol';

// ---- Gameplay knobs -------------------------------------------------------
/** Treats on the floor at once. */
export const TREATS_ON_FLOOR = 5;
/** Extra distance the host allows on a claim, to cover network lag. */
const CLAIM_SLACK = 80;
/** A claim with no answer is retried after this long. */
const CLAIM_RETRY_MS = 1000;
/** Host re-sends treats + scores this often, for anyone whose view mounted late. */
const TREATS_RESYNC_MS = 2000;
// ---------------------------------------------------------------------------

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
  /** The room owner; treat/score messages from anyone else are ignored. */
  @Input() hostId = '';
  /** Players in this round (Room.currentPlayers). Everyone else spectates. */
  @Input() players: string[] = [];
  /** Epoch ms when the round ends; the host ignores claims after it. */
  @Input() endsAt = 0;

  /** Fires whenever the score table changes (host: locally, others: from the host). */
  @Output() scoresChange = new EventEmitter<Scores>();

  scores: Scores = {};

  private readonly session = inject(RoomSessionService);
  private readonly zone = inject(NgZone);
  private engine!: KittyEngine;
  private readonly subs = new Subscription();
  /** treat id -> when we asked for it */
  private readonly pendingClaims = new Map<string, number>();
  private nextTreatId = 0;
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

  ngOnInit(): void {
    const playing = this.players.includes(this.me);
    this.engine = new KittyEngine(this.session, this.zone, {
      background: '#BBB8B2',
      controllable: playing,
      start: startPosition(this.players.indexOf(this.me)),
      showRemote: (id) => this.players.includes(id),
      onMove: (self) => this.checkTreats(self),
    });

    this.subs.add(this.session.messages$.subscribe((msg) => this.handle(msg)));

    if (this.isHost) {
      this.scores = Object.fromEntries(this.players.map((id) => [id, 0]));
      this.engine.treats = Array.from({ length: TREATS_ON_FLOOR }, () => this.spawnTreat());
      this.broadcastTreats();
      this.scoresChange.emit(this.scores);
      this.zone.runOutsideAngular(() => {
        this.resyncTimer = setInterval(() => this.broadcastTreats(), TREATS_RESYNC_MS);
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
        if (this.isHost) this.broadcastTreats();
        break;
      case 'claim':
        if (this.isHost) this.resolveClaim(msg.from, msg.id);
        break;
      case 'treats':
        if (!this.isHost && msg.from === this.hostId) {
          this.engine.treats = msg.treats;
          this.setScores(msg.scores);
        }
        break;
      case 'scored':
        if (!this.isHost && msg.from === this.hostId) {
          this.engine.treats = this.engine.treats.filter((t) => t.id !== msg.id);
          this.pendingClaims.delete(msg.id);
          this.setScores(msg.scores);
        }
        break;
    }
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
    const treat = this.engine.treats.find((t) => t.id === treatId);
    if (!treat) return;
    const where = by === this.me ? this.engine.self : this.engine.latestRemote(by);
    if (!where || !touchesTreat(where, treat, CLAIM_SLACK)) return;

    this.engine.treats = [...this.engine.treats.filter((t) => t.id !== treatId), this.spawnTreat()];
    this.pendingClaims.delete(treatId);
    this.setScores({ ...this.scores, [by]: (this.scores[by] ?? 0) + 1 });
    this.session.publish(
      { type: 'scored', id: treatId, by, scores: this.scores },
      { type: 'treats', treats: this.engine.treats, scores: this.scores },
    );
  }

  private broadcastTreats(): void {
    this.session.publish({ type: 'treats', treats: this.engine.treats, scores: this.scores });
  }

  private setScores(scores: Scores): void {
    this.scores = scores;
    this.scoresChange.emit(scores);
  }

  private spawnTreat(): Treat {
    const pad = TREAT_RADIUS + 5;
    return {
      id: `${this.me.slice(0, 4)}-${this.nextTreatId++}`,
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
