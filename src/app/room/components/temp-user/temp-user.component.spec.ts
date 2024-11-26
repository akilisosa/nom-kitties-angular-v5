import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TempUserComponent } from './temp-user.component';

describe('TempUserComponent', () => {
  let component: TempUserComponent;
  let fixture: ComponentFixture<TempUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TempUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TempUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
