import { CommonModule } from '@angular/common';
import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AuthService } from '../shared/services/auth.service';
import { RoomService } from '../shared/services/room.service';
import { ChatRoomComponent } from '../shared/components/chat-room/chat-room.component';
import { GameRoomComponent } from './components/game-room/game-room.component';
import { UserService } from '../shared/services/user.service';
import { LobbyComponent } from './components/lobby/lobby.component';
import { CountdownComponent } from './components/countdown/countdown.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatDialogModule,
    ChatRoomComponent,
    LobbyComponent,
    GameRoomComponent,
    CountdownComponent,
    MatProgressSpinnerModule
  ],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})
export class RoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('lobbyContainer', { static: true }) lobbyContainer!: ElementRef;
  @ViewChild('chatDialog') chatDialog!: TemplateRef<any>;

  size = 10;

  room: any = { simpleCode: '------', id: '' };
  playerList = [];

  lobbyHeight = 0;
  lobbyWidth = 0;

  gameSize = 0;

  isModalOpen = false;
  fullScreen = false;
  roomCode = '';

  kitty: any = {};
  mobile = false;
  gameState = 'lobby';

  private lastCheck = 0;
  private readonly CHECK_INTERVAL = 100; // milliseconds

  // Add these properties to your component class
  private countdownInterval: any;
  timeRemaining = new BehaviorSubject<number>(30);

  // Handle what happens when time is up
  private handleTimeUp() {
    // Emit an event or handle game end logic
    console.log('Time is up!');
    // You might want to emit an event

  }



  subscription = new Subscription();
  constructor(private roomService: RoomService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private authService: AuthService) {
    this.roomCode = this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit() {
    this.getRoom();
    console.log('room is working', this.room);
    this.mobile = this.isMobileDevice()
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
  }


  async cancel() {
    this.isModalOpen = false;
  }

  async joinGame(id: string, curr: any) {

    if (!this.room?.id) {
      return;
    }
    // check if player is already in the room

    if (this.room.players?.some((player: any) => player === curr.userId)) {
      return;
    }

    if (this.room.players?.length >= this.room.roomLimit) {
      return;
    }

    const players = this.room.players || [];

    players.push(curr.userId);
    this.roomService.updateRoomWithPlayer(id, players);
  }

  async getRoom() {
    const urlSegments = this.router.url.split('/');
    let lastSegment = urlSegments[urlSegments.length - 1];
    let curr = null;
    try {
     curr = await this.authService.getCurrentUser();
    } catch (error) {
      console.error('Error getting current user:', error);
    }
try {
  console.log('subscribing to room')
    this.roomService.subscribeToRoomByCode(lastSegment).subscribe((room) => {
      console.log('room subscription', room);
      // if (room) {
      //   this.room = { ...room };
      //   console.log('roomconsole.log()', this.room, this.room.updatedAt, this.room.updatedAt);
      // }
    });
  } catch (error) {
    console.error('Error subscribing to room:', error);
  }


    this.room = await this.roomService.getRoomByCode(lastSegment);
    console.log('currernt user', this.room);
    if (!this.room) {
      this.roomDoesntExist();
      return;
    }

    let players = this.room.players || [];
    console.log('players', players);
    if(!players.includes(curr?.userId)){
       players = [...players, curr?.userId];
      this.room = (await this.roomService.joinRoom(this.room.id, players));
    }
  
      // if playing or countdown return
      this.subscription.add(this.roomService.subscribeToRoomByID(this.room.id).subscribe((room) => {
        this.room = { ...room };
        console.log('roomconsole.log()', this.room, this.room.updatedAt, this.room.updatedAt);

        if (room.status === 'STARTING') {
          this.gameState = 'countdown';
        }

        if (room.status === 'PLAYING') {
          this.gameState = 'playing';
          this.startGameCountdown();
        }
      }));

    
  }

  startGameCountdown() {
    if (!this.room?.timeLimit) {
      console.error('No time limit set');
      return;
    }

    // Convert timeLimit to milliseconds (assuming timeLimit is in seconds)
    const timeLimitMs = this.room.timeLimit * 1000;
    const endTime = Date.now() + timeLimitMs;

    // Clear any existing interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // Create a Subject to handle the countdown
    this.timeRemaining = new BehaviorSubject<number>(this.room.timeLimit);

    // Update every second
    this.countdownInterval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      this.timeRemaining.next(remaining);

      // When countdown reaches 0
      if (remaining === 0) {
        clearInterval(this.countdownInterval);
        this.handleTimeUp();
      }
    }, 1000);

  }

  subscribeToRoom() {
    this.subscription.add(this.roomService.room.subscribe(async (room: any) => {
      if (room) {
        this.room = { ...room };
        const curr = await this.authService.getCurrentUser();
        if (this.room.owner !== curr.userId) {
          await this.joinGame(this.room.id, curr);
        }
      }
    }));
  }

  roomDoesntExist() {
    this.router.navigate(['/game-hub']);
  }

  async startGame() { // 5 seconds in the future
    const gameStartTime = new Date(Date.now() + 5000).toISOString();
    console.log('room', this.room, this.room.updatedAt, this.room.updatedAt);

    await this.roomService.startGame(this.room.id, gameStartTime);
    // this.gameState = 'countdown';
    // this.gameState = 'playing';
  }

  selectPlayersForRound(): string[] {
    if (!this.room?.players) {
      return [];
    }

    // Create a copy of players array to avoid modifying original
    const availablePlayers = [...this.room.players];
    const numPlayersNeeded = Math.min(this.room.playersPerRound, availablePlayers.length);
    const selectedPlayers: string[] = [];

    // Randomly select players
    for (let i = 0; i < numPlayersNeeded; i++) {
      const randomIndex = Math.floor(Math.random() * availablePlayers.length);
      const selectedPlayer = availablePlayers.splice(randomIndex, 1)[0];
      selectedPlayers.push(selectedPlayer);
    }

    return selectedPlayers;
  }

  playGame() {
    const currentPlayers = this.selectPlayersForRound();
    this.roomService.playGame(this.room.id, currentPlayers);
  }

  openChat() {
    this.isModalOpen = true;
    this.dialog.open(this.chatDialog, {
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
      panelClass: 'full-screen-dialog'
    });
  }

  closeChat() {
    this.isModalOpen = false;
    this.dialog.closeAll();
  }

  async leaveRoom() {
    const userID = (await this.authService.getCurrentUser()).userId;
    if (this.room.owner === userID) {
      await this.roomService.deleteRoom(this.room.id);
    }

    if (this.room.owner !== userID) {
      const players = this.room.players?.items || [];
      const newPlayers = players.filter((player: any) => player !== userID);
      this.roomService.updateRoomWithPlayer(this.room.id, newPlayers);
    }


    await this.router.navigate(['/game-hub']);
  }

  // util
  private isMobileDevice(): any {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  }


}
