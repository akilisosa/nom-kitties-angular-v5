import { Component } from '@angular/core';
import { ProfileComponent } from './components/profile/profile.component';
import { QuickStartComponent } from '../shared/components/quick-start/quick-start.component';

@Component({
  selector: 'app-dashboard',
  imports: [ProfileComponent, QuickStartComponent],
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

}
