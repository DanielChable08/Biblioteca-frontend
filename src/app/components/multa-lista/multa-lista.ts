import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subscription, Subject, forkJoin, of, throwError } from 'rxjs';
import { catchError, debounceTime, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';

import { MultaService } from '../../services/multa.service';
import { PrestamoService } from '../../services/prestamo.service';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { PersonaService } from '../../services/persona.service';
import { DetallePrestamo, EstadoPrestamo, Multa, Persona, Prestamo } from '../../models/biblioteca';
import { Page } from '../../models/page';
import { PrestamoDetalleComponent } from '../prestamo-detalle/prestamo-detalle';

@Component({
  selector: 'app-multa-lista',
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
    InputTextModule,
    DatePipe,
    PrestamoDetalleComponent
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './multa-lista.html',
  styleUrls: ['./multa-lista.css']
})
export class MultaListaComponent implements OnInit, OnDestroy {
  private multaService = inject(MultaService);
  private prestamoService = inject(PrestamoService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private catalogService = inject(CatalogService);
  private personaService = inject(PersonaService);
  authService = inject(AuthService);
  private messageService = inject(MessageService);

  get isAdmin(): boolean {
      return this.authService.isAdmin();
  }

  multas: any[] = [];
  loading = false;
  globalFilter: string = '';
  totalRecords = 0;
  page = 0;
  pageSize = 10;
  sortBy = 'fechaEmision';
  sortDirection = 'desc';
  private origenNavegacion: 'admin' | 'prestamos' = 'admin';
  mostrarDetallePrestamo = false;
  prestamoDetalleActual: Prestamo | null = null;
  detallesPrestamoActual: DetallePrestamo[] = [];
  loadingDetallesPrestamo = false;
  highlightPrestamoDetalleId: number | null = null;
  private detallePrestamoRequestId = 0;
  private detallePrestamoSubscription?: Subscription;
  private pageSubscription?: Subscription;
  private searchSubscription?: Subscription;
  private searchRequests$ = new Subject<string>();
  private personasPorId = new Map<number, Persona>();
  private estadosPrestamoPorId = new Map<number, EstadoPrestamo>();
  private estadosPrestamoRequest$?: Observable<EstadoPrestamo[]>;

  ngOnInit(): void {
    const origen = sessionStorage.getItem('multasOrigen');
    if (origen === 'prestamos') {
      this.origenNavegacion = 'prestamos';
    }
    console.log(' Multas - Origen:', this.origenNavegacion);
    
    this.searchSubscription = this.searchRequests$.pipe(debounceTime(300)).subscribe(search => {
      this.globalFilter = search;
      this.page = 0;
      this.loadData();
    });
    this.loadData();
  }

  ngOnDestroy(): void {
    this.detallePrestamoSubscription?.unsubscribe();
    this.pageSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
  }

  loadData(): void {
    this.loading = true;
    this.pageSubscription?.unsubscribe();
    this.pageSubscription = this.multaService.getMultas({
      page: this.page,
      size: this.pageSize,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      search: this.globalFilter
    }).pipe(
      catchError(err => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las multas.' });
        console.error('Error al cargar multas:', err);
        return of(null);
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (response: Page<Multa> | null) => {
        if (!response) return;
        if (response.content.length === 0 && response.totalElements > 0 && this.page > 0) {
          this.page = Math.max(0, response.totalPages - 1);
          this.loadData();
          return;
        }
        this.totalRecords = response.totalElements;
        this.multas = response.content.map(multa => ({
          ...multa,
          lectorNombre: multa.lectorNombre || 'N/A',
          estadoMulta: { id: multa.idEstadoMulta, nombre: multa.estadoMultaNombre },
          motivoMulta: { id: multa.idMotivoMulta, nombre: multa.motivoMultaNombre },
          diasRetraso: multa.diasRetraso || 0
        }));
      }
    });
  }

  onPageChange(event: any): void {
    this.pageSize = event.rows || this.pageSize;
    this.page = Math.floor((event.first || 0) / this.pageSize);
    if (event.sortField) this.sortBy = event.sortField;
    if (event.sortOrder) this.sortDirection = event.sortOrder === 1 ? 'asc' : 'desc';
    this.loadData();
  }

  condonarMulta(multa: any): void {
    const cajeroId = this.authService.getCurrentPersonaId();
    if (!multa?.uuid || cajeroId === null) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la multa o el cajero que registra la condonación.'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Estás seguro de condonar esta multa de $${multa.monto}?`,
      header: 'Confirmar Condonación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, condonar',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-success custom-accept-button',
      rejectButtonStyleClass: 'p-button-text custom-reject-button',
      accept: () => {
        this.loading = true;
        this.multaService.condonarMulta(multa.uuid, { cajero: cajeroId }).pipe(
          finalize(() => this.loading = false)
        ).subscribe({
          next: () => {
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Éxito', 
              detail: 'Multa condonada correctamente.' 
            });
            this.loadData();
          },
          error: (err: any) => {
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'No se pudo condonar la multa.' 
            });
            console.error('Error al condonar multa:', err);
          }
        });
      }
    });
  }

  registrarPago(multa: any): void {
    sessionStorage.setItem('multaIdSeleccionada', multa.id.toString());
    this.router.navigate(['admin/multas/pagar']);
  }

  verDetallesPrestamo(multa: Multa): void {
    if (!multa?.uuid || multa.idPrestamoDetalle === undefined || multa.idPrestamoDetalle === null) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar el préstamo asociado a esta multa.'
      });
      return;
    }

    const requestId = ++this.detallePrestamoRequestId;
    this.detallePrestamoSubscription?.unsubscribe();
    this.prestamoDetalleActual = null;
    this.detallesPrestamoActual = [];
    this.highlightPrestamoDetalleId = multa.idPrestamoDetalle;
    this.mostrarDetallePrestamo = true;
    this.loadingDetallesPrestamo = true;

    const uuidPrestamo$ = multa.uuidPrestamo
      ? of(multa.uuidPrestamo)
      : this.multaService.getMultaById(multa.uuid).pipe(
        map(multaCompleta => multaCompleta.uuidPrestamo)
      );

    this.detallePrestamoSubscription = uuidPrestamo$.pipe(
      switchMap(uuidPrestamo => {
        if (!uuidPrestamo) {
          return throwError(() => new Error('La multa no contiene el UUID del préstamo relacionado.'));
        }

        return forkJoin({
          prestamo: this.prestamoService.getPrestamoByUuid(uuidPrestamo),
          detalles: this.prestamoService.getDetallesPrestamo(uuidPrestamo),
          estados: this.getEstadosPrestamo()
        }).pipe(switchMap(({ prestamo, detalles, estados }) => forkJoin({
          lector: this.getPersona(prestamo.idLector),
          bibliotecario: this.getPersona(prestamo.idBibliotecario)
        }).pipe(map(({ lector, bibliotecario }) => {
          this.estadosPrestamoPorId = new Map(estados.map(estado => [estado.id, estado]));
          return {
            prestamo: {
              ...prestamo,
              lector: lector || this.personasPorId.get(prestamo.idLector),
              bibliotecario: bibliotecario || this.personasPorId.get(prestamo.idBibliotecario),
              estadoPrestamo: this.estadosPrestamoPorId.get(prestamo.idEstadoPrestamo)
            },
            detalles
          };
        }))));
      }),
      catchError(error => {
        if (requestId === this.detallePrestamoRequestId) {
          this.mostrarDetallePrestamo = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getErrorDetallePrestamo(error)
          });
          console.error('Error al cargar el préstamo asociado a la multa:', {
            status: error?.status,
            url: error?.url,
            error
          });
        }
        return of(null);
      }),
      finalize(() => {
        if (requestId === this.detallePrestamoRequestId) {
          this.loadingDetallesPrestamo = false;
        }
      })
    ).subscribe({
      next: data => {
        if (!data) return;
        if (requestId !== this.detallePrestamoRequestId) return;
        const { prestamo, detalles } = data;
        this.prestamoDetalleActual = prestamo;
        this.detallesPrestamoActual = detalles;
      }
    });
  }

  private getEstadosPrestamo(): Observable<EstadoPrestamo[]> {
    if (this.estadosPrestamoPorId.size) {
      return of([...this.estadosPrestamoPorId.values()]);
    }
    if (!this.estadosPrestamoRequest$) {
      this.estadosPrestamoRequest$ = this.catalogService.getEstadosPrestamos().pipe(
        tap(estados => {
          this.estadosPrestamoPorId = new Map(estados.map(estado => [estado.id, estado]));
        }),
        catchError(error => {
          this.estadosPrestamoRequest$ = undefined;
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.estadosPrestamoRequest$;
  }

  private getPersona(id: number): Observable<Persona | undefined> {
    const cached = this.personasPorId.get(id);
    if (cached) return of(cached);
    return this.personaService.getPersonaById(id).pipe(
      tap(persona => this.personasPorId.set(persona.id, persona)),
      catchError(error => error?.status === 401 ? throwError(() => error) : of(undefined))
    );
  }

  private getErrorDetallePrestamo(error: any): string {
    switch (error?.status) {
      case 0:
        return 'No se pudo conectar con el servidor al cargar el préstamo asociado a esta multa.';
      case 403:
        return 'No tienes permisos para consultar los detalles de este préstamo.';
      case 401:
        return 'El servidor rechazó la autenticación al cargar el préstamo asociado a esta multa.';
      case 404:
        return 'No se encontró el préstamo o sus detalles asociados a esta multa.';
      case 500:
        return 'El servidor no pudo cargar los detalles del préstamo. Inténtalo de nuevo.';
      default:
        return error?.status
          ? `No se pudieron cargar los detalles del préstamo (HTTP ${error.status}).`
          : 'No se pudieron cargar los detalles del préstamo asociado a esta multa.';
    }
  }

  cerrarDetallePrestamo(): void {
    this.detallePrestamoRequestId++;
    this.detallePrestamoSubscription?.unsubscribe();
    this.detallePrestamoSubscription = undefined;
    this.mostrarDetallePrestamo = false;
    this.prestamoDetalleActual = null;
    this.detallesPrestamoActual = [];
    this.highlightPrestamoDetalleId = null;
    this.loadingDetallesPrestamo = false;
  }

  regresar(): void {
    console.log('🔙 Regresando a:', this.origenNavegacion);
    
    sessionStorage.removeItem('multasOrigen');
    
    if (this.origenNavegacion === 'prestamos') {
      this.router.navigate(['/admin/prestamos']);
    } else {
      this.router.navigate(['/admin']);
    }
  }

  applyFilterGlobal(_table: any, event: Event): void {
    this.searchRequests$.next((event.target as HTMLInputElement).value);
  }

  clearFilter(table: any): void {
    this.globalFilter = '';
    table.clear();
    this.page = 0;
    this.loadData();
  }

  getEstadoClass(estadoNombre: string = ''): string {
    switch (estadoNombre.toLowerCase()) {
      case 'emitida': return 'status-emitida';
      case 'pendiente': return 'status-pendiente';
      case 'pagada': return 'status-pagada';
      case 'condonada': return 'status-condonada';
      default: return 'status-desconocido';
    }
  }

  getDiasRetrasoClass(dias: number): string {
    if (dias === 0) return 'dias-normal';
    if (dias <= 5) return 'dias-advertencia';
    if (dias <= 15) return 'dias-critico';
    return 'dias-grave';
  }
}
