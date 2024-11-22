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

@Component({
  selector: 'app-quick-start',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule
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
    rounds: new FormControl('3'),
    timeLimit: new FormControl('30'),
    currentPlayers: new FormControl('4'),
    roomLimit: new FormControl('4'),
    simpleCode: new FormControl(''),
    type: new FormControl('cat')
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
    const hostID = (await this.authService.getCurrentUser()).userId
    
    await this.roomService.createNewRoom({
      public: this.newGameForm.value.public?.toString() || 'true',
      mode: this.newGameForm.value.mode,
      rounds: Number(this.newGameForm.value.rounds),
      timeLimit: Number(this.newGameForm.value.timeLimit),
      currentPlayers: Number(this.newGameForm.value.currentPlayers),
      roomLimit: Number(this.newGameForm.value.roomLimit),
      simpleCode: this.newGameForm.value.simpleCode,
      hostID,
      status: 'WAITING',
      updatedAt: new Date().toISOString(),
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
