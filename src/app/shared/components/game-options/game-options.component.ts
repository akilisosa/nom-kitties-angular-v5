import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  DEFAULT_ROOM_OPTIONS,
  KITTY_SPEED_CHOICES,
  ROUND_COUNT_CHOICES,
  ROUND_LENGTH_CHOICES,
  RoomOptions,
  TREATS_ON_FLOOR_CHOICES,
  TREAT_SPAWNING_CHOICES,
  treatSpawningLabel,
} from '../../../room/game-settings';

/** The room options as a row of selects. Read-only (disabled) for everyone but the owner. */
@Component({
  selector: 'app-game-options',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './game-options.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './game-options.component.css',
})
export class GameOptionsComponent {
  @Input() value: RoomOptions = DEFAULT_ROOM_OPTIONS;
  @Input() editable = true;
  @Output() valueChange = new EventEmitter<RoomOptions>();

  readonly treatSpawningChoices = TREAT_SPAWNING_CHOICES;
  readonly treatsOnFloorChoices = TREATS_ON_FLOOR_CHOICES;
  readonly kittySpeedChoices = KITTY_SPEED_CHOICES;
  readonly roundCountChoices = ROUND_COUNT_CHOICES;
  readonly treatSpawningLabel = treatSpawningLabel;

  /** Older rooms may have a round length that's no longer offered; still show it. */
  get roundLengthChoices(): number[] {
    const choices: number[] = [...ROUND_LENGTH_CHOICES];
    return choices.includes(this.value.timeLimit) ? choices : [this.value.timeLimit, ...choices];
  }

  set<K extends keyof RoomOptions>(key: K, value: RoomOptions[K]): void {
    this.valueChange.emit({ ...this.value, [key]: value });
  }
}
