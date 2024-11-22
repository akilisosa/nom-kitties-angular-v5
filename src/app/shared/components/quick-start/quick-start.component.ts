import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RoomService } from '../../services/room.service';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-quick-start',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  templateUrl: './quick-start.component.html',
  styleUrl: './quick-start.component.css'
})
export class QuickStartComponent implements OnInit {

  @Input() showRefresh: boolean = false; 
  @Output() refreshEmit = new EventEmitter<void>();

  view: 'quickstart' | 'start' | 'join' | 'private' = 'quickstart';

  newGameForm = new FormGroup({
    public: new FormControl(true),
    mode: new FormControl('classic'),
    totalRounds: new FormControl(3),
    timeLimit: new FormControl(30),
    playersPerRound: new FormControl(4),
    
    roomLimit: new FormControl(4),
    simpleCode: new FormControl(''),
    name:   new FormControl('example'),
  })

  constructor(private roomService: RoomService,
    private router: Router,
    private authService: AuthService) { }

  ngOnInit() {
    const code = this.generate6DigitAlphaNumericCode();
    this.newGameForm.patchValue({ simpleCode: code });
  }

  generate6DigitAlphaNumericCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }


  async startGame() {
    // todo check for room generated code. 
    const owner = (await this.authService.getCurrentUser()).userId
    
    await this.roomService.createNewRoom({
      ...this.newGameForm.value,
      public: this.newGameForm.value.public ? 'public' : 'private',
      players: [owner],
      owner,
      status: 'WAITING',
      createdAt: new Date().toISOString(),
    })

    this.router.navigate(['game-hub', 'room', this.newGameForm.value.simpleCode]);
  }

  joinGame() {
    this.router.navigate(['game-hub']);
  }

  joinPrivate() {
    console.log('private game');
  }

}
