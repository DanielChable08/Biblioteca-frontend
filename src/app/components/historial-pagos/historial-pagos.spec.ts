import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { PagoService } from '../../services/pago.service';
import { PersonaService } from '../../services/persona.service';
import HistorialPagos from './historial-pagos';

describe('HistorialPagos', () => {
  let component: HistorialPagos;
  let fixture: ComponentFixture<HistorialPagos>;
  let pagoService: jasmine.SpyObj<PagoService>;

  beforeEach(async () => {
    sessionStorage.clear();
    pagoService = jasmine.createSpyObj<PagoService>('PagoService', ['getPagos']);
    pagoService.getPagos.and.returnValue(of({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true
    } as any));
    const personaService = jasmine.createSpyObj<PersonaService>('PersonaService', ['getPersonaById']);
    personaService.getPersonaById.and.returnValue(of({ id: 17, nombre: 'Lector', apPaterno: 'QA' } as any));

    await TestBed.configureTestingModule({
      imports: [HistorialPagos],
      providers: [
        { provide: PagoService, useValue: pagoService },
        { provide: PersonaService, useValue: personaService },
        { provide: ActivatedRoute, useValue: { snapshot: { params: { idLector: '17' } } } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HistorialPagos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads only the selected reader payment page and keeps Spring page metadata', () => {
    expect(component).toBeTruthy();
    expect(pagoService.getPagos).toHaveBeenCalledOnceWith({
      page: 0, size: 10, sortBy: 'fechaPago', sortDirection: 'desc', lectorId: 17
    });
  });

  it('requests another page while preserving the reader filter', () => {
    component.onPageChange({ first: 10, rows: 10 });
    expect(pagoService.getPagos).toHaveBeenCalledWith({
      page: 1, size: 10, sortBy: 'fechaPago', sortDirection: 'desc', lectorId: 17
    });
  });
});
