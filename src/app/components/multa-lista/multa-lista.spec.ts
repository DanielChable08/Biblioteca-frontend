import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { MultaService } from '../../services/multa.service';
import { PrestamoService } from '../../services/prestamo.service';
import { DetallePrestamo, Multa, Prestamo } from '../../models/biblioteca';
import { MultaListaComponent } from './multa-lista';

describe('MultaListaComponent', () => {
  let fixture: ComponentFixture<MultaListaComponent>;
  let component: MultaListaComponent;
  let multaService: jasmine.SpyObj<MultaService>;
  let prestamoService: jasmine.SpyObj<PrestamoService>;
  let catalogService: jasmine.SpyObj<CatalogService>;

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

  const multa = (uuid: string, idPrestamoDetalle: number): Multa => ({
    id: idPrestamoDetalle,
    uuid,
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
      'getPrestamos', 'getPersonas', 'getDetallesPrestamo'
    ]);
    catalogService = jasmine.createSpyObj<CatalogService>('CatalogService', ['getEstadosPrestamos']);

    multaService.getMultas.and.returnValue(of([]));
    multaService.getEstadosMultas.and.returnValue(of([]));
    multaService.getMotivosMultas.and.returnValue(of([]));
    prestamoService.getPrestamos.and.returnValue(of([prestamoA, prestamoB]));
    prestamoService.getPersonas.and.returnValue(of([
      { id: 1, nombre: 'Bibliotecaria', apPaterno: 'Ejemplo' } as any,
      { id: 2, nombre: 'Lector A', apPaterno: 'Ejemplo' } as any,
      { id: 3, nombre: 'Lector B', apPaterno: 'Ejemplo' } as any
    ]));
    catalogService.getEstadosPrestamos.and.returnValue(of([
      { id: 1, nombre: 'Activo' } as any
    ]));

    await TestBed.configureTestingModule({
      imports: [MultaListaComponent],
      providers: [
        { provide: MultaService, useValue: multaService },
        { provide: PrestamoService, useValue: prestamoService },
        { provide: CatalogService, useValue: catalogService },
        { provide: AuthService, useValue: { hasPermission: () => true, isAdmin: () => false } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MultaListaComponent);
    component = fixture.componentInstance;
  });

  it('loads the full loan and all of its details from the multa relation', () => {
    const multaSeleccionada = multa('multa-a', 701);
    const detalleMultado: DetallePrestamo = { ...detalle(701), idPrestamo: prestamoB.id };
    multaService.getMultaById.and.returnValue(of({
      ...multaSeleccionada,
      prestamoDetalle: detalleMultado
    }));
    prestamoService.getDetallesPrestamo.and.returnValue(of([detalle(700), detalle(701), detalle(702)]));

    component.verDetallesPrestamo(multaSeleccionada);

    expect(multaService.getMultaById).toHaveBeenCalledOnceWith('multa-a');
    expect(prestamoService.getDetallesPrestamo).toHaveBeenCalledOnceWith('prestamo-b');
    expect(component.prestamoDetalleActual?.id).toBe(prestamoB.id);
    expect(component.detallesPrestamoActual.map(item => item.id)).toEqual([700, 701, 702]);
    expect(component.highlightPrestamoDetalleId).toBe(701);
    expect(component.loadingDetallesPrestamo).toBeFalse();
  });

  it('clears the previous multa highlight when opening a different multa', () => {
    const primeraMulta = multa('multa-a', 701);
    const segundaMulta = multa('multa-b', 801);
    multaService.getMultaById.and.returnValues(
      of({ ...primeraMulta, prestamoDetalle: { ...detalle(701), idPrestamo: prestamoA.id } }),
      of({ ...segundaMulta, prestamoDetalle: { ...detalle(801), idPrestamo: prestamoB.id } })
    );
    prestamoService.getDetallesPrestamo.and.returnValues(of([detalle(701)]), of([detalle(801)]));

    component.verDetallesPrestamo(primeraMulta);
    expect(component.highlightPrestamoDetalleId).toBe(701);

    component.verDetallesPrestamo(segundaMulta);

    expect(component.prestamoDetalleActual?.id).toBe(prestamoB.id);
    expect(component.detallesPrestamoActual.map(item => item.id)).toEqual([801]);
    expect(component.highlightPrestamoDetalleId).toBe(801);
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
