import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NutritionService } from '../../core/services/nutrition';
import { EnergyBalanceService } from '../../core/services/energy-balance';

@Component({
  selector: 'app-nutrition',
  imports: [FormsModule],
  templateUrl: './nutrition.html',
  styleUrl: './nutrition.scss',
})
export class Nutrition {
  readonly nutritionService = inject(NutritionService);

  readonly calorieTarget = 2000;
  readonly proteinTarget = 164;
  readonly carbsTarget = 200;
  readonly fatTarget = 60;

  readonly calories = signal<number | null>(null);
  readonly protein = signal<number | null>(null);
  readonly carbs = signal<number | null>(null);
  readonly fat = signal<number | null>(null);

  constructor() {
    const today = this.nutritionService.getTodayEntry();

    if (today) {
      this.calories.set(today.calories);
      this.protein.set(today.protein);
      this.carbs.set(today.carbs);
      this.fat.set(today.fat);
    }
  }

  save(): void {
    if (
      this.calories() === null ||
      this.protein() === null ||
      this.carbs() === null ||
      this.fat() === null
    ) {
      return;
    }

    this.nutritionService.saveEntry(
      this.calories()!,
      this.protein()!,
      this.carbs()!,
      this.fat()!,
    );
  }

  get caloriesRemaining(): number {
    return this.calorieTarget - (this.calories() ?? 0);
  }

  get proteinRemaining(): number {
    return this.proteinTarget - (this.protein() ?? 0);
  }

  get carbsRemaining(): number {
    return this.carbsTarget - (this.carbs() ?? 0);
  }

  get fatRemaining(): number {
    return this.fatTarget - (this.fat() ?? 0);
  }

  get calorieProgress(): number {
    return this.getProgress(this.calories() ?? 0, this.calorieTarget);
  }

  get proteinProgress(): number {
    return this.getProgress(this.protein() ?? 0, this.proteinTarget);
  }

  get carbsProgress(): number {
    return this.getProgress(this.carbs() ?? 0, this.carbsTarget);
  }

  get fatProgress(): number {
    return this.getProgress(this.fat() ?? 0, this.fatTarget);
  }

  private getProgress(value: number, target: number): number {
    if (target <= 0) {
      return 0;
    }

    return Math.min((value / target) * 100, 100);
  }

  readonly energyBalanceService = inject(EnergyBalanceService);

  get energyBalance() {
    return this.energyBalanceService.getDailyEnergyBalance();
  }

  get estimatedWeeklyLoss(): number {
    const balance = this.energyBalance;

    if (!balance || balance.deficit <= 0) {
      return 0;
    }

    return this.energyBalanceService.calculateEstimatedKgLoss(
      balance.deficit * 7,
    );
  }

  get sevenDayTrend() {
    return this.energyBalanceService.getSevenDayEnergyTrend();
  }
}
