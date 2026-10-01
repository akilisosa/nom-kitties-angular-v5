import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { JoystickComponent } from '../joystick/joystick.component';
import { KittyEngine, Keys } from '../../engine/kitty-engine';
import { RoomSessionService } from '../../net/room-session.service';

@Component({
  selector: 'app-lobby',
  imports: [MatButtonModule, MatIconModule, JoystickComponent],
  standalone: true,
  templateUrl: './lobby.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './lobby.component.css',
})
export class LobbyComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('gameCanvas') gameCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() size = 600;
  @Input() isModalOpen = false;
  @Input() isOwner = false;
  /** Names of everyone connected, including you. */
  @Input() roster: string[] = [];

  @Output() startGameEmit = new EventEmitter<void>();

  private readonly engine = new KittyEngine(inject(RoomSessionService), inject(NgZone), {
    background: '#ebebd3',
    controllable: true,
  });
  private viewReady = false;

  ngAfterViewInit(): void {
    this.engine.attach(this.gameCanvas.nativeElement);
    this.viewReady = true;
    this.ngOnChanges();
  }

  ngOnChanges(): void {
    if (!this.viewReady) return;
    this.engine.resize(this.size);
    if (this.isModalOpen || this.size <= 0) {
      this.engine.stop();
    } else {
      this.engine.start();
    }
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }

  onDirectionChange(keys: Keys): void {
    this.engine.setKeys(keys);
  }
}
