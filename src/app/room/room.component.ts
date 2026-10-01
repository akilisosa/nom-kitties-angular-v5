import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../shared/services/auth.service';
import { Room, RoomService } from '../shared/services/room.service';
import { ChatRoomComponent } from '../shared/components/chat-room/chat-room.component';
import { GameRoomComponent } from './components/game-room/game-room.component';
import { UserService } from '../shared/services/user.service';
import { LobbyComponent } from './components/lobby/lobby.component';
import { CountdownComponent } from './components/countdown/countdown.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PodiumComponent } from './components/podium/podium.component';
import { RoomSessionService } from './net/room-session.service';
import { RoomMessage, Scores } from './net/protocol';

// ---- Gameplay knobs -------------------------------------------------------
/** Countdown length after the owner presses Start. */
const COUNTDOWN_MS = 5000;
/** Round length when the room has no timeLimit (seconds). */
const DEFAULT_TIME_LIMIT_S = 30;
// ---------------------------------------------------------------------------

type GameState = 'loading' | 'lobby' | 'countdown' | 'playing' | 'results' | 'podium';

@Component({
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    ChatRoomComponent,
    LobbyComponent,
    GameRoomComponent,
    CountdownComponent,
    MatProgressSpinnerModule,
    PodiumComponent,
  ],
  providers: [RoomSessionService],
  templateUrl: './room.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './room.component.css',
})
export class RoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('lobbyContainer', { static: true }) lobbyContainer!: ElementRef;
  @ViewChild('chatDialog') chatDialog!: TemplateRef<unknown>;

  room: Room | null = null;
  me = '';
  gameState: GameState = 'loading';

  lobbyHeight = 0;
  lobbyWidth = 0;
  gameSize = 0;
  isModalOpen = false;

  /** Names of everyone connected, for the lobby roster. */
  roster: string[] = [];
  scores: Scores = {};
  winners: string[] = [];
  /** Epoch ms for the current round, derived from Room.gameStartTime. */
  startsAt = 0;
  endsAt = 0;
  timeRemaining = 0;

  private lastCheck = 0;
  private readonly CHECK_INTERVAL = 100; // milliseconds
  private roundTimer: ReturnType<typeof setInterval> | null = null;
  private playingWritten = false;
  private finishing = false;
  private hostSeen = false;
  private left = false;
  private readonly subscription = new Subscription();

  constructor(
    private roomService: RoomService,
    private session: RoomSessionService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private authService: AuthService,
  ) {}

  get isOwner(): boolean {
    return !!this.room && this.room.owner === this.me;
  }

  get currentPlayers(): string[] {
    return (this.room?.currentPlayers ?? []).filter((p): p is string => !!p);
  }

  ngOnInit() {
    void this.enterRoom(this.route.snapshot.paramMap.get('id') ?? '');
  }

  ngAfterViewChecked() {
    const now = Date.now();
    if (now - this.lastCheck < this.CHECK_INTERVAL) {
      return;
    }
    this.lastCheck = now;

    const width = this.lobbyContainer.nativeElement.clientWidth;
    const height = this.lobbyContainer.nativeElement.clientHeight;
    if (this.lobbyWidth !== width || this.lobbyHeight !== height) {
      this.lobbyWidth = Math.min(width, 600);
      this.lobbyHeight = Math.min(height, 600);
      this.gameSize = Math.min(this.lobbyWidth, this.lobbyHeight) - 5;
      if (this.gameSize > 600) {
        this.gameSize = 600;
      }
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.stopRoundTimer();
    this.leaveBestEffort();
  }

  /** Tab closing or navigating away from the site: best effort. */
  @HostListener('window:pagehide')
  onPageHide() {
    this.leaveBestEffort();
  }

  async leaveRoom() {
    this.leaveBestEffort();
    await this.router.navigate(['/game-hub']);
  }

  // ---- Joining -------------------------------------------------------------

  private async enterRoom(code: string) {
    this.me = (await this.authService.getCurrentUser()).userId;

    let room = await this.roomService.getRoomByCode(code);
    if (!room) {
      return this.bounce('That room does not exist.');
    }
    if (room.status === 'CANCELLED') {
      return this.bounce('That room was closed.');
    }

    if (!(room.players ?? []).includes(this.me)) {
      const { room: joined, error } = await this.roomService.joinRoom(room.id);
      if (!joined) {
        return this.bounce(
          room.status !== 'WAITING'
            ? 'That game has already started.'
            : error ?? 'Could not join the room.',
        );
      }
      room = joined;
    }

    const kitty = await this.userService.getUser();
    if (this.left) return;
    this.subscription.add(this.session.messages$.subscribe((msg) => this.onMessage(msg)));
    this.subscription.add(this.session.peers$.subscribe(() => this.onPeersChanged()));
    this.subscription.add(
      this.roomService.observeRoom(room.id).subscribe({
        next: (updated) => this.applyRoom(updated),
        error: (err) => console.error('Room subscription error', err),
      }),
    );
    await this.session.connect(room.id, this.me, {
      name: kitty?.name ?? 'Kitty',
      color: kitty?.color ?? '#000000',
    });

    // Catch any update that landed between the first read and the subscription starting.
    this.applyRoom((await this.roomService.getRoom(room.id)) ?? room);
  }

  // ---- Room status -> UI ---------------------------------------------------

  private applyRoom(room: Room) {
    this.room = room;
    switch (room.status) {
      case 'CANCELLED':
        if (!this.isOwner) this.bounce('The host left, so the room was closed.');
        return;
      case 'FINISHED':
        this.stopRoundTimer();
        this.winners = (room.winners ?? []).filter((w): w is string => !!w);
        this.scores = parseScores(room.stats) ?? this.scores;
        this.gameState = 'podium';
        return;
      case 'STARTING':
      case 'PLAYING':
        this.startRound(room);
        return;
      default:
        this.stopRoundTimer();
        this.gameState = 'lobby';
    }
  }

  /** Idempotent per gameStartTime, so unrelated room updates never restart the timer. */
  private startRound(room: Room) {
    const startsAt = room.gameStartTime ? Date.parse(room.gameStartTime) : NaN;
    if (Number.isNaN(startsAt) || startsAt === this.startsAt) return;

    this.stopRoundTimer();
    this.startsAt = startsAt;
    this.endsAt = startsAt + (room.timeLimit || DEFAULT_TIME_LIMIT_S) * 1000;
    this.playingWritten = room.status === 'PLAYING';
    this.finishing = false;
    this.scores = {};
    this.winners = [];
    this.tick();
    this.roundTimer = setInterval(() => this.tick(), 250);
  }

  private tick() {
    const now = Date.now();
    this.timeRemaining = Math.max(0, Math.ceil((this.endsAt - now) / 1000));

    if (now < this.startsAt) {
      this.gameState = 'countdown';
      return;
    }
    if (now < this.endsAt) {
      this.gameState = 'playing';
      if (this.isOwner && !this.playingWritten && this.room) {
        this.playingWritten = true;
        void this.roomService.setPlaying(this.room.id);
      }
      return;
    }

    this.stopRoundTimer();
    this.gameState = 'results';
    if (this.isOwner) void this.finishRound();
  }

  private stopRoundTimer() {
    if (this.roundTimer) {
      clearInterval(this.roundTimer);
      this.roundTimer = null;
    }
  }

  // ---- Owner actions -------------------------------------------------------

  async startGame() {
    if (!this.isOwner || !this.room) return;
    // Fresh roster, limited to people actually connected right now.
    const room = (await this.roomService.getRoom(this.room.id)) ?? this.room;
    const connected = new Set([this.me, ...this.session.peers.keys()]);
    const candidates = (room.players ?? []).filter((p): p is string => !!p && connected.has(p));
    const currentPlayers = shuffle(candidates).slice(0, room.playersPerRound || candidates.length);
    const gameStartTime = new Date(Date.now() + COUNTDOWN_MS).toISOString();
    await this.roomService.startGame(room.id, gameStartTime, currentPlayers);
  }

  private async finishRound() {
    if (this.finishing || !this.room) return;
    this.finishing = true;
    const top = Math.max(0, ...Object.values(this.scores));
    const winners = top > 0 ? Object.keys(this.scores).filter((id) => this.scores[id] === top) : [];
    this.session.publish({ type: 'end', scores: this.scores, winners });
    await this.roomService.finishGame(this.room.id, winners, JSON.stringify(this.scores));
  }

  /** FINISHED -> WAITING so the same group can go again (and new players can join). */
  async playAgain() {
    if (this.isOwner && this.room) await this.roomService.reopenRoom(this.room.id);
  }

  onScoresChange(scores: Scores) {
    this.scores = scores;
  }

  // ---- Channel -------------------------------------------------------------

  private onMessage(msg: RoomMessage) {
    if (msg.type === 'end' && msg.from === this.room?.owner && this.gameState !== 'podium') {
      // The host's word is final; the FINISHED room update will follow.
      this.stopRoundTimer();
      this.scores = msg.scores;
      this.winners = msg.winners;
      this.gameState = 'podium';
    }
  }

  private onPeersChanged() {
    const peers = this.session.peers;
    this.roster = [this.session.myProfile.name, ...[...peers.values()].map((p) => p.name)];

    const owner = this.room?.owner;
    if (!owner || this.isOwner) return;
    if (peers.has(owner)) {
      this.hostSeen = true;
    } else if (this.hostSeen && this.gameState !== 'podium') {
      // Host vanished without cancelling (tab killed). Nobody else can finish the round.
      this.bounce('The host left, so the room was closed.');
    }
  }

  // ---- Leaving -------------------------------------------------------------

  private leaveBestEffort() {
    if (this.left) return;
    this.left = true;
    this.stopRoundTimer();
    const room = this.room;
    if (room && room.status !== 'CANCELLED') {
      if (this.isOwner) {
        void this.roomService.cancelRoom(room.id);
      } else {
        void this.roomService.leaveRoom(room.id);
      }
    }
    void this.session.close();
  }

  private bounce(message: string) {
    this.snackBar.open(message, 'OK', { duration: 5000 });
    void this.leaveRoom();
  }

  // ---- Chat ----------------------------------------------------------------

  openChat() {
    this.isModalOpen = true;
    this.dialog.open(this.chatDialog, {
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
      panelClass: 'full-screen-dialog',
    });
  }

  closeChat() {
    this.isModalOpen = false;
    this.dialog.closeAll();
  }
}

function parseScores(stats: string | null | undefined): Scores | null {
  if (!stats) return null;
  try {
    const parsed: unknown = JSON.parse(stats);
    return parsed && typeof parsed === 'object' ? (parsed as Scores) : null;
  } catch {
    return null;
  }
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
