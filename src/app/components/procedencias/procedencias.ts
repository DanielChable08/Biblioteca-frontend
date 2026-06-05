import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, finalize, Subject } from 'rxjs';

import { trigger, transition, style, animate } from '@angular/animations';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';


import { ProcedenciaService } from '../../services/procedencia.service';
import { Procedencia } from '../../models/biblioteca';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-procedencias',
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
    InputTextModule,
    TextareaModule,
    SkeletonModule
  ],
  templateUrl: './procedencias.html',
  styleUrls: ['./procedencias.css'],
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
export default class ProcedenciasComponent implements OnInit {
  private procedenciaService = inject(ProcedenciaService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  authService = inject(AuthService);
  procedencias: Procedencia[] = [];
  procedenciasDesactivadas: any[] = [];
  entradasTotales: number = 0;
  entradasDesactivadasTotales: number = 0;
  searchSubject = new Subject<string>();
  searchDeactivatedSubject = new Subject<string>();
  globalFilter: string = '';
  ocultosFilter: string = '';
  currentSort = { field: 'id', order: 'desc' };
  currentPage = 0;
  currentSize = 15;
  currentDeactivatedSort = { field: 'id', order: 'desc' };
  currentDeactivatedPage = 0;
  currentDeactivatedSize = 15;

  // Modal
  displayModal = false;
  isEditMode = false;
  isSubmitting = false;
  procedenciaForm!: FormGroup;
  procedenciaSeleccionada: Procedencia | null = null;
  modalDesactivados = false;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.searchSubject.pipe(debounceTime(400)).subscribe(search => {
      this.loadData(0, this.currentSize, this.currentSort.field, this.currentSort.order, search);
    });
    this.loadDeactivatedData();
    this.searchDeactivatedSubject.pipe(debounceTime(400)).subscribe(search => {
      this.loadDeactivatedData(0, this.currentDeactivatedSize, this.currentDeactivatedSort.field, this.currentDeactivatedSort.order, search);
    });
  }

  initForm(): void {
    this.procedenciaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      descripcion: ['', [Validators.minLength(2)]]
    });
  }

  loadData(page: number = 0, size: number = 15, sortField: string = 'nombre', sortOrder: string = 'asc', search = ''): void {
    this.procedenciaService.listarProcedencias(page, size, sortField, sortOrder, search).subscribe({
      next: (data) => {
        this.procedencias = data.content;
        this.entradasTotales = data.totalElements
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las procedencias.'
        });
        console.error(err);
      }
    });
  }

  loadDeactivatedData(page: number = 0, size: number = 15, sortField: string = 'nombre', sortOrder: string = 'asc', search = ''): void {
    this.procedenciaService.listarProcedenciasDesactivadas(page, size, sortField, sortOrder, search).subscribe({
      next: (data) => {
        this.procedenciasDesactivadas = data.content;
        this.entradasDesactivadasTotales = data.totalElements
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las procedencias.'
        });
        console.error(err);
      }
    });
  }

  abrirModalAgregar(): void {
    this.isEditMode = false;
    this.procedenciaSeleccionada = null;
    this.procedenciaForm.reset();
    this.displayModal = true;
  }

  abrirModalEditar(procedencia: Procedencia): void {
    this.isEditMode = true;
    this.procedenciaSeleccionada = procedencia;
    this.procedenciaForm.patchValue({ nombre: procedencia.nombre, descripcion: procedencia.descripcion });
    this.displayModal = true;
  }

  cerrarModal(): void {
    this.displayModal = false;
    this.procedenciaForm.reset();
    this.procedenciaSeleccionada = null;
  }

  onSubmit(): void {
    if (this.procedenciaForm.invalid) {
      this.procedenciaForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const data = this.procedenciaForm.value;

    const request = this.isEditMode && this.procedenciaSeleccionada
      ? this.procedenciaService.actualizarProcedencia(this.procedenciaSeleccionada.uuid, data)
      : this.procedenciaService.crearProcedencia(data);

    request.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Procedencia ${this.isEditMode ? 'actualizada' : 'creada'} correctamente.`
        });
        this.cerrarModal();
        this.loadData();
      },
      error: (err: any) => {
        let errorDetail = `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} la procedencia.`;
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

  eliminar(procedencia: Procedencia): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar la procedencia "${procedencia.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.procedenciaService.desactivarProcedencia(procedencia.uuid).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Procedencia eliminada.'
            });
            this.procedencias = this.procedencias.filter(c => c.id !== procedencia.id);
            this.loadDeactivatedData(this.currentDeactivatedPage, this.currentDeactivatedSize, this.currentDeactivatedSort.field, this.currentDeactivatedSort.order, this.ocultosFilter);
          },
          error: (err: any) => {
            let errorDetail = 'No se pudo eliminar la procedencia.';
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

  reactivarProcedencia(procedencia: Procedencia): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de reactivar la procedencia "${procedencia.nombre}"?`,
      header: 'Confirmar Reactivación',
      icon: 'pi pi-refresh text-green-500',
      acceptLabel: 'Sí, reactivar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success custom-accept-button',
      rejectButtonStyleClass: 'p-button-text custom-reject-button',
      accept: () => {
        this.procedenciaService.reactivarProcedencia(procedencia.uuid).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Procedencia reactivada.'
            });
            this.procedenciasDesactivadas = this.procedenciasDesactivadas.filter(c => c.id !== procedencia.id);
            this.loadData(this.currentPage, this.currentSize, this.currentSort.field, this.currentSort.order, this.globalFilter);
          },
          error: (err: any) => {
            let errorDetail = 'No se pudo reactivar la procedencia.';
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
    this.globalFilter = (event.target as HTMLInputElement).value;
    this.searchSubject.next(this.globalFilter);
  }

  clearFilter(table: any): void {
    this.globalFilter = '';
    this.searchSubject.next('');
  }

  onPageChange(event: any): void {
    this.currentPage = event.rows > 0 ? Math.floor(event.first / event.rows) : 0;
    this.currentSize = event.rows;
    this.currentSort.field = event.sortField || 'id';
    this.currentSort.order = event.sortOrder === 1 ? 'asc' : 'desc';

    this.loadData(this.currentPage, this.currentSize, this.currentSort.field, this.currentSort.order, this.globalFilter);
  }

  onDeactivatedPageChange(event: any): void {
    this.currentDeactivatedPage = event.rows > 0 ? Math.floor(event.first / event.rows) : 0;
    this.currentDeactivatedSize = event.rows;
    this.currentDeactivatedSort.field = event.sortField || 'id';
    this.currentDeactivatedSort.order = event.sortOrder === 1 ? 'asc' : 'desc';

    this.loadDeactivatedData(this.currentDeactivatedPage, this.currentDeactivatedSize, this.currentDeactivatedSort.field, this.currentDeactivatedSort.order, this.ocultosFilter);
  }

  applyFilterOcultos(table: any, event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    table.filterGlobal(filterValue, 'contains');
  }

  clearOcultosFilter(table: any): void {
    this.ocultosFilter = '';
    table.clear();
  }
}
