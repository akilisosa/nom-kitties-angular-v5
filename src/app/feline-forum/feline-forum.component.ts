import { Component } from '@angular/core';
import { ChatRoomComponent } from '../shared/components/chat-room/chat-room.component';

@Component({
  selector: 'app-feline-forum',
  imports: [ChatRoomComponent],
  standalone: true,
  templateUrl: './feline-forum.component.html',
  styleUrl: './feline-forum.component.css'
})
export class FelineForumComponent {

}
