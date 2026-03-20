import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { finalize, forkJoin, map, switchMap, of, catchError } from 'rxjs';

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
import { CatalogService } from '../../services/catalog.service';
import { BookService } from '../../services/book.service';
import { UsuarioService } from '../../services/usuario.service';
import { EjemplarService } from '../../services/ejemplar.service';
import { AuthService } from '../../services/auth.service';
import { SharedDataService } from '../../services/shared-data.service';
import {
  Prestamo,
  Persona,
  EstadoPrestamo,
  Ejemplar,
  PrestamoPayload,
  Libro
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
export default class PrestamoFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private prestamoService = inject(PrestamoService);
  private catalogService = inject(CatalogService);
  private usuarioService = inject(UsuarioService);
  private bookService = inject(BookService);
  private ejemplarService = inject(EjemplarService);
  private authService = inject(AuthService);
  private sharedDataService = inject(SharedDataService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  prestamoForm!: FormGroup;
  catalogoForm!: FormGroup;

  isEditMode = false;
  isSubmitting = false;
  catalogoSubmitting = false;
  prestamoUuid: string | null = null;

  readonly MAX_EJEMPLARES = 5;

  lectores: (Persona & { nombreCompleto: string })[] = [];
  estadosPrestamo: EstadoPrestamo[] = [];
  
  allEjemplares: Ejemplar[] = [];
  allLibros: Libro[] = [];

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

  idPersonaBibliotecario!: number;

  private scanBuffer = '';
  private scanTimeout: any;

  ngOnInit(): void {
    this.initForms();
    this.setIdBibliotecario();
    this.loadCatalogos(); 
    this.setupFechaListeners();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
    }

    if (event.key === 'Enter') {
        if (this.scanBuffer.length > 0) {
            this.agregarPorEscaneo(this.scanBuffer);
            this.scanBuffer = '';
        }
    } else if (event.key.length === 1) {
        this.scanBuffer += event.key;
        
        if (this.scanTimeout) clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => {
            this.scanBuffer = '';
        }, 200); 
    }
  }

  agregarPorEscaneo(codigo: string): void {
    if (!codigo) return;

    if (this.ejemplaresSeleccionados.length >= this.MAX_EJEMPLARES) {
        this.messageService.add({ severity: 'warn', summary: 'Límite alcanzado', detail: `Máximo ${this.MAX_EJEMPLARES} libros.` });
        return;
    }

    const ejemplar = this.ejemplaresDisponibles.find(e => e.codigo.toLowerCase() === codigo.toLowerCase());

    if (!ejemplar) {
        const existePeroOcupado = this.allEjemplares.find(e => e.codigo.toLowerCase() === codigo.toLowerCase());
        if (existePeroOcupado) {
            this.messageService.add({ severity: 'error', summary: 'No disponible', detail: `El libro ${existePeroOcupado.codigo} ya está prestado o no disponible.` });
        } else {
            this.messageService.add({ severity: 'error', summary: 'No encontrado', detail: `No se encontró: ${codigo}` });
        }
        return;
    }

    if (this.ejemplaresSeleccionados.some(e => e.id === ejemplar.id)) {
        this.messageService.add({ severity: 'warn', summary: 'Ya agregado', detail: 'Este libro ya está en la lista actual.' });
        return;
    }

    this.ejemplaresSeleccionados.push(ejemplar);
    this.messageService.add({ severity: 'success', summary: 'Agregado', detail: `${ejemplar.libro?.titulo} agregado.` });
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
    this.prestamoForm.get('fechaPrestamo')?.valueChanges.subscribe(fecha => {
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
  }

  loadCatalogos(): void {
    forkJoin({
      lectores: this.prestamoService.getPersonas(),
      estados: this.catalogService.getEstadosPrestamos(),
      ejemplares: this.ejemplarService.getEjemplares(),
      libros: this.bookService.getLibros(),
      estadosEjemplares: this.catalogService.getEstadosEjemplares()
    }).subscribe({
      next: ({ lectores, estados, ejemplares, libros, estadosEjemplares }) => {
        this.lectores = lectores
          .filter(p => p.idTipoPersona === 1) 
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
                libro: libroDelEjemplar, 
                estado: estadoEjemplar
            };
        });

        const estadoDisponible = estadosEjemplares.find(e => e.nombre.toLowerCase() === 'disponible');
        this.ejemplaresDisponibles = this.allEjemplares.filter(e => e.idEstadoEjemplar === estadoDisponible?.id);
        
        this.ejemplaresFiltrados = [...this.ejemplaresDisponibles];
        this.cargarAutoresParaEjemplares(this.ejemplaresDisponibles);
        this.checkEditMode();
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
    this.modoReemplazo = false;
    this.indiceReemplazo = -1;
    this.ejemplarFilter = '';
    this.ejemplaresFiltrados = this.ejemplaresDisponibles;
    this.displayEjemplarModal = true;
  }

  iniciarReemplazo(index: number): void {
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
      ejemplar.libro?.titulo.toLowerCase().includes(filter) ||
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
    this.ejemplaresSeleccionados.splice(index, 1);
    this.ejemplaresSeleccionados = [...this.ejemplaresSeleccionados]; 
  }

  onSubmit(): void {
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
        this.prestamoService.createPrestamo(payload).pipe(finalize(() => this.isSubmitting = false))
        .subscribe({
          next: (p) => {
            if (!p.uuid) return;
            const detalles = this.ejemplaresSeleccionados.map(e => ({ idEjemplar: e.id, fechaDevolucion: null, idEstadoPrestamo: 1 }));
            this.prestamoService.cargarDetallesEnMasiva(p.uuid, detalles).subscribe({
              next: () => {
                this.sharedDataService.notificarActualizacionEjemplares();
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Préstamo registrado correctamente.' });
                this.cdr.detectChanges();
                setTimeout(() => {
                  this.router.navigate(['/admin/prestamos']);
                }, 1500); 
              },
              error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Se guardó el préstamo pero fallaron los detalles.' });
                this.cdr.detectChanges();
              }
            });
          },
          error: (err) => {
            let detalleError = 'No se pudo registrar el préstamo (El backend lo rechazó).';
            
            if (err?.error) {
               if (typeof err.error === 'string') {
                  detalleError = err.error; 
               } else if (err.error.message) {
                  detalleError = err.error.message; 
               } else if (err.error.error) {
                  detalleError = err.error.error; 
               }
            }

            this.messageService.add({ severity: 'error', summary: 'Préstamo Rechazado', detail: detalleError });
            this.cdr.detectChanges();
          }
        });
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
    if (!ejemplar?.libro?.autores || ejemplar.libro.autores.length === 0) return 'Autor no asignado';
    return ejemplar.libro.autores.map(a => `${a.nombre} ${a.apPaterno || ''}`).join(', ');
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