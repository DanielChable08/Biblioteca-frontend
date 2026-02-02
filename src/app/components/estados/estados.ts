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
import { EstadoEjemplar } from '../../models/biblioteca';

@Component({
  selector: 'app-estados',
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
  templateUrl: './estados.html',
  styleUrls: ['./estados.css']
})
export default class EstadosComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  estados: EstadoEjemplar[] = [];
  loading = false;
  globalFilter: string = '';
  
  displayModal = false;
  isEditMode = false;
  isSubmitting = false;
  estadoForm!: FormGroup;
  estadoSeleccionado: EstadoEjemplar | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.estadoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  loadData(): void {
    this.loading = true;
    this.catalogService.getEstadosEjemplares().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        this.estados = data;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los estados.'
        });
        console.error(err);
      }
    });
  }

  abrirModalAgregar(): void {
    this.isEditMode = false;
    this.estadoSeleccionado = null;
    this.estadoForm.reset();
    this.displayModal = true;
  }

  abrirModalEditar(estado: EstadoEjemplar): void {
    this.isEditMode = true;
    this.estadoSeleccionado = estado;
    this.estadoForm.patchValue({ nombre: estado.nombre });
    this.displayModal = true;
  }

  cerrarModal(): void {
    this.displayModal = false;
    this.estadoForm.reset();
    this.estadoSeleccionado = null;
  }

  onSubmit(): void {
    if (this.estadoForm.invalid) {
      this.estadoForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const data = this.estadoForm.value;

    const request = this.isEditMode && this.estadoSeleccionado
      ? this.catalogService.updateEstadoEjemplar(this.estadoSeleccionado.uuid, data)
      : this.catalogService.createEstadoEjemplar(data);

    request.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Estado ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`
        });
        this.cerrarModal();
        this.loadData();
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el estado.`
        });
        console.error(err);
      }
    });
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  eliminar(estado: EstadoEjemplar): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el estado "${estado.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        this.catalogService.deleteEstadoEjemplar(estado.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Estado eliminado.'
            });
            this.estados = this.estados.filter(e => e.id !== estado.id);
          },
          error: (err: any) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el estado.'
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
