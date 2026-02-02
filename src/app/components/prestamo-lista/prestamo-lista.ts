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
import { CheckboxModule } from 'primeng/checkbox';

import { PrestamoService } from '../../services/prestamo.service';
import { CatalogService } from '../../services/catalog.service';
import { BookService } from '../../services/book.service';
import { PrintTicketService } from '../../services/print-ticket.service';
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
    CheckboxModule,
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
  private printService = inject(PrintTicketService);

  prestamos: Prestamo[] = [];
  personasMap = new Map<number, string>();
  estadosMap = new Map<number, string>();
  detallesPrestamo: DetallePrestamo[] = [];
  prestamoActual: Prestamo | null = null;
  mostrarDetalle = false;
  loading = false;
  globalFilter: string = '';
  loadingDetalles = false;

  mostrarModalDevolucion = false;
  detallesDevolucion: any[] = [];
  prestamoDevolucion: Prestamo | null = null;
  loadingDevolucion = false;
  procesandoDevolucion = false;

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
    this.cargarDetalles(prestamo);
  }

  private cargarDetalles(prestamo: Prestamo): void {
    this.loadingDetalles = true;

    forkJoin({
      detalles: this.prestamoService.getDetallesPrestamo(prestamo.uuid!),
      ejemplares: this.bookService.getEjemplares(),
      libros: this.bookService.getLibros(),
      estadosEjemplares: this.catalogService.getEstadosEjemplares()
    }).pipe(
      switchMap(({ detalles, ejemplares, libros, estadosEjemplares }) => {
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
            const librosCompletos = libros.map((libro, index) => ({
              ...libro,
              autores: autoresArray[index] || []
            }));

            const ejemplaresCompletos = ejemplares.map(ejemplar => {
              const libroDelEjemplar = librosCompletos.find(l => l.id === ejemplar.idLibro);
              const estadoEjemplar = estadosEjemplares.find(e => e.id === ejemplar.idEstadoEjemplar);
              return {
                ...ejemplar,
                libro: libroDelEjemplar,
                estadoEjemplar: estadoEjemplar
              };
            });

            const detallesMapeados = detalles.map(detalle => {
              const ejemplarEncontrado = ejemplaresCompletos.find(e => e.id === detalle.idEjemplar);

              return {
                ...detalle,
                ejemplar: ejemplarEncontrado,
                estadoEjemplar: ejemplarEncontrado?.estadoEjemplar
              };
            });

            return detallesMapeados;
          })
        );
      }),
      finalize(() => this.loadingDetalles = false)
    ).subscribe({
      next: (detallesMapeados) => {
        this.detallesPrestamo = detallesMapeados;
      },
      error: (err: any) => {
        console.error(' Error al cargar detalles:', err);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron cargar los detalles.' 
        });
      }
    });
  }

  imprimirTicketPrestamo(prestamo?: Prestamo): void {
    const prestamoAImprimir = prestamo || this.prestamoActual;
    
    if (!prestamoAImprimir) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay préstamo seleccionado para imprimir.'
      });
      return;
    }

    if (prestamo && (!this.detallesPrestamo.length || this.prestamoActual?.uuid !== prestamo.uuid)) {
      this.loadingDetalles = true;
      
      forkJoin({
        detalles: this.prestamoService.getDetallesPrestamo(prestamo.uuid!),
        ejemplares: this.bookService.getEjemplares(),
        libros: this.bookService.getLibros(),
        estadosEjemplares: this.catalogService.getEstadosEjemplares()
      }).pipe(
        switchMap(({ detalles, ejemplares, libros, estadosEjemplares }) => {
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
              const librosCompletos = libros.map((libro, index) => ({
                ...libro,
                autores: autoresArray[index] || []
              }));

              const ejemplaresCompletos = ejemplares.map(ejemplar => {
                const libroDelEjemplar = librosCompletos.find(l => l.id === ejemplar.idLibro);
                const estadoEjemplar = estadosEjemplares.find(e => e.id === ejemplar.idEstadoEjemplar);
                return {
                  ...ejemplar,
                  libro: libroDelEjemplar,
                  estadoEjemplar: estadoEjemplar
                };
              });

              const detallesMapeados = detalles.map(detalle => {
                const ejemplarEncontrado = ejemplaresCompletos.find(e => e.id === detalle.idEjemplar);
                return {
                  ...detalle,
                  ejemplar: ejemplarEncontrado,
                  estadoEjemplar: ejemplarEncontrado?.estadoEjemplar
                };
              });

              return detallesMapeados;
            })
          );
        }),
        finalize(() => this.loadingDetalles = false)
      ).subscribe({
        next: (detallesMapeados) => {
          this.generarTicket(prestamo, detallesMapeados);
        },
        error: (err: any) => {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se pudieron cargar los detalles para imprimir.' 
          });
          console.error('Error al cargar detalles para impresión:', err);
        }
      });
    } else {
      this.generarTicket(prestamoAImprimir, this.detallesPrestamo);
    }
  }

  private generarTicket(prestamo: Prestamo, detalles: any[]): void {
    if (detalles.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No hay ejemplares para imprimir.'
      });
      return;
    }

    const ejemplaresData = detalles.map(detalle => ({
      codigo: detalle.ejemplar?.codigo || 'N/A',
      titulo: detalle.ejemplar?.libro?.titulo || 'No disponible',
      autor: this.getAutoresNombres(detalle)
    }));

    const ticketData = {
      lector: `${prestamo.lector?.nombre || ''} ${prestamo.lector?.apPaterno || ''}`.trim(),
      bibliotecario: `${prestamo.bibliotecario?.nombre || ''} ${prestamo.bibliotecario?.apPaterno || ''}`.trim(),
      fechaPrestamo: new Date(prestamo.fechaPrestamo),
      fechaLimite: new Date(prestamo.fechaLimite),
      ejemplares: ejemplaresData
    };

    this.printService.imprimirTicketPrestamo(ticketData);
  }

  abrirModalDevolucion(prestamo: Prestamo): void {
    this.prestamoDevolucion = prestamo;
    this.detallesDevolucion = [];
    this.mostrarModalDevolucion = true;
    this.loadingDevolucion = true;

    forkJoin({
      detalles: this.prestamoService.getDetallesPrestamo(prestamo.uuid!),
      ejemplares: this.bookService.getEjemplares(),
      libros: this.bookService.getLibros(),
      estadosEjemplares: this.catalogService.getEstadosEjemplares()
    }).pipe(
      switchMap(({ detalles, ejemplares, libros, estadosEjemplares }) => {
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
            const librosCompletos = libros.map((libro, index) => ({
              ...libro,
              autores: autoresArray[index] || []
            }));

            const ejemplaresCompletos = ejemplares.map(ejemplar => {
              const libroDelEjemplar = librosCompletos.find(l => l.id === ejemplar.idLibro);
              const estadoEjemplar = estadosEjemplares.find(e => e.id === ejemplar.idEstadoEjemplar);
              return {
                ...ejemplar,
                libro: libroDelEjemplar,
                estadoEjemplar: estadoEjemplar
              };
            });

            const detallesMapeados = detalles
              .filter(detalle => !detalle.fechaDevolucion)
              .map(detalle => {
                const ejemplarEncontrado = ejemplaresCompletos.find(e => e.id === detalle.idEjemplar);

                return {
                  ...detalle,
                  ejemplar: ejemplarEncontrado,
                  estadoEjemplar: ejemplarEncontrado?.estadoEjemplar,
                  seleccionado: false
                };
              });

            return detallesMapeados;
          })
        );
      }),
      finalize(() => this.loadingDevolucion = false)
    ).subscribe({
      next: (detallesMapeados) => {
        this.detallesDevolucion = detallesMapeados;
      },
      error: (err: any) => {
        console.error('Error al cargar detalles:', err);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudieron cargar los detalles para devolución.' 
        });
      }
    });
  }

  procesarDevolucion(): void {
    const detallesSeleccionados = this.detallesDevolucion.filter(d => d.seleccionado);

    if (detallesSeleccionados.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Debes seleccionar al menos un ejemplar para devolver.'
      });
      return;
    }

    this.procesandoDevolucion = true;

    const detallesIds = detallesSeleccionados.map(detalle => detalle.id);

    this.prestamoService.devolverEjemplares(
      this.prestamoDevolucion!.uuid!, 
      detallesIds
    ).pipe(
      finalize(() => this.procesandoDevolucion = false)
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `${detallesSeleccionados.length} ejemplar(es) devuelto(s) correctamente.`
        });
        this.cerrarModalDevolucion();
        this.loadData();
      },
      error: (err) => {
        console.error('Error al devolver ejemplares:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron devolver los ejemplares.'
        });
      }
    });
  }

  cerrarModalDetalle(): void {
    this.mostrarDetalle = false;
    this.prestamoActual = null;
    this.detallesPrestamo = [];
  }

  cerrarModalDevolucion(): void {
    this.mostrarModalDevolucion = false;
    this.prestamoDevolucion = null;
    this.detallesDevolucion = [];
  }

  regresar(): void {
    this.router.navigate(['/admin']);
  }

  agregarPrestamo(): void {
    this.router.navigate(['admin/prestamos/nuevo']);
  }

  multas(): void {
    sessionStorage.setItem('multasOrigen', 'prestamos');
    this.router.navigate(['admin/multas']);
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

  getAutoresNombres(detalle: any): string {
    if (!detalle?.ejemplar?.libro?.autores || detalle.ejemplar.libro.autores.length === 0) {
      return 'Sin autor';
    }
    return detalle.ejemplar.libro.autores
      .map((a: any) => `${a.nombre} ${a.apPaterno}`)
      .join(', ');
  }

  getCantidadSeleccionados(): number {
    return this.detallesDevolucion.filter(d => d.seleccionado).length;
  }

  toggleSeleccionTodos(event: any): void {
    const checked = event.checked;
    this.detallesDevolucion.forEach(detalle => detalle.seleccionado = checked);
  }

  todosSeleccionados(): boolean {
    return this.detallesDevolucion.length > 0 && 
           this.detallesDevolucion.every(d => d.seleccionado);
  }

  algunoSeleccionado(): boolean {
    return this.detallesDevolucion.some(d => d.seleccionado);
  }
}
