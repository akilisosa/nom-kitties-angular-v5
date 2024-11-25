import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { RoomService } from '../shared/services/room.service';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-home',
  imports: [    MatToolbarModule,
    CommonModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RouterModule,
  RouterLink],
  standalone: true,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  joinGameForm = new FormGroup({
    simpleCode: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]),
  });

  view = 'home';
  loading = false;

  constructor(private roomService: RoomService, private router: Router) {}


  async joinGame() {
    this.loading = true;
    if (this.joinGameForm.valid) {
      const room = await this.roomService.getRoomByCode(this.joinGameForm.value.simpleCode?.toLocaleUpperCase() || '');
      if (room) {
        this.router.navigate(['room', room.simpleCode]);
      }
    }
    }

}
