import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { Player1Component } from './components/player1/player1.component';
import { Player2Component } from './components/player2/player2.component';
import { GameboardComponent } from './components/gameboard/gameboard.component';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';

@Component({
  selector: 'app-local-game',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    FormsModule,
    MatSelectModule,
    Player1Component,
    Player2Component,
    GameboardComponent
  ],
  templateUrl: './local-game.component.html',
  styleUrl: './local-game.component.css'
})
export class LocalGameComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  @ViewChild('lobbyContainer', { static: true }) lobbyContainer!: ElementRef;

  active: boolean = false;
  timer: number = 30;
  private interval: any; // Store interval reference
  isPaused: boolean = false;

  player1Score: number = 0;
  player2Score: number = 0;

  player1Color: string = '#a85c32';
  player2Color: string = '#000000';

   isSidebarOpen = false;
  settingsView = false;
  size = 10;

  state = 'newGame';

  form = this.fb.group({
    timeLimit: [30],
    treatsOnFloor: [3]
  });

  lobbyHeight = 0;
  lobbyWidth = 0; 

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {}


  ngOnInit() {
  }

  ngAfterViewInit(): void {
    // this.form.valueChanges.subscribe((value) => {
    //   console.log(value);
    // });
  }

  ngAfterViewChecked() {
    const width = this.lobbyContainer.nativeElement.clientWidth;
    const height = this.lobbyContainer.nativeElement.clientHeight;
    if(this.lobbyWidth !== width || this.lobbyHeight !== height){
      this.lobbyWidth = width;
      this.lobbyHeight = height;
      this.size = Math.min(width, height) - 5;
      if(this.size > 600) {
        this.size = 600;
        console.log('size', this.size);
      }
      this.cdr.detectChanges();
    }

  }

  ngOnDestroy() {
    this.clearGameInterval();
  }

  @HostListener('window:keydown.space', ['$event'])
  handleSpaceBar(event: KeyboardEvent) {
    event.preventDefault(); // Prevent page scrolling
    if (this.active) {
      this.pauseGame()
    } else {
      if (this.timer === 30 || this.timer < 1) {

        this.startGame()
      } else {
        this.resumeGame()
      }
    }
    // Add your spacebar logic here
  }


  scoreChange(event: any) {
    this.player1Score = event.player1Score
    this.player2Score = event.player2Score
  }

  colorChange(event: any, player: string) {
    if (player === 'player1') {
      this.player1Color = event;
    } else if (player === 'player2') {
      this.player2Color = event;
    }

  }

  startGame() {
    this.active = true;
    this.state = 'game';
    this.timer = Number(this.form.controls.timeLimit.value) || 30;
    this.player1Score = 0;
    this.player2Score = 0;
    this.isPaused = false;
    this.settingsView = false;
    this.startTimer();
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }


  private startTimer() {
    this.interval = setInterval(() => {
      if (this.timer > 0 && !this.isPaused) {
        this.timer--;
      } else if (this.timer === 0) {
        this.active = false;
        this.clearGameInterval();
      }
    }, 1000);
  }

  pauseGame() {
    this.isPaused = true;
    this.active = false;
    this.state = 'paused';
  }

  resumeGame() {
    this.isPaused = false;
    this.active = true;
    this.state = 'game';
  }

  private clearGameInterval() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

 


}
