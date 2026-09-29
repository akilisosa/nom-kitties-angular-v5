import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-shop',
  imports: [MatButtonModule],
  templateUrl: './shop.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './shop.component.css',
})
export class ShopComponent {}
