import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { finalize, forkJoin, map, switchMap, of } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';

import { PrestamoService } from '../../services/prestamo.service';
import { CatalogService } from '../../services/catalog.service';
import { UsuarioService } from '../../services/usuario.service';
import { BookService } from '../../services/book.service';
import { 
  Prestamo, 
  Persona, 
  EstadoPrestamo, 
  Ejemplar,
  PrestamoPayload 
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
    CheckboxModule
  ],
  templateUrl: './prestamo-formulario.html',
  styleUrls: ['./prestamo-formulario.css']
})
export default class PrestamoFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private prestamoService = inject(PrestamoService);
  private catalogService = inject(CatalogService);
  private usuarioService = inject(UsuarioService);
  private bookService = inject(BookService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  prestamoForm!: FormGroup;
  catalogoForm!: FormGroup;
  
  isEditMode = false;
  isSubmitting = false;
  catalogoSubmitting = false;
  prestamoUuid: string | null = null;

  bibliotecarios: (Persona & { nombreCompleto: string })[] = [];
  lectores: (Persona & { nombreCompleto: string })[] = [];
  estadosPrestamo: EstadoPrestamo[] = [];
  ejemplaresDisponibles: Ejemplar[] = [];
  ejemplaresFiltrados: Ejemplar[] = [];

  ejemplaresSeleccionados: Ejemplar[] = [];

  displayCatalogoModal = false;
  displayEjemplarModal = false;
  catalogoTipo: 'bibliotecario' | 'lector' | 'estadoPrestamo' | null = null;

  ejemplarFilter = '';
  minFechaLimite: Date = new Date();

  ngOnInit(): void {
    this.initForms();
    this.loadCatalogos();
    this.checkEditMode();
    this.setupFechaListeners();
  }

  initForms(): void {
    this.prestamoForm = this.fb.group({
      fechaPrestamo: [new Date(), [Validators.required]],
      fechaLimite: [this.getDefaultFechaLimite(), [Validators.required]],
      idBibliotecario: [null, [Validators.required]],
      idLector: [null, [Validators.required]],
      idEstadoPrestamo: [null, [Validators.required]]
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
        this.minFechaLimite = new Date(fecha);
      }
    });
  }

  loadCatalogos(): void {
    // Cargar bibliotecarios
    this.usuarioService.getBibliotecarios().subscribe({
      next: (data) => {
        this.bibliotecarios = data.map(p => ({
          ...p,
          nombreCompleto: `${p.nombre} ${p.apPaterno} ${p.apMaterno || ''}`
        }));
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los bibliotecarios.'
        });
        console.error(err);
      }
    });

    // Cargar lectores
    this.usuarioService.getLectores().subscribe({
      next: (data) => {
        this.lectores = data.map(p => ({
          ...p,
          nombreCompleto: `${p.nombre} ${p.apPaterno} ${p.apMaterno || ''}`
        }));
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los lectores.'
        });
        console.error(err);
      }
    });

    // Cargar estados de préstamo
    this.catalogService.getEstadosPrestamos().subscribe({
      next: (data) => {
        this.estadosPrestamo = data;
        const estadoActivo = data.find(e => e.nombre.toLowerCase() === 'activo');
        if (estadoActivo && !this.isEditMode) {
          this.prestamoForm.patchValue({ idEstadoPrestamo: estadoActivo.id });
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los estados de préstamo.'
        });
        console.error(err);
      }
    });

    // Cargar ejemplares con libros y autores (PATRÓN BIBLIOTECARIO)
    forkJoin({
      ejemplares: this.bookService.getEjemplaresDisponibles(),
      libros: this.bookService.getLibros()
    }).pipe(
      switchMap(({ ejemplares, libros }) => {
        if (libros.length === 0) {
          return of({ ejemplares: [], libros: [] });
        }

        // Obtener autores para cada libro
        const autorRequests = libros.map(libro =>
          this.bookService.getAutoresForLibro(libro.uuid)
        );

        return forkJoin(autorRequests).pipe(
          map(autoresArray => {
            // Asignar autores a cada libro
            const librosCompletos = libros.map((libro, index) => ({
              ...libro,
              autores: autoresArray[index]
            }));

            // Asignar libro completo a cada ejemplar
            const ejemplaresCompletos = ejemplares.map(ejemplar => {
              const libroDelEjemplar = librosCompletos.find(l => l.id === ejemplar.idLibro);
              return {
                ...ejemplar,
                libro: libroDelEjemplar
              };
            });

            return { ejemplares: ejemplaresCompletos, libros: librosCompletos };
          })
        );
      })
    ).subscribe({
      next: ({ ejemplares }) => {
        this.ejemplaresDisponibles = ejemplares;
        this.ejemplaresFiltrados = ejemplares;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los ejemplares.'
        });
        console.error(err);
      }
    });
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

    this.prestamoService.getPrestamoByUuid(this.prestamoUuid).subscribe({
      next: (prestamo) => {
        this.prestamoForm.patchValue({
          fechaPrestamo: new Date(prestamo.fechaPrestamo),
          fechaLimite: new Date(prestamo.fechaLimite),
          idBibliotecario: prestamo.idBibliotecario,
          idLector: prestamo.idLector,
          idEstadoPrestamo: prestamo.idEstadoPrestamo
        });

        if (prestamo.detalles) {
          this.ejemplaresSeleccionados = prestamo.detalles
            .map(d => d.ejemplar)
            .filter((e): e is Ejemplar => e !== undefined);
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el préstamo.'
        });
        console.error(err);
      }
    });
  }

  onSubmit(): void {
    if (this.prestamoForm.invalid) {
      this.prestamoForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor completa todos los campos requeridos.'
      });
      return;
    }

    if (this.ejemplaresSeleccionados.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Debes seleccionar al menos un ejemplar.'
      });
      return;
    }

    this.isSubmitting = true;
    const formData = this.prestamoForm.value;

    const payload: PrestamoPayload = {
      fechaPrestamo: this.formatDate(formData.fechaPrestamo),
      fechaLimite: this.formatDate(formData.fechaLimite),
      idBibliotecario: formData.idBibliotecario,
      idLector: formData.idLector,
      idEstadoPrestamo: formData.idEstadoPrestamo
    };

    if (this.isEditMode && this.prestamoUuid) {
      this.updatePrestamo(payload);
    } else {
      this.createPrestamo(payload);
    }
  }

  createPrestamo(payload: PrestamoPayload): void {
    this.prestamoService.createPrestamo(payload).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (prestamo) => {
        const idEjemplares = this.ejemplaresSeleccionados.map(e => e.id);
        this.prestamoService.cargarDetallesEnMasiva(prestamo.uuid, idEjemplares).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Préstamo creado correctamente.'
            });
            this.router.navigate(['/admin/prestamos']);
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudieron agregar los ejemplares al préstamo.'
            });
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear el préstamo.'
        });
        console.error(err);
      }
    });
  }

  updatePrestamo(payload: PrestamoPayload): void {
    if (!this.prestamoUuid) return;

    this.prestamoService.updatePrestamo(this.prestamoUuid, payload).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Préstamo actualizado correctamente.'
        });
        this.router.navigate(['/admin/prestamos']);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el préstamo.'
        });
        console.error(err);
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
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    const offset = -date.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
    const offsetSign = offset >= 0 ? '+' : '-';

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }

  abrirModalAgregar(tipo: 'bibliotecario' | 'lector' | 'estadoPrestamo'): void {
    this.catalogoTipo = tipo;
    this.catalogoForm.reset();
    this.displayCatalogoModal = true;
  }

  getTituloModal(): string {
    switch (this.catalogoTipo) {
      case 'bibliotecario': return 'Agregar Bibliotecario';
      case 'lector': return 'Agregar Lector';
      case 'estadoPrestamo': return 'Agregar Estado de Préstamo';
      default: return 'Agregar';
    }
  }

  guardarCatalogo(): void {
    if (this.catalogoForm.invalid) {
      this.catalogoForm.markAllAsTouched();
      return;
    }

    this.catalogoSubmitting = true;
    const data = this.catalogoForm.value;

    switch (this.catalogoTipo) {
      case 'estadoPrestamo':
        this.catalogService.createEstadoPrestamo(data).pipe(
          finalize(() => this.catalogoSubmitting = false)
        ).subscribe({
          next: (nuevo) => {
            this.estadosPrestamo = [...this.estadosPrestamo, nuevo];
            this.prestamoForm.patchValue({ idEstadoPrestamo: nuevo.id });
            this.displayCatalogoModal = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Estado creado correctamente.'
            });
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo crear el estado.'
            });
            console.error(err);
          }
        });
        break;
      
      case 'bibliotecario':
      case 'lector':
        this.messageService.add({
          severity: 'info',
          summary: 'Info',
          detail: 'Funcionalidad en desarrollo. Usar el módulo de Personas.'
        });
        this.displayCatalogoModal = false;
        break;
    }
  }

  abrirModalEjemplar(): void {
    this.ejemplarFilter = '';
    this.ejemplaresFiltrados = this.ejemplaresDisponibles;
    this.displayEjemplarModal = true;
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

  isEjemplarSeleccionado(ejemplar: Ejemplar): boolean {
    return this.ejemplaresSeleccionados.some(e => e.id === ejemplar.id);
  }

  toggleEjemplar(ejemplar: Ejemplar): void {
    const index = this.ejemplaresSeleccionados.findIndex(e => e.id === ejemplar.id);
    if (index > -1) {
      this.ejemplaresSeleccionados.splice(index, 1);
    } else {
      this.ejemplaresSeleccionados.push(ejemplar);
    }
  }

  confirmarEjemplares(): void {
    this.displayEjemplarModal = false;
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: `${this.ejemplaresSeleccionados.length} ejemplar(es) agregado(s).`
    });
  }

  removerEjemplar(index: number): void {
    this.ejemplaresSeleccionados.splice(index, 1);
    this.messageService.add({
      severity: 'info',
      summary: 'Eliminado',
      detail: 'Ejemplar removido de la lista.'
    });
  }

  regresar(): void {
    this.router.navigate(['/admin/prestamos']);
  }

  // Método para obtener autores desde un ejemplar
  getAutoresNombres(ejemplar: Ejemplar): string {
    if (!ejemplar?.libro?.autores || ejemplar.libro.autores.length === 0) {
      return 'Autor no asignado';
    }
    return ejemplar.libro.autores.map(a => `${a.nombre} ${a.apPaterno}`).join(', ');
  }
}
