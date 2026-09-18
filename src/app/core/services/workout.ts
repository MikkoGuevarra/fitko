import { computed, Injectable, signal } from '@angular/core';

import {
  ExerciseLog,
  StrengthProgressPoint,
  WorkoutDraft,
  WorkoutPlan,
  WorkoutSession,
  WorkoutType,
} from '../models/workout.model';
import { WORKOUT_PLANS } from '../models/workout-plans';

@Injectable({
  providedIn: 'root',
})
export class WorkoutService {
  private readonly STORAGE_KEY = 'mikko-fit-workouts';

  readonly sessions = signal<WorkoutSession[]>(this.loadSessions());

  readonly totalWorkouts = computed(() => this.sessions().length);

  readonly totalVolume = computed(() =>
    this.sessions().reduce((total, session) => total + session.totalVolume, 0),
  );

  readonly totalMinutes = computed(() =>
    this.sessions().reduce(
      (total, session) => total + session.durationMinutes,
      0,
    ),
  );

  saveWorkout(session: WorkoutSession): void {
    this.sessions.update((sessions) => [session, ...sessions]);

    this.saveSessions();
  }

  getLastExercise(exerciseId: string): ExerciseLog | null {
    for (const session of this.sessions()) {
      const exercise = session.exercises.find(
        (item) => item.exerciseId === exerciseId,
      );

      if (exercise) {
        return exercise;
      }
    }

    return null;
  }

  deleteWorkout(id: string): void {
    this.sessions.update((sessions) =>
      sessions.filter((session) => session.id !== id),
    );

    this.saveSessions();
  }

