import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.default)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/bibliotecario/bibliotecario').then(m => m.default)
  }, 
  { 
    path: 'admin/libros/nuevo', 
    loadComponent: () => import('./components/libro-formulario/libro-formulario').then(m => m.default)
  },
  { 
    path: 'admin/libros/editar/:uuid', 
    loadComponent: () => import('./components/libro-formulario/libro-formulario').then(m => m.default)
  },
  {
    path: 'admin/usuarios', 
    loadComponent: () => import('./components/usuarios/usuarios').then(m => m.default)
  },
  {
    path: 'admin/usuarios/nuevo',
    loadComponent: () => import('./components/usuario-formulario/usuario-formulario').then(m => m.default)
  },
  {
    path: 'admin/usuarios/editar/:uuid',
    loadComponent: () => import('./components/usuario-formulario/usuario-formulario').then(m => m.default)
  },
  { path: '**', redirectTo: '/login' }
];