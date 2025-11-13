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
  { 
    path: 'admin/prestamos', 
    loadComponent: () => import('./components/prestamo-lista/prestamo-lista').then(m => m.default)
  },
    { 
    path: 'admin/autores', 
    loadComponent: () => import('./components/autores/autores').then(m => m.default)
  },
  { 
    path: 'admin/categorias', 
    loadComponent: () => import('./components/categorias/categorias').then(m => m.default)
  },
  { 
    path: 'admin/editoriales', 
    loadComponent: () => import('./components/editoriales/editoriales').then(m => m.default)
  },
  { 
    path: 'admin/idiomas', 
    loadComponent: () => import('./components/idiomas/idiomas').then(m => m.default)
  },
  { 
    path: 'admin/tipos', 
    loadComponent: () => import('./components/tipos/tipos').then(m => m.default)
  },
  { 
    path: 'admin/estados', 
    loadComponent: () => import('./components/estados/estados').then(m => m.default)
  },
  { 
    path: 'admin/condiciones', 
    loadComponent: () => import('./components/condiciones/condiciones').then(m => m.default)
  },
  {
  path: 'admin/prestamos/nuevo', 
  loadComponent: () => import('./components/prestamo-formulario/prestamo-formulario').then(m => m.default)
  },
  { path: '**', redirectTo: '/login' }
];