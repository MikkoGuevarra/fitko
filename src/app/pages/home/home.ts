import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FitnessService } from '../../core/services/fitness';
import { WorkoutService } from '../../core/services/workout';
import { RunningService } from '../../core/services/running';
import { DecimalPipe } from '@angular/common';
import { NutritionService } from '../../core/services/nutrition';
import { EnergyBalanceService } from '../../core/services/energy-balance';



@Component({
    selector: 'app-home',
    imports: [
        RouterLink,
        DecimalPipe 
    ],
    templateUrl: './home.html',
    styleUrl: './home.scss',
})
export class Home {

    readonly fitnessService =
        inject(FitnessService);

    readonly nutritionService =
        inject(NutritionService);

    readonly runningService =
        inject(RunningService);

    readonly workoutService =
        inject(WorkoutService);

    readonly energyBalanceService =
        inject(EnergyBalanceService);


    readonly calorieTarget = 2000;
    readonly proteinTarget = 164;


    get todayNutrition() {
        return this.nutritionService
            .getTodayEntry();
    }


    get todayEnergyBalance() {
        return this.energyBalanceService
            .getDailyEnergyBalance();
    }


    get currentWeight(): number {
        return this.fitnessService
            .currentWeight();
    }


    get calorieProgress(): number {

        const calories =
            this.todayNutrition?.calories ?? 0;

        return this.getProgress(
            calories,
            this.calorieTarget
        );
    }


    get proteinProgress(): number {

        const protein =
            this.todayNutrition?.protein ?? 0;

        return this.getProgress(
            protein,
            this.proteinTarget
        );
    }


    private getProgress(
        value: number,
        target: number
    ): number {

        if (target <= 0) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(
                0,
                (value / target) * 100
            )
        );
    }

    get todayRunningCalories(): number {
    return this.runningService
        .getCaloriesByDate(
            this.getTodayDate()
        );
}


get todayWorkoutCalories(): number {
    return this.workoutService
        .getWorkoutCaloriesByDate(
            this.getTodayDate(),
            this.currentWeight
        );
}


get hasRunToday(): boolean {
    return this.todayRunningCalories > 0;
}


get hasWorkoutToday(): boolean {
    return this.todayWorkoutCalories > 0;
}


private getTodayDate(): string {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, '0');

    const day =
        String(
            now.getDate()
        ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}
}