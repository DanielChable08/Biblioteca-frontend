import { fakeAsync, ComponentFixture, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { PrestamoService } from '../../services/prestamo.service';
import { PrintTicketService } from '../../services/print-ticket.service';
import PrestamoLista from './prestamo-lista';

describe('PrestamoLista', () => {
  let component: PrestamoLista;
  let fixture: ComponentFixture<PrestamoLista>;
  let prestamoService: jasmine.SpyObj<PrestamoService>;

  const prestamo = {
    id: 41,
    uuid: 'prestamo-a',
    fechaPrestamo: '2026-10-01T10:00:00',
    fechaLimite: '2026-10-08T10:00:00',
    idBibliotecario: 1,
    idLector: 2,
    idEstadoPrestamo: 1,
    lector: { id: 2, nombre: 'Lector', apPaterno: 'Ejemplo' },
    bibliotecario: { id: 1, nombre: 'Bibliotecario', apPaterno: 'Ejemplo' },
    estadoPrestamo: { id: 1, nombre: 'Activo' }
  } as any;

  beforeEach(async () => {
    prestamoService = jasmine.createSpyObj<PrestamoService>('PrestamoService', [
      'getPrestamos', 'getPersonas', 'getDetallesPrestamo'
    ]);
    prestamoService.getPrestamos.and.returnValue(of({
      content: [prestamo], totalElements: 1, totalPages: 1, size: 10, number: 0, first: true, last: true
    } as any));
    prestamoService.getPersonas.and.returnValue(of([
      { id: 1, nombre: 'Bibliotecario', apPaterno: 'Ejemplo' },
      { id: 2, nombre: 'Lector', apPaterno: 'Ejemplo' }
    ] as any));
    prestamoService.getDetallesPrestamo.and.returnValue(of([]));

    const catalogService = jasmine.createSpyObj<CatalogService>('CatalogService', ['getEstadosPrestamos']);
    catalogService.getEstadosPrestamos.and.returnValue(of([{ id: 1, nombre: 'Activo' }] as any));

    await TestBed.configureTestingModule({
      imports: [PrestamoLista],
      providers: [
        { provide: AuthService, useValue: { hasPermission: () => true } },
        { provide: PrestamoService, useValue: prestamoService },
        { provide: CatalogService, useValue: catalogService },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: PrintTicketService, useValue: { imprimirTicketPrestamo: jasmine.createSpy('imprimirTicketPrestamo') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PrestamoLista);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads and maps only the first server page', () => {
    expect(prestamoService.getPrestamos).toHaveBeenCalledOnceWith(0, 10, 'fechaPrestamo', 'desc', '');
    expect(component.prestamos.map(item => item.uuid)).toEqual([prestamo.uuid]);
    expect(component.prestamos[0].lector?.nombre).toBe('Lector');
    expect(component.prestamos[0].estadoPrestamo?.nombre).toBe('Activo');
    expect(component.totalRecords).toBe(1);
  });

  it('requests the selected server page and sort order', () => {
    prestamoService.getPrestamos.calls.reset();
    prestamoService.getPrestamos.and.returnValue(of({
      content: [prestamo], totalElements: 26, totalPages: 2, size: 25, number: 1, first: false, last: true
    } as any));

    component.onPageChange({ first: 25, rows: 25, sortField: 'fechaLimite', sortOrder: 1 });

    expect(prestamoService.getPrestamos).toHaveBeenCalledOnceWith(1, 25, 'fechaLimite', 'asc', '');
    expect(component.currentPage).toBe(1);
    expect(component.currentSize).toBe(25);
    expect(component.totalRecords).toBe(26);
  });

  it('debounces search and restarts from the first server page', fakeAsync(() => {
    prestamoService.getPrestamos.calls.reset();
    prestamoService.getPrestamos.and.returnValue(of({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true
    } as any));

    component.currentPage = 2;
    component.applyFilterGlobal(null, { target: { value: '  Lector Ejemplo  ' } } as any);
    tick(349);
    expect(prestamoService.getPrestamos).not.toHaveBeenCalled();
    tick(1);

    expect(prestamoService.getPrestamos).toHaveBeenCalledOnceWith(
      0, 10, 'fechaPrestamo', 'desc', 'Lector Ejemplo'
    );
  }));

  it('discards an older page response after navigating to another page', () => {
    const oldPage = new Subject<any>();
    const currentPage = new Subject<any>();
    prestamoService.getPrestamos.calls.reset();
    prestamoService.getPrestamos.and.returnValues(oldPage, currentPage);

    component.onPageChange({ first: 10, rows: 10 });
    component.onPageChange({ first: 20, rows: 10 });

    oldPage.next({ content: [{ ...prestamo, id: 91 }], totalElements: 30 } as any);
    oldPage.complete();
    currentPage.next({ content: [{ ...prestamo, id: 92 }], totalElements: 30 } as any);
    currentPage.complete();

    expect(component.prestamos.map(item => item.id)).toEqual([92]);
    expect(component.totalRecords).toBe(30);
  });

  it('requests only the selected loan details and requests them again after reopening', () => {
    component.verDetalles(prestamo);
    expect(prestamoService.getDetallesPrestamo).toHaveBeenCalledOnceWith(prestamo.uuid);

    component.cerrarModalDetalle();
    component.verDetalles(prestamo);

    expect(prestamoService.getDetallesPrestamo).toHaveBeenCalledTimes(2);
    expect(prestamoService.getPrestamos).toHaveBeenCalledTimes(1);
    expect(prestamoService.getPersonas).toHaveBeenCalledTimes(1);
  });

  it('cancels stale detail requests when changing loans and closing the modal', () => {
    let oldRequestCancelled = false;
    let closeRequestCancelled = false;
    const prestamoB = { ...prestamo, id: 42, uuid: 'prestamo-b' };
    prestamoService.getDetallesPrestamo.and.returnValues(
      new Observable<any>(() => () => oldRequestCancelled = true),
      new Observable<any>(() => () => closeRequestCancelled = true)
    );

    component.verDetalles(prestamo);
    component.verDetalles(prestamoB);
    expect(oldRequestCancelled).toBeTrue();
    expect(component.prestamoActual?.uuid).toBe(prestamoB.uuid);

    component.cerrarModalDetalle();
    expect(closeRequestCancelled).toBeTrue();
    expect(component.detallesPrestamo).toEqual([]);
    expect(component.loadingDetalles).toBeFalse();
  });

  it('cancels a pending return-detail request when closing the return modal', () => {
    let requestCancelled = false;
    prestamoService.getDetallesPrestamo.and.returnValue(new Observable<any>(() => () => requestCancelled = true));

    component.abrirModalDevolucion(prestamo);
    component.cerrarModalDevolucion();

    expect(requestCancelled).toBeTrue();
    expect(component.detallesDevolucion).toEqual([]);
    expect(component.loadingDevolucion).toBeFalse();
  });

  it('cancels a pending full loan list request when leaving the loans screen', () => {
    let requestUnsubscribed = false;
    prestamoService.getPrestamos.calls.reset();
    prestamoService.getPrestamos.and.returnValue(new Observable<any>(() => () => {
      requestUnsubscribed = true;
    }));

    component.loadData();

    expect(prestamoService.getPrestamos).toHaveBeenCalledTimes(1);
    expect(requestUnsubscribed).toBeFalse();

    fixture.destroy();

    expect(requestUnsubscribed).toBeTrue();
  });
});
