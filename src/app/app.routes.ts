import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { adminGuard } from './guards/admin.guard';

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
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.default),
    canActivate: [authGuard] 
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/bibliotecario/bibliotecario').then(m => m.default),
    canActivate: [authGuard, roleGuard] 
  },
  { 
    path: 'admin/libros/nuevo', 
    loadComponent: () => import('./components/libro-formulario/libro-formulario').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/libros/editar/:uuid', 
    loadComponent: () => import('./components/libro-formulario/libro-formulario').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/usuarios', 
    loadComponent: () => import('./components/usuarios/usuarios').then(m => m.default),
    canActivate: [authGuard, adminGuard]
  },
  { 
    path: 'admin/usuarios/nuevo', 
    loadComponent: () => import('./components/usuario-formulario/usuario-formulario').then(m => m.default),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/usuarios/editar/:uuid',
    loadComponent: () => import('./components/usuario-formulario/usuario-formulario'),
    canActivate: [authGuard, adminGuard]
  },
  { 
    path: 'admin/prestamos', 
    loadComponent: () => import('./components/prestamo-lista/prestamo-lista').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  {
    path: 'admin/prestamos/nuevo', 
    loadComponent: () => import('./components/prestamo-formulario/prestamo-formulario').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  {
    path: 'admin/prestamos/editar/:uuid', 
    loadComponent: () => import('./components/prestamo-formulario/prestamo-formulario').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/multas', 
    loadComponent: () => import('./components/multa-lista/multa-lista').then(m => m.MultaListaComponent),
    canActivate: [authGuard, roleGuard]
  },
  {
    path: 'admin/multas/pagar',
    loadComponent: () => import('./components/multa-pago/multa-pago').then(m => m.MultaPagoComponent),
    canActivate: [authGuard, adminGuard]
  },
  { 
    path: 'admin/politicas', 
    loadComponent: () => import('./components/politicas-multas/politicas-multas').then(m => m.PoliticasMultasComponent),
    canActivate: [authGuard, adminGuard]
  },
  { 
    path: 'admin/autores', 
    loadComponent: () => import('./components/autores/autores').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/categorias', 
    loadComponent: () => import('./components/categorias/categorias').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/areas', 
    loadComponent: () => import('./components/areas/areas').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/editoriales', 
    loadComponent: () => import('./components/editoriales/editoriales').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/idiomas', 
    loadComponent: () => import('./components/idiomas/idiomas').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/tipos', 
    loadComponent: () => import('./components/tipos/tipos').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/estados', 
    loadComponent: () => import('./components/estados/estados').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: 'admin/condiciones', 
    loadComponent: () => import('./components/condiciones/condiciones').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  {
    path: 'admin/ejemplares', 
    loadComponent: () => import('./components/ejemplar-lista/ejemplar-lista').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  {
    path: 'admin/personas',
    loadComponent: () => import('./components/personas-lista/personas-lista').then(m => m.default),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/personas/nuevo',
    loadComponent: () => import('./components/personas-formulario/personas-formulario').then(m => m.default),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/personas/editar/:uuid',
    loadComponent: () => import('./components/personas-formulario/personas-formulario').then(m => m.default),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/impresiones',
    loadComponent: () => import('./components/impresiones/impresiones').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  {
    path: 'admin/personas/:idLector/historial-pagos',
    loadComponent: () => import('./components/historial-pagos/historial-pagos').then(m => m.default),
    canActivate: [authGuard, adminGuard] 
  },
  {
    path: 'admin/pagos',
    loadComponent: () => import('./components/pagos-index/pagos-index').then(m => m.default),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/pagos/lector/:idLector',
    loadComponent: () => import('./components/historial-pagos/historial-pagos').then(m => m.default),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/personas/detalle/:uuid',
    loadComponent: () => import('./components/persona-detalle/persona-detalle').then(m => m.default),
    canActivate: [authGuard, roleGuard]
  },
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];