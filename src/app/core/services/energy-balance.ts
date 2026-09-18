import { inject, Injectable } from '@angular/core';

import { FitnessService } from './fitness';
import { NutritionService } from './nutrition';
import { RunningService } from './running';
import { WorkoutService } from './workout';

import type {
  BaseActivityLevel,
  DailyEnergyBalance,
  EnergyProfile,
  EnergyTrend,
} from '../models/energy-balance.model';

@Injectable({
  providedIn: 'root',
})
export class EnergyBalanceService {
  private readonly fitnessService = inject(FitnessService);

  private readonly nutritionService = inject(NutritionService);

  private readonly runningService = inject(RunningService);

  private readonly workoutService = inject(WorkoutService);

  /*
   * ========================================
   * PROFILE
   * ========================================
   *
   * Later we can move this into Settings.
   */

  readonly profile: EnergyProfile = {
    sex: 'male',
    age: 37,
    heightCm: 178,

    /*
     * Running + gym are added separately,
     * so we keep the base activity low.
     */
    baseActivityLevel: 'sedentary',
  };

  /*
   * ========================================
   * DAILY ENERGY BALANCE
   * ========================================
   */

  getDailyEnergyBalance(
    date: string = this.getTodayDate(),
  ): DailyEnergyBalance | null {
    const nutrition = this.nutritionService.getEntryByDate(date);

    /*
     * Without food data we cannot
     * calculate the deficit.
     */
    if (!nutrition) {
      return null;
    }

    const weightKg = this.fitnessService.getWeightByDate(date);

    const bmr = this.calculateBmr(weightKg, this.profile);

    const baseExpenditure = this.calculateBaseExpenditure(
      weightKg,
      this.profile,
    );

    const runningCalories = this.runningService.getCaloriesByDate(date);

    const workoutCalories = this.workoutService.getWorkoutCaloriesByDate(
      date,
      weightKg,
    );

    const totalExpenditure = this.calculateTotalExpenditure(
      baseExpenditure,
      runningCalories,
      workoutCalories,
    );

    const deficit = this.calculateDeficit(totalExpenditure, nutrition.calories);

    return {
      date,

      weightKg,

      bmr,
      baseExpenditure,

      runningCalories,
      workoutCalories,

      totalExpenditure,

      caloriesEaten: nutrition.calories,

      deficit,
    };
  }

  /*
   * ========================================
   * BMR — MIFFLIN-ST JEOR
   * ========================================
   */

  calculateBmr(weightKg: number, profile: EnergyProfile): number {
    const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age;

    const sexAdjustment = profile.sex === 'male' ? 5 : -161;

    return Math.round(base + sexAdjustment);
  }

  /*
   * ========================================
   * BASE DAILY EXPENDITURE
   * ========================================
   *
   * Does not include logged running
   * or gym workouts.
   */

  calculateBaseExpenditure(weightKg: number, profile: EnergyProfile): number {
    const bmr = this.calculateBmr(weightKg, profile);

    const multiplier = this.getBaseActivityMultiplier(
      profile.baseActivityLevel,
    );

    return Math.round(bmr * multiplier);
  }

  /*
   * ========================================
   * TOTAL EXPENDITURE
   * ========================================
   */

  calculateTotalExpenditure(
    baseExpenditure: number,
    runningCalories: number,
    workoutCalories: number,
  ): number {
    return Math.round(baseExpenditure + runningCalories + workoutCalories);
  }

  /*
   * ========================================
   * DEFICIT / SURPLUS
   * ========================================
   *
   * Positive = deficit
   * Negative = surplus
   */

  calculateDeficit(totalExpenditure: number, caloriesEaten: number): number {
    return Math.round(totalExpenditure - caloriesEaten);
  }

  /*
   * ========================================
   * ESTIMATED WEIGHT LOSS
   * ========================================
   */

  calculateEstimatedKgLoss(deficitCalories: number): number {
    if (deficitCalories <= 0) {
      return 0;
    }

    return deficitCalories / 7700;
  }

  /*
   * ========================================
   * BASE ACTIVITY
   * ========================================
   */

  private getBaseActivityMultiplier(activityLevel: BaseActivityLevel): number {
    switch (activityLevel) {
      case 'light':
        return 1.3;

      case 'sedentary':
      default:
        return 1.2;
    }
  }

  /*
   * ========================================
   * LOCAL DATE
   * ========================================
   */

  private getTodayDate(): string {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1).padStart(2, '0');

    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getSevenDayEnergyTrend(): EnergyTrend | null {
    const dates = this.getLastDates(7);

    const balances = dates
      .map((date) => this.getDailyEnergyBalance(date))
      .filter((balance): balance is DailyEnergyBalance => balance !== null);

    if (!balances.length) {
      return null;
    }

    /*
     * ========================================
     * TOTALS
     * ========================================
     */

    const totalCaloriesEaten = balances.reduce(
      (total, balance) => total + balance.caloriesEaten,
      0,
    );

    const totalExpenditure = balances.reduce(
      (total, balance) => total + balance.totalExpenditure,
      0,
    );

    const totalDeficit = balances.reduce(
      (total, balance) => total + balance.deficit,
      0,
    );

    /*
     * ========================================
     * DAILY AVERAGES
     * ========================================
     */

    const daysLogged = balances.length;

    const averageCaloriesEaten = Math.round(totalCaloriesEaten / daysLogged);

    const averageExpenditure = Math.round(totalExpenditure / daysLogged);

    const averageDeficit = Math.round(totalDeficit / daysLogged);

    /*
     * ========================================
     * WEEKLY PROJECTION
     * ========================================
     *
     * We use the average of the logged days
     * and project it across 7 days.
     */

    const projectedWeeklyDeficit = averageDeficit * 7;

    const estimatedKgLossPerWeek =
      projectedWeeklyDeficit > 0 ? projectedWeeklyDeficit / 7700 : 0;

    /*
     * ========================================
     * GOAL
     * ========================================
     */

    const currentWeight = this.fitnessService.currentWeight();

    const goalWeight = this.fitnessService.goalWeight;

    const weightRemaining = Math.max(0, currentWeight - goalWeight);

    const estimatedWeeksToGoal =
      estimatedKgLossPerWeek > 0 && weightRemaining > 0
        ? weightRemaining / estimatedKgLossPerWeek
        : null;

    return {
      daysLogged,

      averageCaloriesEaten,
      averageExpenditure,
      averageDeficit,

      totalDeficit,

      estimatedKgLossPerWeek,

      currentWeight,
      goalWeight,
      weightRemaining,

      estimatedWeeksToGoal,
    };
  }

  private getLastDates(days: number): string[] {
    const dates: string[] = [];

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(today);

      date.setDate(today.getDate() - i);

      const year = date.getFullYear();

      const month = String(date.getMonth() + 1).padStart(2, '0');

      const day = String(date.getDate()).padStart(2, '0');

      dates.push(`${year}-${month}-${day}`);
    }

    return dates;
  }
}
