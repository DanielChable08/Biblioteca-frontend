import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, Subject, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { MultaService } from '../../services/multa.service';
import { PrestamoService } from '../../services/prestamo.service';
import { PersonaService } from '../../services/persona.service';
import { DetallePrestamo, Multa, Prestamo } from '../../models/biblioteca';
import { MultaListaComponent } from './multa-lista';

describe('MultaListaComponent', () => {
  let fixture: ComponentFixture<MultaListaComponent>;
  let component: MultaListaComponent;
  let multaService: jasmine.SpyObj<MultaService>;
  let prestamoService: jasmine.SpyObj<PrestamoService>;
  let catalogService: jasmine.SpyObj<CatalogService>;
  let personaService: jasmine.SpyObj<PersonaService>;

  const prestamoA: Prestamo = {
    id: 41,
    uuid: 'prestamo-a',
    fechaPrestamo: '2026-10-01T10:00:00',
    fechaLimite: '2026-10-08T10:00:00',
    idBibliotecario: 1,
    idLector: 2,
    idEstadoPrestamo: 1
  };
  const prestamoB: Prestamo = {
    id: 42,
    uuid: 'prestamo-b',
    fechaPrestamo: '2026-10-02T10:00:00',
    fechaLimite: '2026-10-09T10:00:00',
    idBibliotecario: 1,
    idLector: 3,
    idEstadoPrestamo: 1
  };

  const detalle = (id: number): DetallePrestamo => ({
    id,
    idEjemplar: id,
    idEstadoPrestamo: 1,
    ejemplar: { id, codigo: `E-${id}` }
  });

  const multa = (uuid: string, idPrestamoDetalle: number, uuidPrestamo?: string): Multa => ({
    id: idPrestamoDetalle,
    uuid,
    ...(uuidPrestamo ? { uuidPrestamo } : {}),
    monto: 25,
    fechaEmision: '2026-10-10T10:00:00',
    idPrestamoDetalle,
    idMotivoMulta: 1,
    idEstadoMulta: 1
  });

  beforeEach(async () => {
    multaService = jasmine.createSpyObj<MultaService>('MultaService', [
      'getMultas', 'getEstadosMultas', 'getMotivosMultas', 'getMultaById', 'condonarMulta'
    ]);
    prestamoService = jasmine.createSpyObj<PrestamoService>('PrestamoService', [
      'getPrestamos', 'getPrestamoByUuid', 'getPersonas', 'getDetallesPrestamo'
    ]);
    catalogService = jasmine.createSpyObj<CatalogService>('CatalogService', ['getEstadosPrestamos']);
    personaService = jasmine.createSpyObj<PersonaService>('PersonaService', ['getPersonaById']);

    multaService.getMultas.and.returnValue(of({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true
    } as any));
    multaService.getEstadosMultas.and.returnValue(of([]));
    multaService.getMotivosMultas.and.returnValue(of([]));
    prestamoService.getPrestamoByUuid.and.returnValue(of(prestamoB));
    prestamoService.getPersonas.and.returnValue(of([
      { id: 1, nombre: 'Bibliotecaria', apPaterno: 'Ejemplo' } as any,
      { id: 2, nombre: 'Lector A', apPaterno: 'Ejemplo' } as any,
      { id: 3, nombre: 'Lector B', apPaterno: 'Ejemplo' } as any
    ]));
    personaService.getPersonaById.and.callFake((id: number) => of(({
      1: { id: 1, nombre: 'Bibliotecaria', apPaterno: 'Ejemplo' },
      2: { id: 2, nombre: 'Lector A', apPaterno: 'Ejemplo' },
      3: { id: 3, nombre: 'Lector B', apPaterno: 'Ejemplo' }
    } as Record<number, any>)[id]));
    catalogService.getEstadosPrestamos.and.returnValue(of([
      { id: 1, nombre: 'Activo' } as any
    ]));

    await TestBed.configureTestingModule({
      imports: [MultaListaComponent],
      providers: [
        { provide: MultaService, useValue: multaService },
        { provide: PrestamoService, useValue: prestamoService },
        { provide: CatalogService, useValue: catalogService },
        { provide: PersonaService, useValue: personaService },
        { provide: AuthService, useValue: { hasPermission: () => true, isAdmin: () => false } },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MultaListaComponent);
    component = fixture.componentInstance;
    component.loadData();
    multaService.getMultaById.calls.reset();
    prestamoService.getPrestamos.calls.reset();
    prestamoService.getPrestamoByUuid.calls.reset();
    prestamoService.getPersonas.calls.reset();
    prestamoService.getDetallesPrestamo.calls.reset();
    catalogService.getEstadosPrestamos.calls.reset();
    personaService.getPersonaById.calls.reset();
  });

  it('loads the multa screen without requesting the full loan list, then opens details without it', () => {
    const multaSeleccionada = multa('multa-a', 701, prestamoB.uuid);
    prestamoService.getPrestamoByUuid.and.returnValue(of(prestamoB));
    prestamoService.getDetallesPrestamo.and.returnValue(of([detalle(701)]));

    expect(multaService.getMultas).toHaveBeenCalledTimes(1);
    expect(multaService.getEstadosMultas).not.toHaveBeenCalled();
    expect(multaService.getMotivosMultas).not.toHaveBeenCalled();
    expect(prestamoService.getPersonas).not.toHaveBeenCalled();
    expect(prestamoService.getPrestamos).not.toHaveBeenCalled();

    component.verDetallesPrestamo(multaSeleccionada);

    expect(multaService.getMultaById).not.toHaveBeenCalled();
    expect(prestamoService.getPrestamos).not.toHaveBeenCalled();
    expect(prestamoService.getPrestamoByUuid).toHaveBeenCalledOnceWith('prestamo-b');
    expect(prestamoService.getDetallesPrestamo).toHaveBeenCalledOnceWith('prestamo-b');
    expect(personaService.getPersonaById).toHaveBeenCalledTimes(2);
    expect(component.loadingDetallesPrestamo).toBeFalse();
    expect(component.mostrarDetallePrestamo).toBeTrue();
  });

  it('discards an obsolete fine-page response after a newer page request', () => {
    const obsolete = new Subject<any>();
    const current = new Subject<any>();
    multaService.getMultas.and.returnValues(obsolete, current);

    component.loadData();
    component.page = 1;
    component.loadData();
    obsolete.next({
      content: [multa('old', 501)], totalElements: 1, totalPages: 1, size: 10, number: 0, first: true, last: true
    });
    current.next({
      content: [multa('new', 601)], totalElements: 1, totalPages: 1, size: 10, number: 1, first: false, last: true
    });

    expect(component.multas.map(item => item.uuid)).toEqual(['new']);
  });

  it('uses targeted lookup requests on first open without fetching full lists or the multa again', () => {
    const multaSeleccionada = multa('multa-a', 701, prestamoB.uuid);
    const detalleMultado: DetallePrestamo = { ...detalle(701), idPrestamo: prestamoB.id };
    prestamoService.getDetallesPrestamo.and.returnValue(of([detalle(700), detalle(701), detalle(702)]));
    prestamoService.getPrestamoByUuid.and.returnValue(of(prestamoB));

    component.verDetallesPrestamo(multaSeleccionada);

    expect(multaService.getMultaById).not.toHaveBeenCalled();
    expect(prestamoService.getPrestamoByUuid).toHaveBeenCalledOnceWith('prestamo-b');
    expect(prestamoService.getDetallesPrestamo).toHaveBeenCalledOnceWith('prestamo-b');
    expect(prestamoService.getPrestamos).not.toHaveBeenCalled();
    expect(prestamoService.getPersonas).not.toHaveBeenCalled();
    expect(catalogService.getEstadosPrestamos).toHaveBeenCalledTimes(1);
    expect(multaService.getMultaById.calls.count()
      + prestamoService.getPrestamoByUuid.calls.count()
      + prestamoService.getDetallesPrestamo.calls.count()
      + catalogService.getEstadosPrestamos.calls.count()
      + personaService.getPersonaById.calls.count()).toBe(5);
    expect(component.prestamoDetalleActual?.id).toBe(prestamoB.id);
    expect(component.prestamoDetalleActual?.lector?.nombre).toBe('Lector B');
    expect(component.prestamoDetalleActual?.bibliotecario?.nombre).toBe('Bibliotecaria');
    expect(component.detallesPrestamoActual.map(item => item.id)).toEqual([700, 701, 702]);
    expect(component.highlightPrestamoDetalleId).toBe(701);
    expect(component.loadingDetallesPrestamo).toBeFalse();
  });

  for (const [status, expectedMessage] of [
    [0, 'No se pudo conectar con el servidor al cargar el préstamo asociado a esta multa.'],
    [403, 'No tienes permisos para consultar los detalles de este préstamo.'],
    [404, 'No se encontró el préstamo o sus detalles asociados a esta multa.'],
    [500, 'El servidor no pudo cargar los detalles del préstamo. Inténtalo de nuevo.']
  ] as const) {
    it(`shows a user-facing message for HTTP ${status} detail errors`, () => {
      const messageService = fixture.debugElement.injector.get(MessageService);
      spyOn(messageService, 'add');
      prestamoService.getPrestamoByUuid.and.returnValue(throwError(() => new HttpErrorResponse({
        status,
        statusText: 'Request failed',
        url: '/sdt/v1/prestamos/prestamo-b'
      })));

      component.verDetallesPrestamo(multa('multa-a', 701, prestamoB.uuid));

      expect(component.mostrarDetallePrestamo).toBeFalse();
      expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ detail: expectedMessage }));
    });
  }

  it('cancels the previous request when selecting another multa quickly', () => {
    const primeraMulta = multa('multa-a', 701, prestamoA.uuid);
    const segundaMulta = multa('multa-b', 801, prestamoB.uuid);
    const respuestaObsoleta = new Subject<Prestamo>();
    let solicitudObsoletaCancelada = false;
    const respuestaCancelable = new Observable<Prestamo>(observer => {
      const subscription = respuestaObsoleta.subscribe(observer);
      return () => {
        solicitudObsoletaCancelada = true;
        subscription.unsubscribe();
      };
    });
    prestamoService.getPrestamoByUuid.and.returnValues(respuestaCancelable, of(prestamoB));
    prestamoService.getDetallesPrestamo.and.returnValues(of([detalle(701)]), of([detalle(801)]));

    component.verDetallesPrestamo(primeraMulta);
    expect(component.highlightPrestamoDetalleId).toBe(701);
    component.verDetallesPrestamo(segundaMulta);
    respuestaObsoleta.next(prestamoA);

    expect(component.prestamoDetalleActual?.id).toBe(prestamoB.id);
    expect(component.detallesPrestamoActual.map(item => item.id)).toEqual([801]);
    expect(component.highlightPrestamoDetalleId).toBe(801);
    expect(multaService.getMultaById).not.toHaveBeenCalled();
    expect(prestamoService.getPrestamoByUuid).toHaveBeenCalledTimes(2);
    expect(personaService.getPersonaById).toHaveBeenCalledTimes(2);
    expect(prestamoService.getPrestamoByUuid).toHaveBeenCalledWith('prestamo-a');
    expect(prestamoService.getPrestamoByUuid).toHaveBeenCalledWith('prestamo-b');
    expect(solicitudObsoletaCancelada).toBeTrue();
  });

  it('reuses the loaded loan-state catalog when the dialog is reopened', () => {
    const multaSeleccionada = multa('multa-a', 701, prestamoB.uuid);
    prestamoService.getDetallesPrestamo.and.returnValues(of([detalle(701)]), of([detalle(701)]));
    prestamoService.getPrestamoByUuid.and.returnValue(of(prestamoB));

    component.verDetallesPrestamo(multaSeleccionada);
    component.cerrarDetallePrestamo();
    component.verDetallesPrestamo(multaSeleccionada);

    expect(multaService.getMultaById).not.toHaveBeenCalled();
    expect(prestamoService.getPrestamos).not.toHaveBeenCalled();
    expect(prestamoService.getPersonas).not.toHaveBeenCalled();
    expect(prestamoService.getPrestamoByUuid).toHaveBeenCalledTimes(2);
    expect(catalogService.getEstadosPrestamos).toHaveBeenCalledTimes(1);
    expect(prestamoService.getDetallesPrestamo).toHaveBeenCalledTimes(2);
    expect(multaService.getMultaById.calls.count()
      + prestamoService.getPrestamoByUuid.calls.count()
      + prestamoService.getDetallesPrestamo.calls.count()
      + catalogService.getEstadosPrestamos.calls.count()
      + personaService.getPersonaById.calls.count()).toBe(7);
  });

  it('cancels pending requests when closing and does not reopen stale data', () => {
    const multaSeleccionada = multa('multa-a', 701, prestamoA.uuid);
    const respuestaPendiente = new Subject<Prestamo>();
    prestamoService.getPrestamoByUuid.and.returnValue(respuestaPendiente);
    prestamoService.getDetallesPrestamo.and.returnValue(of([detalle(701)]));

    component.verDetallesPrestamo(multaSeleccionada);
    component.cerrarDetallePrestamo();
    respuestaPendiente.next(prestamoA);

    expect(component.mostrarDetallePrestamo).toBeFalse();
    expect(component.prestamoDetalleActual).toBeNull();
    expect(component.detallesPrestamoActual).toEqual([]);
    expect(component.highlightPrestamoDetalleId).toBeNull();
    expect(prestamoService.getPrestamoByUuid).toHaveBeenCalledOnceWith('prestamo-a');
  });

  it('falls back to the individual multa response when an older list DTO omits the loan UUID', () => {
    const multaSeleccionada = multa('multa-antigua', 901);
    multaService.getMultaById.and.returnValue(of({ ...multaSeleccionada, uuidPrestamo: prestamoB.uuid }));
    prestamoService.getPrestamoByUuid.and.returnValue(of(prestamoB));
    prestamoService.getDetallesPrestamo.and.returnValue(of([detalle(901)]));

    component.verDetallesPrestamo(multaSeleccionada);

    expect(multaService.getMultaById).toHaveBeenCalledOnceWith('multa-antigua');
    expect(prestamoService.getPrestamoByUuid).toHaveBeenCalledOnceWith('prestamo-b');
    expect(component.highlightPrestamoDetalleId).toBe(901);
  });

  it('clears the selected detail and highlight when the dialog closes', () => {
    component.mostrarDetallePrestamo = true;
    component.prestamoDetalleActual = prestamoA;
    component.detallesPrestamoActual = [detalle(701)];
    component.highlightPrestamoDetalleId = 701;

    component.cerrarDetallePrestamo();

    expect(component.mostrarDetallePrestamo).toBeFalse();
    expect(component.prestamoDetalleActual).toBeNull();
    expect(component.detallesPrestamoActual).toEqual([]);
    expect(component.highlightPrestamoDetalleId).toBeNull();
  });
});
