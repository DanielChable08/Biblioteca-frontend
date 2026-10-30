import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { PagoMultaPayload } from '../models/biblioteca';
import { PagoService } from './pago.service';

describe('PagoService', () => {
  let service: PagoService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PagoService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('sends the supplied idempotency key and unchanged multi-fine body only on payment registration', () => {
    const key = '9fbd7c06-36e9-4c78-8772-c8866db0d08f';
    const payload: PagoMultaPayload = {
      montoRecibido: 75,
      cajero: 4,
      lectorPago: 8,
      idsMultas: [21, 22]
    };

    service.registrarPago(payload, key).subscribe();

    const request = httpTesting.expectOne(`${environment.apiURL}/pagos`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe(key);
    expect(request.request.body).toEqual(payload);
    request.flush({});
  });

  it('does not add the idempotency header to payment reads', () => {
    service.getPagos().subscribe();

    const request = httpTesting.expectOne(`${environment.apiURL}/pagos`);
    expect(request.request.headers.has('Idempotency-Key')).toBeFalse();
    request.flush([]);
  });
});
