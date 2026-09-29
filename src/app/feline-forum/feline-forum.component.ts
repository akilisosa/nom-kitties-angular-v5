import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ChatRoomComponent } from '../shared/components/chat-room/chat-room.component';

@Component({
  selector: 'app-feline-forum',
  imports: [ChatRoomComponent],
  standalone: true,
  templateUrl: './feline-forum.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './feline-forum.component.css',
})
export class FelineForumComponent {}
