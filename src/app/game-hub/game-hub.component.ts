import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { QuickStartComponent } from '../shared/components/quick-start/quick-start.component';
import { RoomService } from '../shared/services/room.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatRippleModule } from '@angular/material/core';

@Component({
  selector: 'app-game-hub',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    QuickStartComponent,
    MatRippleModule
  ],
  templateUrl: './game-hub.component.html',
  styleUrl: './game-hub.component.css'
})
export class GameHubComponent implements OnInit {

  roomList: any[] = [];
  subscription = new Subscription();
  constructor(private roomService: RoomService, private router: Router) { }

  ngOnInit() {
    this.roomService.getRoomList();
    this.subscribeToRoomList();
  }

  subscribeToRoomList() {
    this.subscription.add(this.roomService.roomListShared().subscribe((roomList) => {
      this.roomList = [...roomList];
    }));
  }

 async joinGame(game: any) {
  // const success =  await this.roomService.joinRoom(game.id);
  await this.router.navigate(['game-hub', 'room', game.simpleCode]);
  }
  
}

