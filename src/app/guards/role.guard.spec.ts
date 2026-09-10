import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, provideRouter, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';
import { routes } from '../app.routes';

describe('Acceso del prestamista', () => {
  beforeEach(() => {
    sessionStorage.setItem('userData', JSON.stringify({ roles: [{ name: 'Prestamista', permisos: [
      'VER_PERSONA', 'VER_PAGO', 'CREAR_PAGO', 'VER_PRESTAMO', 'CREAR_PRESTAMO',
      'ACTUALIZAR_PRESTAMO', 'VER_EJEMPLAR', 'VER_AREA', 'VER_CATEGORIA'
    ] }] }));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
  });
  afterEach(() => sessionStorage.removeItem('userData'));

  function acceso(path: string) {
    const route = routes.find(r => r.path === path)!;
    expect(route).toBeDefined();
    return TestBed.runInInjectionContext(() => roleGuard(
      { data: route.data ?? {} } as ActivatedRouteSnapshot,
      { url: '/' + path } as RouterStateSnapshot
    ));
  }

  it('reconoce el rol y permite entrar al panel', () => {
    const auth = TestBed.inject(AuthService);
    expect(auth.getUserRole()).toBe('PRESTAMISTA');
    expect(auth.canAccessAdminPanel()).toBeTrue();
    expect(acceso('admin')).toBeTrue();
  });

  it('permite préstamos, cobros y consulta de personas y catálogos', () => {
    for (const ruta of ['admin/prestamos', 'admin/prestamos/nuevo', 'admin/prestamos/editar/:uuid',
      'admin/multas/pagar', 'admin/pagos', 'admin/personas', 'admin/impresiones', 'admin/areas']) {
      expect(routes.find(r => r.path === ruta)!.canActivate).toContain(roleGuard);
      expect(acceso(ruta)).toBeTrue();
    }
  });

  it('impide crear personas y modificar libros sin los permisos correspondientes', () => {
    for (const ruta of ['admin/personas/nuevo', 'admin/personas/editar/:uuid', 'admin/libros/nuevo', 'admin/libros/editar/:uuid']) {
      const resultado = acceso(ruta);
      expect(resultado instanceof UrlTree).toBeTrue();
      expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/admin');
    }
  });
});
