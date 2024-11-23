import { Component, ElementRef, EventEmitter, HostListener, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-joystick',
  templateUrl: './joystick.component.html',
  styleUrls: ['./joystick.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class JoystickComponent {
  @Output() directionChange = new EventEmitter<any>();
  @ViewChild('joystick') joystick!: ElementRef<HTMLDivElement>;
  @ViewChild('joystickHandle') joystickHandle!: ElementRef<HTMLDivElement>;

  private startX = 0;
  private startY = 0;
  private isDragging = false;
  private lastEmittedDirection: { w: boolean, s: boolean, a: boolean, d: boolean } = { w: false, s: false, a: false, d: false };

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.isDragging = true;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;

    const angle = Math.atan2(deltaY, deltaX);
    const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), 50); // Limit the distance

    const handle = this.joystickHandle.nativeElement;
    handle.style.transform = `translate(${distance * Math.cos(angle)}px, ${distance * Math.sin(angle)}px)`;

    this.updateDirection(angle);
  }

  @HostListener('touchend')
  onTouchEnd() {
    this.isDragging = false;
    const handle = this.joystickHandle.nativeElement;
    handle.style.transform = 'translate(0, 0)';
    this.directionChange.emit({ w: false, s: false, a: false, d: false });
    this.lastEmittedDirection = { w: false, s: false, a: false, d: false };
  }


  private readonly TOLERANCE = Math.PI / 8; // Made constant
  private readonly DIRECTIONS = [ // Pre-defined directions array
    { angle: 0, keys: { w: false, s: false, a: false, d: true } },
    { angle: Math.PI / 4, keys: { w: false, s: true, a: false, d: true } },
    { angle: Math.PI / 2, keys: { w: false, s: true, a: false, d: false } },
    { angle: (3 * Math.PI) / 4, keys: { w: false, s: true, a: true, d: false } },
    { angle: Math.PI, keys: { w: false, s: false, a: true, d: false } },
    { angle: (-3 * Math.PI) / 4, keys: { w: true, s: false, a: true, d: false } },
    { angle: -Math.PI / 2, keys: { w: true, s: false, a: false, d: false } },
    { angle: -Math.PI / 4, keys: { w: false, s: false, a: false, d: true } }
  ] as const;

  private updateDirection(angle: number): void {
    // Find the closest direction
    const matchedDirection = this.DIRECTIONS.find(dir =>
      angle >= dir.angle - this.TOLERANCE && angle < dir.angle + this.TOLERANCE
    );

    if (matchedDirection) {
      const hasChanged = Object.entries(matchedDirection.keys).some(
        ([key, value]) => this.lastEmittedDirection[key as keyof typeof matchedDirection.keys] !== value
      );

      if (hasChanged) {
        this.directionChange.emit(matchedDirection.keys);
        this.lastEmittedDirection = matchedDirection.keys;
      }
    }
  }
}