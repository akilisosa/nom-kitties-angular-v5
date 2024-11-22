import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameEventService } from '../../services/game-event.service';
import { GameDataService } from '../../services/game-data.service';

@Component({
  selector: 'app-lobby',
  imports: [],
  standalone: true,
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css'
})
export class LobbyComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('gameCanvas') gameCanvas!: ElementRef;

  @Input() room: any;
  @Input() size: number = 500;
  @Input() playerList: any[] = []
  @Input() isModalOpen: boolean = false;

  
  animationFrameId:any;
  ctx: any;
  canvas: any;

  player1 = {
    x: 50,
    y: 50,
    size: 50,
    speed: 5,
    color: 'red',
  }

  player2 = {
    x: 500,
    y: 100,
    size: 50,
    width: 50,
    height: 50,
    speed: 5,
    color: 'blue',
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

  obstacles: any[] = [
    // Example obstacles - adjust positions and sizes as needed
    { x: 200, y: 200, width: 100, height: 20, color: 'gray' },  // Horizontal wall
    { x: 400, y: 100, width: 20, height: 200, color: 'gray' },  // Vertical wall
    { x: 100, y: 400, width: 200, height: 20, color: 'gray' },  // Another wall
  ];


  subscription = new Subscription();
  constructor(private gameEvents: GameEventService, private gameDataService: GameDataService) {
    this.gameLoop = this.gameLoop.bind(this);
  }

  // Add keyboard event listeners
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if(this.isModalOpen) return;
    // Check if the pressed key exists in our keys object
    if (event.key in this.keys) {
      event.preventDefault(); // Prevent default browser scrolling
      this.keys[event.key as keyof typeof this.keys] = true;
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    if(this.isModalOpen) return;
    // Check if the released key exists in our keys object
    if (event.key in this.keys) {
      event.preventDefault();
      this.keys[event.key as keyof typeof this.keys] = false;
    }
  }

  ngOnInit() {

    const messages = this.gameDataService.connect();

    this.subscription = messages.subscribe({
      next: (message) => {
        console.log('Received message:', message);
      },
      error: (error) => {
        console.error('Error:', error);
      }
    });

    setTimeout(() => {
      this.gameDataService.subscribe('/default/messages');
    }, 1000); 

    setTimeout(() => {
      this.gameDataService.publishEvent('/default/messages', {
        type: 'PLAYER_MOVE',
        playerId: 'this.playerId',
        position: 'wow' 
      });
    }, 2000);
    

  this.gameEvents.subscribeToEvents('/default/channel/')
    .subscribe({
      next: (event: any) => {
        // Handle incoming game events
        console.log('Received event:', event);
        
        // Example: Handle different event types
        switch(event.message.type) {
          case 'PLAYER_MOVE':
            this.handlePlayerMove(event.message);
            break;
          case 'COLLECT_ITEM':
            this.handleItemCollection(event.message);
            break;
          // Add other event types as needed
        }
      },
      error: (error: any) => {
        console.error('Subscription error:', error);
      }
    });

    setTimeout(() => {
      this.sendPlayerMove(100, 100);
          }, 1000);
  }

    // Example of sending a player movement event
    sendPlayerMove(x: number, y: number) {
      this.gameEvents.publishEvent('/default/channel/', {
        type: 'PLAYER_MOVE',
        playerId: 'this.playerId',
        position: { x, y }
      });
    }
  
    // Example of sending a collect item event
    sendCollectItem(itemId: string) {
      this.gameEvents.publishEvent('/default/channel/', {
        type: 'COLLECT_ITEM',
        playerId: 'this.playerId',
        itemId: itemId
      });
    }
  
    private handlePlayerMove(event: any) {
      // if (event.playerId !== this.playerId) {
      //   // Update other player's position
      //   // this.updateOtherPlayerPosition(event.position);
      // }
    }
  
    private handleItemCollection(event: any) {
      // if (event.playerId !== this.playerId) {
      //   // Update item collection state
      //   // this.removeCollectedItem(event.itemId);
      // }
    }

  ngOnChanges() {
    if (this.size > 0) {
      this.drawCanvas();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
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

  getScaledValue(originalValue: number): number {
    const scaleFactor = this.size / 600;
    return originalValue * scaleFactor;
  }

  checkObstacleCollisions(obj: any, newX: number, newY: number): boolean {
    const testObj = { x: newX, y: newY, width: obj.width, height: obj.height };
    return this.obstacles.some(obstacle => this.checkCollision(testObj, obstacle));
  }

  checkCollision(obj1: any, obj2: any): boolean {
    // const scaleFactor = this.size / 600; // Original size was 600
    return (obj1.x < obj2.x + obj2.size &&
      obj1.x + obj1.size > obj2.x &&
      obj1.y < obj2.y + obj2.size &&
      obj1.y + obj1.size > obj2.y);
  }

  gameLoop() {

    const newP1X = this.player1.x + (this.keys.d ? this.player1.speed : (this.keys.a ? -this.player1.speed : 0));
    const newP1Y = this.player1.y + (this.keys.s ? this.player1.speed : (this.keys.w ? -this.player1.speed : 0));

    const p1CollidesWithObstacle = this.checkObstacleCollisions(this.player1, newP1X, newP1Y);

    // calculate new positions

        // Update player 1 position if no collisions
        if (!this.checkCollision(
          { ...this.player1, x: newP1X, y: newP1Y },
          this.player2
        ) && !p1CollidesWithObstacle) {
          this.player1.x = Math.max(0, Math.min(newP1X, 600 - this.player1.size));
          this.player1.y = Math.max(0, Math.min(newP1Y, 600 - this.player1.size));
        }

        this.ctx.clearRect(0, 0, this.size, this.size);
        this.ctx.fillStyle = '#ebebd3';
        this.ctx.fillRect(0, 0, this.size, this.size);
    

    // const kittySize = this.getScaledValue(50);
    // const kittyX = this.getScaledValue(50);
    // const kittyY = this.getScaledValue(50);
    this.drawKitty(this.player1.x, this.player1.y, 50, '#040607');
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  drawKitty(x: number, y: number, width: number, color: string = '#040607') {
    // Scale factor to maintain proportions

    width = this.getScaledValue(width);
    x = this.getScaledValue(x);
    y = this.getScaledValue(y);


    const scale = width / 50; // SVG viewBox is 50x50

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);

    // Main body outline (cls-3)
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = 'black'; // Add stroke color
    this.ctx.lineWidth = 0.5; 

    this.ctx.beginPath();
    this.ctx.moveTo(8.6, 1.52);
    this.ctx.bezierCurveTo(11, 1.05, 14.3, 6.83, 15.71, 8.51);
    this.ctx.bezierCurveTo(21.03, 7.84, 26.45, 7.8, 31.77, 8.51);
    this.ctx.bezierCurveTo(32.78, 7.27, 33.61, 5.86, 34.65, 4.65);
    this.ctx.bezierCurveTo(38.29, 0.4, 39.08, -0.01, 42.49, 6.12);
    this.ctx.bezierCurveTo(46.73, 13.74, 50.19, 28.3, 44.21, 35.66);
    this.ctx.bezierCurveTo(42.24, 38.08, 39.32, 39.73, 36.49, 40.93);
    this.ctx.lineTo(36.49, 44.24);
    this.ctx.bezierCurveTo(38.52, 44.19, 41.78, 44.76, 43.41, 43.69);
    this.ctx.bezierCurveTo(44.77, 42.79, 44.94, 40.64, 46.96, 40.5);
    this.ctx.bezierCurveTo(51.74, 40.17, 50.93, 47.79, 42.67, 49.69);
    this.ctx.bezierCurveTo(38.39, 49.44, 13.76, 50.02, 12.27, 49.69);
    this.ctx.bezierCurveTo(10.13, 49.22, 11.49, 42.81, 11.11, 41.05);
    this.ctx.bezierCurveTo(-1.14, 36.5, -1.51, 24.72, 1.8, 13.72);
    this.ctx.bezierCurveTo(2.45, 11.53, 6.53, 1.93, 8.6, 1.52);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

}
