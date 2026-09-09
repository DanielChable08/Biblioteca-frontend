import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import PrestamoFormulario from './prestamo-formulario';
import { Ejemplar } from '../../models/biblioteca';

describe('PrestamoFormulario: escaneo', () => {
  let component: PrestamoFormulario;
  let fixture: ComponentFixture<PrestamoFormulario>;
  let messages: jasmine.Spy;
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
    fixture.detectChanges();
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
