import { Component, Input, OnChanges, ChangeDetectionStrategy } from '@angular/core';
import { UserService } from '../../../shared/services/user.service';
import { CommonModule } from '@angular/common';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { Scores } from '../../net/protocol';

interface PodiumRow {
  id: string;
  name: string;
  color: string;
  score: number;
}

@Component({
  selector: 'app-podium',
  imports: [CommonModule, MatIconModule],
  standalone: true,
  templateUrl: './podium.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './podium.component.css',
})
export class PodiumComponent implements OnChanges {
  @Input() winners: string[] = [];
  @Input() scores: Scores = {};
  /** False between rounds of a match: the top score is only leading, not the winner yet. */
  @Input() final = true;

  winnerRows: PodiumRow[] = [];
  scoreRows: PodiumRow[] = [];

  private readonly users = new Map<string, Promise<PodiumRow>>();

  constructor(
    private userService: UserService,
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
  ) {
    this.matIconRegistry.addSvgIcon(
      'kitty',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/svg/kitty.svg'),
    );
  }

  async ngOnChanges() {
    const winners = this.winners ?? [];
    const scores = this.scores ?? {};
    const [winnerRows, scoreRows] = await Promise.all([
      Promise.all(winners.map((id) => this.lookup(id, scores))),
      Promise.all(Object.keys(scores).map((id) => this.lookup(id, scores))),
    ]);
    this.winnerRows = winnerRows;
    this.scoreRows = scoreRows.sort((a, b) => b.score - a.score);
  }

  private async lookup(id: string, scores: Scores): Promise<PodiumRow> {
    if (!this.users.has(id)) {
      this.users.set(
        id,
        this.userService.getUserByOwnerID(id).then((user) => ({
          id,
          name: user?.name ?? 'Kitty',
          color: user?.color ?? '#000000',
          score: 0,
        })),
      );
    }
    const row = await this.users.get(id)!;
    return { ...row, score: scores[id] ?? 0 };
  }
}
