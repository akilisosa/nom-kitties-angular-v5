import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-podium',
  imports: [],
  standalone: true,
  templateUrl: './podium.component.html',
  styleUrl: './podium.component.css'
})
export class PodiumComponent {

  @Input() podium: any[] = [];
  @Input() room: any = {};
  @Input() playersScore: any = {};

}
