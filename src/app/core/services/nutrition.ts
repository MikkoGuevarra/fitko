import { Injectable, computed, signal } from '@angular/core';

import type {
    NutritionEntry,
} from '../models/nutrition.model';

@Injectable({
    providedIn: 'root',
})
export class NutritionService {

    private readonly STORAGE_KEY =
        'mikko-fit-nutrition';

    readonly entries =
        signal<NutritionEntry[]>(
            this.loadEntries()
        );


    readonly averageCalories7Days =
        computed(() => {

            const entries =
                this.getLastDaysEntries(7);

            if (!entries.length) {
                return 0;
            }

            const total =
                entries.reduce(
                    (sum, entry) =>
                        sum + entry.calories,
                    0
                );

            return Math.round(
                total / entries.length
            );
        });


    readonly averageProtein7Days =
        computed(() => {

            const entries =
                this.getLastDaysEntries(7);

            if (!entries.length) {
                return 0;
            }

            const total =
                entries.reduce(
                    (sum, entry) =>
                        sum + entry.protein,
                    0
                );

            return Math.round(
                total / entries.length
            );
        });


    saveEntry(
        calories: number,
        protein: number,
        carbs: number,
        fat: number,
        date: string = this.getTodayDate()
    ): void {

        const entry: NutritionEntry = {
            id: crypto.randomUUID(),
            date,
            calories,
            protein,
            carbs,
            fat,
        };


        /*
         * One nutrition entry per day.
         *
         * If today's entry already exists,
         * replace it.
         */

        const updated =
            this.entries()
                .filter(
                    existing =>
                        existing.date !== date
                );


        updated.push(entry);


        updated.sort(
            (a, b) =>
                b.date.localeCompare(a.date)
        );


        this.entries.set(updated);

        this.saveEntries();
    }


    getEntryByDate(
        date: string
    ): NutritionEntry | null {

        return (
            this.entries().find(
                entry =>
                    entry.date === date
            ) ?? null
        );
    }


    getTodayEntry():
        NutritionEntry | null {

        return this.getEntryByDate(
            this.getTodayDate()
        );
    }


    deleteEntry(
        id: string
    ): void {

        this.entries.update(
            entries =>
                entries.filter(
                    entry =>
                        entry.id !== id
                )
        );

        this.saveEntries();
    }


    private getLastDaysEntries(
        days: number
    ): NutritionEntry[] {

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );


        const start =
            new Date(today);

        start.setDate(
            start.getDate() -
            (days - 1)
        );


        return this.entries()
            .filter(entry => {

                const date =
                    new Date(
                        `${entry.date}T00:00:00`
                    );

                return (
                    date >= start &&
                    date <= today
                );
            });
    }


    private getTodayDate(): string {

        const now =
            new Date();

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


    private loadEntries():
        NutritionEntry[] {

        const stored =
            localStorage.getItem(
                this.STORAGE_KEY
            );

        if (!stored) {
            return [];
        }


        try {

            return JSON.parse(
                stored
            ) as NutritionEntry[];

        } catch {

            return [];
        }
    }


    private saveEntries(): void {

        localStorage.setItem(
            this.STORAGE_KEY,
            JSON.stringify(
                this.entries()
            )
        );
    }
}