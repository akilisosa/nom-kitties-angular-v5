import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserService } from '../../../shared/services/user.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {

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

  constructor(private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.subcribeToUser();
    this.getUser();
  }

  async getUser() {
    this.loading = true;
    const user = this.userService.user.getValue()
    if(!user) {
     this.user =  await this.userService.getUser();
     console.log('user', this.user);
     if(!this.user) {
      const owner = (await this.authService.getCurrentUser()).userId
      this.user = await this.userService.save({...this.form.value, owner});
     }
    }
    this.loading = false;
  }

  subcribeToUser() {
    this.subscription.add(
      this.userService.userShared().subscribe((user: any) => {
        if (user) {
          this.form.patchValue(user);
          this.cdr.detectChanges();
        }
      })
    );
  }

  async save() {
    this.loading = true;
  const user= await this.userService.save(this.form.value);
    console.log('user', user);
   this.form.markAsPristine();
   this.loading = false;
  }

}
