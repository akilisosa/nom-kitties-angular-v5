import { Component } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import {  ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { filter } from 'rxjs';

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

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const urlSegments = this.router.url.split('/');
      let lastSegment = urlSegments[urlSegments.length - 1];
      if(urlSegments[urlSegments.length - 2] === 'room') {
        lastSegment = urlSegments[urlSegments.length - 2];
      }
      // Update your title here
      this.updateTitle(lastSegment);
    });
  
    // Method 2: Using ActivatedRoute
    this.route.url.subscribe((segments: any) => {
      const lastSegment = segments[segments.length - 1]?.path;
      // Update your title here
      this.updateTitle(lastSegment);
    });
  }

  private updateTitle(segment: string) {
    if(segment === 'local-game') {
      this.title = 'Local Game'
    } else if(segment === 'online-game') {
      this.title = 'Online Game'
    } else if(segment === 'learn-more') {
      this.title = 'Learn More'
    } else if(segment === 'room') {
      const urlSegments = this.router.url.split('/');
      let lastSegment = urlSegments[urlSegments.length - 1];
      this.title = 'Room' + '-' + lastSegment
    } else {
      this.title = 'Nom Kitties'
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
