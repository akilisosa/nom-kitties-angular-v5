import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-countdown',
  imports: [],
  templateUrl: './countdown.component.html',
  styleUrl: './countdown.component.css'
})
export class CountdownComponent {

  @Input() room: any;
  @Output() startGameEvent = new EventEmitter<void>();

  constructor() { }
}
