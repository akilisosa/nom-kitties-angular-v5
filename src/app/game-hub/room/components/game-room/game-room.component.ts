import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ControllerComponent } from '../controller/controller.component';
import { drawKitty, getScaledValue } from './draw-util';
import { GameDataService } from '../../services/game-data.service';
// import { GameEventsService } from '../../services/game-events.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../shared/services/auth.service';

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
  owner = '1';

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
        if(!this.owner) return;
        this.gameDataService.publishEvent('/default/messages', {
          type: 'PLAYER_MOVE',
          player: {...this.player, id: this.owner},
          keys: this.keys,
          screenSize: this.size
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
      if(!this.owner) return;
       // check if this.keys values have changed
       if (Object.keys(this.keys).some(key => prevKeys[key as keyof typeof this.keys] !== this.keys[key as keyof typeof this.keys])) {
        this.gameDataService.publishEvent('/default/messages', {
          type: 'PLAYER_MOVE',
          player: {...this.player, id: this.owner},
          keys:  this.keys,
          screenSize: this.size
        })
      }
    }
  }

  constructor(private gameDataService: GameDataService, private authService: AuthService) {
    this.gameLoop = this.gameLoop.bind(this);
   }


  ngOnInit() {

    this.setOwner()
    console.log('game room init');

    const messages = this.gameDataService.connect();

    this.subscription = messages.subscribe({
      next: (message) => {
        console.log('Received message:', message);
        message = JSON.parse(message.event)
        console.log(this.players)
        if( message.player.id === this.owner) return;
        if(message.type === 'PLAYER_MOVE') {
            this.players.set(message.player.id, { player: {...message.player, resize: true}, keys:  message.keys, screenSize: message.screenSize });
        }
      },
      error: (error) => {
        console.error('Error:', error);
      }
    });

    setTimeout(() => {
      this.gameDataService.subscribe('/default/messages');
    }, 1000);

  }

  async setOwner() {
    this.owner = ( await this.authService.getCurrentUser()).userId;
  }

  ngOnChanges() {
    if (this.size > 0 && !this.isModalOpen) {
      this.drawCanvas();
      this.player.size = getScaledValue(50, this.size);
      this.player.speed = getScaledValue(5, this.size);
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

    const newP1X = this.player.x + (this.keys.d ? this.player.speed : (this.keys.a ? -this.player.speed : 0));
    const newP1Y = this.player.y + (this.keys.s ? this.player.speed : (this.keys.w ? -this.player.speed : 0));

    this.player.x = Math.max(0, Math.min(newP1X, this.size - this.player.size));
    this.player.y = Math.max(0, Math.min(newP1Y, this.size - this.player.size));
    // Check i

    // iterate over players
 
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.fillStyle = '#ebebd3';
    this.ctx.fillRect(0, 0, this.size, this.size);

    // Draw the player
    this.ctx.fillStyle = '#ff0000';
    // this.ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size);
    // getScaledValue(50, this.size)

    drawKitty(this.ctx, this.player.x, this.player.y, this.player.size, this.size, '#040607');
    // console.log('this.player', this.players);

    [...this.players.values()].forEach((playerData: any) => {

      if (!playerData.player) return;

      const { player, keys, screenSize } = playerData;

      console.log( 'player', player, screenSize);
      
      if(player.resize == true){
     player.x = player.x * this.size / screenSize;
    player.y = player.y * this.size / screenSize;
      }
    
    
      // Update position if keys are pressed
      const newX = player.x + (keys.d ? this.player.speed : (keys.a ? -this.player.speed : 0));
      const newY = player.y + (keys.s ? this.player.speed : (keys.w ? -this.player.speed : 0));
      
      player.x = Math.max(0, Math.min(newX, this.size - this.player.size));
      player.y = Math.max(0, Math.min(newY, this.size - this.player.size));

        this.ctx.fillStyle = '#000000'// this.player.color;


      drawKitty(this.ctx, player.x, player.y, this.player.size, this.size, '#000000', true);
     
      this.players.set(player.id, { player: {...player, resize: false}, keys, screenSize });
  
    });

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

}
