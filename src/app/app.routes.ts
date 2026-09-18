import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'workout',
    loadComponent: () =>
      import('./pages/workout/workout').then((m) => m.Workout),
  },
  {
    path: 'running',
    loadComponent: () =>
      import('./pages/running/running').then((m) => m.Running),
  },
  {
    path: 'progress',
    loadComponent: () =>
      import('./pages/progress/progress').then((m) => m.Progress),
  },
  {
    path: 'workout/history/:sessionId',
    loadComponent: () =>
      import('./pages/workout-history-detail/workout-history-detail').then(
        (m) => m.WorkoutHistoryDetail,
      ),
  },
  {
    path: 'workout/summary/:sessionId',
    loadComponent: () =>
        import('./pages/workout-summary/workout-summary')
            .then((m) => m.WorkoutSummary),
},
  {
    path: 'workout/:id',
    loadComponent: () =>
      import('./pages/workout-session/workout-session').then(
        (m) => m.WorkoutSession,
      ),
  },
  
{
    path: 'nutrition',
    loadComponent: () =>
        import('./pages/nutrition/nutrition')
            .then((m) => m.Nutrition),
},
  {
    path: '**',
    redirectTo: 'home',
  },
];
