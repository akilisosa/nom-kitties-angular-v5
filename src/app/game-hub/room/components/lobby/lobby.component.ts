import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-lobby',
  imports: [],
  standalone: true,
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css'
})
export class LobbyComponent {
  @Input() isModalOpen: boolean = false;
  @Input() size: number = 600;
  @Input() room: any;
  @Input() playerList: any[] = [];

}
