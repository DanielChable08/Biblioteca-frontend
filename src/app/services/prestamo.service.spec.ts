import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PrestamoService } from './prestamo.service';
import { AltaCompletaPrestamoPayload } from '../models/prestamo-intento';
import { environment } from '../../environments/environment';

describe('PrestamoService', () => {
  let service: PrestamoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PrestamoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the complete loan and supplied idempotency key in one request', () => {
    const key = '550e8400-e29b-41d4-a716-446655440000';
    const payload: AltaCompletaPrestamoPayload = {
      prestamo: {
        fechaPrestamo: '2026-11-17T09:00:00',
        fechaLimite: '2026-11-24T09:00:00',
        idBibliotecario: 3,
        idLector: 9,
        idEstadoPrestamo: 7
      },
      idEjemplares: [12, 18]
    };

    service.createPrestamoCompleto(payload, key).subscribe();

    const request = http.expectOne(`${environment.apiURL}/prestamos/alta-completa`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe(key);
    expect(request.request.body).toEqual(payload);
    request.flush({ prestamo: { uuid: 'loan-uuid' }, detalles: [] });
  });
});
