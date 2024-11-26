import { ChangeDetectorRef, Component } from '@angular/core';
import { TempUserService } from '../../../shared/services/temp-user.service';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { v4 } from 'uuid';

@Component({
  selector: 'app-temp-user',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  standalone: true,
  templateUrl: './temp-user.component.html',
  styleUrl: './temp-user.component.css'
})
export class TempUserComponent {

  // constructor(private tempUserService: TempUserService) { }

  user: any;

  form = new FormGroup({
    id: new FormControl(''),
    owner: new FormControl(''),
    name: new FormControl('Kitty123'),
    color: new FormControl('#a85c32'),
    type: new FormControl('cat')
  });


  subscription = new Subscription();

  loading = false;

  constructor(private tempUserService: TempUserService,
    private cdr: ChangeDetectorRef) { }

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
        if(!user) {
          /// set id to uuid
          this.form.patchValue({ id: v4(), owner: v4() });
          this.save()
         // this.form.patchValue(this.form.value);
        }
      })
    );
  
  }

  save() {
    console.log('saving user', this.form.value)
    this.tempUserService.setUser(this.form.value);
  }
  

}
