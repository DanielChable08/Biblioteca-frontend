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
import { Autor } from '../../models/biblioteca';

@Component({
  selector: 'app-autores',
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
  templateUrl: './autores.html',
  styleUrls: ['./autores.css']
})
export default class AutoresComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  autores: Autor[] = [];
  loading = false;
  globalFilter: string = '';
  
  // Modal
  displayModal = false;
  isEditMode = false;
  isSubmitting = false;
  autorForm!: FormGroup;
  autorSeleccionado: Autor | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.autorForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apPaterno: ['', [Validators.required, Validators.minLength(2)]],
      apMaterno: ['']
    });
  }

  loadData(): void {
    this.loading = true;
    this.catalogService.getAutores().pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (data) => {
        this.autores = data;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los autores.'
        });
        console.error(err);
      }
    });
  }

  abrirModalAgregar(): void {
    this.isEditMode = false;
    this.autorSeleccionado = null;
    this.autorForm.reset();
    this.displayModal = true;
  }

  abrirModalEditar(autor: Autor): void {
    this.isEditMode = true;
    this.autorSeleccionado = autor;
    this.autorForm.patchValue({
      nombre: autor.nombre,
      apPaterno: autor.apPaterno,
      apMaterno: autor.apMaterno
    });
    this.displayModal = true;
  }

  cerrarModal(): void {
    this.displayModal = false;
    this.autorForm.reset();
    this.autorSeleccionado = null;
  }

  onSubmit(): void {
    if (this.autorForm.invalid) {
      this.autorForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const autorData = this.autorForm.value;

    const request = this.isEditMode && this.autorSeleccionado
      ? this.catalogService.updateAutor(this.autorSeleccionado.uuid, autorData)
      : this.catalogService.createAutor(autorData);

    request.pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Autor ${this.isEditMode ? 'actualizado' : 'creado'} correctamente.`
        });
        this.cerrarModal();
        this.loadData();
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo ${this.isEditMode ? 'actualizar' : 'crear'} el autor.`
        });
        console.error(err);
      }
    });
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  eliminar(autor: Autor): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar al autor "${autor.nombre} ${autor.apPaterno}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.loading = true;
        this.catalogService.deleteAutor(autor.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Autor eliminado.'
            });
            this.autores = this.autores.filter(a => a.id !== autor.id);
          },
          error: (err: any) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el autor.'
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
