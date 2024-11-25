import { trigger, state, style, transition, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-countdown',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './countdown.component.html',
  styleUrl: './countdown.component.css',
  animations: [
    trigger('countdownAnimation', [
      state('void', style({
        opacity: 0,
        transform: 'scale(0.5)'
      })),
      state('*', style({
        opacity: 1,
        transform: 'scale(1)'
      })),
      transition(':enter', [
        animate('0.5s ease-out')
      ]),
      transition('* => void', [
        animate('0.5s ease-in')
      ]),
      transition('* => *', [
        style({ transform: 'scale(1.5)', opacity: 0 }),
        animate('0.5s ease-out')
      ])
    ])
  ]
})
 export class CountdownComponent  implements OnInit, OnDestroy {
  @Input() room: any; // Assuming room is passed as an input
  @Output() startGameEmit = new EventEmitter<void>();
  private intervalId: number | null = null;
  countdown: number = 5000; // Start with 5 seconds in milliseconds
  gameStartTime: number = 0;

  ngOnInit(): void {
    const timeElapsed = this.calculateTimeElapsed();
    console.log(timeElapsed);
    this.gameStartTime = Date.now() + (5000 - timeElapsed); // Set game start time 5 seconds from now
    this.startCountdown(this.gameStartTime);
    // this.gameStartTime = Date.now() + (5000); // Set game start time 5 seconds from now
    // this.startCountdown(this.gameStartTime);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private calculateTimeElapsed(): number {
    if (!this.room?.updatedAt) {
      return 0;
    }

    const updatedAtMs = this.room.updatedAt instanceof Date 
      ? this.room.updatedAt.getTime()
      : new Date(this.room.updatedAt).getTime();

    return Math.min(5000, Date.now() - updatedAtMs);
  }

  private startCountdown(gameStartTime: any): void {
    this.intervalId = window.setInterval(() => {
      const timeLeft = gameStartTime - Date.now();
      this.countdown = Math.max(0, timeLeft);

      if (this.countdown <= 0 && this.intervalId) {
        this.startGameEmit.emit(); 
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }, 100); // Update every 100 milliseconds for smoother countdown
  }
}