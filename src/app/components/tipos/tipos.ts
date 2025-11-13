import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';

import { CatalogService } from '../../services/catalog.service';
import { TipoLibro } from '../../models/biblioteca';

@Component({
  selector: 'app-tipos',
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
  templateUrl: './tipos.html',
  styleUrls: ['./tipos.css']
})
export default class TiposComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  tipos: TipoLibro[] = [];
  loading = false;
  globalFilter: string = '';
  
  // Modal
  displayModal = false;
  isEditMode = false;
  isSubmitting = false;
  tipoForm!: FormGroup;
  tipoSeleccionado: TipoLibro | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.tipoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  loadData(): void {
    this.loading = true;
    this.catalogService.getTiposLibros().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        this.tipos = data;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los tipos de libros.'
        });
        console.error(err);
      }
    });
  }

  abrirModalAgregar(): void {
    this.isEditMode = false;
    this.tipoSeleccionado = null;
    this.tipoForm.reset();
    this.displayModal = true;
  }

  abrirModalEditar(tipo: TipoLibro): void {
    this.isEditMode = true;
    this.tipoSeleccionado = tipo;
    this.tipoForm.patchValue({ nombre: tipo.nombre });
    this.displayModal = true;
  }

  cerrarModal(): void {
    this.displayModal = false;
    this.tipoForm.reset();
    this.tipoSeleccionado = null;
  }

  onSubmit(): void {
    if (this.tipoForm.invalid) {
      this.tipoForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const data = this.tipoForm.value;

    const request = this.isEditMode && this.tipoSeleccionado
      ? this.catalogService.updateTipoLibro(this.tipoSeleccionado.uuid, data)
      : this.catalogService.createTipoLibro(data);

    request.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Tipo de libro ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`
        });
        this.cerrarModal();
        this.loadData();
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el tipo de libro.`
        });
        console.error(err);
      }
    });
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  eliminar(tipo: TipoLibro): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el tipo "${tipo.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        this.catalogService.deleteTipoLibro(tipo.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Tipo de libro eliminado.'
            });
            this.tipos = this.tipos.filter(t => t.id !== tipo.id);
          },
          error: (err: any) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el tipo de libro.'
            });
            console.error(err);
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
