import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { finalize, forkJoin, map, switchMap, of, catchError, Subscription } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';

import PersonaFormularioComponent from '../personas-formulario/personas-formulario';

import { PrestamoService } from '../../services/prestamo.service';
import { PrestamoIntentoService } from '../../services/prestamo-intento.service';
import { FechasNoHabilesResponse } from '../../models/calendario-institucional';
import { CatalogService } from '../../services/catalog.service';
import { BookService } from '../../services/book.service';
import { UsuarioService } from '../../services/usuario.service';
import { EjemplarService } from '../../services/ejemplar.service';
import { AuthService } from '../../services/auth.service';
import { SharedDataService } from '../../services/shared-data.service';
import { AltaCompletaPrestamoPayload, PrestamoIntento } from '../../models/prestamo-intento';
import {
  Prestamo,
  Persona,
  EstadoPrestamo,
  Ejemplar,
  PrestamoPayload,
  Libro,
  OptionLibro
} from '../../models/biblioteca';

@Component({
  selector: 'app-prestamo-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DatePickerModule,
    SelectModule,
    ToastModule,
    DialogModule,
    TooltipModule,
    CheckboxModule,
    PersonaFormularioComponent
  ],
  templateUrl: './prestamo-formulario.html',
  styleUrls: ['./prestamo-formulario.css'],
  providers: [MessageService]
})
export default class PrestamoFormularioComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private prestamoService = inject(PrestamoService);
  private prestamoIntentoService = inject(PrestamoIntentoService);
  private catalogService = inject(CatalogService);
  private usuarioService = inject(UsuarioService);
  private bookService = inject(BookService);
  private ejemplarService = inject(EjemplarService);
  authService = inject(AuthService);
  private sharedDataService = inject(SharedDataService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  prestamoForm!: FormGroup;
  catalogoForm!: FormGroup;

  isEditMode = false;
  isSubmitting = false;
  intentoPendiente: PrestamoIntento | null = null;
  errorConflictoClave = false;
  private usuarioIntentoScope: string | null = null;
  catalogoSubmitting = false;
  prestamoUuid: string | null = null;

  readonly MAX_EJEMPLARES = 5;

  lectores: (Persona & { nombreCompleto: string })[] = [];
  estadosPrestamo: EstadoPrestamo[] = [];
  
  allEjemplares: Ejemplar[] = [];
  allLibros: OptionLibro[] = [];

  ejemplaresDisponibles: Ejemplar[] = [];
  ejemplaresFiltrados: Ejemplar[] = [];
  ejemplaresSeleccionados: Ejemplar[] = [];

  displayCatalogoModal = false;
  displayEjemplarModal = false;
  displayLectorModal = false; 

  catalogoTipo: 'lector' | 'estadoPrestamo' | null = null;
  ejemplarFilter = '';
  
  modoReemplazo = false;
  indiceReemplazo = -1;
  
  minFechaLimite: Date = new Date();
  minFechaPrestamo: Date = this.getTodayMidnight();
  fechasNoHabiles: Date[] = [];
  calendarioCargando = false;
  calendarioError = false;
  calendarioFueraCobertura = false;
  calendarioMesSinDiasDisponibles = false;

  idPersonaBibliotecario!: number;

  private scanBuffer = '';
  private scanTimeout?: ReturnType<typeof setTimeout>;
  private fechaPrestamoSubscription?: Subscription;
  private fechaLimiteSubscription?: Subscription;
  private calendarioSubscription?: Subscription;
  private calendarioPorMes = new Map<string, FechasNoHabilesResponse>();
  private calendarioMesActivo: string | null = null;
  private mesesSinCoberturaAvisados = new Set<string>();
  catalogosListos = false;

  ngOnInit(): void {
    this.initForms();
    this.setIdBibliotecario();
    this.recuperarIntentoPendiente();
    this.loadCatalogos(); 
    this.setupFechaListeners();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.isComposing ||
        this.displayLectorModal || this.displayCatalogoModal || this.isSubmitting || this.intentoPendiente ||
        target?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"]')) {
        this.limpiarEscaneo();
        return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
        if (this.scanBuffer.length > 0) {
            event.preventDefault();
            const codigo = this.scanBuffer;
            this.limpiarEscaneo();
            this.agregarPorEscaneo(codigo);
        }
    } else if (event.key.length === 1) {
        this.scanBuffer += event.key;
        
        if (this.scanTimeout) clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => {
            this.scanBuffer = '';
        }, 200); 
    }
  }

  private limpiarEscaneo(): void {
    clearTimeout(this.scanTimeout);
    this.scanBuffer = '';
  }

  ngOnDestroy(): void {
    this.limpiarEscaneo();
    this.fechaPrestamoSubscription?.unsubscribe();
    this.fechaLimiteSubscription?.unsubscribe();
    this.calendarioSubscription?.unsubscribe();
  }

  escanearDesdeCampo(event: KeyboardEvent, campo: HTMLInputElement): void {
    if (this.isSubmitting || this.intentoPendiente) return;
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    if (event.key === 'Tab' && !campo.value.trim()) return;
    event.preventDefault();
    event.stopPropagation();
    this.limpiarEscaneo();
    this.agregarPorEscaneo(campo.value);
    campo.value = '';
    if (this.displayEjemplarModal) {
      this.ejemplarFilter = '';
      this.filtrarEjemplares();
    }
  }

  agregarPorEscaneo(codigo: string): void {
    codigo = codigo.trim();
    if (!codigo) return;
    if (this.isSubmitting || this.intentoPendiente) return;
    if (!this.catalogosListos) {
      this.messageService.add({ severity: 'warn', summary: 'Catálogos no disponibles', detail: 'Espera a que carguen los datos antes de escanear. Si la carga falló, recarga la página.' });
      return;
    }

    const ejemplar = this.ejemplaresDisponibles.find(e => e.codigo?.trim().toLowerCase() === codigo.toLowerCase());

    if (!ejemplar) {
        const existePeroOcupado = this.allEjemplares.find(e => e.codigo?.trim().toLowerCase() === codigo.toLowerCase());
        if (existePeroOcupado) {
            this.messageService.add({ severity: 'error', summary: 'No disponible', detail: `El libro ${existePeroOcupado.codigo} ya está prestado o no disponible.` });
        } else {
            this.messageService.add({ severity: 'error', summary: 'No encontrado', detail: `No se encontró: ${codigo}` });
        }
        return;
    }

    if (this.displayEjemplarModal && this.modoReemplazo) {
      this.toggleEjemplar(ejemplar);
      return;
    }

    if (this.ejemplaresSeleccionados.some(e => e.id === ejemplar.id)) {
        this.messageService.add({ severity: 'warn', summary: 'Ya agregado', detail: 'Este libro ya está en la lista actual.' });
        return;
    }

    if (!this.canAddMoreEjemplares()) {
      this.messageService.add({ severity: 'warn', summary: 'Límite alcanzado', detail: `Máximo ${this.MAX_EJEMPLARES} libros.` });
      return;
    }
    this.ejemplaresSeleccionados = [...this.ejemplaresSeleccionados, ejemplar];
    this.messageService.add({ severity: 'success', summary: 'Agregado', detail: `${ejemplar.libro?.titulo || ejemplar.libroOption?.titulo || ejemplar.codigo} agregado.` });
  }

  private setIdBibliotecario(): void {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      this.idPersonaBibliotecario = user.idPersona || user.id;
      if (!this.isEditMode) {
        this.prestamoForm.patchValue({ idBibliotecario: this.idPersonaBibliotecario });
      }
    } else {
      this.idPersonaBibliotecario = -1;
    }
  }

  private getTodayMidnight(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private parseFecha(fecha: any): Date {
    if (!fecha) return new Date();
    if (fecha instanceof Date) return fecha;
    
    if (Array.isArray(fecha)) {
       return new Date(fecha[0], fecha[1] - 1, fecha[2], fecha[3] || 0, fecha[4] || 0);
    }
    
    if (typeof fecha === 'string' && fecha.length === 10) {
       return new Date(fecha + 'T00:00:00');
    }
    
    return new Date(fecha);
  }

  initForms(): void {
    const today = new Date();
    this.prestamoForm = this.fb.group({
      fechaPrestamo: [today, [Validators.required]],
      fechaLimite: [this.getDefaultFechaLimite(), [Validators.required]],
      idBibliotecario: [null],
      idLector: [null, [Validators.required]],
      idEstadoPrestamo: [null]
    });
    this.catalogoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  getDefaultFechaLimite(): Date {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 7);
    return fecha;
  }

  setupFechaListeners(): void {
    this.fechaPrestamoSubscription?.unsubscribe();
    this.fechaPrestamoSubscription = this.prestamoForm.get('fechaPrestamo')?.valueChanges.subscribe(fecha => {
      if (fecha) {
        const fechaObj = new Date(fecha);
        const minLimite = new Date(fechaObj);
        minLimite.setDate(minLimite.getDate() + 1);
        this.minFechaLimite = minLimite;
        
        const currentLimite = this.prestamoForm.get('fechaLimite')?.value;
        if (currentLimite && new Date(currentLimite) <= fechaObj) {
             this.prestamoForm.patchValue({ fechaLimite: minLimite });
        }
      }
    });

    this.fechaLimiteSubscription?.unsubscribe();
    this.fechaLimiteSubscription = this.prestamoForm.get('fechaLimite')?.valueChanges.subscribe(() => {
      const control = this.prestamoForm.get('fechaLimite');
      if (!control?.hasError('fechaNoHabil')) return;
      const remainingErrors = { ...(control.errors ?? {}) };
      delete remainingErrors['fechaNoHabil'];
      control.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
    });
  }

  onCalendarioMostrar(): void {
    const selectedDate = this.prestamoForm.get('fechaLimite')?.value;
    this.cargarFechasNoHabiles(selectedDate instanceof Date ? selectedDate : this.minFechaLimite);
  }

  onCalendarioMesCambiar(event: { month?: number; year?: number }): void {
    if (!event.month || !event.year) return;
    this.cargarFechasNoHabiles(this.fechaLocal(event.year, event.month - 1, 1));
  }

  cargarFechasNoHabiles(fechaVisible: Date): void {
    const year = fechaVisible.getFullYear();
    const month = fechaVisible.getMonth();
    const monthKey = this.claveMes(year, month);
    const cached = this.calendarioPorMes.get(monthKey);
    if (cached) {
      this.calendarioSubscription?.unsubscribe();
      this.calendarioMesActivo = monthKey;
      this.calendarioCargando = false;
      this.aplicarFechasNoHabiles(monthKey, cached);
      return;
    }

    if (this.calendarioMesActivo === monthKey && this.calendarioCargando) return;

    this.calendarioSubscription?.unsubscribe();
    this.calendarioMesActivo = monthKey;
    this.calendarioCargando = true;
    this.calendarioError = false;
    this.calendarioFueraCobertura = false;
    this.calendarioMesSinDiasDisponibles = false;
    this.fechasNoHabiles = [];
    const inicio = this.fechaLocal(year, month, 1);
    const fin = this.fechaLocal(year, month + 1, 0);

    this.calendarioSubscription = this.prestamoService
      .getFechasNoHabiles(this.formatearFechaLocal(inicio), this.formatearFechaLocal(fin))
      .subscribe({
        next: response => {
          if (this.calendarioMesActivo !== monthKey) return;
          this.calendarioPorMes.set(monthKey, response);
          this.calendarioCargando = false;
          this.aplicarFechasNoHabiles(monthKey, response);
        },
        error: () => {
          if (this.calendarioMesActivo !== monthKey) return;
          this.calendarioCargando = false;
          this.calendarioError = true;
          this.calendarioMesSinDiasDisponibles = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Calendario no disponible',
            detail: 'No se pudieron consultar las fechas institucionales. Intenta abrir nuevamente el calendario.'
          });
        }
      });
  }

  private aplicarFechasNoHabiles(monthKey: string, response: FechasNoHabilesResponse): void {
    this.fechasNoHabiles = response.fechasNoHabiles.map(fecha => this.parseFechaLocal(fecha));
    this.calendarioError = false;
    this.calendarioFueraCobertura = !response.coberturaCompleta;
    this.calendarioMesSinDiasDisponibles = !this.hayDiaDisponible(monthKey, response);

    if (this.calendarioFueraCobertura && !this.mesesSinCoberturaAvisados.has(monthKey)) {
      this.mesesSinCoberturaAvisados.add(monthKey);
      this.messageService.add({
        severity: 'info',
        summary: 'Calendario institucional pendiente',
        detail: 'Fuera de los periodos configurados solo se bloquean sábados y domingos; no se presuponen vacaciones ni suspensiones.'
      });
    }

    const fechaSeleccionada = this.prestamoForm.get('fechaLimite')?.value;
    if (fechaSeleccionada instanceof Date && this.claveMesDeFecha(fechaSeleccionada) === monthKey
        && response.fechasNoHabiles.includes(this.formatearFechaLocal(fechaSeleccionada))) {
      this.prestamoForm.get('fechaLimite')?.setValue(null);
      this.prestamoForm.get('fechaLimite')?.markAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha límite no disponible',
        detail: 'La fecha seleccionada no está disponible por el calendario institucional. Elige otro día.'
      });
    }
  }

  private hayDiaDisponible(monthKey: string, response: FechasNoHabilesResponse): boolean {
    const [year, zeroBasedMonth] = monthKey.split('-').map(Number);
    const first = this.fechaLocal(year, zeroBasedMonth, 1);
    const last = this.fechaLocal(year, zeroBasedMonth + 1, 0);
    const min = this.minFechaLimite;
    const minDate = this.fechaLocal(min.getFullYear(), min.getMonth(), min.getDate());
    const start = first < minDate ? minDate : first;
    if (start > last) return false;

    const unavailable = new Set(response.fechasNoHabiles);
    for (const date = start; date <= last; date.setDate(date.getDate() + 1)) {
      if (!unavailable.has(this.formatearFechaLocal(date))) return true;
    }
    return false;
  }

  private fechaEsNoHabil(fecha: Date, response: FechasNoHabilesResponse): boolean {
    return response.fechasNoHabiles.includes(this.formatearFechaLocal(fecha));
  }

  private claveMesDeFecha(fecha: Date): string {
    return this.claveMes(fecha.getFullYear(), fecha.getMonth());
  }

  private claveMes(year: number, zeroBasedMonth: number): string {
    return `${year}-${String(zeroBasedMonth + 1).padStart(2, '0')}`;
  }

  private fechaLocal(year: number, zeroBasedMonth: number, day: number): Date {
    return new Date(year, zeroBasedMonth, day, 0, 0, 0, 0);
  }

  private parseFechaLocal(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return this.fechaLocal(year, month - 1, day);
  }

  private formatearFechaLocal(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  loadCatalogos(): void {
    this.catalogosListos = false;
    forkJoin({
      lectores: this.prestamoService.getPersonas(),
      estados: this.catalogService.getEstadosPrestamos(),
      ejemplares: this.ejemplarService.getEjemplares(),
      libros: this.bookService.getOptionLibros(),
      estadosEjemplares: this.catalogService.getEstadosEjemplares()
    }).subscribe({
      next: ({ lectores, estados, ejemplares, libros, estadosEjemplares }) => {
        this.lectores = lectores
          .map(p => ({
            ...p,
            nombreCompleto: `${p.nombre} ${p.apPaterno} ${p.apMaterno || ''}`.trim()
          }));

        this.estadosPrestamo = estados;
        if (!this.isEditMode) {
          const activo = estados.find(e => e.nombre.toLowerCase().includes('activo'));
          if (activo) {
            this.prestamoForm.patchValue({ idEstadoPrestamo: activo.id });
          }
        }

        this.allLibros = libros; 
        this.allEjemplares = ejemplares.map(ejemplar => {
            const libroDelEjemplar = libros.find(l => l.id === ejemplar.idLibro);
            const estadoEjemplar = estadosEjemplares.find(e => e.id === ejemplar.idEstadoEjemplar);
            return {
                ...ejemplar,
                libroOption: libroDelEjemplar, 
                estado: estadoEjemplar
            };
        });

        const estadoDisponible = estadosEjemplares.find(e => e.nombre.trim().toLowerCase() === 'disponible');
        this.ejemplaresDisponibles = this.allEjemplares.filter(e => e.idEstadoEjemplar === estadoDisponible?.id);
        
        this.ejemplaresFiltrados = [...this.ejemplaresDisponibles];
        this.cargarAutoresParaEjemplares(this.ejemplaresDisponibles);
        this.checkEditMode();
        this.restaurarIntentoEnPantalla();
        if (!this.isEditMode) this.catalogosListos = true;
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los datos iniciales.' });
      }
    });
  }

  cargarAutoresParaEjemplares(ejemplares: Ejemplar[]) {
      const librosUnicos = [...new Set(ejemplares.map(e => e.libro).filter(l => l !== undefined))];
      const requests = librosUnicos.map(libro => {
          if(!libro || !libro.uuid) return of(null);
          return this.bookService.getAutoresForLibro(libro.uuid).pipe(
              map(autores => {
                  libro.autores = autores; 
                  return true;
              }),
              catchError(() => of(false))
          );
      });
      if(requests.length > 0) {
          forkJoin(requests).subscribe();
      }
  }

  checkEditMode(): void {
    this.prestamoUuid = this.route.snapshot.paramMap.get('uuid');
    if (this.prestamoUuid) {
      this.isEditMode = true;
      this.loadPrestamo();
    }
  }

  loadPrestamo(): void {
    if (!this.prestamoUuid) return;

    this.prestamoService.getPrestamoByUuid(this.prestamoUuid).pipe(
        switchMap(prestamo => {
            return this.prestamoService.getDetallesPrestamo(this.prestamoUuid!).pipe(
                map(detalles => ({ prestamo, detalles }))
            );
        })
    ).subscribe({
      next: ({ prestamo, detalles }) => {
        const fPrestamo = this.parseFecha(prestamo.fechaPrestamo);
        const fLimite = prestamo.fechaLimite ? this.parseFecha(prestamo.fechaLimite) : this.getDefaultFechaLimite();

        const minL = new Date(fPrestamo);
        minL.setDate(minL.getDate() + 1);
        this.minFechaLimite = minL;

        this.cdr.detectChanges();

        this.prestamoForm.patchValue({
          fechaPrestamo: fPrestamo,
          fechaLimite: fLimite,
          idBibliotecario: prestamo.idBibliotecario,
          idLector: prestamo.idLector,
          idEstadoPrestamo: prestamo.idEstadoPrestamo
        }, { emitEvent: false });
        
        this.reconstruirEjemplaresSeleccionados(detalles);
        this.catalogosListos = true;
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el préstamo.' });
      }
    });
  }

  reconstruirEjemplaresSeleccionados(detalles: any[]) {
      const detallesActivos = detalles.filter(d => !d.fechaDevolucion);
      const ejemplaresEncontrados: Ejemplar[] = [];

      detallesActivos.forEach(detalle => {
          const ejemplarEnMemoria = this.allEjemplares.find(e => e.id === detalle.idEjemplar);
          if (ejemplarEnMemoria) {
              ejemplaresEncontrados.push(ejemplarEnMemoria);
              if (!this.ejemplaresDisponibles.find(e => e.id === ejemplarEnMemoria.id)) {
                  this.ejemplaresDisponibles.push(ejemplarEnMemoria);
              }
          }
      });

      this.ejemplaresSeleccionados = ejemplaresEncontrados;
      this.ejemplaresFiltrados = [...this.ejemplaresDisponibles];
      this.cargarAutoresParaEjemplares(ejemplaresEncontrados);
  }

  abrirModalEjemplar(): void {
    if (this.isSubmitting || this.intentoPendiente) return;
    this.modoReemplazo = false;
    this.indiceReemplazo = -1;
    this.ejemplarFilter = '';
    this.ejemplaresFiltrados = this.ejemplaresDisponibles;
    this.displayEjemplarModal = true;
  }

  iniciarReemplazo(index: number): void {
    if (this.isSubmitting || this.intentoPendiente) return;
    this.modoReemplazo = true;
    this.indiceReemplazo = index;
    this.ejemplarFilter = '';
    this.ejemplaresFiltrados = this.ejemplaresDisponibles;
    this.displayEjemplarModal = true;
  }

  isEjemplarSeleccionado(ejemplar: Ejemplar): boolean {
    if (this.modoReemplazo) {
        return this.ejemplaresSeleccionados[this.indiceReemplazo]?.id === ejemplar.id;
    }
    return this.ejemplaresSeleccionados.some(e => e.id === ejemplar.id);
  }

  toggleEjemplar(ejemplar: Ejemplar): void {
    if (this.isSubmitting || this.intentoPendiente) return;
    if (this.modoReemplazo) {
        if (this.ejemplaresSeleccionados[this.indiceReemplazo].id === ejemplar.id) {
            this.cerrarModalEjemplar();
            return;
        }
        const yaEstaEnLista = this.ejemplaresSeleccionados.some((e, idx) => e.id === ejemplar.id && idx !== this.indiceReemplazo);
        if (yaEstaEnLista) {
            this.messageService.add({ severity: 'warn', summary: 'Duplicado', detail: 'Este libro ya está en la lista.' });
            return;
        }
        this.ejemplaresSeleccionados[this.indiceReemplazo] = ejemplar;
        this.ejemplaresSeleccionados = [...this.ejemplaresSeleccionados];
        this.cerrarModalEjemplar();
        this.messageService.add({ severity: 'info', summary: 'Cambiado', detail: 'Libro reemplazado correctamente.' });
        return;
    }

    const index = this.ejemplaresSeleccionados.findIndex(e => e.id === ejemplar.id);
    if (index > -1) {
      this.ejemplaresSeleccionados.splice(index, 1);
    } else {
      if (this.ejemplaresSeleccionados.length >= this.MAX_EJEMPLARES) {
        this.messageService.add({ severity: 'warn', summary: 'Límite', detail: `Máximo ${this.MAX_EJEMPLARES} libros.` });
        return;
      }
      this.ejemplaresSeleccionados.push(ejemplar);
    }
  }

  filtrarEjemplares(): void {
    const filter = this.ejemplarFilter.toLowerCase();
    this.ejemplaresFiltrados = this.ejemplaresDisponibles.filter(ejemplar =>
      ejemplar.codigo.toLowerCase().includes(filter) ||
      (ejemplar.libro?.titulo || ejemplar.libroOption?.titulo)?.toLowerCase().includes(filter) ||
      ejemplar.libro?.autores?.some(a =>
        `${a.nombre} ${a.apPaterno}`.toLowerCase().includes(filter)
      )
    );
  }

  canAddMoreEjemplares(): boolean {
    return this.ejemplaresSeleccionados.length < this.MAX_EJEMPLARES;
  }

  confirmarEjemplares(): void {
    this.displayEjemplarModal = false;
  }

  cerrarModalEjemplar(): void {
      this.displayEjemplarModal = false;
      this.modoReemplazo = false;
      this.indiceReemplazo = -1;
  }

  removerEjemplar(index: number): void {
    if (this.isSubmitting || this.intentoPendiente) return;
    this.ejemplaresSeleccionados.splice(index, 1);
    this.ejemplaresSeleccionados = [...this.ejemplaresSeleccionados]; 
  }

  onSubmit(): void {
    if (this.isSubmitting) return;
    if (this.intentoPendiente) {
      this.enviarIntentoPrestamo(this.intentoPendiente);
      return;
    }

    if (this.prestamoForm.invalid) {
      this.prestamoForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Completa los campos requeridos.' });
      return;
    }

    const fechaPrestamo: Date = this.prestamoForm.get('fechaPrestamo')!.value;
    const fechaLimite: Date = this.prestamoForm.get('fechaLimite')!.value;
    
    if (fechaLimite <= fechaPrestamo) {
      this.messageService.add({ severity: 'warn', summary: 'Fecha inválida', detail: 'La fecha límite debe ser posterior al préstamo.' });
      return;
    }

    const calendarioDelMes = this.calendarioPorMes.get(this.claveMesDeFecha(fechaLimite));
    if (!calendarioDelMes) {
      this.cargarFechasNoHabiles(fechaLimite);
      this.messageService.add({
        severity: 'info',
        summary: 'Consultando calendario',
        detail: 'Espera a que se validen las fechas institucionales antes de registrar el préstamo.'
      });
      return;
    }
    if (this.fechaEsNoHabil(fechaLimite, calendarioDelMes)) {
      this.prestamoForm.get('fechaLimite')?.setErrors({ ...(this.prestamoForm.get('fechaLimite')?.errors ?? {}), fechaNoHabil: true });
      this.prestamoForm.get('fechaLimite')?.markAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha inválida',
        detail: 'La fecha de devolución seleccionada no está disponible por el calendario institucional.'
      });
      return;
    }

    if (this.ejemplaresSeleccionados.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sin libros', detail: 'Agrega al menos un ejemplar.' });
      return;
    }

    this.isSubmitting = true;
    const formData = this.prestamoForm.value;

    const payload: PrestamoPayload = {
      fechaPrestamo: this.formatDate(formData.fechaPrestamo),
      fechaLimite: this.formatDate(formData.fechaLimite),
      idBibliotecario: this.idPersonaBibliotecario,
      idLector: formData.idLector,
      idEstadoPrestamo: formData.idEstadoPrestamo || 7
    };

    if (this.isEditMode && this.prestamoUuid) {
      this.updatePrestamo(payload);
    } else {
      this.createPrestamo(payload);
    }
  }

