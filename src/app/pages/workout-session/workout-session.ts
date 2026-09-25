import {
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';

import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import { WORKOUT_PLANS } from '../../core/models/workout-plans';

import type {
  ExerciseLog,
  ExerciseSet,
  WorkoutPlan,
  WorkoutSession as WorkoutSessionModel,
  WorkoutType,
} from '../../core/models/workout.model';

import { WorkoutService } from '../../core/services/workout';

@Component({
  selector: 'app-workout-session',
  imports: [
    FormsModule,
    RouterLink,
    DecimalPipe,
  ],
  templateUrl: './workout-session.html',
  styleUrl: './workout-session.scss',
})
export class WorkoutSession implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly workoutService = inject(WorkoutService);

  readonly workout = signal<WorkoutPlan | null>(null);
  readonly exerciseLogs = signal<ExerciseLog[]>([]);

  private startedAt = Date.now();

  // ========================================
  // REST TIMER
  // ========================================

  readonly restSecondsRemaining = signal(0);
  readonly restTimerActive = signal(false);
  readonly restExerciseName = signal('');
  readonly restComplete = signal(false);

  private restEndsAt: number | null = null;

  private restTimerInterval:
    ReturnType<typeof setInterval> | null = null;

  private restCompleteTimeout:
    ReturnType<typeof setTimeout> | null = null;

  // ========================================
  // WORKOUT TIMER
  // ========================================

  readonly workoutElapsedSeconds = signal(0);

  private workoutTimerInterval:
    ReturnType<typeof setInterval> | null = null;

  // ========================================
  // VISIBILITY CHANGE
  // ========================================

  private readonly visibilityChangeHandler = (): void => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    // Safari/iPhone may suspend timers in background.
    // Recalculate from real timestamps when returning.
    this.updateWorkoutTimer();

    if (this.restTimerActive()) {
      this.updateRestTimer();
    }
  };

  // ========================================
  // SESSION STATS
  // ========================================

  readonly completedSets = computed(() =>
    this.exerciseLogs()
      .flatMap((exercise) => exercise.sets)
      .filter((set) => set.completed)
      .length
  );

  readonly totalSets = computed(() =>
    this.exerciseLogs().reduce(
      (total, exercise) => total + exercise.sets.length,
      0
    )
  );

  readonly progress = computed(() => {
    const total = this.totalSets();

    if (!total) {
      return 0;
    }

    return (this.completedSets() / total) * 100;
  });

  readonly totalVolume = computed(() =>
    this.exerciseLogs()
      .flatMap((exercise) => exercise.sets)
      .filter((set) => set.completed)
      .reduce(
        (total, set) =>
          total +
          (set.weight ?? 0) *
            (set.reps ?? 0),
        0
      )
  );

  // ========================================
  // CONSTRUCTOR
  // ========================================

  constructor() {
    const workoutId =
      this.route.snapshot.paramMap.get('id') as WorkoutType;

    const workout = WORKOUT_PLANS.find(
      (item) => item.id === workoutId
    );

    if (!workout) {
      this.router.navigate(['/workout']);
      return;
    }

    this.workout.set(workout);

    const draft =
      this.workoutService.getDraft();

    // Protect active workout
    if (
      draft &&
      draft.workoutType !== workout.id
    ) {
      this.router.navigate(['/workout']);
      return;
    }

    // Resume existing workout
    if (
      draft &&
      draft.workoutType === workout.id
    ) {
      this.exerciseLogs.set(
        draft.exercises
      );

      this.startedAt =
        draft.startedAt;
    } else {
      // Start new workout
      this.startedAt = Date.now();

      const logs: ExerciseLog[] =
        workout.exercises.map((exercise) => {
          const previous =
            this.workoutService.getLastExercise(
              exercise.id
            );

          const suggestion =
            this.workoutService.getProgressiveOverloadSuggestion(
              exercise.id,
              exercise.sets,
              exercise.minReps,
              exercise.maxReps
            );

          const weightIncreaseUnlocked =
            suggestion?.message.includes(
              'Weight increase unlocked'
            ) ?? false;

          return {
            exerciseId: exercise.id,
            exerciseName: exercise.name,

            sets: Array.from(
              { length: exercise.sets },
              (_, index) => {
                const previousSet =
                  previous?.sets[index];

                // Progressive overload unlocked
                if (
                  weightIncreaseUnlocked &&
                  suggestion
                ) {
                  return {
                    setNumber: index + 1,
                    weight: suggestion.weight,
                    reps: null,
                    completed: false,
                  };
                }

                // Normal progression:
                // previous weight, reps empty
                return {
                  setNumber: index + 1,
                  weight:
                    previousSet?.weight ?? null,
                  reps: null,
                  completed: false,
                };
              }
            ),
          };
        });

      this.exerciseLogs.set(logs);

      this.workoutService.saveDraft(
        workout.id,
        logs,
        this.startedAt
      );
    }

    this.startWorkoutTimer();

    document.addEventListener(
      'visibilitychange',
      this.visibilityChangeHandler
    );
  }

  // ========================================
  // LIVE REP PROGRESS
  // ========================================

  getRepProgress(
    exerciseIndex: number,
    exerciseId: string
  ): number | null {
    const previous =
      this.workoutService.getLastExercise(
        exerciseId
      );

    if (!previous) {
      return null;
    }

    const currentExercise =
      this.exerciseLogs()[exerciseIndex];

    if (!currentExercise) {
      return null;
    }

    const currentSets =
      currentExercise.sets.filter(
        (set) =>
          set.completed &&
          set.weight !== null &&
          set.reps !== null &&
          set.weight > 0 &&
          set.reps > 0
      );

    if (!currentSets.length) {
      return null;
    }

    const currentWeight =
      currentSets[0].weight!;

    const sameCurrentWeight =
      currentSets.every(
        (set) =>
          set.weight === currentWeight
      );

    if (!sameCurrentWeight) {
      return null;
    }

    const previousSets =
      previous.sets.filter(
        (set) =>
          set.weight === currentWeight &&
          set.reps !== null &&
          set.reps > 0
      );

    if (!previousSets.length) {
      return null;
    }

    const setsToCompare =
      Math.min(
        currentSets.length,
        previousSets.length
      );

    const currentReps =
      currentSets
        .slice(0, setsToCompare)
        .reduce(
          (total, set) =>
            total + set.reps!,
          0
        );

    const previousReps =
      previousSets
        .slice(0, setsToCompare)
        .reduce(
          (total, set) =>
            total + set.reps!,
          0
        );

    return currentReps - previousReps;
  }

  // ========================================
  // SETS
  // ========================================

  toggleSet(
    exerciseIndex: number,
    setIndex: number
  ): void {
    const workout = this.workout();

    if (!workout) {
      return;
    }

    const exercise =
      workout.exercises[exerciseIndex];

    const set =
      this.exerciseLogs()[
        exerciseIndex
      ].sets[setIndex];

    // Don't complete invalid set
    if (
      !set.completed &&
      (
        set.weight === null ||
        set.reps === null ||
        set.weight <= 0 ||
        set.reps <= 0
      )
    ) {
      return;
    }

    const willComplete =
      !set.completed;

    this.updateSet(
      exerciseIndex,
      setIndex,
      {
        completed: willComplete,
      }
    );

    // Start rest timer after completing set
    if (willComplete) {
      this.startRestTimer(
        exercise.restSeconds,
        exercise.name
      );
    }
  }

  updateWeight(
    exerciseIndex: number,
    setIndex: number,
    value: number | null
  ): void {
    this.updateSet(
      exerciseIndex,
      setIndex,
      {
        weight: value,
      }
    );
  }

  updateReps(
    exerciseIndex: number,
    setIndex: number,
    value: number | null
  ): void {
    this.updateSet(
      exerciseIndex,
      setIndex,
      {
        reps: value,
      }
    );
  }

  private updateSet(
    exerciseIndex: number,
    setIndex: number,
    changes: Partial<ExerciseSet>
  ): void {
    this.exerciseLogs.update((logs) =>
      logs.map(
        (exercise, eIndex) => {
          if (
            eIndex !== exerciseIndex
          ) {
            return exercise;
          }

          return {
            ...exercise,

            sets: exercise.sets.map(
              (set, sIndex) =>
                sIndex === setIndex
                  ? {
                      ...set,
                      ...changes,
                    }
                  : set
            ),
          };
        }
      )
    );

    // Auto-save draft
    const workout = this.workout();

    if (!workout) {
      return;
    }

    this.workoutService.saveDraft(
      workout.id,
      this.exerciseLogs(),
      this.startedAt
    );
  }

  // ========================================
  // LAST SESSION
  // ========================================

  getLastExercise(
    exerciseId: string
  ): ExerciseLog | null {
    return this.workoutService
      .getLastExercise(exerciseId);
  }

  // ========================================
  // FINISH WORKOUT
  // ========================================

  finishWorkout(): void {
    const workout = this.workout();

    if (!workout) {
      return;
    }

    const completed =
      this.completedSets();

    const total =
      this.totalSets();

    if (completed === 0) {
      return;
    }

    if (completed < total) {
      const remaining =
        total - completed;

      const confirmed =
        window.confirm(
          `You still have ${remaining} ${
            remaining === 1
              ? 'set'
              : 'sets'
          } remaining.\n\nFinish workout anyway?`
        );

      if (!confirmed) {
        return;
      }
    }

    const exercises =
      this.exerciseLogs()
        .map((exercise) => ({
          ...exercise,

          sets: exercise.sets.filter(
            (set) => set.completed
          ),
        }))
        .filter(
          (exercise) =>
            exercise.sets.length > 0
        );

    if (!exercises.length) {
      return;
    }

    // Real elapsed workout duration
    const durationMinutes =
      Math.max(
        1,
        Math.round(
          (
            Date.now() -
            this.startedAt
          ) / 60000
        )
      );

    const session:
      WorkoutSessionModel = {
        id: crypto.randomUUID(),

        workoutType: workout.id,

        workoutName: workout.name,

        date:
          new Date().toISOString(),

        durationMinutes,

        exercises,

        totalVolume:
          this.totalVolume(),
      };

    this.workoutService.saveWorkout(
      session
    );

    this.workoutService.clearDraft();

    this.stopRestTimer();
    this.stopWorkoutTimer();

    this.router.navigate([
      '/workout/summary',
      session.id,
    ]);
  }

  // ========================================
  // WEIGHT PR
  // ========================================

  getExercisePR(
    exerciseId: string
  ): number | null {
    return this.workoutService
      .getExercisePR(exerciseId);
  }

  isNewPR(
    exerciseId: string,
    weight: number | null
  ): boolean {
    if (
      weight === null ||
      weight <= 0
    ) {
      return false;
    }

    const previousPR =
      this.workoutService
        .getExercisePR(exerciseId);

    if (previousPR === null) {
      return false;
    }

    return weight > previousPR;
  }

  // ========================================
  // REST TIMER
  // ========================================

  startRestTimer(
    seconds: number,
    exerciseName: string
  ): void {
    // Stop previous timer
    this.stopRestTimer();

    // Clear previous completion state
    this.restComplete.set(false);

    if (this.restCompleteTimeout) {
      clearTimeout(
        this.restCompleteTimeout
      );

      this.restCompleteTimeout = null;
    }

    /*
     * Source of truth:
     * real timestamp when rest finishes.
     */
    this.restEndsAt =
      Date.now() +
      seconds * 1000;

    this.restExerciseName.set(
      exerciseName
    );

    this.restSecondsRemaining.set(
      seconds
    );

    this.restTimerActive.set(true);

    /*
     * Interval only refreshes the UI.
     * It does NOT determine elapsed time.
     */
    this.restTimerInterval =
      setInterval(() => {
        this.updateRestTimer();
      }, 250);
  }

  private updateRestTimer(): void {
    if (
      !this.restTimerActive() ||
      this.restEndsAt === null
    ) {
      return;
    }

    const millisecondsRemaining =
      this.restEndsAt -
      Date.now();

    const secondsRemaining =
      Math.max(
        0,
        Math.ceil(
          millisecondsRemaining / 1000
        )
      );

    this.restSecondsRemaining.set(
      secondsRemaining
    );

    if (
      millisecondsRemaining <= 0
    ) {
      this.completeRestTimer();
    }
  }

  private completeRestTimer(): void {
    if (!this.restTimerActive()) {
      return;
    }

    this.restSecondsRemaining.set(0);

    this.stopRestTimer();

    this.restCompleteFeedback();

    this.restComplete.set(true);

    if (this.restCompleteTimeout) {
      clearTimeout(
        this.restCompleteTimeout
      );
    }

    this.restCompleteTimeout =
      setTimeout(() => {
        this.restComplete.set(false);

        this.restCompleteTimeout =
          null;
      }, 2000);
  }

  addRestTime(
    seconds = 30
  ): void {
    if (
      !this.restTimerActive() ||
      this.restEndsAt === null
    ) {
      return;
    }

    /*
     * Add time to the REAL end timestamp.
     */
    this.restEndsAt +=
      seconds * 1000;

    this.updateRestTimer();
  }

  skipRestTimer(): void {
    this.stopRestTimer();

    this.restSecondsRemaining.set(0);
  }

  formatRestTime(
    seconds: number
  ): string {
    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  private stopRestTimer(): void {
    if (this.restTimerInterval) {
      clearInterval(
        this.restTimerInterval
      );

      this.restTimerInterval = null;
    }

    this.restTimerActive.set(false);

    this.restEndsAt = null;
  }

  // ========================================
  // REST COMPLETE FEEDBACK
  // ========================================

  private restCompleteFeedback(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate([
        200,
        100,
        200,
      ]);
    }

    this.playRestBeep();
  }

  private playRestBeep(): void {
    try {
      const audioContext =
        new AudioContext();

      const oscillator =
        audioContext
          .createOscillator();

      const gain =
        audioContext
          .createGain();

      oscillator.connect(gain);

      gain.connect(
        audioContext.destination
      );

      oscillator.type = 'sine';

      oscillator.frequency
        .setValueAtTime(
          880,
          audioContext.currentTime
        );

      gain.gain
        .setValueAtTime(
          0.15,
          audioContext.currentTime
        );

      gain.gain
        .exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime +
            0.35
        );

      oscillator.start();

      oscillator.stop(
        audioContext.currentTime +
          0.35
      );

      oscillator.addEventListener(
        'ended',
        () => {
          void audioContext.close();
        }
      );
    } catch (error) {
      console.warn(
        'Rest timer sound unavailable',
        error
      );
    }
  }

  // ========================================
  // WORKOUT TIMER
  // ========================================

  private startWorkoutTimer(): void {
    this.stopWorkoutTimer();

    this.updateWorkoutTimer();

    /*
     * Interval only refreshes UI.
     * Real time comes from startedAt.
     */
    this.workoutTimerInterval =
      setInterval(() => {
        this.updateWorkoutTimer();
      }, 1000);
  }

  private updateWorkoutTimer(): void {
    const elapsed =
      Math.floor(
        (
          Date.now() -
          this.startedAt
        ) / 1000
      );

    this.workoutElapsedSeconds.set(
      Math.max(0, elapsed)
    );
  }

  formatWorkoutTime(
    seconds: number
  ): string {
    const hours =
      Math.floor(
        seconds / 3600
      );

    const minutes =
      Math.floor(
        (seconds % 3600) / 60
      );

    const remainingSeconds =
      seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes
        .toString()
        .padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  private stopWorkoutTimer(): void {
    if (!this.workoutTimerInterval) {
      return;
    }

    clearInterval(
      this.workoutTimerInterval
    );

    this.workoutTimerInterval = null;
  }

  // ========================================
  // ESTIMATED 1RM
  // ========================================

  getExerciseEstimated1RM(
    exerciseId: string
  ): number | null {
    return this.workoutService
      .getExerciseEstimated1RM(
        exerciseId
      );
  }

  getSetEstimated1RM(
    weight: number | null,
    reps: number | null
  ): number | null {
    if (
      weight === null ||
      reps === null ||
      weight <= 0 ||
      reps <= 0 ||
      reps > 12
    ) {
      return null;
    }

    return this.workoutService
      .calculateEstimated1RM(
        weight,
        reps
      );
  }

  isNewEstimated1RMPR(
    exerciseId: string,
    weight: number | null,
    reps: number | null
  ): boolean {
    const estimated =
      this.getSetEstimated1RM(
        weight,
        reps
      );

    if (estimated === null) {
      return false;
    }

    const previousBest =
      this.workoutService
        .getExerciseEstimated1RM(
          exerciseId
        );

    if (previousBest === null) {
      return false;
    }

    return estimated > previousBest;
  }

  // ========================================
  // PROGRESSIVE OVERLOAD
  // ========================================

  getProgressiveSuggestion(
    exerciseId: string,
    expectedSets: number,
    minReps: number,
    maxReps: number
  ) {
    return this.workoutService
      .getProgressiveOverloadSuggestion(
        exerciseId,
        expectedSets,
        minReps,
        maxReps
      );
  }

  // ========================================
  // DESTROY
  // ========================================

  ngOnDestroy(): void {
    document.removeEventListener(
      'visibilitychange',
      this.visibilityChangeHandler
    );

    this.stopRestTimer();

    this.stopWorkoutTimer();

    if (this.restCompleteTimeout) {
      clearTimeout(
        this.restCompleteTimeout
      );

      this.restCompleteTimeout = null;
    }
  }
}