import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ControllerComponent } from '../controller/controller.component';
import { drawKitty, getScaledValue } from './draw-util';
import { GameDataService } from '../../services/game-data.service';
// import { GameEventsService } from '../../services/game-events.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-game-room',
  imports: [],
  standalone: true,
  templateUrl: './game-room.component.html',
  styleUrl: './game-room.component.css'
})
export class GameRoomComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('gameCanvas') gameCanvas!: ElementRef;
  @ViewChild(ControllerComponent) controller!: ControllerComponent;


  @Input() room: any;
  @Input() size: number = 500;
  @Input() playerList: any[] = []
  @Input() isModalOpen: boolean = false;
  @Input() direction = '';
  @Input() user = { id: '1', name: 'user1' };

  players = new Map();

  player = {
    x: 50,
    y: 50,
    size: 50,
    speed: 5,
    color: 'red',
  }

  keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  };

  animationFrameId: any;
  ctx: any;
  canvas: any;


  subscription = new Subscription()




  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Check if the pressed key exists in our keys object
    if (event.key in this.keys) {
      event.preventDefault(); // Prevent default browser scrolling
      const prevKeys = { ...this.keys };
      this.keys[event.key as keyof typeof this.keys] = true;

      // check if this.keys values have changed
      if (Object.keys(this.keys).some(key => prevKeys[key as keyof typeof this.keys] !== this.keys[key as keyof typeof this.keys])) {
        this.gameDataService.publishEvent('/default/messages', {
          type: 'PLAYER_MOVE',
          player: this.player,
          keys: this.keys
        })
      }
    }
  }

  private hasKeysChanged(prevKeys: Record<string, boolean>, currentKeys: Record<string, boolean>): boolean {
    const keys = Object.keys(prevKeys);
    return keys.some(key => prevKeys[key] !== currentKeys[key]);
}


  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    // Check if the released key exists in our keys object
    if (event.key in this.keys) {
      event.preventDefault();
      const prevKeys = { ...this.keys };
      this.keys[event.key as keyof typeof this.keys] = false;

       // check if this.keys values have changed
       if (Object.keys(this.keys).some(key => prevKeys[key as keyof typeof this.keys] !== this.keys[key as keyof typeof this.keys])) {
        this.gameDataService.publishEvent('/default/messages', {
          type: 'PLAYER_MOVE',
          player: this.player,
          keys:  this.keys
        })
      }
    }
  }

  constructor(private gameDataService: GameDataService) { }



  //   private gameEvents: GameEventsService) {
  //   this.gameDataService.connect();
  // }

  ngOnInit() {
    console.log('game room init');

    const messages = this.gameDataService.connect();

    this.subscription = messages.subscribe({
      next: (message) => {
        console.log('Received message:', message);
        message = JSON.parse(message.event)

        if(message.type === 'PLAYER_MOVE' && message.player.id !== this.user.id) return;
        if(message.type === 'PLAYER_MOVE') {
            this.players.set(message.player.id, { player: message.player, keys:  message.keys });
        }
      },
      error: (error) => {
        console.error('Error:', error);
      }
    });

    setTimeout(() => {
      this.gameDataService.subscribe('/default/messages');
    }, 1000);

    //   setTimeout(() => {
    //     this.gameDataService.publishEvent('/default/messages', {
    //       type: 'PLAYER_MOVE',
    //       playerId: 'this.playerId',
    //       position: 'wow' 
    //     });
    //   }, 2000);


    // this.gameEvents.subscribeToEvents('/default/channel/')
    //   .subscribe({
    //     next: (event: any) => {
    //       // Handle incoming game events
    //       console.log('Received event:', event);

    //       // Example: Handle different event types
    //       switch(event.message.type) {
    //         case 'PLAYER_MOVE':
    //           this.handlePlayerMove(event.message);
    //           break;
    //         case 'COLLECT_ITEM':
    //           this.handleItemCollection(event.message);
    //           break;
    //         // Add other event types as needed
    //       }
    //     },
    //     error: (error: any) => {
    //       console.error('Subscription error:', error);
    //     }
    //   });

    //   setTimeout(() => {
    //     this.sendPlayerMove(100, 100);
    //         }, 1000);
  }

  ngOnChanges() {
    if (this.size > 0 && !this.isModalOpen) {
      this.drawCanvas();
      this.player.size = getScaledValue(50, this.size);
    }
    if (this.isModalOpen) {
      this.stopGameLoop();
    }

  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  stopGameLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  drawCanvas() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.canvas = this.gameCanvas.nativeElement;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#ebebd3';
    this.ctx.fillRect(0, 0, this.size, this.size);
    this.gameLoop();
  }

  gameLoop() {
    if (this.isModalOpen) {
      this.stopGameLoop();
      return
    }



    // Ensure player stays within bounds
    // Calculate potential new positions
    const newP1X = this.player.x + (this.keys.d ? this.player.speed : (this.keys.a ? -this.player.speed : 0));
    const newP1Y = this.player.y + (this.keys.s ? this.player.speed : (this.keys.w ? -this.player.speed : 0));

    this.player.x = Math.max(0, Math.min(newP1X, this.size - this.player.size));
    this.player.y = Math.max(0, Math.min(newP1Y, this.size - this.player.size));
    // Check i

    // Update player 1 position if no collisions
    // if (!this.checkCollision(
    //   { ...this.player, x: newP1X, y: newP1Y },
    //   this.player2
    // ) && !p1CollidesWithObstacle) {
    //   this.player1.x = Math.max(0, Math.min(newP1X, 600 - this.player1.size));
    //   this.player1.y = Math.max(0, Math.min(newP1Y, 600 - this.player1.size));
    // }

    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.fillStyle = '#ebebd3';
    this.ctx.fillRect(0, 0, this.size, this.size);

    // Draw the player
    this.ctx.fillStyle = '#ff0000';
    // this.ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size);
    // getScaledValue(50, this.size)

    drawKitty(this.ctx, this.player.x, this.player.y, this.player.size, this.size, '#040607');

    // const kittySize = this.getScaledValue(50);
    // const kittyX = this.getScaledValue(50);
    // const kittyY = this.getScaledValue(50);
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

}
