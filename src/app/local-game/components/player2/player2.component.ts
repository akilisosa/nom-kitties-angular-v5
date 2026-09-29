import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-player2',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  standalone: true,
  templateUrl: './player2.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './player2.component.css',
})
export class Player2Component {
  @Input() score = 0;
  @Output() colorChange = new EventEmitter<string>();

  form = this.fb.group({
    color: ['#000000'],
    name: ['Player2'],
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
