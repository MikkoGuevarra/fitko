import { Component, inject } from '@angular/core';
import {
    DatePipe,
    DecimalPipe,
} from '@angular/common';
import {
    ActivatedRoute,
    Router,
    RouterLink,
} from '@angular/router';

import { WorkoutService } from '../../core/services/workout';

@Component({
    selector: 'app-workout-summary',
    imports: [
        RouterLink,
        DatePipe,
        DecimalPipe,
    ],
    templateUrl: './workout-summary.html',
    styleUrl: './workout-summary.scss',
})
export class WorkoutSummary {

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    readonly workoutService =
        inject(WorkoutService);


    readonly sessionId =
        this.route.snapshot.paramMap.get(
            'sessionId'
        );


    readonly session =
        this.sessionId
            ? this.workoutService
                .getWorkoutById(
                    this.sessionId
                )
            : null;


    readonly personalRecords =
        this.sessionId
            ? this.workoutService
                .getSessionPRs(
                    this.sessionId
                )
            : [];


    constructor() {

        if (!this.session) {
            this.router.navigate([
                '/workout'
            ]);
        }
    }


    get completedSets(): number {

        if (!this.session) {
            return 0;
        }

        return this.session.exercises.reduce(
            (total, exercise) =>
                total +
                exercise.sets.length,
            0
        );
    }
}