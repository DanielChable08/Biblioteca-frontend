import { Routes } from '@angular/router';


export const routes: Routes = [
  { path: '', 
    redirectTo: '/login', 
    pathMatch: 'full' 
  },


  {
    path: 'login', 
    loadComponent: () => import('./components/login/login').then(m => m.Login)
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./components/bibliotecario/bibliotecario').then(m => m.BibliotecarioComponent)
  },
  { path: '**', redirectTo: '/login' }
];
