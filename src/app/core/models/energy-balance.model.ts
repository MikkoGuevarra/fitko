export type Sex = 'male' | 'female';

export type BaseActivityLevel =
    | 'sedentary'
    | 'light';

export interface EnergyProfile {
    sex: Sex;
    age: number;
    heightCm: number;
    baseActivityLevel: BaseActivityLevel;
}

export interface DailyEnergyBalance {
    date: string;

    weightKg: number;

    bmr: number;
    baseExpenditure: number;

    runningCalories: number;
    workoutCalories: number;

    totalExpenditure: number;

    caloriesEaten: number;

    deficit: number;
}

export interface EnergyTrend {
    daysLogged: number;

    averageCaloriesEaten: number;
    averageExpenditure: number;
    averageDeficit: number;

    totalDeficit: number;

    estimatedKgLossPerWeek: number;

    currentWeight: number;
    goalWeight: number;
    weightRemaining: number;

    estimatedWeeksToGoal: number | null;
}