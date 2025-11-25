import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map, finalize, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';

import { PrestamoService } from '../../services/prestamo.service';
import { CatalogService } from '../../services/catalog.service';
import { BookService } from '../../services/book.service';
import { Prestamo, DetallePrestamo } from '../../models/biblioteca';

@Component({
  selector: 'app-prestamo-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    DatePipe
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './prestamo-lista.html',
  styleUrls: ['./prestamo-lista.css']
})
export default class PrestamoListaComponent implements OnInit {
  private prestamoService = inject(PrestamoService);
  private catalogService = inject(CatalogService);
  private bookService = inject(BookService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  prestamos: Prestamo[] = [];
  personasMap = new Map<number, string>();
  estadosMap = new Map<number, string>();
  detallesPrestamo: DetallePrestamo[] = [];
  prestamoActual: Prestamo | null = null;
  mostrarDetalle = false;
  loading = false;
  globalFilter: string = '';
  loadingDetalles = false;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      prestamos: this.prestamoService.getPrestamos(),
      personas: this.prestamoService.getPersonas(),
      estados: this.catalogService.getEstadosPrestamos()
    }).pipe(
      map(({ prestamos, personas, estados }) => {
        personas.forEach(p => this.personasMap.set(p.id, `${p.nombre} ${p.apPaterno} ${p.apMaterno || ''}`.trim()));
        estados.forEach(e => this.estadosMap.set(e.id, e.nombre));

        return prestamos.map(p => ({
          ...p,
          lector: personas.find(lector => lector.id === p.idLector),
          bibliotecario: personas.find(bib => bib.id === p.idBibliotecario),
          estadoPrestamo: estados.find(e => e.id === p.idEstadoPrestamo)
        }));
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (prestamosMapeados) => {
        this.prestamos = prestamosMapeados;
      },
      error: (err: any) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron cargar los préstamos.' 
        });
        console.error('Error al cargar préstamos:', err);
      }
    });
  }

verDetalles(prestamo: Prestamo): void {
  this.prestamoActual = prestamo;
  this.detallesPrestamo = [];
  this.mostrarDetalle = true;
  this.loadingDetalles = true;

  console.log('🔍 Iniciando carga de detalles para préstamo:', prestamo.uuid);

  // Cargar detalles del préstamo junto con ejemplares, libros y estados
  forkJoin({
    detalles: this.prestamoService.getDetallesPrestamo(prestamo.uuid!),
    ejemplares: this.bookService.getEjemplares(),
    libros: this.bookService.getLibros(),
    estadosEjemplares: this.catalogService.getEstadosEjemplares()
  }).pipe(
    switchMap(({ detalles, ejemplares, libros, estadosEjemplares }) => {
      console.log('📋 Detalles recibidos:', detalles);
      console.log('📚 Ejemplares:', ejemplares);
      console.log('📖 Libros:', libros);
      console.log('📊 Estados ejemplares:', estadosEjemplares);

      // Obtener autores de todos los libros
      const libroIds = [...new Set(ejemplares.map(e => e.idLibro))];
      const autorRequests = libroIds.map(idLibro => {
        const libro = libros.find(l => l.id === idLibro);
        if (libro?.uuid) {
          return this.bookService.getAutoresForLibro(libro.uuid);
        }
        return [];
      });

      return forkJoin(autorRequests.length > 0 ? autorRequests : [[]]).pipe(
        map(autoresArray => {
          // Mapear libros con sus autores
          const librosCompletos = libros.map((libro, index) => ({
            ...libro,
            autores: autoresArray[index] || []
          }));

          // Mapear ejemplares con sus libros completos
          const ejemplaresCompletos = ejemplares.map(ejemplar => {
            const libroDelEjemplar = librosCompletos.find(l => l.id === ejemplar.idLibro);
            return {
              ...ejemplar,
              libro: libroDelEjemplar
            };
          });

          // Mapear detalles con ejemplares y estados
          const detallesMapeados = detalles.map(detalle => {
            const ejemplarEncontrado = ejemplaresCompletos.find(e => e.id === detalle.idEjemplar);
            const estadoEncontrado = estadosEjemplares.find(e => e.id === detalle.idEstadoPrestamo);
            
            console.log('🔍 Mapeando detalle:', {
              detalle,
              idEstadoEjemplar: detalle.idEstadoPrestamo,
              estadoEncontrado,
              ejemplarEncontrado
            });

            return {
              ...detalle,
              ejemplar: ejemplarEncontrado,
              estadoEjemplar: estadoEncontrado
            };
          });

          console.log('✅ Detalles mapeados finales:', detallesMapeados);
          return detallesMapeados;
        })
      );
    }),
    finalize(() => this.loadingDetalles = false)
  ).subscribe({
    next: (detallesMapeados) => {
      this.detallesPrestamo = detallesMapeados;
      console.log('✅ Detalles asignados a la tabla:', this.detallesPrestamo);
    },
    error: (err: any) => {
      console.error('❌ Error al cargar detalles:', err);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se pudieron cargar los detalles.' 
      });
    }
  });
}


  cerrarModalDetalle(): void {
    this.mostrarDetalle = false;
    this.prestamoActual = null;
    this.detallesPrestamo = [];
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  agregarPrestamo(): void {
    this.router.navigate(['admin/prestamos/nuevo']);
  }

  editarPrestamo(prestamo: Prestamo): void {
    this.router.navigate(['/admin/prestamos/editar', prestamo.uuid]);
  }

  eliminarPrestamo(prestamo: Prestamo): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de anular el préstamo? Esta acción no se puede deshacer.`,
      header: 'Confirmar anulación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, anular',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger custom-accept-button',
      rejectButtonStyleClass: 'p-button-text custom-reject-button',
      accept: () => {
        this.loading = true;
        this.prestamoService.deletePrestamo(prestamo.uuid!).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Éxito', 
              detail: 'Préstamo anulado correctamente.' 
            });
            this.prestamos = this.prestamos.filter(p => p.uuid !== prestamo.uuid);
          },
          error: (err: any) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'No se pudo anular el préstamo.' 
            });
            console.error('Error al eliminar préstamo:', err);
          }
        });
      }
    });
  }

  applyFilterGlobal(table: any, event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    table.filterGlobal(filterValue, 'contains');
  }

  clearFilter(table: any) {
    this.globalFilter = '';
    table.clear();
  }

  getEstadoClass(estadoNombre: string = ''): string {
    switch (estadoNombre.toLowerCase()) {
      case 'activo': return 'status-activo';
      case 'devuelto': 
      case 'devuelto a tiempo': return 'status-devuelto';
      case 'atrasado':
      case 'devuelto tarde': return 'status-atrasado';
      case 'parcialmente devuelto': return 'status-parcial';
      case 'completado a tiempo':
      case 'completado con retardo': return 'status-completado';
      default: return 'status-desconocido';
    }
  }

  getAutoresNombres(detalle: DetallePrestamo): string {
    if (!detalle?.ejemplar?.libro?.autores || detalle.ejemplar.libro.autores.length === 0) {
      return 'Sin autor';
    }
    return detalle.ejemplar.libro.autores
      .map(a => `${a.nombre} ${a.apPaterno}`)
      .join(', ');
  }
}
