import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { trigger, transition, style, animate } from '@angular/animations';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';

import { CatalogService } from '../../services/catalog.service';
import { Catalogo } from '../../models/biblioteca';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule
  ],
  templateUrl: './categorias.html',
  styleUrls: ['./categorias.css'],
  animations: [
    trigger('dropIn', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('250ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'translateY(-10px)', opacity: 0 })),
      ]),
    ]),
  ],
})
export default class CategoriasComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  categorias: Catalogo[] = [];
  loading = false;
  globalFilter: string = '';

  // Modal
  displayModal = false;
  isEditMode = false;
  isSubmitting = false;
  categoriaForm!: FormGroup;
  categoriaSeleccionada: Catalogo | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.categoriaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  loadData(): void {
    this.loading = true;
    this.catalogService.getCategorias().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        this.categorias = data;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las categorías.'
        });
        console.error(err);
      }
    });
  }

  abrirModalAgregar(): void {
    this.isEditMode = false;
    this.categoriaSeleccionada = null;
    this.categoriaForm.reset();
    this.displayModal = true;
  }

  abrirModalEditar(categoria: Catalogo): void {
    this.isEditMode = true;
    this.categoriaSeleccionada = categoria;
    this.categoriaForm.patchValue({ nombre: categoria.nombre });
    this.displayModal = true;
  }

  cerrarModal(): void {
    this.displayModal = false;
    this.categoriaForm.reset();
    this.categoriaSeleccionada = null;
  }

  onSubmit(): void {
    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const data = this.categoriaForm.value;

    const request = this.isEditMode && this.categoriaSeleccionada
      ? this.catalogService.updateCategoria(this.categoriaSeleccionada.uuid, data)
      : this.catalogService.createCategoria(data);

    request.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Categoría ${this.isEditMode ? 'actualizada' : 'creada'} correctamente.`
        });
        this.cerrarModal();
        this.loadData();
      },
      error: (err: any) => {
        let errorDetail = `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} la categoría.`;
        let errorSummary = 'Error';

        if (err.status === 400) {
          if (err.error && typeof err.error === 'object') {
            const errores = Object.values(err.error).join(' ');
            errorDetail = errores;
          }
          errorSummary = 'Conflicto';
        } else if (err.status === 409) {
          errorSummary = 'Conflicto';
          errorDetail = err.error.error;
        }

        this.messageService?.add({
          severity: 'error',
          summary: errorSummary,
          detail: errorDetail
        });
      }
    });
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  eliminar(categoria: Catalogo): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar la categoría "${categoria.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        this.catalogService.deleteCategoria(categoria.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Categoría eliminada.'
            });
            this.categorias = this.categorias.filter(c => c.id !== categoria.id);
          },
          error: (err: any) => {
            let errorDetail = 'No se pudo eliminar la categoría.';
            let errorSummary = 'Error';

            if (err.status === 400) {
              if (err.error && typeof err.error === 'object') {
                const errores = Object.values(err.error).join(' ');
                errorDetail = errores;
              }
              errorSummary = 'Conflicto';
            } else if (err.status === 409) {
              errorSummary = 'Conflicto';
              errorDetail = err.error.error;
            }

            this.messageService?.add({
              severity: 'error',
              summary: errorSummary,
              detail: errorDetail
            });
          }
        });
      }
    });
  }

  applyFilterGlobal(table: any, event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    table.filterGlobal(filterValue, 'contains');
  }

  clearFilter(table: any): void {
    this.globalFilter = '';
    table.clear();
  }
}
