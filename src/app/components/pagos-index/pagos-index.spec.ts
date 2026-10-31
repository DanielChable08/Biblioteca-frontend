import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { PagoService } from '../../services/pago.service';
import PagosIndex from './pagos-index';

describe('PagosIndex', () => {
  let component: PagosIndex;
  let fixture: ComponentFixture<PagosIndex>;
  let pagoService: jasmine.SpyObj<PagoService>;

  beforeEach(async () => {
    pagoService = jasmine.createSpyObj<PagoService>('PagoService', ['getPagos']);
    pagoService.getPagos.and.returnValue(of({
      content: [], totalElements: 0, totalPages: 0, size: 10, number: 0, first: true, last: true
    } as any));
    await TestBed.configureTestingModule({
      imports: [PagosIndex],
      providers: [
        { provide: PagoService, useValue: pagoService },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PagosIndex);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the first server page with a bounded page size', () => {
    expect(component).toBeTruthy();
    expect(pagoService.getPagos).toHaveBeenCalledOnceWith({
      page: 0, size: 10, sortBy: 'fechaPago', sortDirection: 'desc', search: ''
    });
  });

  it('requests later pages from the service instead of slicing a local full list', () => {
    component.onPageChange({ first: 10, rows: 10, sortField: 'folio', sortOrder: 1 });
    expect(pagoService.getPagos).toHaveBeenCalledWith({
      page: 1, size: 10, sortBy: 'folio', sortDirection: 'asc', search: ''
    });
  });
});
