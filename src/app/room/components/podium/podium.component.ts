import { Component, Input } from '@angular/core';
import { UserService } from '../../../shared/services/user.service';
import { CommonModule } from '@angular/common';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-podium',
  imports: [
    CommonModule,
    MatIconModule,
  ],
  standalone: true,
  templateUrl: './podium.component.html',
  styleUrl: './podium.component.css'
})
export class PodiumComponent {

  @Input() podium: any[] = [];
  @Input() room: any = {};
  @Input() playersScore: any = {};

  winners: any[] = [];

  constructor (private userService: UserService,
      private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) {
    this.matIconRegistry.addSvgIcon(
      'kitty',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/svg/kitty.svg')
    );
  }

  ngOnInit() {
    this.getWinners(this.room.winners)
  }

  async getWinners(winners: string[]) {
    for(let i = 0; i < winners.length; i++) {
     const user =  await this.userService.getUserByOwnerID(winners[i]);
        this.winners.push(user);
      }

      console.log(this.winners)
    }
  





  

}
