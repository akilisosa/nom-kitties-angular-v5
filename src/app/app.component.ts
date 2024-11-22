import { Component } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import {  RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

Amplify.configure(outputs);

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    standalone: true,
    styleUrl: './app.component.css',
    imports: [CommonModule, RouterOutlet, RouterLink,
      MatToolbarModule, MatSidenavModule, MatButtonModule, MatIconModule, MatListModule]
})
export class AppComponent {
  title = 'Nom Kitties';

  isSidebarOpen = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
