import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalGameComponent } from './local-game.component';

describe('LocalGameComponent', () => {
  let component: LocalGameComponent;
  let fixture: ComponentFixture<LocalGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalGameComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
