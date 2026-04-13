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
import { Areas } from '../../models/biblioteca';

@Component({
  selector: 'app-areas',
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
  templateUrl: './areas.html',
  styleUrls: ['./areas.css'],
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
export default class AreasComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  areas: Areas[] = [];
  loading = false;
  globalFilter: string = '';

  displayModal = false;
  isEditMode = false;
  isSubmitting = false;
  areasForm!: FormGroup;
  areaSeleccionada: Areas | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.areasForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  loadData(): void {
    this.loading = true;
    this.catalogService.getAreas().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        this.areas = data;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las Áreas.'
        });
        console.error(err);
      }
    });
  }

  abrirModalAgregar(): void {
    this.isEditMode = false;
    this.areaSeleccionada = null;
    this.areasForm.reset();
    this.displayModal = true;
  }

  abrirModalEditar(area: Areas): void {
    this.isEditMode = true;
    this.areaSeleccionada = area;
    this.areasForm.patchValue({ nombre: area.nombre });
    this.displayModal = true;
  }

  cerrarModal(): void {
    this.displayModal = false;
    this.areasForm.reset();
    this.areaSeleccionada = null;
  }

  onSubmit(): void {
    if (this.areasForm.invalid) {
      this.areasForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const data = this.areasForm.value;

    const request = this.isEditMode && this.areaSeleccionada
      ? this.catalogService.updateAreas(this.areaSeleccionada.uuid, data)
      : this.catalogService.createAreas(data);

    request.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Área ${this.isEditMode ? 'actualizada' : 'creada'} correctamente.`
        });
        this.cerrarModal();
        this.loadData();
      },
      error: (err: any) => {
        let errorDetail = `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el área.`;
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

        this.messageService.add({
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

  eliminar(area: Areas): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el área "${area.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        this.catalogService.deleteAreas(area.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Área eliminada.'
            });
            this.areas = this.areas.filter(a => a.id !== area.id);
          },
          error: (err: any) => {
            let errorDetail = 'No se pudo eliminar el Área.';
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

            this.messageService.add({
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