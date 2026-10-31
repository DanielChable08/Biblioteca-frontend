import { AuthService } from '../../services/auth.service';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { PrestamoDetalleComponent } from '../prestamo-detalle/prestamo-detalle';
import { getEstadoPrestamoClass } from '../../utils/estado-prestamo';
import { Router } from '@angular/router';
import { Observable, Subject, Subscription, forkJoin, of, throwError } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
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
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';

import { PrestamoService } from '../../services/prestamo.service';
import { CatalogService } from '../../services/catalog.service';

import { PrintTicketService } from '../../services/print-ticket.service';
import { EstadoPrestamo, Persona, Prestamo, DetallePrestamo } from '../../models/biblioteca';

interface PrestamoPageRequest {
  page: number;
  size: number;
  sortField: string;
  sortOrder: string;
  search: string;
  requestId: number;
}

interface PrestamoLookups {
  personas: Persona[];
  estados: EstadoPrestamo[];
}

@Component({
  selector: 'app-prestamo-lista',
  standalone: true,
  imports: [
    CommonModule,
    PrestamoDetalleComponent,
    FormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    CheckboxModule,
    DatePipe,
    InputNumberModule,
    DividerModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './prestamo-lista.html',
  styleUrls: ['./prestamo-lista.css']
})
export default class PrestamoListaComponent implements OnInit {
  authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private prestamoService = inject(PrestamoService);
  private catalogService = inject(CatalogService);

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
  currentPage = 0;
  currentSize = 10;
  totalRecords = 0;
  sortField = 'fechaPrestamo';
  sortOrder = 'desc';
  loadingDetalles = false;
  diasfestivosSelect = 0;
  diasfestivos = 0;

  mostrarModalDevolucion = false;
  mostrarModalDiasFestivos = false;
  detallesDevolucion: any[] = [];
  prestamoDevolucion: Prestamo | null = null;
  loadingDevolucion = false;
  procesandoDevolucion = false;

  private pageRequests$ = new Subject<PrestamoPageRequest>();
  private searchTerms$ = new Subject<string>();
  private lookups$?: Observable<PrestamoLookups>;
  private detallePrestamoSubscription?: Subscription;
  private devolucionDetallesSubscription?: Subscription;
  private latestRequestId = 0;
  private lastRequestSignature = '';

  ngOnInit(): void {
    this.pageRequests$.pipe(
      switchMap(request => {
        this.loading = true;
        return forkJoin({
          page: this.prestamoService.getPrestamos(
            request.page, request.size, request.sortField, request.sortOrder, request.search
          ),
          lookups: this.getLookups()
        }).pipe(
          map(({ page, lookups }) => ({ request, page, lookups })),
          catchError(error => {
            if (request.requestId === this.latestRequestId) {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los préstamos.'
              });
              console.error('Error al cargar préstamos:', error);
            }
            return of(null);
          }),
          finalize(() => {
            if (request.requestId === this.latestRequestId) this.loading = false;
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (!result || result.request.requestId !== this.latestRequestId) return;
      const { page, lookups } = result;
      this.personasMap.clear();
      lookups.personas.forEach(persona => this.personasMap.set(
        persona.id, `${persona.nombre} ${persona.apPaterno} ${persona.apMaterno || ''}`.trim()
      ));
      this.estadosMap.clear();
      lookups.estados.forEach(estado => this.estadosMap.set(estado.id, estado.nombre));
      this.prestamos = page.content.map(prestamo => ({
        ...prestamo,
        lector: lookups.personas.find(persona => persona.id === prestamo.idLector),
        bibliotecario: lookups.personas.find(persona => persona.id === prestamo.idBibliotecario),
        estadoPrestamo: lookups.estados.find(estado => estado.id === prestamo.idEstadoPrestamo)
      }));
      this.totalRecords = page.totalElements;
    });

    this.searchTerms$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(search => {
      this.globalFilter = search;
      this.currentPage = 0;
      this.requestPage();
    });

    this.loadData();
  }

  loadData(): void {
    this.requestPage(true);
  }

  onPageChange(event: any): void {
    this.currentSize = event.rows > 0 ? event.rows : this.currentSize;
    this.currentPage = this.currentSize > 0 ? Math.floor(event.first / this.currentSize) : 0;
    this.sortField = event.sortField || this.sortField;
    this.sortOrder = event.sortOrder === 1 ? 'asc' : event.sortOrder === -1 ? 'desc' : this.sortOrder;
    this.requestPage();
  }

  private requestPage(force = false): void {
    const request = {
      page: this.currentPage,
      size: this.currentSize,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
      search: this.globalFilter.trim()
    };
    const signature = JSON.stringify(request);
    if (!force && signature === this.lastRequestSignature) return;
    this.lastRequestSignature = signature;
    this.latestRequestId++;
    this.pageRequests$.next({ ...request, requestId: this.latestRequestId });
  }

  private getLookups(): Observable<PrestamoLookups> {
    if (!this.lookups$) {
      this.lookups$ = forkJoin({
        personas: this.prestamoService.getPersonas(),
        estados: this.catalogService.getEstadosPrestamos()
      }).pipe(
        catchError(error => {
          this.lookups$ = undefined;
          return throwError(() => error);
        }),
        tap(({ personas, estados }) => {
          this.personasMap = new Map(personas.map(persona => [
            persona.id, `${persona.nombre} ${persona.apPaterno} ${persona.apMaterno || ''}`.trim()
          ]));
          this.estadosMap = new Map(estados.map(estado => [estado.id, estado.nombre]));
        }),
        takeUntilDestroyed(this.destroyRef),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.lookups$;
  }

  verDetalles(prestamo: Prestamo): void {
    this.prestamoActual = prestamo;
    this.detallesPrestamo = [];
    this.mostrarDetalle = true;
    this.cargarDetalles(prestamo);
  }

  private cargarDetalles(prestamo: Prestamo): void {
    this.detallePrestamoSubscription?.unsubscribe();
    this.loadingDetalles = true;
    const prestamoUuid = prestamo.uuid!;

    this.detallePrestamoSubscription = this.prestamoService.getDetallesPrestamo(prestamoUuid).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (this.prestamoActual?.uuid === prestamoUuid) this.loadingDetalles = false;
      })
    ).subscribe({
      next: (detallesMapeados) => {
        if (this.mostrarDetalle && this.prestamoActual?.uuid === prestamoUuid) {
          this.detallesPrestamo = detallesMapeados;
        }
      },
      error: (err: any) => {
        console.error('Error al cargar detalles:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los detalles.' });
      }
    });
  }

  abrirModalDevolucion(prestamo: Prestamo): void {
    this.devolucionDetallesSubscription?.unsubscribe();
    this.prestamoDevolucion = prestamo;
    this.detallesDevolucion = [];
    this.mostrarModalDevolucion = true;
    this.loadingDevolucion = true;

    const prestamoUuid = prestamo.uuid!;
    this.devolucionDetallesSubscription = this.prestamoService.getDetallesPrestamo(prestamoUuid).pipe(
      takeUntilDestroyed(this.destroyRef),
      map(detalles => detalles.filter(d => !d.fechaDevolucion).map(d => ({ ...d, seleccionado: false }))),
      finalize(() => {
        if (this.prestamoDevolucion?.uuid === prestamoUuid) this.loadingDevolucion = false;
      })
    ).subscribe({
      next: (detallesMapeados) => {
        if (this.mostrarModalDevolucion && this.prestamoDevolucion?.uuid === prestamoUuid) {
          this.detallesDevolucion = detallesMapeados;
        }
      },
      error: (err: any) => {
        console.error('Error al cargar detalles:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los detalles para devolución.' });
      }
    });
  }

  abrirModalDiasFestivos() {
    this.mostrarModalDiasFestivos = true;
  }

  cerrarModalDiasFestivos() {
    this.mostrarModalDiasFestivos = false;
  }

  guardarDiasFestivos() {
    this.diasfestivos = this.diasfestivosSelect;
    this.cerrarModalDiasFestivos();
  }

  procesarDevolucion(): void {
    const detallesSeleccionados = this.detallesDevolucion.filter(d => d.seleccionado);

    if (detallesSeleccionados.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: 'Debes seleccionar al menos un ejemplar para devolver.' });
      return;
    }

    this.procesandoDevolucion = true;
    const detallesIds = detallesSeleccionados.map(detalle => detalle.id);

    this.prestamoService.devolverEjemplares(this.prestamoDevolucion!.uuid!, detallesIds, this.diasfestivos)
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

      this.prestamoService.getDetallesPrestamo(prestamo.uuid!).pipe(
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
    this.detallePrestamoSubscription?.unsubscribe();
    this.detallePrestamoSubscription = undefined;
    this.mostrarDetalle = false; this.prestamoActual = null; this.detallesPrestamo = []; this.loadingDetalles = false;
  }

  cerrarModalDevolucion(): void {
    this.devolucionDetallesSubscription?.unsubscribe();
    this.devolucionDetallesSubscription = undefined;
    this.mostrarModalDevolucion = false; this.prestamoDevolucion = null; this.detallesDevolucion = []; this.loadingDevolucion = false; this.diasfestivos = 0; this.diasfestivosSelect = 0;
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
            this.totalRecords = Math.max(0, this.totalRecords - 1);
            if (this.prestamos.length === 1 && this.currentPage > 0) this.currentPage--;
            this.loadData();
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo anular.' })
        });
      }
    });
  }

  applyFilterGlobal(table: any, event: Event): void {
    this.globalFilter = (event.target as HTMLInputElement).value;
    this.currentPage = 0;
    if (table) table.first = 0;
    this.searchTerms$.next(this.globalFilter.trim());
  }

  clearFilter(table: any): void {
    this.globalFilter = '';
    this.currentPage = 0;
    if (table) table.first = 0;
    this.searchTerms$.next('');
  }

  getEstadoClass(estadoNombre: string = ''): string {
    return getEstadoPrestamoClass(estadoNombre);
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
