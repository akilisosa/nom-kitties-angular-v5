import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameHubComponent } from './game-hub.component';

describe('GameHubComponent', () => {
  let component: GameHubComponent;
  let fixture: ComponentFixture<GameHubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameHubComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
