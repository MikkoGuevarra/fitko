import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkoutHistoryDetail } from './workout-history-detail';

describe('WorkoutHistoryDetail', () => {
  let component: WorkoutHistoryDetail;
  let fixture: ComponentFixture<WorkoutHistoryDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutHistoryDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkoutHistoryDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
