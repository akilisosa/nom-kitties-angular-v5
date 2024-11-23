import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ControllerComponent } from '../controller/controller.component';
import { drawKitty, generateRandomPosition, getScaledValue, spawnCollectible } from './draw-util';
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
  @Input() treatsOnFloor = 5;
  COLLECTIBLE_RADIUS = 10;
  collectibles: any[] = [];


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
        this.gameDataService.publishEvent('/default/messages', {
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
        this.gameDataService.publishEvent('/default/messages', {
          type: 'PLAYER_MOVE',
          player: { ...this.player, id: this.owner },
          keys: this.keys,
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
        if (message.player?.id === this.owner) return;
        if (message.type === 'PLAYER_MOVE') {
          this.players.set(message.player.id, { player: { ...message.player, resize: true }, keys: message.keys, screenSize: message.screenSize });
        }
        if (message.type === 'COLLECTIBLES') {
          this.collectibles = message.collectibles;
        }
        if (message.type === 'PLAYER_SCORE') {
    this.playerScore(message)
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
    this.owner = (await this.authService.getCurrentUser()).userId;
  }

  playerScore(message: any){
    console.log('PlayerScore',message)
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


  publishCollectibles(collectibles: any[]) {
    this.gameDataService.publishEvent('/default/messages', {
      type: 'COLLECTIBLES',
      collectibles
    })
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


  consumeCollectible(player: any, width: number, collectibles: any[]) {
    console.log('collectible consumed');
    this.gameDataService.publishEvent('/default/messages', {
      type: 'PLAYER_SCORE',
      player: { ...this.player, id: this.owner, },
      keys: this.keys,
      screenSize: this.size,
      collectibles
    })

    this.collectibles = collectibles;
    

    if(player.id === this.room.owner) {
      spawnCollectible(this.COLLECTIBLE_RADIUS, this.obstacles, this.size, this.collectibles, this.treatsOnFloor);
      this.publishCollectibles(this.collectibles)
    }

  }



  checkCollectibleCollection(player: any, width: number, collectibleList: any[] = this.collectibles) {
    collectibleList.forEach(collectible => {
      if (collectible.active) {
        const dx = (player.x + width / 2) - collectible.x;
        const dy = (player.y + width / 2) - collectible.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < (width / 2 + collectible.radius)) {
          collectible.active = false;
          this.consumeCollectible(player, width, collectibleList) 
        }
      }

    });
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

  newCollectibles(collectibles: any[]) {
    this.gameDataService.publishEvent('/default/messages', {
      type: 'COLLECTIBLES',
      collectibles
    })
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

    this.checkCollectibleCollection(this.player, this.player.size);

    // Remove collected circles and spawn new ones if needed
    this.collectibles = this.collectibles.filter(c => c.active);
    while (this.collectibles.length < this.treatsOnFloor) {
      spawnCollectible(this.COLLECTIBLE_RADIUS, this.obstacles, this.size, this.collectibles, this.treatsOnFloor);
      this.newCollectibles(this.collectibles)
    }



    drawKitty(this.ctx, this.player.x, this.player.y, this.player.size,this.player.color);

    [...this.players.values()].forEach((playerData: any) => {

      if (!playerData.player) return;

      const { player, keys, screenSize } = playerData;
      if (player.resize == true) {
        player.x = getScaledValue(player.x, this.size);
        player.y = getScaledValue(player.y, this.size);
      }


      // Update position if keys are pressed
      const newX = player.x + (keys.d ? this.player.speed : (keys.a ? -this.player.speed : 0));
      const newY = player.y + (keys.s ? this.player.speed : (keys.w ? -this.player.speed : 0));

      player.x = Math.max(0, Math.min(newX, this.size - this.player.size));
      player.y = Math.max(0, Math.min(newY, this.size - this.player.size));

     // this.player.color;


      drawKitty(this.ctx, player.x, player.y, this.player.size, player.color);

      this.players.set(player.id, { player: { ...player, resize: false }, keys, screenSize });

    });

    // Draw collectibles
    this.collectibles.forEach(collectible => {
      if (collectible.active) {
        this.ctx.beginPath();
        this.ctx.arc(collectible.x, collectible.y, collectible.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = collectible.color;
        this.ctx.fill();
        this.ctx.closePath();
      }
    });

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

}
