import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkoutSession } from './workout-session';

describe('WorkoutSession', () => {
  let component: WorkoutSession;
  let fixture: ComponentFixture<WorkoutSession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutSession]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkoutSession);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
