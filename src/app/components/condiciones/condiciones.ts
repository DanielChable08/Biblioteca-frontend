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
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { CatalogService } from '../../services/catalog.service';
import { CondicionFisica } from '../../models/biblioteca';

@Component({
  selector: 'app-condiciones',
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
  templateUrl: './condiciones.html',
  styleUrls: ['./condiciones.css'],
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
export default class CondicionesComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  condiciones: CondicionFisica[] = [];
  loading = false;
  globalFilter: string = '';
  
  // Modal
  displayModal = false;
  isEditMode = false;
  isSubmitting = false;
  condicionForm!: FormGroup;
  condicionSeleccionada: CondicionFisica | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.condicionForm = this.fb.group({
      nombre: ['', [Validators.required]]
    });
  }

  loadData(): void {
    this.loading = true;
    this.catalogService.getCondicionesFisicas().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        this.condiciones = data;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las condiciones físicas.'
        });
        console.error(err);
      }
    });
  }

  abrirModalAgregar(): void {
    this.isEditMode = false;
    this.condicionSeleccionada = null;
    this.condicionForm.reset();
    this.displayModal = true;
  }

  abrirModalEditar(condicion: CondicionFisica): void {
    this.isEditMode = true;
    this.condicionSeleccionada = condicion;
    this.condicionForm.patchValue({ nombre: condicion.nombre });
    this.displayModal = true;
  }

  cerrarModal(): void {
    this.displayModal = false;
    this.condicionForm.reset();
    this.condicionSeleccionada = null;
  }

  onSubmit(): void {
    if (this.condicionForm.invalid) {
      this.condicionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const data = this.condicionForm.value;

    const request = this.isEditMode && this.condicionSeleccionada
      ? this.catalogService.updateCondicionFisica(this.condicionSeleccionada.uuid, data)
      : this.catalogService.createCondicionFisica(data);

    request.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Condición física ${this.isEditMode ? 'actualizada' : 'creada'} correctamente.`
        });
        this.cerrarModal();
        this.loadData();
      },
      error: (err: any) => {
        let errorDetail = `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} la condición física.`;
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

  eliminar(condicion: CondicionFisica): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar la condición física "${condicion.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        this.catalogService.deleteCondicionFisica(condicion.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Condición física eliminada.'
            });
            this.condiciones = this.condiciones.filter(c => c.id !== condicion.id);
          },
          error: (err: any) => {
            let errorDetail = 'No se pudo eliminar la condición física.';
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
