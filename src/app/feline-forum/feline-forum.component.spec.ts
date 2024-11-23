import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FelineForumComponent } from './feline-forum.component';

describe('FelineForumComponent', () => {
  let component: FelineForumComponent;
  let fixture: ComponentFixture<FelineForumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FelineForumComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FelineForumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