createPrestamo(payload: PrestamoPayload) {
    const scope = this.authService.getCurrentUserScope();
    if (!scope) {
      this.isSubmitting = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Sesión no identificada',
        detail: 'Vuelve a iniciar sesión antes de registrar el préstamo.'
      });
      return;
    }

    this.usuarioIntentoScope = scope;
    let intento = this.intentoPendiente;
    if (!intento) {
      const payloadCompleto: AltaCompletaPrestamoPayload = {
        prestamo: { ...payload },
        idEjemplares: this.ejemplaresSeleccionados.map(ejemplar => ejemplar.id)
      };
      try {
        intento = this.prestamoIntentoService.preparar(scope, payloadCompleto);
      } catch (error) {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo preparar el intento',
          detail: error instanceof Error ? error.message : 'No se pudo guardar el intento de forma segura.'
        });
        return;
      }
      this.intentoPendiente = intento;
      this.restaurarIntentoEnPantalla();
    }

    this.enviarIntentoPrestamo(intento);
  }

  private recuperarIntentoPendiente(): void {
    this.usuarioIntentoScope = this.authService.getCurrentUserScope();
    if (!this.usuarioIntentoScope || this.route.snapshot.paramMap.get('uuid')) return;

    const recuperacion = this.prestamoIntentoService.recuperar(this.usuarioIntentoScope);
    if (recuperacion.estado === 'invalid') {
      this.prestamoIntentoService.limpiarInvalido(this.usuarioIntentoScope);
      this.messageService.add({
        severity: 'warn',
        summary: 'Intento no recuperable',
        detail: 'El intento guardado no es válido. Revisa el préstamo antes de iniciar uno nuevo.'
      });
      return;
    }
    if (recuperacion.estado === 'found') {
      this.intentoPendiente = recuperacion.intento;
      this.restaurarIntentoEnPantalla();
      this.messageService.add({
        severity: 'warn',
        summary: 'Préstamo pendiente de confirmar',
        detail: 'Reintenta el mismo envío para recuperar su resultado; se conservaron la clave y los datos originales.'
      });
    }
  }

  private restaurarIntentoEnPantalla(): void {
    const intento = this.intentoPendiente;
    if (!intento) return;

    this.prestamoForm.patchValue({
      fechaPrestamo: this.parseFecha(intento.payload.prestamo.fechaPrestamo),
      fechaLimite: this.parseFecha(intento.payload.prestamo.fechaLimite),
      idBibliotecario: intento.payload.prestamo.idBibliotecario,
      idLector: intento.payload.prestamo.idLector,
      idEstadoPrestamo: intento.payload.prestamo.idEstadoPrestamo
    }, { emitEvent: false });

    this.ejemplaresSeleccionados = intento.payload.idEjemplares
      .map(id => this.allEjemplares.find(ejemplar => ejemplar.id === id))
      .filter((ejemplar): ejemplar is Ejemplar => Boolean(ejemplar));
    this.prestamoForm.disable({ emitEvent: false });
  }

  private enviarIntentoPrestamo(intento: PrestamoIntento): void {
    const scope = this.authService.getCurrentUserScope();
    if (!scope || scope !== intento.userScope) {
      this.isSubmitting = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Usuario distinto',
        detail: 'El intento pertenece a otra sesión. Inicia sesión con el mismo usuario para recuperarlo.'
      });
      return;
    }

    this.isSubmitting = true;
    this.usuarioIntentoScope = scope;
    this.prestamoService.createPrestamoCompleto(intento.payload, intento.idempotencyKey)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: respuesta => {
          this.prestamoIntentoService.limpiar(scope, intento);
          this.intentoPendiente = null;
          this.errorConflictoClave = false;
          this.prestamoForm.enable({ emitEvent: false });
          this.sharedDataService.notificarActualizacionEjemplares();
          const identificador = respuesta.prestamo.uuid ?? respuesta.prestamo.id;
          this.messageService.add({
            severity: 'success',
            summary: 'Préstamo registrado',
            detail: `Préstamo ${identificador ?? ''} creado con ${respuesta.detalles.length} ejemplar(es).`
          });
          this.cdr.detectChanges();
          setTimeout(() => this.router.navigate(['/admin/prestamos']), 1500);
        },
        error: (error: HttpErrorResponse) => this.manejarErrorAltaCompleta(error, scope, intento)
      });
  }

  private manejarErrorAltaCompleta(error: HttpErrorResponse, scope: string, intento: PrestamoIntento): void {
    const mensaje = this.obtenerMensajeError(error);
    const mensajeNormalizado = mensaje.toLowerCase();
    const esEnProceso = mensajeNormalizado.includes('está siendo procesada');
    const claveConOtroPayload = mensajeNormalizado.includes('utilizada con datos distintos');
    const resultadoIncierto = error.status === 0 || error.status >= 500 || error.status === 401 || error.status === 403;
    const conservarIntento = esEnProceso || claveConOtroPayload || resultadoIncierto;
    this.errorConflictoClave = claveConOtroPayload;

    if (!conservarIntento) {
      this.prestamoIntentoService.limpiar(scope, intento);
      this.intentoPendiente = null;
      this.errorConflictoClave = false;
      this.prestamoForm.enable({ emitEvent: false });
    }

    const detalle = conservarIntento
      ? `${mensaje} Conserva este intento y reinténtalo con los mismos datos para recuperar el resultado.`
      : mensaje;
    this.messageService.add({
      severity: 'error',
      summary: conservarIntento ? 'Resultado pendiente de confirmar' : 'Préstamo no registrado',
      detail: detalle || 'No se pudo registrar el préstamo.'
    });
    this.cdr.detectChanges();
  }

  descartarIntentoConConflictoDeClave(): void {
    const intento = this.intentoPendiente;
    if (!intento || !this.errorConflictoClave) return;

    const confirmado = window.confirm(
      'El servidor indica que esta clave pertenece a otros datos. Antes de iniciar otro préstamo, confirma que el préstamo previo no se registró.'
    );
    if (!confirmado) return;

    this.prestamoIntentoService.limpiar(intento.userScope, intento);
    this.intentoPendiente = null;
    this.errorConflictoClave = false;
    this.prestamoForm.enable({ emitEvent: false });
  }

  private obtenerMensajeError(error: HttpErrorResponse): string {
    if (typeof error.error === 'string') return error.error;
    const mensaje = error.error?.message || error.error?.error;
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;

    if (error.error && typeof error.error === 'object') {
      const validaciones = Object.values(error.error)
        .flatMap(valor => Array.isArray(valor) ? valor : [valor])
        .filter((valor): valor is string => typeof valor === 'string' && Boolean(valor.trim()));
      if (validaciones.length) return validaciones.join(' ');
    }

    return error.message || 'No se pudo registrar el préstamo.';
  }

  updatePrestamo(payload: PrestamoPayload) {
        this.prestamoService.updatePrestamo(this.prestamoUuid!, payload).pipe(finalize(() => this.isSubmitting = false))
        .subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Préstamo actualizado correctamente.' });
                this.cdr.detectChanges();
                setTimeout(() => {
                  this.router.navigate(['/admin/prestamos']);
                }, 1500);
            },
            error: (err) => {
                const msjBackend = err?.error?.message || err?.error;
                const detailStr = typeof msjBackend === 'string' ? msjBackend : 'No se pudo actualizar el préstamo.';
                this.messageService.add({ severity: 'error', summary: 'Error', detail: detailStr });
                this.cdr.detectChanges();
            }
        });
    }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  regresar(): void {
    this.router.navigate(['/admin/prestamos']);
  }

  getAutoresNombres(ejemplar: Ejemplar): string {
    if (!ejemplar?.libroOption?.autores || ejemplar.libroOption.autores.length === 0) return 'Autor no asignado';
    return ejemplar.libroOption.autores.map(a => `${a.apPaterno || ''} ${a.apMaterno || ''} ${a.nombre}`).join(', ');
  }

  abrirModalLector() {
      this.displayLectorModal = true;
    }

  onLectorGuardado(nuevaPersona: any): void {
    this.displayLectorModal = false;
    
    this.prestamoService.getPersonas().subscribe(lectores => {
      this.lectores = lectores
        .filter(p => p.idTipoPersona === 1) 
        .map(p => ({
          ...p,
          nombreCompleto: `${p.nombre} ${p.apPaterno} ${p.apMaterno || ''}`.trim()
        }));

      if (nuevaPersona && nuevaPersona.id) {
        this.prestamoForm.patchValue({ idLector: nuevaPersona.id });
        this.messageService.add({ severity: 'success', summary: 'Lector listo', detail: 'Seleccionado automáticamente.' });
        this.cdr.detectChanges();
      }
    });
  }

  guardarCatalogo() { this.displayCatalogoModal = false; }
  getTituloModal() { return ''; }
}
