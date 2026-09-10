import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';
import Impresiones from './impresiones';

describe('Filtros de impresiones', () => {
  let fixture: ComponentFixture<Impresiones>;
  let component: Impresiones;
  let http: HttpTestingController;
  const ejemplares = [
    { id: 1, codigo: 'ABC-01', titulo: 'Teología', autores: ['José Pérez'], anho: '2020',
      isbn: '9781234567890', areas: ['Religión'], categoria: 'Ensayo', estadoEjemplar: 'Disponible',
      condicionFisica: 'Bueno', ubicacion: 'Estante A', numeroCopia: 1 },
    { id: 2, codigo: 'ABC-02', titulo: 'Historia', autores: [], anho: '2021',
      areas: ['Historia'], categoria: 'Ensayo', estadoEjemplar: 'Prestado',
      condicionFisica: 'Regular', ubicacion: 'Estante B', numeroCopia: 10 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Impresiones],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        provideNoopAnimations(), MessageService]
    }).compileComponents();
    fixture = TestBed.createComponent(Impresiones);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  function cargar(error = false) {
    const catalogos: Record<string, string[]> = {
      areas: ['Religión', 'Historia', 'Filosofía'], categorias: ['Ensayo'],
      'estados-ejemplares': ['Disponible', 'Prestado'], 'condicion-fisica-ejemplar': ['Bueno', 'Regular']
    };
    for (const [ruta, nombres] of Object.entries(catalogos)) {
      http.expectOne(`${environment.apiURL}/${ruta}`).flush(nombres.map((nombre, id) => ({ id, nombre })));
    }
    const request = http.expectOne(`${environment.apiURL}/ejemplares/impresion`);
    if (error) request.flush({}, { status: 403, statusText: 'Forbidden' });
    else request.flush(ejemplares);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('carga las opciones desde las rutas reales de catálogos', () => {
    cargar();
    expect(component.areasOptions).toContain('Filosofía');
    expect(component.ejemplaresFiltrados.length).toBe(2);
  });

  it('filtra desde el input con el texto recién escrito e ignora acentos', async () => {
    cargar();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[aria-label="Buscar libros y ejemplares"]');
    input.value = 'teologia';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.ejemplaresFiltrados.map(e => e.id)).toEqual([1]);
    expect(fixture.nativeElement.querySelectorAll('.ejemplar-card').length).toBe(1);
  });

  it('combina área, estado, ubicación y número de copia exacto', () => {
    cargar();
    component.areasSeleccionadas = ['Religión'];
    component.filtros.estadoEjemplar = 'Disponible';
    component.filtros.ubicacion = 'estante a';
    component.filtros.numeroCopia = '1';
    component.filtrarEjemplares();
    expect(component.ejemplaresFiltrados.map(e => e.id)).toEqual([1]);
    component.filtros.condicionFisica = 'Regular';
    component.filtrarEjemplares();
    expect(component.ejemplaresFiltrados).toEqual([]);
  });

  it('busca ISBN sin separadores y limpia sin perder la selección', () => {
    cargar();
    component.toggleEjemplar(component.ejemplares[0]);
    component.filtroTexto = '9781234567890';
    component.filtrarEjemplares();
    expect(component.ejemplaresFiltrados.length).toBe(1);
    component.limpiarFiltros();
    expect(component.ejemplaresFiltrados.length).toBe(2);
    expect(component.ejemplaresSeleccionados.map(e => e.id)).toEqual([1]);
  });

  it('distingue los errores de carga de una búsqueda sin coincidencias', () => {
    cargar(true);
    expect(component.errorCarga).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
    expect(fixture.nativeElement.textContent).not.toContain('No se encontraron ejemplares');
  });
});
