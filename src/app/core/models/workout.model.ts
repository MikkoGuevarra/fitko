export type WorkoutType = 'upper-a' | 'lower' | 'upper-b';

export interface WorkoutExercise {
    id: string;
    name: string;
    sets: number;
    minReps: number;
    maxReps: number;
    restSeconds: number;
    weightIncrement: number;
}

export interface WorkoutPlan {
    id: WorkoutType;
    name: string;
    label: string;
    exercises: WorkoutExercise[];
}

export interface ExerciseSet {
    setNumber: number;
    weight: number | null;
    reps: number | null;
    completed: boolean;
}

export interface ExerciseLog {
    exerciseId: string;
    exerciseName: string;
    sets: ExerciseSet[];
}

export interface WorkoutSession {
    id: string;
    workoutType: WorkoutType;
    workoutName: string;
    date: string;

    durationMinutes: number;

    exercises: ExerciseLog[];

    totalVolume: number;
}

export interface WorkoutDraft {
    workoutType: WorkoutType;
    exercises: ExerciseLog[];
    startedAt: number;
}

export interface StrengthProgressPoint {
    date: string;
    weight: number;
    reps: number;
    estimated1RM: number;
}