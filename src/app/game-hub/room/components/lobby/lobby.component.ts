import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameDataService } from '../../services/game-data.service';
import { drawKitty, getScaledValue } from '../game-room/draw-util';
import { UserService } from '../../../../shared/services/user.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-lobby',
  imports: [MatButtonModule, MatIconModule],
  standalone: true,
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css'
})
export class LobbyComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('gameCanvas') gameCanvas!: ElementRef;

  @Input() room: any;
  @Input() size: number = 600;
  @Input() playerList: any[] = []
  @Input() isModalOpen: boolean = false;
  @Input() direction = '';
  @Input() user = { id: '1', name: 'user1' };
  @Input() treatsOnFloor = 5;

  @Output() startGameEmit = new EventEmitter<any>();


  players = new Map();
  owner = '1';

  player = {
    id: '1',
    x: 50,
    y: 50,
    size: 50,
    speed: 5,
    color: '#000000',
  }

  keys = {
    w: false,
    s: false,
    a: false,
    d: false,
  };

  obstacles: any[] = [
    // Example obstacles - adjust positions and sizes as needed
    { x: 200, y: 200, width: 100, height: 20, color: 'gray' },  // Horizontal wall
    { x: 400, y: 100, width: 20, height: 200, color: 'gray' },  // Vertical wall
    { x: 100, y: 400, width: 200, height: 20, color: 'gray' },  // Another wall
  ];


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
        if (!this.owner) return;
        this.gameDataService.publishEvent(`/default/messages/${this.room.id}`, {
          type: 'PLAYER_MOVE',
          player: { ...this.player, id: this.owner },
          keys: this.keys,
          screenSize: this.size
        })
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    // Check if the released key exists in our keys object
    if (event.key in this.keys) {
      event.preventDefault();
      const prevKeys = { ...this.keys };
      this.keys[event.key as keyof typeof this.keys] = false;
      if (!this.owner) return;
      // check if this.keys values have changed
      if (Object.keys(this.keys).some(key => prevKeys[key as keyof typeof this.keys] !== this.keys[key as keyof typeof this.keys])) {
        this.gameDataService.publishEvent(`/default/messages/${this.room.id}`, {
          type: 'PLAYER_MOVE',
          player: { ...this.player, id: this.owner },
          keys: this.keys,
          screenSize: this.size
        })
      }
    }
  }

  constructor(private gameDataService: GameDataService, private userService: UserService, private authService: AuthService) {
    this.gameLoop = this.gameLoop.bind(this);
  }

  onDirectionChange(keys: any) {
    console.log('direction', keys);
    this.keys = keys;

    this.gameDataService.publishEvent(`/default/messages/${this.room.id}`, {
      type: 'PLAYER_MOVE',
      player: { ...this.player, id: this.owner },
      keys: keys,
      screenSize: this.size
    })
  }


  ngOnInit() {

    this.setOwner()
    console.log('game room init');

    const messages = this.gameDataService.connect();

    this.subscription = messages.subscribe({
      next: (message) => {
        console.log('Received message:', message);
        message = JSON.parse(message.event)
        if (message.player?.id === this.owner) return;
        if (message.type === 'PLAYER_MOVE') {

 
            message.player.x = getScaledValue(message.player.x, this.size);
            message.player.y = getScaledValue(message.player.y, this.size);
          
          this.players.set(message.player.id, { player: { ...message.player}, keys: message.keys, screenSize: message.screenSize });
        }
      },
      error: (error) => {
        console.error('Error:', error);
      }
    });

    setTimeout(() => {
      this.gameDataService.subscribe(`/default/messages/${this.room.id}`);
    }, 1000);

  }

  async setOwner() {
    this.owner = (await this.authService.getCurrentUser()).userId;
    const kitty = (await this.userService.getUser());
    this.player = { ...this.player, color: kitty?.color || '#000000', id: this.owner };
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
    this.subscription.unsubscribe();
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



  checkCollision(obj1: any, obj2: any): boolean {

    const scaledObj1 = {
      x: obj1.x,
      y: obj1.y,
      width: getScaledValue(obj1.width, this.size),
      height: getScaledValue(obj1.height, this.size)
    };

    const scaledObj2 = {
      x: obj2.x,
      y: obj2.y,
      width: getScaledValue(obj2.width, this.size),
      height: getScaledValue(obj2.height, this.size)
    };

    return (scaledObj1.x < scaledObj2.x + scaledObj2.width &&
      scaledObj1.x + scaledObj1.width > scaledObj2.x &&
      scaledObj1.y < scaledObj2.y + scaledObj2.height &&
      scaledObj1.y + scaledObj1.height > scaledObj2.y);
  }



  // Check if an object collides with any obstacle
  checkObstacleCollisions(obj: any, newX: number, newY: number): boolean {
    const testObj = { x: newX, y: newY, width: obj.width, height: obj.height };
    return this.obstacles.some(obstacle => this.checkCollision(testObj, obstacle));
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

    drawKitty(this.ctx, this.player.x, this.player.y, this.player.size,this.player.color);

    [...this.players.values()].forEach((playerData: any) => {

      if (!playerData.player) return;

      const { player, keys, screenSize } = playerData;


      // Update position if keys are pressed
      const newX = player.x + (keys.d ? this.player.speed : (keys.a ? -this.player.speed : 0));
      const newY = player.y + (keys.s ? this.player.speed : (keys.w ? -this.player.speed : 0));

      player.x = Math.max(0, Math.min(newX, this.size - this.player.size));
      player.y = Math.max(0, Math.min(newY, this.size - this.player.size));

     // this.player.color;


      drawKitty(this.ctx, player.x, player.y, this.player.size, player.color);

      this.players.set(player.id, { player: { ...player }, keys, screenSize });

    });

    // Draw collectib

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

}