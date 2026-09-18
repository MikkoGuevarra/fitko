import { Component, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
    Router,
    RouterLink,
} from '@angular/router';

import { WORKOUT_PLANS } from '../../core/models/workout-plans';
import { WorkoutService } from '../../core/services/workout';

@Component({
    selector: 'app-workout',
    imports: [
        RouterLink,
        DatePipe,
        DecimalPipe,
    ],
    templateUrl: './workout.html',
    styleUrl: './workout.scss',
})
export class Workout {

    private readonly router =
        inject(Router);

    readonly workouts =
        WORKOUT_PLANS;

    readonly workoutService =
        inject(WorkoutService);


    get activeDraft() {
        return this.workoutService.getDraft();
    }


    get activeDraftWorkout() {
        const draft = this.activeDraft;

        if (!draft) {
            return null;
        }

        return WORKOUT_PLANS.find(
            workout =>
                workout.id === draft.workoutType
        ) ?? null;
    }


    resumeWorkout(): void {
        const draft = this.activeDraft;

        if (!draft) {
            return;
        }

        this.router.navigate([
            '/workout',
            draft.workoutType,
        ]);
    }


    discardWorkout(): void {
        const confirmed =
            window.confirm(
                'Discard your current workout? Your progress will be lost.'
            );

        if (!confirmed) {
            return;
        }

        this.workoutService.clearDraft();
    }

    
}