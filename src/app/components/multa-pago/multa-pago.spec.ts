import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, of, Subject, throwError } from 'rxjs';

import { PagoMulta } from '../../models/biblioteca';
import { AuthService } from '../../services/auth.service';
import { MultaService } from '../../services/multa.service';
import { PagoIntentoService } from '../../services/pago-intento.service';
import { PagoService } from '../../services/pago.service';
import { PrintTicketService } from '../../services/print-ticket.service';
import { MultaPagoComponent } from './multa-pago';

describe('MultaPagoComponent', () => {
  const multa = {
    id: 7,
    monto: 25,
    fechaEmision: '2026-10-01',
    idEstadoMulta: 1,
    idMotivoMulta: 2,
    idPersona: 8,
    diasRetraso: 2,
    montoPorDia: 12.5
  };
  const pagoCreado: PagoMulta = {
    id: 1,
    fechaPago: '2026-10-29T12:00:00',
    total: 25,
    montoRecibido: 30,
    cambio: 5,
    moneda: 'MXN',
    metodoPago: 'Efectivo',
    folio: 'PM-TEST',
    anulado: false,
    uuid: 'pago-uuid',
    lectorPago: {} as any,
    cajero: {} as any
  };

  let fixture: ComponentFixture<MultaPagoComponent>;
  let component: MultaPagoComponent;
  let multaService: jasmine.SpyObj<MultaService>;
  let pagoService: jasmine.SpyObj<PagoService>;
  let router: jasmine.SpyObj<Router>;
  let printService: jasmine.SpyObj<PrintTicketService>;
  let pagoIntentoService: PagoIntentoService;
  let messages: jasmine.Spy;

  beforeEach(async () => {
    sessionStorage.clear();
    multaService = jasmine.createSpyObj<MultaService>('MultaService', [
    'getMultas', 'getMultasByIds'
    ]);
    multaService.getMultas.and.returnValue(of({
      content: [{ ...multa, lectorNombre: 'Lector Prueba', motivoMultaNombre: 'Retraso', estadoMultaNombre: 'Emitida' }],
      totalElements: 1, totalPages: 1, size: 10, number: 0, first: true, last: true
    } as any));
    multaService.getMultasByIds.and.returnValue(of([
      { ...multa, lectorNombre: 'Lector Prueba', motivoMultaNombre: 'Retraso', estadoMultaNombre: 'Emitida' }
    ] as any));

    pagoService = jasmine.createSpyObj<PagoService>('PagoService', ['registrarPago']);
    pagoService.registrarPago.and.returnValue(new Subject<PagoMulta>() as Observable<PagoMulta>);

    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    printService = jasmine.createSpyObj<PrintTicketService>('PrintTicketService', ['imprimirTicketPago']);
    const authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getCurrentUserScope', 'getCurrentPersonaId'
    ]);
    authService.getCurrentUserScope.and.returnValue('user:4');
    authService.getCurrentPersonaId.and.returnValue(4);

    await TestBed.configureTestingModule({
      imports: [MultaPagoComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MultaService, useValue: multaService },
        { provide: PagoService, useValue: pagoService },
        { provide: Router, useValue: router },
        { provide: PrintTicketService, useValue: printService },
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    pagoIntentoService = TestBed.inject(PagoIntentoService);
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(MultaPagoComponent);
    component = fixture.componentInstance;
    messages = spyOn(fixture.debugElement.injector.get(MessageService), 'add');
    fixture.detectChanges();
  }

  function seleccionarMulta(): void {
    component.multas[0].seleccionada = true;
    component.actualizarTotal();
    component.montoRecibido = 30;
    component.calcularCambio();
  }

  it('does not issue a second request on a double click', () => {
    createComponent();
    seleccionarMulta();

    component.procesarPago();
    component.procesarPago();

    expect(pagoService.registrarPago).toHaveBeenCalledTimes(1);
    const [body, key] = pagoService.registrarPago.calls.first().args;
    expect(body).toEqual({ montoRecibido: 30, cajero: 4, lectorPago: 8, idsMultas: [7] });
    expect(key).toMatch(/^[0-9a-f-]{36}$/i);
    expect(component.procesando).toBeTrue();
  });

  it('preserves selected fines and totals while moving across server pages', () => {
    createComponent();
    const secondFine = { ...multa, id: 8, monto: 15, fechaEmision: '2026-10-02' };
    multaService.getMultas.and.callFake((options: any) => of({
      content: [options.page === 0 ? multa : secondFine],
      totalElements: 2, totalPages: 2, size: 1, number: options.page,
      first: options.page === 0, last: options.page === 1
    } as any));
    component.pageSize = 1;
    component.loadMultasPendientes();

    component.multas[0].seleccionada = true;
    component.actualizarTotal();
    component.onPageChange({ first: 1, rows: 1 });

    expect(component.multas[0].id).toBe(8);
    expect(component.multasSeleccionadas.map(item => item.id)).toEqual([7]);
    expect(component.totalSeleccionado).toBe(25);

    component.multas[0].seleccionada = true;
    component.actualizarTotal();
    expect(component.multasSeleccionadas.map(item => item.id)).toEqual([7, 8]);
    expect(component.totalSeleccionado).toBe(40);
  });

  it('keeps the same key and body after a network error and retries only on user action', () => {
    createComponent();
    seleccionarMulta();
    const retryResponse = new Subject<PagoMulta>();
    pagoService.registrarPago.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      retryResponse
    );

    component.procesarPago();
    expect(component.procesando).toBeFalse();
    expect(component.intentoPendiente).not.toBeNull();
    expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({
      detail: jasmine.stringMatching(/No pudimos confirmar el resultado/)
    }));
    expect(pagoService.registrarPago).toHaveBeenCalledTimes(1);

    component.procesarPago();
    expect(pagoService.registrarPago).toHaveBeenCalledTimes(2);
    expect(pagoService.registrarPago.calls.argsFor(1)).toEqual(
      pagoService.registrarPago.calls.argsFor(0)
    );
  });

  [408, 429, 500].forEach((status) => {
    it(`preserves the saved operation after uncertain HTTP ${status}`, () => {
      createComponent();
      seleccionarMulta();
      pagoService.registrarPago.and.returnValue(throwError(() => new HttpErrorResponse({ status })));

      component.procesarPago();

      expect(component.intentoPendiente).not.toBeNull();
      expect(pagoIntentoService.recuperar('user:4').estado).toBe('found');
      expect(component.procesando).toBeFalse();
      expect(pagoService.registrarPago).toHaveBeenCalledTimes(1);
    });
  });

  it('preserves the attempt when the backend reports the same key is still processing', () => {
    createComponent();
    seleccionarMulta();
    pagoService.registrarPago.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { error: 'La clave Idempotency-Key está siendo procesada. Reintenta la misma solicitud con esa clave.' }
    })));

    component.procesarPago();

    expect(component.intentoPendiente).not.toBeNull();
    expect(pagoIntentoService.recuperar('user:4').estado).toBe('found');
    expect(component.procesando).toBeFalse();
  });

  it('preserves an unknown 409 and allows only a manual retry of the same operation', () => {
    createComponent();
    seleccionarMulta();
    const retryResponse = new Subject<PagoMulta>();
    pagoService.registrarPago.and.returnValues(
      throwError(() => new HttpErrorResponse({
        status: 409,
        error: { error: 'Conflicto no identificado por el cliente.' }
      })),
      retryResponse
    );

    component.procesarPago();

    expect(pagoService.registrarPago).toHaveBeenCalledTimes(1);
    expect(component.procesando).toBeFalse();
    expect(component.edicionBloqueada).toBeTrue();
    expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({
      summary: 'Pago pendiente de confirmación',
      detail: jasmine.stringMatching(/conflicto no identificado.*confirmar el estado del pago/i)
    }));

    const originalRequest = pagoService.registrarPago.calls.argsFor(0);
    const stored = pagoIntentoService.recuperar('user:4');
    expect(stored.estado).toBe('found');
    if (stored.estado !== 'found') return;
    expect(stored.intento.idempotencyKey).toBe(originalRequest[1]);
    expect(stored.intento.payload).toEqual(originalRequest[0]);

    component.multas[0].seleccionada = false;
    component.montoRecibido = 999;
    component.actualizarTotal();
    expect(component.multasSeleccionadas.map(item => item.id)).toEqual([7]);
    expect(component.totalSeleccionado).toBe(25);
    expect(pagoService.registrarPago).toHaveBeenCalledTimes(1);

    component.procesarPago();

    expect(pagoService.registrarPago).toHaveBeenCalledTimes(2);
    expect(pagoService.registrarPago.calls.argsFor(1)).toEqual(originalRequest);
    expect(component.intentoPendiente?.idempotencyKey).toBe(originalRequest[1]);
    expect(component.intentoPendiente?.payload).toEqual(originalRequest[0]);
  });

  it('refreshes multas and finalizes a rejected attempt when a fine is already paid', () => {
    createComponent();
    seleccionarMulta();
    pagoService.registrarPago.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { error: 'La multa 7 ya está asociada a un pago.' }
    })));
    const initialRefreshes = multaService.getMultas.calls.count();

    component.procesarPago();

    expect(multaService.getMultas.calls.count()).toBe(initialRefreshes + 1);
    expect(component.intentoPendiente).toBeNull();
    expect(component.multasSeleccionadas).toEqual([]);
    expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({ summary: 'Multa no disponible' }));
  });

  it('does not automatically retry a key reused with different data', () => {
    createComponent();
    seleccionarMulta();
    pagoService.registrarPago.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { error: 'La clave Idempotency-Key ya fue utilizada con datos distintos.' }
    })));

    component.procesarPago();

    expect(pagoService.registrarPago).toHaveBeenCalledTimes(1);
    expect(component.intentoPendiente).toBeNull();
    expect(pagoIntentoService.recuperar('user:4').estado).toBe('none');
  });

  it('recovers after reload and retries the saved multi-fine body with its original key', () => {
    const saved = pagoIntentoService.preparar('user:4', {
      montoRecibido: 75,
      cajero: 4,
      lectorPago: 8,
      idsMultas: [7, 9]
    }, 65);
    createComponent();
    const restoredAttempt = component.intentoPendiente;
    pagoService.registrarPago.and.returnValue(new Subject<PagoMulta>());

    component.procesarPago();

    expect(restoredAttempt).toEqual(saved);
    expect(pagoService.registrarPago).toHaveBeenCalledOnceWith(saved.payload, saved.idempotencyKey);
    expect(component.edicionBloqueada).toBeTrue();
  });

  it('clears a successful attempt, prints the existing ticket and refreshes the pending fines', fakeAsync(() => {
    createComponent();
    seleccionarMulta();
    pagoService.registrarPago.and.returnValue(of(pagoCreado));
    const initialRefreshes = multaService.getMultas.calls.count();

    component.procesarPago();
    tick(2000);

    expect(component.intentoPendiente).toBeNull();
    expect(pagoIntentoService.recuperar('user:4').estado).toBe('none');
    expect(printService.imprimirTicketPago).toHaveBeenCalledTimes(1);
    expect(multaService.getMultas.calls.count()).toBe(initialRefreshes + 1);
    expect(router.navigate).toHaveBeenCalledWith(['/admin/multas']);
  }));
});
