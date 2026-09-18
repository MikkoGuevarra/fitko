import {
    Component,
    computed,
    inject,
} from '@angular/core';

import {
    DatePipe,
    DecimalPipe,
} from '@angular/common';

import { FormsModule } from '@angular/forms';
import { FitnessService } from '../../core/services/fitness';
import { RunningService } from '../../core/services/running';


@Component({
    selector: 'app-running',
    imports: [
        FormsModule,
        DatePipe,
        DecimalPipe,
    ],
    templateUrl: './running.html',
    styleUrl: './running.scss',
})
export class Running {

    readonly fitness =
        inject(FitnessService);

    readonly runningService =
        inject(RunningService);


    distanceKm: number | null = null;

    hours = 0;

    minutes = 0;

get durationMinutes(): number {
    return (this.hours * 60) + this.minutes;
}


saveRun(): void {

    if (
        this.distanceKm === null ||
        this.distanceKm <= 0 ||
        this.durationMinutes <= 0
    ) {
        return;
    }


    this.runningService.addRun(
        this.distanceKm,
        this.durationMinutes,
        this.fitness.currentWeight()
    );


    this.distanceKm = null;

    this.hours = 0;

    this.minutes = 0;
}


    deleteRun(id: string): void {

        this.runningService.deleteRun(id);
    }
}