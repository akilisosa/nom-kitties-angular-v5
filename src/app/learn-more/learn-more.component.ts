import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-learn-more',
  imports: [RouterLink, MatButtonModule],
  standalone: true,
  templateUrl: './learn-more.component.html',
  styleUrl: './learn-more.component.css'
})
export class LearnMoreComponent {

}