  private loadSessions(): WorkoutSession[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);

    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private saveSessions(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sessions()));
  }

  readonly workoutsThisWeek = computed(() => {
    const now = new Date();

    const startOfWeek = new Date(now);

    const day = now.getDay();

    const daysFromMonday = day === 0 ? 6 : day - 1;

    startOfWeek.setDate(now.getDate() - daysFromMonday);

    startOfWeek.setHours(0, 0, 0, 0);

    return this.sessions().filter((session) => {
      const sessionDate = new Date(session.date);

      return sessionDate >= startOfWeek;
    }).length;
  });

  getWorkoutById(id: string): WorkoutSession | null {
    return this.sessions().find((session) => session.id === id) ?? null;
  }

  getExercisePR(exerciseId: string): number | null {
    let maxWeight: number | null = null;

    for (const session of this.sessions()) {
      const exercise = session.exercises.find(
        (item) => item.exerciseId === exerciseId,
      );

      if (!exercise) {
        continue;
      }

      for (const set of exercise.sets) {
        if (set.weight === null) {
          continue;
        }

        if (maxWeight === null || set.weight > maxWeight) {
          maxWeight = set.weight;
        }
      }
    }

    return maxWeight;
  }

  getStrengthProgress(): {
    exerciseId: string;
    exerciseName: string;
    firstWeight: number;
    currentPR: number;
    improvement: number;
  }[] {
    const exercises = new Map<
      string,
      {
        exerciseId: string;
        exerciseName: string;
        weights: {
          weight: number;
          date: string;
        }[];
      }
    >();

    /*
     * sessions() è salvato newest-first.
     * Non importa perché dopo ordiniamo per data.
     */
    for (const session of this.sessions()) {
      for (const exercise of session.exercises) {
        if (!exercises.has(exercise.exerciseId)) {
          exercises.set(exercise.exerciseId, {
            exerciseId: exercise.exerciseId,

            exerciseName: exercise.exerciseName,

            weights: [],
          });
        }

        const item = exercises.get(exercise.exerciseId)!;

        for (const set of exercise.sets) {
          if (set.weight === null || set.weight <= 0) {
            continue;
          }

          item.weights.push({
            weight: set.weight,
            date: session.date,
          });
        }
      }
    }

    return Array.from(exercises.values())

      .filter((exercise) => exercise.weights.length > 0)

      .map((exercise) => {
        const weights = [...exercise.weights].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        const firstWeight = weights[0].weight;

        const currentPR = Math.max(...weights.map((item) => item.weight));

        return {
          exerciseId: exercise.exerciseId,

          exerciseName: exercise.exerciseName,

          firstWeight,

          currentPR,

          improvement: currentPR - firstWeight,
        };
      })

      .sort((a, b) => b.improvement - a.improvement);
  }

  private readonly DRAFT_STORAGE_KEY = 'mikko-fit-workout-draft';

  saveDraft(
    workoutType: WorkoutType,
    exercises: ExerciseLog[],
    startedAt: number,
  ): void {
    const draft = {
      workoutType,
      exercises,
      startedAt,
    };

    localStorage.setItem(this.DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }

  getDraft(): WorkoutDraft | null {
    const stored = localStorage.getItem(this.DRAFT_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as WorkoutDraft;
    } catch {
      return null;
    }
  }
  clearDraft(): void {
    localStorage.removeItem(this.DRAFT_STORAGE_KEY);
  }

  getDraftCompletedSets(): number {
    const draft = this.getDraft();

    if (!draft) {
      return 0;
    }

    return draft.exercises
      .flatMap((exercise) => exercise.sets)
      .filter((set) => set.completed).length;
  }

  getDraftTotalSets(): number {
    const draft = this.getDraft();

    if (!draft) {
      return 0;
    }

    return draft.exercises.reduce(
      (total, exercise) => total + exercise.sets.length,
      0,
    );
  }

  readonly nextWorkout = computed<WorkoutPlan>(() => {
    const sessions = this.sessions();

    /*
     * No workout completed yet:
     * start with Upper A.
     */
    if (!sessions.length) {
      return WORKOUT_PLANS[0];
    }

    /*
     * Sessions are stored newest first.
     */
    const lastWorkout = sessions[0];

    const currentIndex = WORKOUT_PLANS.findIndex(
      (workout) => workout.id === lastWorkout.workoutType,
    );

    /*
     * Fallback.
     */
    if (currentIndex === -1) {
      return WORKOUT_PLANS[0];
    }

    const nextIndex = (currentIndex + 1) % WORKOUT_PLANS.length;

    return WORKOUT_PLANS[nextIndex];
  });

  getDraftWorkout(): WorkoutPlan | null {
    const draft = this.getDraft();

    if (!draft) {
      return null;
    }

    return (
      WORKOUT_PLANS.find((workout) => workout.id === draft.workoutType) ?? null
    );
  }

  getSessionPRs(sessionId: string): {
    exerciseId: string;
    exerciseName: string;
    weight: number;
  }[] {
    const session = this.getWorkoutById(sessionId);

    if (!session) {
      return [];
    }

    const results: {
      exerciseId: string;
      exerciseName: string;
      weight: number;
    }[] = [];

    for (const exercise of session.exercises) {
      const sessionWeights = exercise.sets
        .map((set) => set.weight)
        .filter((weight): weight is number => weight !== null && weight > 0);

      if (!sessionWeights.length) {
        continue;
      }

      const sessionMax = Math.max(...sessionWeights);

      /*
       * Find the best weight BEFORE
       * this session.
       */
      let previousPR: number | null = null;

      for (const previousSession of this.sessions()) {
        if (previousSession.id === sessionId) {
          continue;
        }

        /*
         * Only sessions before this one.
         */
        if (
          new Date(previousSession.date).getTime() >=
          new Date(session.date).getTime()
        ) {
          continue;
        }

        const previousExercise = previousSession.exercises.find(
          (item) => item.exerciseId === exercise.exerciseId,
        );

        if (!previousExercise) {
          continue;
        }

        for (const set of previousExercise.sets) {
          if (set.weight === null || set.weight <= 0) {
            continue;
          }

          if (previousPR === null || set.weight > previousPR) {
            previousPR = set.weight;
          }
        }
      }

      /*
       * First-ever logged weight also
       * counts as establishing a PR.
       */
      if (previousPR === null || sessionMax > previousPR) {
        results.push({
          exerciseId: exercise.exerciseId,

          exerciseName: exercise.exerciseName,

          weight: sessionMax,
        });
      }
    }

    return results;
  }

  calculateEstimated1RM(weight: number, reps: number): number {
    if (weight <= 0 || reps <= 0) {
      return 0;
    }

    if (reps === 1) {
      return weight;
    }

    return weight * (1 + reps / 30);
  }

  getExerciseEstimated1RM(exerciseId: string): number | null {
    let best1RM: number | null = null;

    for (const session of this.sessions()) {
      const exercise = session.exercises.find(
        (item) => item.exerciseId === exerciseId,
      );

      if (!exercise) {
        continue;
      }

      for (const set of exercise.sets) {
        if (
          set.weight === null ||
          set.reps === null ||
          set.weight <= 0 ||
          set.reps <= 0 ||
          set.reps > 12
        ) {
          continue;
        }

        const estimated = this.calculateEstimated1RM(set.weight, set.reps);

        if (best1RM === null || estimated > best1RM) {
          best1RM = estimated;
        }
      }
    }

    return best1RM;
  }

  getExerciseStrengthProgress(exerciseId: string): StrengthProgressPoint[] {
    const points: StrengthProgressPoint[] = [];

    for (const session of this.sessions()) {
      const exercise = session.exercises.find(
        (item) => item.exerciseId === exerciseId,
      );

      if (!exercise) {
        continue;
      }

      let bestSet: StrengthProgressPoint | null = null;

      for (const set of exercise.sets) {
        if (
          set.weight === null ||
          set.reps === null ||
          set.weight <= 0 ||
          set.reps <= 0 ||
          set.reps > 12
        ) {
          continue;
        }

        const estimated1RM = this.calculateEstimated1RM(set.weight, set.reps);

        if (bestSet === null || estimated1RM > bestSet.estimated1RM) {
          bestSet = {
            date: session.date,
            weight: set.weight,
            reps: set.reps,
            estimated1RM,
          };
        }
      }

      if (bestSet) {
        points.push(bestSet);
      }
    }

    /*
     * Oldest -> newest.
     * Useful directly for charts.
     */
    return points.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  getTrackedExercises(): {
    id: string;
    name: string;
  }[] {
    const exercises = new Map<string, string>();

    for (const session of this.sessions()) {
      for (const exercise of session.exercises) {
        if (!exercises.has(exercise.exerciseId)) {
          exercises.set(exercise.exerciseId, exercise.exerciseName);
        }
      }
    }

    return Array.from(exercises.entries())
      .map(([id, name]) => ({
        id,
        name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getProgressiveOverloadSuggestion(
    exerciseId: string,
    expectedSets: number,
    minReps: number,
    maxReps: number,
  ): {
    weight: number;
    reps: number;
    message: string;
  } | null {
    const previous = this.getLastExercise(exerciseId);

    if (!previous) {
      return null;
    }

    const completedSets = previous.sets.filter(
      (set) =>
        set.weight !== null &&
        set.reps !== null &&
        set.weight > 0 &&
        set.reps > 0,
    );

    if (!completedSets.length) {
      return null;
    }

    /*
     * ========================================
     * FIND WORKING WEIGHT
     * ========================================
     *
     * Find the weight used for the majority
     * of the working sets.
     */

    const weightFrequency = new Map<number, number>();

    for (const set of completedSets) {
      const weight = set.weight!;

      weightFrequency.set(weight, (weightFrequency.get(weight) ?? 0) + 1);
    }

    let workingWeight = completedSets[0].weight!;

    let highestFrequency = 0;

    for (const [weight, frequency] of weightFrequency.entries()) {
      if (
        frequency > highestFrequency ||
        (frequency === highestFrequency && weight > workingWeight)
      ) {
        workingWeight = weight;

        highestFrequency = frequency;
      }
    }

    /*
     * Sets performed using the main
     * working weight.
     */

    const workingSets = completedSets.filter(
      (set) => set.weight === workingWeight,
    );

    if (!workingSets.length) {
      return null;
    }

    /*
     * ========================================
     * WEIGHT INCREASE
     * ========================================
     *
     * IMPORTANT:
     *
     * Weight increases ONLY if:
     *
     * 1. All expected working sets exist.
     * 2. Every expected set reached max reps.
     *
     * Example 3×8-10:
     *
     * 50×10
     * 50×10
     * 50×10
     *
     * => unlock 52.5×8
     */

    const completedAllExpectedSets = workingSets.length >= expectedSets;

    const allSetsReachedMax =
      completedAllExpectedSets &&
      workingSets.slice(0, expectedSets).every((set) => set.reps! >= maxReps);

    if (allSetsReachedMax) {
      const nextWeight = Math.round((workingWeight + 2.5) * 2) / 2;

      return {
        weight: nextWeight,

        reps: minReps,

        message: `Weight increase unlocked — try ${nextWeight} kg × ${minReps}`,
      };
    }

    /*
     * ========================================
     * REP PROGRESSION
     * ========================================
     *
     * Increase the weakest set by one rep.
     *
     * Example:
     *
     * 50×10
     * 50×8
     * 50×7
     *
     * => target 50×8
     */

    const lowestReps = Math.min(...workingSets.map((set) => set.reps!));

    const targetReps = Math.min(Math.max(lowestReps + 1, minReps), maxReps);

    return {
      weight: workingWeight,

      reps: targetReps,

      message: `Try ${workingWeight} kg × ${targetReps}`,
    };
  }

  getEstimatedWorkoutCalories(sessionId: string, weightKg: number): number {
    const session = this.getWorkoutById(sessionId);

    if (!session) {
      return 0;
    }

    /*
     * Strength training estimate.
     *
     * MET ≈ 5 for a normal/moderate-hard
     * resistance training session.
     *
     * kcal =
     * MET × 3.5 × weightKg / 200 × minutes
     */

    const MET = 5;

    const calories = ((MET * 3.5 * weightKg) / 200) * session.durationMinutes;

    return Math.round(calories);
  }

  getWorkoutCaloriesByDate(date: string, weightKg: number): number {
    const sessions = this.sessions().filter(
      (session) => this.getLocalDate(session.date) === date,
    );

    return sessions.reduce(
      (total, session) =>
        total + this.getEstimatedWorkoutCalories(session.id, weightKg),
      0,
    );
  }

  private getLocalDate(date: string): string {
    const value = new Date(date);

    const year = value.getFullYear();

    const month = String(value.getMonth() + 1).padStart(2, '0');

    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
