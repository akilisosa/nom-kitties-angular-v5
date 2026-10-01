import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-countdown',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './countdown.component.html',
  styleUrl: './countdown.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [
    trigger('countdownAnimation', [
      state(
        'void',
        style({
          opacity: 0,
          transform: 'scale(0.5)',
        }),
      ),
      state(
        '*',
        style({
          opacity: 1,
          transform: 'scale(1)',
        }),
      ),
      transition(':enter', [animate('0.5s ease-out')]),
      transition('* => void', [animate('0.5s ease-in')]),
      transition('* => *', [
        style({ transform: 'scale(1.5)', opacity: 0 }),
        animate('0.5s ease-out'),
      ]),
    ]),
  ],
})
export class CountdownComponent implements OnInit, OnDestroy {
  /** Epoch ms the owner picked (Room.gameStartTime); every client counts down to it. */
  @Input() startsAt = 0;
  private intervalId: number | null = null;
  seconds = 5;

  ngOnInit(): void {
    this.tick();
    this.intervalId = window.setInterval(() => this.tick(), 100);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    this.seconds = Math.max(0, Math.ceil((this.startsAt - Date.now()) / 1000));
  }
}
