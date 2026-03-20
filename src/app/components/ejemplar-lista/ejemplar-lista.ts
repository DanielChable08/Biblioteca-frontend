import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

import { BookService } from '../../services/book.service';
import { CatalogService } from '../../services/catalog.service';
import { Ejemplar } from '../../models/biblioteca';
import { environment } from '../../../environments/enviroment';
import EjemplarFormularioComponent from '../ejemplar-formulario/ejemplar-formulario';
import LibroDetalleComponent from '../libro-detalle/libro-detalle';

@Component({
  selector: 'app-ejemplar-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    DialogModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule
  ],
  providers: [ConfirmationService, MessageService, DialogService],
  templateUrl: './ejemplar-lista.html',
  styleUrls: ['./ejemplar-lista.css']
})
export default class EjemplarListaComponent implements OnInit, OnDestroy {
  private bookService = inject(BookService);
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private dialogService = inject(DialogService);

  ejemplares: any[] = [];
  loading = false;
  globalFilter: string = '';
  private dialogRef?: DynamicDialogRef;

  private readonly IMAGES_BASE_URL = environment.plainURL + '/assets/img/'; 

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      ejemplares: this.bookService.getEjemplares(),
      libros: this.bookService.getLibros(),
      estadosEjemplares: this.catalogService.getEstadosEjemplares(),
      condicionesFisicas: this.catalogService.getCondicionesFisicas()
    }).pipe(
      map(({ ejemplares, libros, estadosEjemplares, condicionesFisicas }) => {
        return ejemplares.map((ejemplar: any) => {
          const libro = libros.find((l: any) => l.id === ejemplar.idLibro);
          const estadoEjemplar = estadosEjemplares.find((e: any) => e.id === ejemplar.idEstadoEjemplar);
          const condicionFisica = condicionesFisicas.find((c: any) => c.id === ejemplar.idCondicionFisicaEjemplar);

          return {
            ...ejemplar,
            libro: libro,
            estadoEjemplar: estadoEjemplar,
            condicionFisica: condicionFisica
          };
        });
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (ejemplaresMapeados) => {
        this.ejemplares = ejemplaresMapeados;
      },
      error: (err: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los ejemplares.'
        });
        console.error('Error al cargar ejemplares:', err);
      }
    });
  }

  agregarEjemplar(): void {
    this.dialogRef = this.dialogService.open(EjemplarFormularioComponent, {
      header: 'Agregar Ejemplar',
      width: '50vw',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      data: { messageService: this.messageService }
    });

    this.dialogRef.onClose.subscribe((resultado) => {
      if (resultado) this.loadData();
    });
  }

  editarEjemplar(ejemplar: Ejemplar): void {
    this.dialogRef = this.dialogService.open(EjemplarFormularioComponent, {
      header: 'Editar Ejemplar',
      width: '50vw',
      contentStyle: { overflow: 'auto' },
      baseZIndex: 10000,
      data: { ejemplarUuid: ejemplar.uuid, messageService: this.messageService }
    });

    this.dialogRef.onClose.subscribe((resultado) => {
      if (resultado) this.loadData();
    });
  }

  formatearISBN(isbn: string | undefined): string {
    if (!isbn) return 'N/A';
    const limpio = isbn.replace(/[^0-9X]/gi, '');
    if (limpio.length === 10) {
      return `${limpio.substring(0, 1)}-${limpio.substring(1, 4)}-${limpio.substring(4, 9)}-${limpio.substring(9, 10)}`;
    }
    if (limpio.length === 13) {
      return `${limpio.substring(0, 3)}-${limpio.substring(3, 4)}-${limpio.substring(4, 8)}-${limpio.substring(8, 12)}-${limpio.substring(12, 13)}`;
    }
    return isbn;
  }

  verLibro(ejemplar: any): void {
    if (!ejemplar.libro?.uuid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se puede ver el libro asociado.'
      });
      return;
    }

    // === LÓGICA DE IMAGEN COPIADA DE BIBLIOTECARIO ===
    // Construimos la URL completa antes de abrir el modal
    let imagenCompleta = ejemplar.libro.imagen;
    
    if (imagenCompleta && !imagenCompleta.startsWith('http')) {
        // Concatenamos la base URL
        imagenCompleta = `${this.IMAGES_BASE_URL}${imagenCompleta}`;
    }

    this.dialogRef = this.dialogService.open(LibroDetalleComponent, {
      header: `Detalles de ${ejemplar.libro.titulo}`,
      width: '75%',
      contentStyle: { 'max-height': '90vh', 'overflow': 'auto' },
      baseZIndex: 10000,
      data: {
        uuid: ejemplar.libro.uuid,
        imagenUrl: imagenCompleta // <-- Enviamos la URL ya procesada
      },
      modal: true,
      closable: true
    });
  }

  eliminarEjemplar(ejemplar: Ejemplar): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el ejemplar con código "${ejemplar.codigo}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger custom-accept-button',
      rejectButtonStyleClass: 'p-button-text custom-reject-button',
      accept: () => {
        this.loading = true;
        this.bookService.deleteEjemplar(ejemplar.uuid).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ejemplar eliminado correctamente.' });
            this.loadData();
          },
          error: (err: any) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el ejemplar.' });
          }
        });
      }
    });
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  applyFilterGlobal(table: any, event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    table.filterGlobal(filterValue, 'contains');
  }

  clearFilter(table: any): void {
    this.globalFilter = '';
    table.clear();
  }

  getEstadoClass(estadoNombre: string = ''): string {
    switch (estadoNombre.toLowerCase()) {
      case 'disponible': return 'status-disponible';
      case 'prestado': return 'status-prestado';
      case 'reservado': return 'status-reservado';
      case 'en reparación': case 'en reparacion': return 'status-reparacion';
      case 'extraviado': return 'status-extraviado';
      case 'dado de baja': return 'status-baja';
      default: return 'status-desconocido';
    }
  }

  getCondicionClass(condicionNombre: string = ''): string {
    switch (condicionNombre.toLowerCase()) {
      case 'excelente': case 'nuevo': return 'condicion-excelente';
      case 'bueno': case 'buena': return 'condicion-buena';
      case 'regular': return 'condicion-regular';
      case 'malo': case 'mala': case 'deteriorado': return 'condicion-mala';
      default: return 'condicion-desconocida';
    }
  }

  ngOnDestroy(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}