import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetallePrestamo, Prestamo } from '../../models/biblioteca';
import { PrestamoDetalleComponent } from './prestamo-detalle';

describe('PrestamoDetalleComponent', () => {
  let fixture: ComponentFixture<PrestamoDetalleComponent>;
  let component: PrestamoDetalleComponent;

  const prestamo: Prestamo = {
    fechaPrestamo: '2026-10-01T10:00:00',
    fechaLimite: '2026-10-08T10:00:00',
    idBibliotecario: 1,
    idLector: 2,
    idEstadoPrestamo: 1
  };

  const detalle = (id: number): DetallePrestamo => ({
    id,
    idEjemplar: id,
    idEstadoPrestamo: 1,
    ejemplar: {
      id,
      codigo: `E-${id}`,
      libro: {
        id: 7,
        uuid: 'libro-compartido',
        titulo: 'Libro compartido'
      }
    }
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrestamoDetalleComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrestamoDetalleComponent);
    component = fixture.componentInstance;
    component.prestamo = prestamo;
  });

  it('renders all the details for a loan with one item and no highlight', () => {
    component.detalles = [detalle(10)];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.p-datatable-tbody > tr').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.detalle-multa-badge').length).toBe(0);
  });

  it('highlights only the matching detail id when a loan has multiple items', () => {
    component.detalles = [detalle(10), detalle(11), detalle(12)];
    component.highlightPrestamoDetalleId = 11;
    fixture.detectChanges();

    const highlightedRows = fixture.nativeElement.querySelectorAll('.p-datatable-tbody > tr.detalle-multado');
    expect(highlightedRows.length).toBe(1);
    expect(highlightedRows[0].textContent).toContain('E-11');
    expect(highlightedRows[0].textContent).toContain('Ejemplar asociado a esta multa');
  });

  it('does not highlight any item when the requested detail id is absent', () => {
    component.detalles = [detalle(10), detalle(11)];
    component.highlightPrestamoDetalleId = 99;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.detalle-multado').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.detalle-multa-badge').length).toBe(0);
  });

  it('clears the previous highlight when another selection is displayed', () => {
    component.detalles = [detalle(10), detalle(11)];
    component.highlightPrestamoDetalleId = 10;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.detalle-multado').textContent).toContain('E-10');

    component.highlightPrestamoDetalleId = 11;
    fixture.detectChanges();

    const highlightedRows = fixture.nativeElement.querySelectorAll('.detalle-multado');
    expect(highlightedRows.length).toBe(1);
    expect(highlightedRows[0].textContent).toContain('E-11');
  });

  it('shows a loading indicator while the loan itself is being loaded', () => {
    component.prestamo = null;
    component.loading = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando detalles del préstamo');
  });
});
