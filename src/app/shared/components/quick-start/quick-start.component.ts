import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RoomService, normalizeRoomCode } from '../../services/room.service';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GameOptionsComponent } from '../game-options/game-options.component';
import { DEFAULT_ROOM_OPTIONS, RoomOptions, roomOptionColumns } from '../../../room/game-settings';

@Component({
  selector: 'app-quick-start',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    GameOptionsComponent,
  ],
  templateUrl: './quick-start.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './quick-start.component.css',
})
export class QuickStartComponent implements OnInit {
  @Input() showRefresh: boolean = false;
  @Output() refreshEmit = new EventEmitter<void>();

  view: 'quickstart' | 'start' | 'join' | 'private' | 'loading' = 'quickstart';

  newGameForm = new FormGroup({
    public: new FormControl(true),
    mode: new FormControl('classic'),
    playersPerRound: new FormControl(4),

    roomLimit: new FormControl(4),
    simpleCode: new FormControl(''),
    name: new FormControl('example'),
  });

  /** Treats, speed, round length and rounds (see GameOptionsComponent). */
  options: RoomOptions = { ...DEFAULT_ROOM_OPTIONS };

  joinGameForm = new FormGroup({
    simpleCode: new FormControl(''),
  });

  loading = false;

  constructor(
    private roomService: RoomService,
    private router: Router,
    private authService: AuthService,
  ) {}

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

  async joinGameWithCode() {
    this.view = 'loading';
    const code = normalizeRoomCode(this.joinGameForm.value.simpleCode ?? '');
    if (!code) {
      this.view = 'join';
      return;
    }
    const room = await this.roomService.getRoomByCode(code);
    if (!room) {
      this.view = 'join';
      return;
    }
    this.router.navigate(['room', code]);
  }

  async startGame() {
    // todo check for room generated code.
    this.view = 'loading';
    const owner = (await this.authService.getCurrentUser()).userId;

    await this.roomService.createNewRoom({
      ...this.newGameForm.value,
      ...roomOptionColumns(this.options),
      currentRound: 1,
      public: this.newGameForm.value.public ? 'public' : 'private',
      players: [owner],
      owner,
      status: 'WAITING',
      createdAt: new Date().toISOString(),
    });

    this.generate6DigitAlphaNumericCode();

    this.loading = false;

    this.router.navigate(['room', this.newGameForm.value.simpleCode]);
  }

  joinGame() {
    this.router.navigate(['game-hub']);
  }

  joinPrivate() {
    console.log('private game');
  }
}
