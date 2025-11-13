import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';

import { CatalogService } from '../../services/catalog.service';
import { Catalogo } from '../../models/biblioteca';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule
  ],
  templateUrl: './categorias.html',
  styleUrls: ['./categorias.css']
})
export default class CategoriasComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  categorias: Catalogo[] = [];
  loading = false;
  globalFilter: string = '';

  ngOnInit(): void {
    this.loadData();
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

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  agregar(): void {
    this.router.navigate(['/admin/categorias/nuevo']);
  }

  editar(categoria: Catalogo): void {
    this.router.navigate(['/admin/categorias/editar', categoria.uuid]);
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
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la categoría.'
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
