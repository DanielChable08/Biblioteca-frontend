import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import PrestamoFormulario from './prestamo-formulario';
import { Ejemplar } from '../../models/biblioteca';
import { PrestamoService } from '../../services/prestamo.service';
import { FechasNoHabilesResponse } from '../../models/calendario-institucional';

describe('PrestamoFormulario', () => {
  let component: PrestamoFormulario;
  let fixture: ComponentFixture<PrestamoFormulario>;
  let messages: jasmine.Spy;
  let calendarioRequest: jasmine.Spy;
  let prestamoService: PrestamoService;
  const ejemplar = (id: number): Ejemplar => ({
    id, codigo: `EJ${id}`, uuid: `uuid-${id}`, ubicacion: null,
    idLibro: id, idCondicionFisicaEjemplar: 1, idEstadoEjemplar: 1,
    libroOption: { id, titulo: `Libro ${id}`, edicion: '1', uuid: `libro-${id}` }
  });
  const key = (value: string) => new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrestamoFormulario],
      providers: [provideHttpClient(), provideRouter([]), provideNoopAnimations()]
    }).compileComponents();
    fixture = TestBed.createComponent(PrestamoFormulario);
    component = fixture.componentInstance;
    spyOn(component, 'loadCatalogos');
    component.catalogosListos = true;
    component.allEjemplares = Array.from({ length: 6 }, (_, i) => ejemplar(i + 1));
    component.ejemplaresDisponibles = component.allEjemplares.slice(0, 5);
    messages = spyOn(fixture.debugElement.injector.get(MessageService), 'add');
    prestamoService = fixture.debugElement.injector.get(PrestamoService);
    calendarioRequest = spyOn(prestamoService, 'getFechasNoHabiles').and.returnValue(of({
      fechasNoHabiles: ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-07', '2026-11-08'],
      coberturaCompleta: true
    }));
    fixture.detectChanges();
  });

  it('consulta el mes visible, bloquea las fechas institucionales y limpia una fecha que se vuelve inválida', () => {
    component.prestamoForm.get('fechaLimite')?.setValue(new Date(2026, 10, 2, 12));
    component.cargarFechasNoHabiles(new Date(2026, 10, 2));

    expect(calendarioRequest).toHaveBeenCalledOnceWith('2026-11-01', '2026-11-30');
    expect(component.fechasNoHabiles.map(date => date.getDate())).toContain(2);
    expect(component.prestamoForm.get('fechaLimite')?.value).toBeNull();
    expect(messages.calls.mostRecent().args[0].summary).toBe('Fecha límite no disponible');
  });

  it('conserva la fecha válida después de cargar el calendario y reutiliza meses consultados', () => {
    component.prestamoForm.get('fechaLimite')?.setValue(new Date(2026, 10, 4, 12));
    component.cargarFechasNoHabiles(new Date(2026, 10, 4));
    component.cargarFechasNoHabiles(new Date(2026, 10, 15));

    expect(component.prestamoForm.get('fechaLimite')?.value.getDate()).toBe(4);
    expect(calendarioRequest).toHaveBeenCalledTimes(1);
  });

  it('cancela la consulta mensual anterior al cambiar de mes', () => {
    const previous = new Subject<FechasNoHabilesResponse>();
    const current = new Subject<FechasNoHabilesResponse>();
    calendarioRequest.and.returnValues(previous.asObservable(), current.asObservable());

    component.cargarFechasNoHabiles(new Date(2026, 10, 1));
    component.cargarFechasNoHabiles(new Date(2026, 11, 1));

    expect(previous.observed).toBeFalse();
    expect(current.observed).toBeTrue();
    current.next({ fechasNoHabiles: ['2026-12-25'], coberturaCompleta: true });
    expect(component.fechasNoHabiles[0].getDate()).toBe(25);
  });

  it('muestra error de consulta y no envía el préstamo si no pudo validar el calendario', () => {
    calendarioRequest.and.returnValue(throwError(() => new Error('Network error')));
    const create = spyOn(prestamoService, 'createPrestamo');
    component.prestamoForm.patchValue({
      fechaPrestamo: new Date(2026, 10, 3, 9),
      fechaLimite: new Date(2026, 10, 4, 12),
      idLector: 1
    });
    component.ejemplaresSeleccionados = [ejemplar(1)];

    component.onSubmit();

    expect(component.calendarioError).toBeTrue();
    expect(create).not.toHaveBeenCalled();
    expect(messages.calls.mostRecent().args[0].summary).toBe('Consultando calendario');
  });

  it('agrega desde el campo enfocado, muestra el título y evita enviar el formulario', () => {
    const submit = spyOn(component, 'onSubmit');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#codigoEscaneado');
    input.value = '  ej1  ';
    const enter = key('Enter');
    input.dispatchEvent(enter);
    fixture.detectChanges();
    expect(enter.defaultPrevented).toBeTrue();
    expect(submit).not.toHaveBeenCalled();
    expect(input.value).toBe('');
    expect(fixture.nativeElement.querySelector('.ejemplar-card').textContent).toContain('Libro 1');
    expect(component.ejemplaresSeleccionados.length).toBe(1);
  });

  it('acepta Tab y no descarta un código lento en el campo dedicado', fakeAsync(() => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#codigoEscaneado');
    input.value = 'EJ';
    tick(500);
    input.value += '1';
    input.dispatchEvent(key('Tab'));
    expect(component.ejemplaresSeleccionados.length).toBe(1);
  }));

  it('captura escaneo global y consume Enter sin activar el botón enfocado', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    for (const char of 'EJ1') button.dispatchEvent(key(char));
    const enter = key('Enter');
    button.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBeTrue();
    expect(component.ejemplaresSeleccionados.length).toBe(1);
  });

  it('no interpreta texto de otros campos ni conserva un prefijo anterior', () => {
    window.dispatchEvent(key('X'));
    const input = document.createElement('input');
    fixture.nativeElement.appendChild(input);
    input.dispatchEvent(key('a'));
    window.dispatchEvent(key('Enter'));
    expect(messages).not.toHaveBeenCalled();
    expect(component.ejemplaresSeleccionados).toEqual([]);
  });

  it('rechaza duplicados, ocupados, desconocidos y exceso del límite', () => {
    component.agregarPorEscaneo('EJ1');
    component.agregarPorEscaneo('EJ1');
    expect(component.ejemplaresSeleccionados.length).toBe(1);
    expect(messages.calls.mostRecent().args[0].summary).toBe('Ya agregado');
    component.agregarPorEscaneo('EJ6');
    expect(messages.calls.mostRecent().args[0].summary).toBe('No disponible');
    component.agregarPorEscaneo('NO-EXISTE');
    expect(messages.calls.mostRecent().args[0].summary).toBe('No encontrado');
    component.ejemplaresSeleccionados = component.allEjemplares.slice(1);
    component.agregarPorEscaneo('EJ1');
    expect(component.ejemplaresSeleccionados.length).toBe(5);
    expect(messages.calls.mostRecent().args[0].summary).toBe('Límite alcanzado');
  });

  it('reemplaza desde el buscador incluso con cinco ejemplares seleccionados', () => {
    component.ejemplaresSeleccionados = component.allEjemplares.slice(1);
    component.iniciarReemplazo(0);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.search-container input');
    input.value = 'EJ1';
    input.dispatchEvent(key('Enter'));
    expect(component.ejemplaresSeleccionados[0].id).toBe(1);
    expect(component.ejemplaresSeleccionados.length).toBe(5);
    expect(component.displayEjemplarModal).toBeFalse();
  });

  it('no reporta un código inexistente mientras aún cargan los catálogos', () => {
    component.catalogosListos = false;
    component.agregarPorEscaneo('EJ1');
    expect(component.ejemplaresSeleccionados).toEqual([]);
    expect(messages.calls.mostRecent().args[0].summary).toBe('Catálogos no disponibles');
  });
});
