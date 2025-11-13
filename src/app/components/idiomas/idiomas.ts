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
  styleUrls: ['./idiomas.css']
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
  
  // Modal
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
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el idioma.`
        });
        console.error(err);
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
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el idioma.'
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
