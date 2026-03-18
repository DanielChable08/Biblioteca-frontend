import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { map, finalize, switchMap, catchError } from 'rxjs/operators';
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
        this.prestamos = prestamosMapeados.sort((a, b) => {
            const dateA = new Date(a.fechaPrestamo).getTime();
            const dateB = new Date(b.fechaPrestamo).getTime();
            return dateB - dateA;
        });
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
        const idsEjemplaresEnPrestamo = new Set(detalles.map(d => d.idEjemplar));
        const ejemplaresDelPrestamo = ejemplares.filter(e => idsEjemplaresEnPrestamo.has(e.id));
        const libroIds = [...new Set(ejemplaresDelPrestamo.map(e => e.idLibro))];

        const autorRequests = libroIds.map(idLibro => {
          const libro = libros.find(l => l.id === idLibro);
          if (libro?.uuid) {
            return this.bookService.getAutoresForLibro(libro.uuid).pipe(catchError(() => of([])));
          }
          return of([]);
        });

        return forkJoin(autorRequests.length > 0 ? autorRequests : [of([])]).pipe(
          map(autoresArray => {
            const autoresPorLibro = new Map<number, any[]>();
            libroIds.forEach((id, index) => {
                autoresPorLibro.set(id, autoresArray[index]);
            });

            const detallesMapeados = detalles.map(detalle => {
              const ejemplarEncontrado = ejemplares.find(e => e.id === detalle.idEjemplar);
              const libroOriginal = libros.find(l => l.id === ejemplarEncontrado?.idLibro);
              const estadoEjemplar = estadosEjemplares.find(e => e.id === ejemplarEncontrado?.idEstadoEjemplar);

              const libroConAutores = libroOriginal ? {
                  ...libroOriginal,
                  autores: autoresPorLibro.get(libroOriginal.id) || []
              } : undefined;

              const ejemplarCompleto = ejemplarEncontrado ? {
                  ...ejemplarEncontrado,
                  libro: libroConAutores,
                  estadoEjemplar: estadoEjemplar
              } : undefined;

              return {
                ...detalle,
                ejemplar: ejemplarCompleto,
                estadoEjemplar: estadoEjemplar
              } as DetallePrestamo;
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
        console.error('Error al cargar detalles:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los detalles.' });
      }
    });
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
        const idsEjemplaresEnPrestamo = new Set(detalles.map(d => d.idEjemplar));
        const ejemplaresDelPrestamo = ejemplares.filter(e => idsEjemplaresEnPrestamo.has(e.id));
        const libroIds = [...new Set(ejemplaresDelPrestamo.map(e => e.idLibro))];

        const autorRequests = libroIds.map(idLibro => {
          const libro = libros.find(l => l.id === idLibro);
          if (libro?.uuid) {
            return this.bookService.getAutoresForLibro(libro.uuid).pipe(catchError(() => of([])));
          }
          return of([]);
        });

        return forkJoin(autorRequests.length > 0 ? autorRequests : [of([])]).pipe(
          map(autoresArray => {
            const autoresPorLibro = new Map<number, any[]>();
            libroIds.forEach((id, index) => {
                autoresPorLibro.set(id, autoresArray[index]);
            });

            const detallesMapeados = detalles
              .filter(detalle => !detalle.fechaDevolucion)
              .map(detalle => {
                const ejemplarEncontrado = ejemplares.find(e => e.id === detalle.idEjemplar);
                const libroOriginal = libros.find(l => l.id === ejemplarEncontrado?.idLibro);
                const estadoEjemplar = estadosEjemplares.find(e => e.id === ejemplarEncontrado?.idEstadoEjemplar);

                const libroConAutores = libroOriginal ? {
                    ...libroOriginal,
                    autores: autoresPorLibro.get(libroOriginal.id) || []
                } : undefined;

                const ejemplarCompleto = ejemplarEncontrado ? {
                    ...ejemplarEncontrado,
                    libro: libroConAutores,
                    estadoEjemplar: estadoEjemplar
                } : undefined;

                return {
                  ...detalle,
                  ejemplar: ejemplarCompleto,
                  estadoEjemplar: estadoEjemplar,
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
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los detalles para devolución.' });
      }
    });
  }

  procesarDevolucion(): void {
    const detallesSeleccionados = this.detallesDevolucion.filter(d => d.seleccionado);

    if (detallesSeleccionados.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Debes seleccionar al menos un ejemplar para devolver.' });
      return;
    }

    this.procesandoDevolucion = true;
    const detallesIds = detallesSeleccionados.map(detalle => detalle.id);

    this.prestamoService.devolverEjemplares(this.prestamoDevolucion!.uuid!, detallesIds)
      .pipe(finalize(() => this.procesandoDevolucion = false))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: `${detallesSeleccionados.length} ejemplar(es) devuelto(s) correctamente.` });
          this.cerrarModalDevolucion();
          this.loadData();
        },
        error: (err) => {
          console.error('Error al devolver ejemplares:', err);
          
          const backendMsg = err.error?.message || (typeof err.error === 'string' ? err.error : '');
          let msgUsuario = 'No se pudieron devolver los ejemplares.';

          if (backendMsg.includes('Devolvió a tiempo') || backendMsg.includes('no aplica multa')) {
             msgUsuario = 'Error del Servidor: El sistema falló al procesar una devolución puntual (Bug Reportado).';
          } else if (backendMsg) {
             msgUsuario = backendMsg;
          }

          this.messageService.add({ severity: 'error', summary: 'Error', detail: msgUsuario });
        }
      });
  }

  imprimirTicketPrestamo(prestamo?: Prestamo): void {
    const prestamoAImprimir = prestamo || this.prestamoActual;
    if (!prestamoAImprimir) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'No hay préstamo seleccionado.' });
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
                const idsEjemplaresEnPrestamo = new Set(detalles.map(d => d.idEjemplar));
                const ejemplaresDelPrestamo = ejemplares.filter(e => idsEjemplaresEnPrestamo.has(e.id));
                const libroIds = [...new Set(ejemplaresDelPrestamo.map(e => e.idLibro))];

                const autorRequests = libroIds.map(idLibro => {
                    const libro = libros.find(l => l.id === idLibro);
                    return libro?.uuid ? this.bookService.getAutoresForLibro(libro.uuid).pipe(catchError(() => of([]))) : of([]);
                });

                return forkJoin(autorRequests.length > 0 ? autorRequests : [of([])]).pipe(
                    map(autoresArray => {
                        const autoresPorLibro = new Map<number, any[]>();
                        libroIds.forEach((id, index) => autoresPorLibro.set(id, autoresArray[index]));

                        return detalles.map(detalle => {
                            const ejemplar = ejemplares.find(e => e.id === detalle.idEjemplar);
                            const libro = libros.find(l => l.id === ejemplar?.idLibro);
                            const libroConAutores = libro ? { ...libro, autores: autoresPorLibro.get(libro.id) || [] } : undefined;
                            const ejemplarCompleto = ejemplar ? { ...ejemplar, libro: libroConAutores } : undefined;
                            return { ...detalle, ejemplar: ejemplarCompleto };
                        });
                    })
                );
            }),
            finalize(() => this.loadingDetalles = false)
        ).subscribe({
            next: (detalles) => this.generarTicket(prestamoAImprimir, detalles),
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al generar ticket.' })
        });
    } else {
      this.generarTicket(prestamoAImprimir, this.detallesPrestamo);
    }
  }

  private generarTicket(prestamo: Prestamo, detalles: any[]): void {
    if (detalles.length === 0) return;
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

  cerrarModalDetalle(): void { 
    this.mostrarDetalle = false; this.prestamoActual = null; this.detallesPrestamo = []; 
  }

  cerrarModalDevolucion(): void { 
    this.mostrarModalDevolucion = false; this.prestamoDevolucion = null; this.detallesDevolucion = []; 
  }

  regresar(): void { 
    this.router.navigate(['/admin']); 
  }

  agregarPrestamo(): void { 
    this.router.navigate(['admin/prestamos/nuevo']); 
  }

  multas(): void { 
    sessionStorage.setItem('multasOrigen', 'prestamos'); this.router.navigate(['admin/multas']); 
  }

  editarPrestamo(p: Prestamo): void { 
    this.router.navigate(['/admin/prestamos/editar', p.uuid]); 
  }
  
  eliminarPrestamo(p: Prestamo): void {
    this.confirmationService.confirm({
      message: '¿Anular préstamo?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí', rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading = true;
        this.prestamoService.deletePrestamo(p.uuid!).pipe(finalize(() => this.loading = false)).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Préstamo anulado.' });
            this.prestamos = this.prestamos.filter(x => x.uuid !== p.uuid);
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo anular.' })
        });
      }
    });
  }

  applyFilterGlobal(table: any, event: Event): void { table.filterGlobal((event.target as HTMLInputElement).value, 'contains'); }
  clearFilter(table: any): void { this.globalFilter = ''; table.clear(); }

  getEstadoClass(estadoNombre: string = ''): string {
    const estado = estadoNombre.toLowerCase();
    switch (estado) {
      case 'activo': return 'status-activo';
      case 'devuelto': 
      case 'devuelto a tiempo': 
      case 'completado a tiempo': return 'status-devuelto';
      case 'atrasado':
      case 'devuelto tarde': 
      case 'completado con retardo': return 'status-atrasado';
      case 'parcialmente devuelto': return 'status-parcial';
      default: return 'status-desconocido';
    }
  }

  getAutoresNombres(detalle: any): string {
    const libro = detalle?.ejemplar?.libro || detalle?.libro || detalle;
    if (!libro?.autores || !Array.isArray(libro.autores) || libro.autores.length === 0) {
      return 'Sin autor';
    }
    return libro.autores
      .map((a: any) => `${a.nombre || ''} ${a.apPaterno || ''}`.trim())
      .filter((n: string) => n !== '')
      .join(', ');
  }

  getCantidadSeleccionados(): number { 
    return this.detallesDevolucion.filter(d => d.seleccionado).length; 
  }

  toggleSeleccionTodos(event: any): void { 
    this.detallesDevolucion.forEach(d => d.seleccionado = event.checked); 
  }

  todosSeleccionados(): boolean { 
    return this.detallesDevolucion.length > 0 && this.detallesDevolucion.every(d => d.seleccionado); 
  }

  algunoSeleccionado(): boolean { 
    return this.detallesDevolucion.some(d => d.seleccionado); 
  }
}