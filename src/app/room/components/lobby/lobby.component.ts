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
import { GameOptionsComponent } from '../../../shared/components/game-options/game-options.component';
import { DEFAULT_ROOM_OPTIONS, KITTY_SPEED_MULTIPLIERS, RoomOptions } from '../../game-settings';

@Component({
  selector: 'app-lobby',
  imports: [MatButtonModule, MatIconModule, JoystickComponent, GameOptionsComponent],
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
  /** The room's current options; only the owner can change them. */
  @Input() options: RoomOptions = DEFAULT_ROOM_OPTIONS;

  @Output() startGameEmit = new EventEmitter<void>();
  @Output() optionsChange = new EventEmitter<RoomOptions>();

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
    // Try the room's kitty speed while waiting.
    this.engine.speed = KITTY_SPEED_MULTIPLIERS[this.options.kittySpeed];
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
