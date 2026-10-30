import { TestBed } from '@angular/core/testing';
import { PagoMultaPayload } from '../models/biblioteca';
import { PagoIntentoService } from './pago-intento.service';

describe('PagoIntentoService', () => {
  let service: PagoIntentoService;

  const payload: PagoMultaPayload = {
    montoRecibido: 50,
    cajero: 4,
    lectorPago: 8,
    idsMultas: [21, 22]
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [PagoIntentoService] });
    service = TestBed.inject(PagoIntentoService);
  });

  it('creates a UUID and persists the exact body for recovery by the same user', () => {
    const attempt = service.preparar('user:4', payload, 45);

    expect(attempt.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(service.recuperar('user:4')).toEqual({ estado: 'found', intento: attempt });
    expect(service.recuperar('user:5')).toEqual({ estado: 'none' });
  });

  it('clears only the matching attempt after it is resolved', () => {
    const attempt = service.preparar('user:4', payload, 45);
    service.limpiar('user:4', { ...attempt, idempotencyKey: crypto.randomUUID() });
    expect(service.recuperar('user:4').estado).toBe('found');

    service.limpiar('user:4', attempt);
    expect(service.recuperar('user:4')).toEqual({ estado: 'none' });

    const nextAttempt = service.preparar('user:4', payload, 45);
    expect(nextAttempt.idempotencyKey).not.toBe(attempt.idempotencyKey);
  });
});
