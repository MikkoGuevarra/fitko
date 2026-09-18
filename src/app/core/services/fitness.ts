import { computed, Injectable, signal } from '@angular/core';
import { WeightEntry } from '../models/weight-entry.model';

@Injectable({
    providedIn: 'root',
})
export class FitnessService {

    private readonly WEIGHT_STORAGE_KEY = 'mikko-fit-weight';

    readonly startWeight = 86;
    readonly goalWeight = 75;

    readonly weeklyWorkoutGoal = signal(3);

    readonly weeklyRunningGoal = signal(17);


    readonly dailyStepsGoal = signal(7000);

    readonly weightEntries = signal<WeightEntry[]>(
        this.loadWeightEntries()
    );

    readonly currentWeight = computed(() => {
        const entries = this.weightEntries();

        if (!entries.length) {
            return this.startWeight;
        }

        return entries[0].weight;
    });

    readonly weightLost = computed(() =>
        this.startWeight - this.currentWeight()
    );

    readonly weightRemaining = computed(() =>
        Math.max(0, this.currentWeight() - this.goalWeight)
    );

    readonly weightProgress = computed(() => {
        const totalToLose =
            this.startWeight - this.goalWeight;

        const lost =
            this.startWeight - this.currentWeight();

        if (totalToLose <= 0) {
            return 0;
        }

        return Math.min(
            100,
            Math.max(0, (lost / totalToLose) * 100)
        );
    });


    addWeight(weight: number): void {

        const entry: WeightEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            weight,
        };

        this.weightEntries.update(entries => [
            entry,
            ...entries,
        ]);

        this.saveWeightEntries();
    }


    deleteWeight(id: string): void {

        this.weightEntries.update(entries =>
            entries.filter(entry => entry.id !== id)
        );

        this.saveWeightEntries();
    }


    private loadWeightEntries(): WeightEntry[] {

        const stored =
            localStorage.getItem(this.WEIGHT_STORAGE_KEY);

        if (!stored) {

            return [
                {
                    id: crypto.randomUUID(),
                    date: '2026-09-18T00:00:00',
                    weight: 85,
                },
                {
                    id: crypto.randomUUID(),
                    date: '2026-09-07T00:00:00',
                    weight: 86,
                },
            ];
        }

        try {
            return JSON.parse(stored);
        } catch {
            return [];
        }
    }


    private saveWeightEntries(): void {

        localStorage.setItem(
            this.WEIGHT_STORAGE_KEY,
            JSON.stringify(this.weightEntries())
        );
    }

    getWeightByDate(
    date: string
): number {

    const targetDate =
        new Date(`${date}T23:59:59`);

    const entries =
        [...this.weightEntries()]
            .filter(
                entry =>
                    new Date(entry.date) <= targetDate
            )
            .sort(
                (a, b) =>
                    new Date(b.date).getTime() -
                    new Date(a.date).getTime()
            );

    if (!entries.length) {
        return this.startWeight;
    }

    return entries[0].weight;
}
}