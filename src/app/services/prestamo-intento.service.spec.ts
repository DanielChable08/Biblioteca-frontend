import { TestBed } from '@angular/core/testing';
import { AltaCompletaPrestamoPayload } from '../models/prestamo-intento';
import { PrestamoIntentoService } from './prestamo-intento.service';

describe('PrestamoIntentoService', () => {
  let service: PrestamoIntentoService;
  const payload: AltaCompletaPrestamoPayload = {
    prestamo: {
      fechaPrestamo: '2026-11-17T09:00:00',
      fechaLimite: '2026-11-24T09:00:00',
      idBibliotecario: 3,
      idLector: 9,
      idEstadoPrestamo: 7
    },
    idEjemplares: [18, 12]
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [PrestamoIntentoService] });
    service = TestBed.inject(PrestamoIntentoService);
  });

  it('creates a UUID and persists a canonical payload scoped to the same user', () => {
    const attempt = service.preparar('user:4', payload);

    expect(attempt.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(attempt.payload.idEjemplares).toEqual([12, 18]);
    expect(payload.idEjemplares).toEqual([18, 12]);
    expect(service.recuperar('user:4')).toEqual({ estado: 'found', intento: attempt });
    expect(service.recuperar('user:5')).toEqual({ estado: 'none' });
  });

  it('reuses the pending attempt and clears only its matching key', () => {
    const attempt = service.preparar('user:4', payload);
    expect(() => service.preparar('user:4', payload)).toThrowError(/debe resolverse primero/);

    service.limpiar('user:4', { ...attempt, idempotencyKey: crypto.randomUUID() });
    expect(service.recuperar('user:4').estado).toBe('found');

    service.limpiar('user:4', attempt);
    expect(service.recuperar('user:4')).toEqual({ estado: 'none' });
  });

  it('recovers the same attempt after service recreation without exposing it to another user', () => {
    const attempt = service.preparar('user:4', payload);
    const reloadedService = new PrestamoIntentoService();

    expect(reloadedService.recuperar('user:4')).toEqual({ estado: 'found', intento: attempt });
    expect(reloadedService.recuperar('user:5')).toEqual({ estado: 'none' });
  });

  it('rejects malformed or cross-user attempts from storage', () => {
    sessionStorage.setItem('biblioteca:prestamo-intento:v1:user%3A4', JSON.stringify({
      userScope: 'user:5',
      idempotencyKey: 'not-a-uuid',
      payload
    }));

    expect(service.recuperar('user:4')).toEqual({ estado: 'invalid' });
  });
});
