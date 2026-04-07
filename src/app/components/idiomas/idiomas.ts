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
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { CatalogService } from '../../services/catalog.service';
import { Idioma } from '../../models/biblioteca';

@Component({
  selector: 'app-idiomas',
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
  templateUrl: './idiomas.html',
  styleUrls: ['./idiomas.css'],
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
export default class IdiomasComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  idiomas: Idioma[] = [];
  loading = false;
  globalFilter: string = '';
  
 
  displayModal = false;
  isEditMode = false;
  isSubmitting = false;
  idiomaForm!: FormGroup;
  idiomaSeleccionado: Idioma | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.idiomaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  loadData(): void {
    this.loading = true;
    this.catalogService.getIdiomas().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        this.idiomas = data;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los idiomas.'
        });
        console.error(err);
      }
    });
  }

  abrirModalAgregar(): void {
    this.isEditMode = false;
    this.idiomaSeleccionado = null;
    this.idiomaForm.reset();
    this.displayModal = true;
  }

  abrirModalEditar(idioma: Idioma): void {
    this.isEditMode = true;
    this.idiomaSeleccionado = idioma;
    this.idiomaForm.patchValue({ nombre: idioma.nombre });
    this.displayModal = true;
  }

  cerrarModal(): void {
    this.displayModal = false;
    this.idiomaForm.reset();
    this.idiomaSeleccionado = null;
  }

  onSubmit(): void {
    if (this.idiomaForm.invalid) {
      this.idiomaForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const data = this.idiomaForm.value;

    const request = this.isEditMode && this.idiomaSeleccionado
      ? this.catalogService.updateIdioma(this.idiomaSeleccionado.uuid, data)
      : this.catalogService.createIdioma(data);

    request.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Idioma ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`
        });
        this.cerrarModal();
        this.loadData();
      },
      error: (err: any) => {
        let errorDetail = `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el idioma.`;
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

  eliminar(idioma: Idioma): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el idioma "${idioma.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        this.catalogService.deleteIdioma(idioma.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Idioma eliminado.'
            });
            this.idiomas = this.idiomas.filter(i => i.id !== idioma.id);
          },
          error: (err: any) => {
            let errorDetail = 'No se pudo eliminar el idioma.';
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
