import { CommonModule } from '@angular/common';
import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';
import { RoomService } from '../../shared/services/room.service';
import { ChatRoomComponent } from '../../shared/components/chat-room/chat-room.component';
import { GameRoomComponent } from './components/game-room/game-room.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatDialogModule,
    ChatRoomComponent,
    GameRoomComponent
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


  subscription = new Subscription();
  constructor(private roomService: RoomService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private authService: AuthService) { 
      this.roomCode = this.route.snapshot.paramMap.get('id')!;
    }

  ngOnInit() {
    this.getRoom();
    this.subscribeToRoom();
  }

  ngAfterViewChecked() {
    const width = this.lobbyContainer.nativeElement.clientWidth;
    const height = this.lobbyContainer.nativeElement.clientHeight;
    if (this.lobbyWidth !== width || this.lobbyHeight !== height) {
      this.lobbyWidth = width;
      this.lobbyHeight = height;

      this.gameSize = Math.min(width, height) - 5;
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

  onWillDismiss(event: Event) {

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
    const curr = await this.authService.getCurrentUser();
    this.room = await this.roomService.getRoomByCode(lastSegment);
    console.log('room', this.room);
    if (!this.room) {

      this.roomDoesntExist();
    }
    else {
       this.roomService.subscribeToRoomByID(this.room.id).subscribe((room) => {
        this.room = { ...room };
        console.log('room', room);
      });

      // .subscribe((room) => {
      //   this.room = { ...room };
      //   console.log('room', room);
      // });
    }
    // if (this.room.owner !== curr.userId) {
    //   await this.joinGame(this.room.id, curr);
    // }
  }

  subscribeToRoom() {
    this.subscription.add(this.roomService.room.subscribe(async (room) => {
      if (room) {
        this.room = room;
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

  openChat() {
    this.isModalOpen = true;
    this.dialog.open(this.chatDialog);
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

}
