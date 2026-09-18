import { Component, inject } from '@angular/core';

import { DatePipe, DecimalPipe } from '@angular/common';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkoutService } from '../../core/services/workout';

@Component({
  selector: 'app-workout-history-detail',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './workout-history-detail.html',
  styleUrl: './workout-history-detail.scss',
})
export class WorkoutHistoryDetail {
  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  readonly workoutService = inject(WorkoutService);

  readonly sessionId = this.route.snapshot.paramMap.get('sessionId');

  readonly session = this.sessionId
    ? this.workoutService.getWorkoutById(this.sessionId)
    : null;

  constructor() {
    if (!this.session) {
      this.router.navigate(['/workout']);
    }
  }

  getExerciseVolume(
    sets: {
      weight: number | null;
      reps: number | null;
    }[],
  ): number {
    return sets.reduce(
      (total, set) => total + (set.weight ?? 0) * (set.reps ?? 0),
      0,
    );
  }
}
