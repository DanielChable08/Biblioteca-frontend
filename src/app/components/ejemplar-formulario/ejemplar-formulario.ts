import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

import { CatalogService } from '../../services/catalog.service';
import { BookService } from '../../services/book.service';
import { Catalogo } from '../../models/biblioteca';

type TipoCatalogoEjemplar = 'condicion' | 'estado';

@Component({
  selector: 'app-ejemplar-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    DialogModule,
    TooltipModule
  ],
  templateUrl: './ejemplar-formulario.html',
  styleUrls: ['./ejemplar-formulario.css']
})
export default class EjemplarFormularioComponent implements OnInit {
  private fb = inject(FormBuilder);
  private catalogService = inject(CatalogService);
  private bookService = inject(BookService);
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private messageService!: MessageService;

  ejemplarForm: FormGroup = this.fb.group({
    ubicacion: [''],
    idLibro: [null, Validators.required],
    idCondicionFisicaEjemplar: [null, Validators.required],
    idEstadoEjemplar: [null, Validators.required]
  });

  catalogoForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]]
  });

  condiciones: Catalogo[] = [];
  estados: Catalogo[] = [];
  libros: any[] = [];

  isSubmitting = false;
  idLibro?: number;
  ejemplarUuid?: string;
  isEditMode = false;
  mostrarSelectorLibro = false;
  displayCatalogoDialog = false;
  catalogoSiendoAgregado: TipoCatalogoEjemplar | null = null;

  ngOnInit(): void {
    this.messageService = this.config.data?.messageService;

    if (!this.messageService) {
      console.error('MessageService no fue proporcionado');
      return;
    }

    this.idLibro = this.config.data?.idLibro;
    this.ejemplarUuid = this.config.data?.ejemplarUuid;
    this.isEditMode = !!this.ejemplarUuid;
    this.mostrarSelectorLibro = !this.idLibro;

    if (this.idLibro) {
      this.ejemplarForm.patchValue({ idLibro: this.idLibro });
    }

    this.loadCatalogs();

    if (this.mostrarSelectorLibro) {
      this.loadLibros();
    }

    if (this.isEditMode && this.ejemplarUuid) {
      this.loadEjemplarData();
    }
  }

  private loadCatalogs(): void {
    this.catalogService.getCondicionesFisicas().subscribe({
      next: (data) => {
        this.condiciones = data;
      },
      error: (err) => {
        this.messageService?.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las condiciones físicas'
        });
      }
    });

    this.catalogService.getEstadosEjemplares().subscribe({
      next: (data) => {
        this.estados = data;
      },
      error: (err) => {
        this.messageService?.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los estados'
        });
      }
    });
  }

  private loadLibros(): void {
    this.bookService.getLibros().subscribe({
      next: (data) => {
        this.libros = data;
      },
      error: (err) => {
        this.messageService?.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los libros'
        });
      }
    });
  }

  private loadEjemplarData(): void {
    if (!this.ejemplarUuid) return;

    this.bookService.getEjemplarByUuid(this.ejemplarUuid).subscribe({
      next: (ejemplar: any) => {
        this.ejemplarForm.patchValue({
          ubicacion: ejemplar.ubicacion || '',
          idLibro: ejemplar.idLibro,
          idCondicionFisicaEjemplar: ejemplar.idCondicionFisicaEjemplar,
          idEstadoEjemplar: ejemplar.idEstadoEjemplar
        });
      },
      error: (err) => {
        this.messageService?.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el ejemplar para edición'
        });
        this.dialogRef.close();
      }
    });
  }

  abrirModalAgregar(tipo: TipoCatalogoEjemplar): void {
    this.catalogoSiendoAgregado = tipo;
    this.catalogoForm.reset();
    this.displayCatalogoDialog = true;
  }

  guardarNuevoCatalogo(): void {
    if (this.catalogoForm.invalid || !this.catalogoSiendoAgregado) {
      this.catalogoForm.markAllAsTouched();
      return;
    }

    const nombreCatalogo = this.catalogoForm.value.nombre.trim();

    const request$ = this.catalogoSiendoAgregado === 'condicion'
      ? this.catalogService.createCondicionFisica({ nombre: nombreCatalogo })
      : this.catalogService.createEstadoEjemplar({ nombre: nombreCatalogo });

    request$.subscribe({
      next: (nuevoItem) => {
        this.messageService?.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `${this.catalogoSiendoAgregado === 'condicion' ? 'Condición' : 'Estado'} agregado correctamente`
        });

        this.displayCatalogoDialog = false;

        if (this.catalogoSiendoAgregado === 'condicion') {
          this.condiciones = [...this.condiciones, nuevoItem];
          this.ejemplarForm.patchValue({ idCondicionFisicaEjemplar: nuevoItem.id });
        } else {
          this.estados = [...this.estados, nuevoItem];
          this.ejemplarForm.patchValue({ idEstadoEjemplar: nuevoItem.id });
        }

        this.catalogoSiendoAgregado = null;
      },
      error: (err) => {
        this.messageService?.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo agregar el elemento'
        });
      }
    });
  }

  onSubmit(): void {
    if (this.ejemplarForm.invalid) {
      this.ejemplarForm.markAllAsTouched();
      this.messageService?.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos obligatorios'
      });
      return;
    }

    this.isSubmitting = true;
    const rawValues = this.ejemplarForm.value;

    const ejemplarPayload = {
      ...rawValues,
      ubicacion: (rawValues.ubicacion && rawValues.ubicacion.trim() !== '') ? rawValues.ubicacion.trim() : null
    };

    const request$ = this.isEditMode && this.ejemplarUuid
      ? this.bookService.updateEjemplar(this.ejemplarUuid, ejemplarPayload)
      : this.bookService.createEjemplar(ejemplarPayload);

    request$.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService?.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.isEditMode ? 'Ejemplar actualizado correctamente' : 'Ejemplar agregado correctamente'
        });

        setTimeout(() => {
          this.dialogRef.close(true);
        }, 1000);
      },
      error: (err) => {
        let errorDetail = 'No se pudo guardar el ejemplar';

        if (err.status === 409) {
          errorDetail = 'Ya existe un ejemplar con ese código de barras';
        } else if (err.status === 404) {
          errorDetail = 'Libro no encontrado';
        } else if (err.status === 400) {
          if (err.error && typeof err.error === 'object') {
            const errores = Object.values(err.error).join(', ');
            errorDetail = errores;
          } else {
            errorDetail = err.error?.message || 'Datos inválidos';
          }
        } else if (err.error?.message) {
          errorDetail = err.error.message;
        }

        this.messageService?.add({
          severity: 'error',
          summary: 'Error',
          detail: errorDetail
        });
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.ejemplarForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  get tituloModal(): string {
    return this.isEditMode ? 'Editar Ejemplar' : 'Nuevo Ejemplar';
  }
}