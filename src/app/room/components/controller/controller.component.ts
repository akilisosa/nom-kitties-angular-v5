import {
  Component,
  HostListener,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { GameRoomComponent } from '../game-room/game-room.component';

@Component({
  selector: 'app-controller',
  standalone: true,
  imports: [],
  templateUrl: './controller.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './controller.component.css',
})
export class ControllerComponent {
  direction: string = '';

  @Input() room: any;
  @Input() size: number = 500;
  @Input() playerList: any[] = [];
  @Input() isModalOpen: boolean = false;

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const keysPressed = new Set<string>();

    window.addEventListener('keydown', (e) => {
      keysPressed.add(e.key);
      this.updateDirection(keysPressed);
    });

    window.addEventListener('keyup', (e) => {
      keysPressed.delete(e.key);
      this.updateDirection(keysPressed);
    });
  }

  updateDirection(keysPressed: Set<string>) {
    if (keysPressed.has('w') && keysPressed.has('a')) {
      this.direction = 'north-west';
    } else if (keysPressed.has('w') && keysPressed.has('d')) {
      this.direction = 'north-east';
    } else if (keysPressed.has('s') && keysPressed.has('a')) {
      this.direction = 'south-west';
    } else if (keysPressed.has('s') && keysPressed.has('d')) {
      this.direction = 'south-east';
    } else if (keysPressed.has('w')) {
      this.direction = 'north';
    } else if (keysPressed.has('a')) {
      this.direction = 'west';
    } else if (keysPressed.has('s')) {
      this.direction = 'south';
    } else if (keysPressed.has('d')) {
      this.direction = 'east';
    } else {
      this.direction = '';
    }
  }
}
