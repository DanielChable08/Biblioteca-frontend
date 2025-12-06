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
import { EjemplarService } from '../../services/ejemplar.service';
import { AuthService } from '../../services/auth.service';
import { SharedDataService } from '../../services/shared-data.service';
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
  private ejemplarService = inject(EjemplarService);
  private authService = inject(AuthService);
  private sharedDataService = inject(SharedDataService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  prestamoForm!: FormGroup;
  catalogoForm!: FormGroup;

  isEditMode = false;
  isSubmitting = false;
  catalogoSubmitting = false;
  prestamoUuid: string | null = null;

  readonly MAX_EJEMPLARES = 5;

  lectores: (Persona & { nombreCompleto: string })[] = [];
  estadosPrestamo: EstadoPrestamo[] = [];
  ejemplaresDisponibles: Ejemplar[] = [];
  ejemplaresFiltrados: Ejemplar[] = [];
  ejemplaresSeleccionados: Ejemplar[] = [];

  displayCatalogoModal = false;
  displayEjemplarModal = false;
  catalogoTipo: 'lector' | 'estadoPrestamo' | null = null;
  ejemplarFilter = '';
  minFechaLimite: Date = new Date();
  minFechaPrestamo: Date = new Date();

  idPersonaBibliotecario!: number;

  ngOnInit(): void {
    this.initForms();
    this.loadCatalogos();
    this.checkEditMode();
    this.setupFechaListeners();
    this.setIdBibliotecario();
  }

  private setIdBibliotecario(): void {
    const userData = localStorage.getItem('userData');
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
        this.minFechaLimite = new Date(fecha);
      }
    });
  }

  loadCatalogos(): void {
    this.prestamoService.getPersonas().subscribe({
      next: (data) => {
        this.lectores = data
          .filter(p => p.idTipoPersona === 1)
          .map(p => ({
            ...p,
            nombreCompleto: `${p.nombre} ${p.apPaterno} ${p.apMaterno || ''}`.trim()
          }));
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los lectores.'
        });
      }
    });

    this.catalogService.getEstadosPrestamos().subscribe({
      next: (data) => {
        this.estadosPrestamo = data;
        if (!this.isEditMode) {
          const activo = data.find(e => e.nombre.toLowerCase().includes('activo'));
          if (activo) {
            this.prestamoForm.patchValue({ idEstadoPrestamo: activo.id });
          }
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los estados de préstamo.'
        });
      }
    });

    forkJoin({
      ejemplares: this.ejemplarService.getEjemplares(),
      libros: this.bookService.getLibros(),
      estados: this.catalogService.getEstadosEjemplares()
    }).pipe(
      switchMap(({ ejemplares, libros, estados }) => {
        if (libros.length === 0) {
          return of({ ejemplares: [], libros: [] });
        }

        const estadoDisponible = estados.find(e => e.nombre.toLowerCase() === 'disponible');
        
        const ejemplaresSoloDisponibles = ejemplares.filter(ejemplar => 
          ejemplar.idEstadoEjemplar === estadoDisponible?.id
        );

        const autorRequests = libros.map(libro =>
          this.bookService.getAutoresForLibro(libro.uuid)
        );
        
        return forkJoin(autorRequests).pipe(
          map(autoresArray => {
            const librosCompletos = libros.map((libro, index) => ({
              ...libro,
              autores: autoresArray[index]
            }));
            
            const ejemplaresCompletos = ejemplaresSoloDisponibles.map(ejemplar => {
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
        console.log('📚 Ejemplares disponibles cargados:', ejemplares.length);
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los ejemplares.'
        });
        console.error('Error cargando ejemplares:', err);
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
          fechaLimite: prestamo.fechaLimite ? new Date(prestamo.fechaLimite) : this.getDefaultFechaLimite(),
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

    const fechaPrestamo: Date = this.prestamoForm.get('fechaPrestamo')!.value;
    const fechaLimite: Date = this.prestamoForm.get('fechaLimite')!.value;
    const hoy = new Date(); hoy.setHours(0,0,0,0);

    if (fechaPrestamo < hoy) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha inválida',
        detail: 'La fecha de préstamo no puede ser anterior a hoy.'
      });
      return;
    }

    if (fechaLimite <= fechaPrestamo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Fecha inválida',
        detail: 'La fecha límite de devolución debe ser después de la fecha de préstamo.'
      });
      return;
    }

    if (this.idPersonaBibliotecario === undefined || this.idPersonaBibliotecario === null || this.idPersonaBibliotecario < 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de sesión',
        detail: 'No se pudo obtener el usuario actual. Por favor reinicia sesión.'
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

    if (this.ejemplaresSeleccionados.length > this.MAX_EJEMPLARES) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: `No se pueden prestar más de ${this.MAX_EJEMPLARES} libros por préstamo.`
      });
      return;
    }

    this.isSubmitting = true;
    const formData = this.prestamoForm.value;

    const payload: PrestamoPayload = {
      fechaPrestamo: this.formatDate(formData.fechaPrestamo),
      fechaLimite: this.formatDate(formData.fechaLimite),
      idBibliotecario: this.idPersonaBibliotecario,
      idLector: formData.idLector,
      idEstadoPrestamo: formData.idEstadoPrestamo || this.prestamoForm.get('idEstadoPrestamo')!.value
    };

    if (this.isEditMode && this.prestamoUuid) {
      this.updatePrestamo(payload);
    } else {
      this.prestamoService.createPrestamo(payload).pipe(
        finalize(() => this.isSubmitting = false)
      ).subscribe({
        next: (prestamo) => {
          console.log('✅ Préstamo creado:', prestamo);
          console.log('🔍 UUID recibido:', prestamo.uuid);
          
          if (!prestamo.uuid) {
            console.error('❌ ERROR: El préstamo no tiene UUID');
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'El préstamo se creó pero no tiene UUID. Verifica la respuesta del backend.'
            });
            return;
          }
          
          const detalles = this.ejemplaresSeleccionados.map(e => ({
            idEjemplar: e.id,
            fechaDevolucion: null,
            idEstadoPrestamo: 1
          }));
          
          console.log('📦 Detalles a enviar:', detalles);
          console.log('🌐 Llamando a cargarDetallesEnMasiva con UUID:', prestamo.uuid);
          
          this.prestamoService.cargarDetallesEnMasiva(prestamo.uuid, detalles).subscribe({
            next: () => {
              console.log('✅ Detalles creados correctamente');
              
              this.sharedDataService.notificarActualizacionEjemplares();
              
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Préstamo y ejemplares creados correctamente.'
              });
              this.router.navigate(['/admin/prestamos']);
            },
            error: (err) => {
              console.error('❌ Error al crear detalles:', err);
              console.error('❌ Status:', err.status);
              console.error('❌ Error completo:', err.error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron agregar los ejemplares al préstamo.'
              });
            }
          });
        },
        error: (err) => {
          console.error('❌ Error al crear préstamo:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el préstamo.'
          });
        }
      });
    }
  }

  updatePrestamo(payload: PrestamoPayload): void {
    if (!this.prestamoUuid) return;

    this.prestamoService.updatePrestamo(this.prestamoUuid, payload).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.sharedDataService.notificarActualizacionEjemplares();
        
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

  abrirModalAgregar(tipo: 'lector' | 'estadoPrestamo'): void {
    this.catalogoTipo = tipo;
    this.catalogoForm.reset();
    this.displayCatalogoModal = true;
  }

  getTituloModal(): string {
    switch (this.catalogoTipo) {
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
          }
        });
        break;
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
      if (this.ejemplaresSeleccionados.length >= this.MAX_EJEMPLARES) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Límite alcanzado',
          detail: `Solo se pueden prestar máximo ${this.MAX_EJEMPLARES} libros por préstamo.`
        });
        return;
      }
      this.ejemplaresSeleccionados.push(ejemplar);
    }
  }

  canAddMoreEjemplares(): boolean {
    return this.ejemplaresSeleccionados.length < this.MAX_EJEMPLARES;
  }

  confirmarEjemplares(): void {
    if (this.ejemplaresSeleccionados.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Debes seleccionar al menos un ejemplar.'
      });
      return;
    }
    if (this.ejemplaresSeleccionados.length > this.MAX_EJEMPLARES) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite excedido',
        detail: `Solo se pueden prestar máximo ${this.MAX_EJEMPLARES} libros.`
      });
      return;
    }
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

  getAutoresNombres(ejemplar: Ejemplar): string {
    if (!ejemplar?.libro?.autores || ejemplar.libro.autores.length === 0) {
      return 'Autor no asignado';
    }
    return ejemplar.libro.autores.map(a => `${a.nombre} ${a.apPaterno}`).join(', ');
  }
}
