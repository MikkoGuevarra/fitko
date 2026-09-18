import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkoutSummary } from './workout-summary';

describe('WorkoutSummary', () => {
  let component: WorkoutSummary;
  let fixture: ComponentFixture<WorkoutSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkoutSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
