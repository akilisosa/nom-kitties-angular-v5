import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserService } from '../../services/user.service';
import { ChatService } from '../../services/chat.service';
import { GameDataService } from '../../../room/services/game-data.service';
import { DomSanitizer } from '@angular/platform-browser';



@Component({
  selector: 'app-chat-room',
  standalone:true,
  imports: [ CommonModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,

    ReactiveFormsModule],
  templateUrl: './chat-room.component.html',
  styleUrl: './chat-room.component.css'
})
export class ChatRoomComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;


  @Input() id: string = 'public';
  user: any = {};

  loading = false;
  subscription = new Subscription()
  message = new FormControl('')
  chatMessageList: any[] = [];

  constructor(private chatService: ChatService, 
    private gameDataService: GameDataService,
    private userService: UserService,
    private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) {
      this.matIconRegistry.addSvgIcon(
        'kitty',
        this.domSanitizer.bypassSecurityTrustResourceUrl('assets/svg/kitty.svg')
      );
    }

  // listen to enter input
  @HostListener('document:keydown.enter', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;
    if (input.value && this.user.name) {
      this.sendChat()
    }
  }

  ngOnInit() {
    this.getUser()

    const messages = this.gameDataService.connect();

    
    this.subscription = messages.subscribe({
      next: (message: any) => {
        console.log('Received message:', message);
        message = JSON.parse(message.event)
        this.updateMessageList(message)
      },
      error: (error: any) => {
        console.error('Error:', error);
      }
    });

    setTimeout(() => {
      this.gameDataService.subscribe(`/default/messages/${this.id}`);
    }, 1000);
  }

  ngAfterViewInit() {
    // Initial scroll to bottom
  }

  ngOnChanges() {
    console.log('changes', this.id);
    if (this.id !== '') {
      this.subscription.unsubscribe();
      this.getLastMessages(this.id);
      this.subscribeToChat(this.id)
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async sendChat() {
    this.loading = true;
    if (this.message.value) {
      this.gameDataService.publishEvent(`/default/messages/${this.id}`, {
        type: 'CHAT',
        message: this.message.value,
        user: this.user,
        id: this.id,
        timestamp: new Date().getTime()
      })
     // await this.chatService.sendChat(this.id, this.message.value, this.user.color, this.user.name,);
      this.message.setValue('');
     // this.scrollToBottom();
    }
    this.loading = false;
  }

  async getLastMessages(id: string) {
    const messages = await this.chatService.getLastMessages(id) || [];
    this.chatMessageList = [...messages];

  }

  async getUser() {
    this.user = await this.userService.user.getValue();
    if (!this.user) {
      this.user = await this.userService.getUser();

    }
  }


  subscribeToChat(id: string) {
    // this.subscription = this.chatService.subscribeToChat(id)
    //   .subscribe({
    //     next: (data: any) => {
    //       console.log(data);
    //       this.updateMessageList(data.data.onCreateMessage)
    //     },
    //     error: (error: any) => {
    //       console.error(error);
    //     },
    //   });
  }

  updateMessageList(message: any) {
    console.log(message);
    this.chatMessageList.push(message);
    if (this.chatMessageList.length > 20) {
      this.chatMessageList.shift();
    }
    setTimeout(() => {
      const lastMessage = this.chatContainer.nativeElement.lastElementChild;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

}