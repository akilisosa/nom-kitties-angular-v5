import {
  Component,
  Input,
  EventEmitter,
  Output,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-player1',
  templateUrl: './player1.component.html',
  styleUrls: ['./player1.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
})
export class Player1Component implements OnInit {
  @Input() score = 0;
  @Output() colorChange = new EventEmitter<string>();

  form = this.fb.group({
    color: ['#a85c32'],
    name: ['Player1'],
  });

  constructor(private fb: FormBuilder) {}

  onColorChange(event: any) {
    this.colorChange.emit(event);
  }

  ngOnInit() {
    this.form.get('color')?.valueChanges.subscribe((color: any) => {
      this.onColorChange(color);
    });
  }
}
