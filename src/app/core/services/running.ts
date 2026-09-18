import { computed, Injectable, signal } from '@angular/core';

import { RunningSession } from '../models/running.model';

@Injectable({
  providedIn: 'root',
})
export class RunningService {
  private readonly STORAGE_KEY = 'mikko-fit-running';

  readonly sessions = signal<RunningSession[]>(this.loadSessions());

  readonly totalRuns = computed(() => this.sessions().length);
  readonly totalDistance = computed(() =>
    this.sessions().reduce((total, session) => total + session.distanceKm, 0),
  );

  readonly totalCalories = computed(() =>
    this.sessions().reduce(
      (total, session) => total + session.estimatedCalories,
      0,
    ),
  );

  readonly kmThisWeek = computed(() => {
    const now = new Date();

    const startOfWeek = new Date(now);

    const day = now.getDay();

    const daysFromMonday = day === 0 ? 6 : day - 1;

    startOfWeek.setDate(now.getDate() - daysFromMonday);

    startOfWeek.setHours(0, 0, 0, 0);

    return this.sessions()
      .filter((session) => {
        const sessionDate = new Date(session.date);

        return sessionDate >= startOfWeek;
      })
      .reduce((total, session) => total + session.distanceKm, 0);
  });

  addRun(distanceKm: number, durationMinutes: number, weightKg: number): void {
    if (distanceKm <= 0 || durationMinutes <= 0) {
      return;
    }

    const averagePace = durationMinutes / distanceKm;

    /*
     * Running kcal estimate:
     * approximately 1 kcal × kg × km.
     */
    const estimatedCalories = Math.round(weightKg * distanceKm);

    const session: RunningSession = {
      id: crypto.randomUUID(),

      date: new Date().toISOString(),

      distanceKm,

      durationMinutes,

      averagePace,

      estimatedCalories,
    };

    this.sessions.update((sessions) => [session, ...sessions]);

    this.saveSessions();
  }

  deleteRun(id: string): void {
    this.sessions.update((sessions) =>
      sessions.filter((session) => session.id !== id),
    );

    this.saveSessions();
  }

  formatPace(pace: number): string {
    if (!Number.isFinite(pace)) {
      return '--:--';
    }

    let minutes = Math.floor(pace);

    let seconds = Math.round((pace - minutes) * 60);

    if (seconds === 60) {
      minutes++;
      seconds = 0;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private loadSessions(): RunningSession[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);

    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private saveSessions(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sessions()));
  }

  getRunningProgress(): {
    date: string;
    distanceKm: number;
    durationMinutes: number;
    averagePace: number;
    estimatedCalories: number;
  }[] {
    return [...this.sessions()]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((session) => ({
        date: session.date,
        distanceKm: session.distanceKm,
        durationMinutes: session.durationMinutes,
        averagePace: session.averagePace,
        estimatedCalories: session.estimatedCalories,
      }));
  }

  readonly averagePace = computed(() => {
    const sessions = this.sessions();

    if (!sessions.length) {
      return null;
    }

    const totalDistance = sessions.reduce(
      (total, session) => total + session.distanceKm,
      0,
    );

    const totalMinutes = sessions.reduce(
      (total, session) => total + session.durationMinutes,
      0,
    );

    if (totalDistance <= 0) {
      return null;
    }

    return totalMinutes / totalDistance;
  });

  readonly bestPace = computed(() => {
    const sessions = this.sessions().filter(
      (session) => session.averagePace > 0,
    );

    if (!sessions.length) {
      return null;
    }

    return Math.min(...sessions.map((session) => session.averagePace));
  });

  readonly longestRun = computed(() => {
    const sessions = this.sessions();

    if (!sessions.length) {
      return 0;
    }

    return Math.max(...sessions.map((session) => session.distanceKm));
  });

  readonly paceImprovement = computed(() => {
    const progress = this.getRunningProgress();

    if (progress.length < 2) {
      return 0;
    }

    const first = progress[0].averagePace;

    const latest = progress[progress.length - 1].averagePace;

    return first - latest;
  });

  getBestRunForDistance(targetDistanceKm: number): {
    distanceKm: number;
    durationMinutes: number;
    averagePace: number;
    date: string;
  } | null {
    const tolerance = 0.15;

    const matchingRuns = this.sessions().filter(
      (session) => Math.abs(session.distanceKm - targetDistanceKm) <= tolerance,
    );

    if (!matchingRuns.length) {
      return null;
    }

    const best = matchingRuns.reduce((fastest, current) =>
      current.durationMinutes < fastest.durationMinutes ? current : fastest,
    );

    return {
      distanceKm: best.distanceKm,
      durationMinutes: best.durationMinutes,
      averagePace: best.averagePace,
      date: best.date,
    };
  }

  readonly runningPersonalBests = computed(() => {
    const distances = [
      {
        label: '5K',
        distance: 5,
      },
      {
        label: '7K',
        distance: 7,
      },
      {
        label: '10K',
        distance: 10,
      },
    ];

    return distances
      .map((item) => ({
        ...item,

        best: this.getBestRunForDistance(item.distance),
      }))
      .filter((item) => item.best !== null);
  });

  formatDuration(durationMinutes: number): string {
    const totalSeconds = Math.round(durationMinutes * 60);

    const hours = Math.floor(totalSeconds / 3600);

    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  getCaloriesByDate(date: string): number {
    return this.sessions()
      .filter((session) => this.getLocalDate(session.date) === date)
      .reduce((total, session) => total + session.estimatedCalories, 0);
  }

  private getLocalDate(date: string): string {
    const value = new Date(date);

    const year = value.getFullYear();

    const month = String(value.getMonth() + 1).padStart(2, '0');

    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
