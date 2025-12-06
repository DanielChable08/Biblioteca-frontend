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
    DialogModule
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
  private messageService!: MessageService; // Se inicializa en ngOnInit

  ejemplarForm!: FormGroup;
  catalogoForm!: FormGroup;

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
    // IMPORTANTE: Recibir el MessageService compartido desde el padre
    this.messageService = this.config.data?.messageService || inject(MessageService);
    
    this.idLibro = this.config.data?.idLibro;
    this.ejemplarUuid = this.config.data?.ejemplarUuid;
    this.isEditMode = !!this.ejemplarUuid;
    this.mostrarSelectorLibro = !this.idLibro;

    this.initForms();
    this.loadCatalogs();

    if (this.isEditMode && this.ejemplarUuid) {
      this.loadEjemplarData();
    }

    if (this.mostrarSelectorLibro) {
      this.loadLibros();
    }
  }

  private initForms(): void {
    this.ejemplarForm = this.fb.group({
      ubicacion: [''],
      idLibro: [this.idLibro || null, Validators.required],
      idCondicionFisicaEjemplar: [null, Validators.required],
      idEstadoEjemplar: [null, Validators.required]
    });

    this.catalogoForm = this.fb.group({
      nombre: ['', Validators.required]
    });
  }

  private loadCatalogs(): void {
    this.catalogService.getCondicionesFisicas().subscribe(data => this.condiciones = data);
    this.catalogService.getEstadosEjemplares().subscribe(data => this.estados = data);
  }

  private loadLibros(): void {
    this.bookService.getLibros().subscribe(data => this.libros = data);
  }

  private loadEjemplarData(): void {
    if (!this.ejemplarUuid) return;

    this.bookService.getEjemplarByUuid(this.ejemplarUuid).subscribe({
      next: (ejemplar: any) => {
        this.ejemplarForm.patchValue({
          ubicacion: ejemplar.ubicacion,
          idLibro: ejemplar.idLibro,
          idCondicionFisicaEjemplar: ejemplar.idCondicionFisicaEjemplar,
          idEstadoEjemplar: ejemplar.idEstadoEjemplar
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el ejemplar.'
        });
      }
    });
  }

  abrirModalAgregar(tipo: TipoCatalogoEjemplar): void {
    this.catalogoSiendoAgregado = tipo;
    this.catalogoForm.reset();
    this.displayCatalogoDialog = true;
  }

  guardarNuevoCatalogo(): void {
    if (this.catalogoForm.invalid || !this.catalogoSiendoAgregado) return;

    const request$ = this.catalogoSiendoAgregado === 'condicion'
      ? this.catalogService.createCondicionFisica(this.catalogoForm.value)
      : this.catalogService.createEstadoEjemplar(this.catalogoForm.value);

    request$.subscribe(nuevoItem => {
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Opción agregada.'
      });
      this.displayCatalogoDialog = false;

      if (this.catalogoSiendoAgregado === 'condicion') {
        this.condiciones = [...this.condiciones, nuevoItem];
        this.ejemplarForm.patchValue({ idCondicionFisicaEjemplar: nuevoItem.id });
      } else {
        this.estados = [...this.estados, nuevoItem];
        this.ejemplarForm.patchValue({ idEstadoEjemplar: nuevoItem.id });
      }
    });
  }

  onSubmit(): void {
    if (this.ejemplarForm.invalid) {
      this.ejemplarForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const ejemplarPayload = this.ejemplarForm.value;

    const request$ = this.isEditMode && this.ejemplarUuid
      ? this.bookService.updateEjemplar(this.ejemplarUuid, ejemplarPayload)
      : this.bookService.createEjemplar(ejemplarPayload);

    request$.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.isEditMode ? 'Ejemplar actualizado.' : 'Ejemplar agregado.'
        });
        setTimeout(() => this.dialogRef.close(true), 1000);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.isEditMode ? 'No se pudo actualizar.' : 'No se pudo agregar el ejemplar.'
        });
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  get tituloModal(): string {
    return this.isEditMode ? 'Editar Ejemplar' : 'Nuevo Ejemplar';
  }
}
