import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Player1Component } from './player1.component';

describe('Player1Component', () => {
  let component: Player1Component;
  let fixture: ComponentFixture<Player1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Player1Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Player1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
