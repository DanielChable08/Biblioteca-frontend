import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { MultaService } from '../../services/multa.service';
import { PagoService } from '../../services/pago.service';
import { PersonaService } from '../../services/persona.service';
import { PrestamoService } from '../../services/prestamo.service';
import PersonaDetalle from './persona-detalle';

describe('PersonaDetalle', () => {
  let component: PersonaDetalle;
  let fixture: ComponentFixture<PersonaDetalle>;
  let prestamoService: jasmine.SpyObj<PrestamoService>;
  let personaService: jasmine.SpyObj<PersonaService>;

  beforeEach(async () => {
    prestamoService = jasmine.createSpyObj<PrestamoService>('PrestamoService', ['getPrestamos', 'getPersonas']);
    prestamoService.getPrestamos.and.returnValue(of({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true
    } as any));
    prestamoService.getPersonas.and.returnValue(of([]));

    personaService = jasmine.createSpyObj<PersonaService>('PersonaService', ['getPersonaByUuid']);
    personaService.getPersonaByUuid.and.returnValue(of({ id: 1 } as any));

    const catalogService = jasmine.createSpyObj<CatalogService>('CatalogService', [
      'getTiposPersonas', 'getEstadosPrestamos'
    ]);
    catalogService.getTiposPersonas.and.returnValue(of([]));
    catalogService.getEstadosPrestamos.and.returnValue(of([]));

    const multaService = jasmine.createSpyObj<MultaService>('MultaService', [
      'getMultas', 'getEstadosMultas', 'getMotivosMultas'
    ]);
    multaService.getMultas.and.returnValue(of({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true
    } as any));
    multaService.getEstadosMultas.and.returnValue(of([]));
    multaService.getMotivosMultas.and.returnValue(of([]));

    const pagoService = jasmine.createSpyObj<PagoService>('PagoService', ['getPagos']);
    pagoService.getPagos.and.returnValue(of({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true
    } as any));

    await TestBed.configureTestingModule({
      imports: [PersonaDetalle],
      providers: [
        { provide: AuthService, useValue: { isAdmin: () => false, hasPermission: () => true } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: PersonaService, useValue: personaService },
        { provide: PagoService, useValue: pagoService },
        { provide: CatalogService, useValue: catalogService },
        { provide: PrestamoService, useValue: prestamoService },
        { provide: MultaService, useValue: multaService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PersonaDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('cancels a pending loan history request when leaving the person screen', () => {
    let requestUnsubscribed = false;
    prestamoService.getPrestamos.and.returnValue(new Observable<any>(() => () => {
      requestUnsubscribed = true;
    }));

    component.cargarHistoriales(1);
    expect(requestUnsubscribed).toBeFalse();

    fixture.destroy();

    expect(requestUnsubscribed).toBeTrue();
  });

  it('requests every loan-history page from the backend filtered to the selected person', () => {
    prestamoService.getPrestamos.and.returnValues(
      of({ content: [{ id: 51, idLector: 1, idBibliotecario: 2, idEstadoPrestamo: 3 }],
        totalElements: 11, totalPages: 2, size: 10, number: 0, first: true, last: false } as any),
      of({ content: [{ id: 52, idLector: 1, idBibliotecario: 2, idEstadoPrestamo: 3 }],
        totalElements: 11, totalPages: 2, size: 10, number: 1, first: false, last: true } as any)
    );

    component.cargarHistoriales(1);
    expect(prestamoService.getPrestamos).toHaveBeenCalledOnceWith(0, 10, 'fechaPrestamo', 'desc', '', 1);
    expect(component.prestamos.map(prestamo => prestamo.id)).toEqual([51]);
    expect(component.totalPrestamos).toBe(11);

    component.onPrestamosPageChange({ first: 10, rows: 10 });
    expect(prestamoService.getPrestamos).toHaveBeenCalledTimes(2);
    expect(prestamoService.getPrestamos).toHaveBeenCalledWith(1, 10, 'fechaPrestamo', 'desc', '', 1);
    expect(component.prestamos.map(prestamo => prestamo.id)).toEqual([52]);
    expect(component.totalPrestamos).toBe(11);
  });

  it('does not start a loan list request from a person response after leaving the screen', () => {
    const pendingPersona = new Subject<any>();
    personaService.getPersonaByUuid.and.returnValue(pendingPersona);

    component.loadPersonaDetalle('persona-1');
    fixture.destroy();
    pendingPersona.next({ id: 1 });

    expect(prestamoService.getPrestamos).not.toHaveBeenCalled();
  });
});
