import { Component, computed, inject, signal } from '@angular/core';

import { DatePipe, DecimalPipe } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { FitnessService } from '../../core/services/fitness';
import { RunningService } from '../../core/services/running';
import { WorkoutService } from '../../core/services/workout';

@Component({
  selector: 'app-progress',
  imports: [FormsModule, DatePipe, DecimalPipe],
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
})
export class Progress {
  readonly fitness = inject(FitnessService);

  readonly workoutService = inject(WorkoutService);

  readonly runningService = inject(RunningService);

  readonly showAddWeight = signal(false);

  newWeight: number | null = null;

  readonly selectedExerciseId = signal<string | null>(null);

  readonly trackedExercises = computed(() =>
    this.workoutService.getTrackedExercises(),
  );
  /*
   * Weight entries ordered from oldest
   * to newest for the chart.
   */
  readonly chartEntries = computed(() =>
    [...this.fitness.weightEntries()].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    ),
  );

  /*
   * SVG chart points.
   *
   * ViewBox:
   * width  = 320
   * height = 140
   */
  readonly chartPoints = computed(() => {
    const entries = this.chartEntries();

    if (!entries.length) {
      return '';
    }

    if (entries.length === 1) {
      return '160,70';
    }

    const weights = entries.map((entry) => entry.weight);

    const minWeight = Math.min(...weights);

    const maxWeight = Math.max(...weights);

    const range = Math.max(1, maxWeight - minWeight);

    const width = 300;

    const height = 100;

    const startX = 10;

    const startY = 20;

    return entries
      .map((entry, index) => {
        const x = startX + (index / (entries.length - 1)) * width;

        const normalized = (entry.weight - minWeight) / range;

        const y = startY + height - normalized * height;

        return `${x},${y}`;
      })
      .join(' ');
  });

  openAddWeight(): void {
    this.newWeight = this.fitness.currentWeight();

    this.showAddWeight.set(true);
  }

  closeAddWeight(): void {
    this.showAddWeight.set(false);

    this.newWeight = null;
  }

  saveWeight(): void {
    if (this.newWeight === null || this.newWeight <= 0) {
      return;
    }

    this.fitness.addWeight(this.newWeight);

    this.closeAddWeight();
  }

  deleteWeight(id: string): void {
    this.fitness.deleteWeight(id);
  }

  readonly selectedExercise = computed(() => {
    const exercises = this.trackedExercises();

    if (!exercises.length) {
      return null;
    }

    const selectedId = this.selectedExerciseId();

    if (selectedId) {
      return (
        exercises.find((exercise) => exercise.id === selectedId) ?? exercises[0]
      );
    }

    return exercises[0];
  });

  readonly strengthChartData = computed(() => {
    const exercise = this.selectedExercise();

    if (!exercise) {
      return [];
    }

    return this.workoutService.getExerciseStrengthProgress(exercise.id);
  });

  readonly currentEstimated1RM = computed(() => {
    const data = this.strengthChartData();

    if (!data.length) {
      return null;
    }

    return data[data.length - 1].estimated1RM;
  });

  readonly bestEstimated1RM = computed(() => {
    const data = this.strengthChartData();

    if (!data.length) {
      return null;
    }

    return Math.max(...data.map((point) => point.estimated1RM));
  });

  readonly estimated1RMImprovement = computed(() => {
    const data = this.strengthChartData();

    if (data.length < 2) {
      return 0;
    }

    return data[data.length - 1].estimated1RM - data[0].estimated1RM;
  });

  readonly strengthChartPoints = computed(() => {
    const data = this.strengthChartData();

    if (!data.length) {
      return '';
    }

    if (data.length === 1) {
      return '20,70';
    }

    const values = data.map((point) => point.estimated1RM);

    const minValue = Math.min(...values);

    const maxValue = Math.max(...values);

    const range = Math.max(1, maxValue - minValue);

    const width = 300;
    const height = 90;

    const startX = 10;
    const startY = 15;

    return data
      .map((point, index) => {
        const x = startX + (index / (data.length - 1)) * width;

        const normalized = (point.estimated1RM - minValue) / range;

        const y = startY + height - normalized * height;

        return `${x},${y}`;
      })
      .join(' ');
  });

  selectExercise(exerciseId: string): void {
    this.selectedExerciseId.set(exerciseId);
  }

  readonly runningChartData = computed(() =>
    this.runningService.getRunningProgress()
);


readonly runningChartPoints = computed(() => {

    const data = this.runningChartData();

    if (!data.length) {
        return '';
    }

    if (data.length === 1) {
        return '20,70';
    }


    const paces =
        data.map(
            point => point.averagePace
        );


    const minPace =
        Math.min(...paces);

    const maxPace =
        Math.max(...paces);

    const range =
        Math.max(
            0.1,
            maxPace - minPace
        );


    const width = 300;
    const height = 100;

    const startX = 10;
    const startY = 20;


    return data
        .map((point, index) => {

            const x =
                startX +
                (
                    index /
                    (data.length - 1)
                ) *
                width;


            /*
             * Pace is reversed:
             * lower pace = faster = higher on chart.
             */

            const normalized =
                (
                    point.averagePace -
                    minPace
                ) /
                range;


            const y =
                startY +
                normalized *
                height;


            return `${x},${y}`;

        })
        .join(' ');
});

formatPaceDifference(
    pace: number
): string {

    const totalSeconds =
        Math.round(
            Math.abs(pace) * 60
        );

    const minutes =
        Math.floor(
            totalSeconds / 60
        );

    const seconds =
        totalSeconds % 60;


    return `${minutes}:${seconds
        .toString()
        .padStart(2, '0')}`;
}
}
