import {
  ChangeDetectorRef,
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TempUserService } from '../../../shared/services/temp-user.service';

import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-temp-user',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  standalone: true,
  templateUrl: './temp-user.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './temp-user.component.css',
})
export class TempUserComponent {
  // constructor(private tempUserService: TempUserService) { }

  user: any;

  form = new FormGroup({
    id: new FormControl(''),
    owner: new FormControl(''),
    name: new FormControl('Kitty123'),
    color: new FormControl('#a85c32'),
    type: new FormControl('cat'),
  });

  subscription = new Subscription();

  loading = false;

  constructor(
    private tempUserService: TempUserService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.subscribeToUser();
  }

  subscribeToUser() {
    this.subscription.add(
      this.tempUserService.userShared().subscribe((user: any) => {
        if (user) {
          this.form.patchValue(user);
          this.cdr.detectChanges();
        }
        if (!user) {
          /// set id to uuid
          this.form.patchValue({
            id: crypto.randomUUID(),
            owner: crypto.randomUUID(),
          });
          this.save();
          // this.form.patchValue(this.form.value);
        }
      }),
    );
  }

  save() {
    console.log('saving user', this.form.value);
    this.tempUserService.setUser(this.form.value);
  }
}
