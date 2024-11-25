import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { drawKitty, generateRandomPosition, getScaledValue, spawnCollectible } from './draw-util';
import { GameDataService } from '../../services/game-data.service';
// import { GameEventsService } from '../../services/game-events.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../shared/services/auth.service';
import { UserService } from '../../../../shared/services/user.service';
import { CommonModule } from '@angular/common';
import { JoystickComponent } from '../joystick/joystick.component';


@Component({
  selector: 'app-game-room',
  imports: [JoystickComponent, CommonModule],
  standalone: true,
  templateUrl: './game-room.component.html',
  styleUrl: './game-room.component.css'
})
export class GameRoomComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('gameCanvas') gameCanvas!: ElementRef;

  @Input() room: any;
  @Input() size: number = 600;
  @Input() playerList: any[] = []
  @Input() isModalOpen: boolean = false;
  @Input() direction = '';
  @Input() user = { id: '1', name: 'user1' };
  @Input() treatsOnFloor = 5;
  COLLECTIBLE_RADIUS = 10;
  collectibles: any[] = [];
  messages: any;

  @Output() playerScoreEmit = new EventEmitter<any>()

  subscriptionID: any;

  playing = false;


  players = new Map();
  owner = '1';

  player = {
    id: '1',
    x: 50,
    y: 50,
    size: 50,
    speed: 5,
    color: '#000000',
    score: 0
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
        if (!this.owner || !this.playing) return;
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
      if (!this.owner || !this.playing) return;
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
    // this.controller.direction = direction;
  }


  ngOnInit() {

    this.setOwner()
    console.log('game room init');

    this.messages = this.gameDataService.connect()


    this.messages.subscribe({
      next: (message: any) => {
        console.log('Received message:', message);
        this.handleMessage(message);
      },
      error: (error: any) => {
        console.error('Error:', error);
      }
    })
        
    setTimeout(() => {
      this.subscriptionID = this.gameDataService.subscribe(`/default/messages/${this.room.id}`)
      
        
      this.drawCanvas();
    }, 1000);

  }

  private handleMessage(message: any) {
    if (message.type === 'PLAYER_SCORE') {
      this.playerScore(message);
    }
    if (message.player?.id === this.owner) return;
    if (message.type === 'PLAYER_MOVE') {
      message.player.x = getScaledValue(message.player.x, this.size);
      message.player.y = getScaledValue(message.player.y, this.size);
      this.players.set(message.player.id, { player: { ...message.player }, keys: message.keys, screenSize: message.screenSize });
    }
    if (message.type === 'COLLECTIBLES') {

      message.event.collectibles.forEach((collectible: any) => {
        collectible.x = ((collectible.x / message.event.size) * this.size);
        collectible.y = ((collectible.y / message.event.size) * this.size);
      });
      this.collectibles = message.event.collectibles;
    }
  }


  async setOwner() {
    this.owner = (await this.authService.getCurrentUser()).userId;
    if (this.room.currentPlayers.includes(this.owner)) {
      const kitty = await this.userService.getUser();
      this.player = { ...this.player, color: kitty?.color || '#000000', id: this.owner };
      this.playing = true;
      console.log('kitty', kitty)
    } else {
      this.playing = false;
    }
  }

  playerScore(message: any) {
    console.log('PlayerScore', message)

    const player = this.players.get(message.player.id);
    if (player) {
      player.player.score = message.player.score + 1;
    } else {
      this.players.set(message.player.id, { player: { ...message.player }, keys: message.keys, screenSize: message.screenSize });
    }
  }

  ngOnChanges() {

    console.log('game room changes', this.size);
    if (this.size > 0 && !this.isModalOpen) {
      this.drawCanvas();
      this.player.size = getScaledValue(50, this.size);
      this.player.speed = getScaledValue(5, this.size);
      this.COLLECTIBLE_RADIUS = getScaledValue(10, this.size);
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
    this.gameDataService.unsubscribe(this.subscriptionID);
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

    this.canvas = this.gameCanvas?.nativeElement;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#ebebd3';
    this.ctx.fillRect(0, 0, this.size, this.size);
    this.gameLoop();
  }


  consumeCollectible(player: any, width: number, collectibles: any[]) {
    this.gameDataService.publishEvent(`/default/messages/${this.room.id}`, {
      type: 'PLAYER_SCORE',
      player: { ...this.player, id: this.owner, },
      keys: this.keys,
      screenSize: this.size,
      collectibles
    })

    this.collectibles = collectibles;



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
    console.log('newCollectibles', collectibles)
    this.gameDataService.publishEvent(`/default/messages/${this.room.id}`, {
      type: 'COLLECTIBLES',
      event: { collectibles, size: this.size },
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
    if (this.collectibles.length < this.treatsOnFloor) {
      while (this.collectibles.length < this.treatsOnFloor) {
        spawnCollectible(this.COLLECTIBLE_RADIUS, this.obstacles, this.size, this.collectibles, this.treatsOnFloor);
      }
      this.newCollectibles(this.collectibles)
    }


    if (this.playing) {
      drawKitty(this.ctx, this.player.x, this.player.y, this.player.size, this.player.color);
    }
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

    // Draw collectibles
    const pi2 = Math.PI * 2;
    this.collectibles.forEach(collectible => {
      if (collectible.active) {
        this.ctx.beginPath();
        this.ctx.arc(collectible.x, collectible.y, this.COLLECTIBLE_RADIUS, 0, pi2);
        // this.ctx.arc(collectible.x * this.size / collectible.size, collectible.x * this.size / collectible.size, collectible.radius, 0, Math.PI * 2);
        //  console.log(collectible.x, collectible.x * this.size / collectible)
        this.ctx.fillStyle = collectible.color;
        this.ctx.fill();
        this.ctx.closePath();
      }
    });

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

}
