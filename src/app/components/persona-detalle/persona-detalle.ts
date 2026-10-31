import { AuthService } from '../../services/auth.service';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http'; 

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast'; 

import { PersonaService } from '../../services/persona.service';
import { PagoService } from '../../services/pago.service';
import { CatalogService } from '../../services/catalog.service';
import { PrestamoService } from '../../services/prestamo.service';
import { MultaService } from '../../services/multa.service';
import { Persona, TipoPersona } from '../../models/biblioteca';
import { EstadoPrestamo } from '../../models/biblioteca';

interface PrestamosPageRequest {
  page: number;
  size: number;
}

interface ReaderPageRequest { page: number; size: number; }

interface PrestamoLookups {
  personas: Persona[];
  estados: EstadoPrestamo[];
}

@Component({
  selector: 'app-persona-detalle',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, TagModule, TooltipModule, ToastModule, RouterModule],
  providers: [MessageService],
  templateUrl: './persona-detalle.html',
  styleUrls: ['./persona-detalle.css']
})
export default class PersonaDetalleComponent implements OnInit {
  authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private personaService = inject(PersonaService);
  private pagoService = inject(PagoService);
  private catalogService = inject(CatalogService);
  private prestamoService = inject(PrestamoService);
  private multaService = inject(MultaService);
  private messageService = inject(MessageService);

  personaUuid: string | null = null;
  persona: Persona | null = null;
  tiposPersona: TipoPersona[] = [];
  loading = true;
  loadingPagos = false;
  loadingPrestamosYMultas = false;
  loadingPrestamos = false;

  activeTab: 'prestamos' | 'multas' | 'pagos' = 'prestamos';

  prestamos: any[] = [];
  prestamosPage = 0;
  prestamosPageSize = 10;
  totalPrestamos = 0;
  multas: any[] = [];
  pagos: any[] = [];
  totalMultas = 0;
  totalPagos = 0;
  multasPage = 0;
  pagosPage = 0;
  multasPageSize = 10;
  pagosPageSize = 10;

  private personaId: number | null = null;
  private prestamosPageRequests$ = new Subject<PrestamosPageRequest>();
  private multasPageRequests$ = new Subject<ReaderPageRequest>();
  private pagosPageRequests$ = new Subject<ReaderPageRequest>();
  private prestamoLookups$?: Observable<PrestamoLookups>;

  ngOnInit(): void {
    this.multasPageRequests$.pipe(
      switchMap(request => {
        this.loadingPrestamosYMultas = true;
        return this.multaService.getMultas({
          page: request.page, size: request.size, sortBy: 'fechaEmision', sortDirection: 'desc', lectorId: this.personaId ?? undefined
        }).pipe(
          catchError(error => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial de multas.' });
            console.error('Error al cargar multas del lector:', error);
            return of(null);
          }),
          finalize(() => this.loadingPrestamosYMultas = false)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(response => {
      if (!response) return;
      if (!response.content.length && response.totalElements > 0 && this.multasPage > 0) {
        this.multasPage = Math.max(0, response.totalPages - 1);
        this.solicitarPaginaMultas(this.multasPage, this.multasPageSize);
        return;
      }
      this.totalMultas = response.totalElements;
      this.multas = response.content.map(multa => ({
        ...multa,
        estadoMulta: { id: multa.idEstadoMulta, nombre: multa.estadoMultaNombre },
        motivoMulta: { id: multa.idMotivoMulta, nombre: multa.motivoMultaNombre },
        diasRetraso: multa.diasRetraso || 0
      }));
    });

    this.pagosPageRequests$.pipe(
      switchMap(request => {
        this.loadingPagos = true;
        return this.pagoService.getPagos({
          page: request.page, size: request.size, sortBy: 'fechaPago', sortDirection: 'desc', lectorId: this.personaId ?? undefined
        }).pipe(
          catchError(error => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los pagos.' });
            console.error('Error al cargar pagos del lector:', error);
            return of(null);
          }),
          finalize(() => this.loadingPagos = false)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(response => {
      if (!response) return;
      if (!response.content.length && response.totalElements > 0 && this.pagosPage > 0) {
        this.pagosPage = Math.max(0, response.totalPages - 1);
        this.solicitarPaginaPagos(this.pagosPage, this.pagosPageSize);
        return;
      }
      this.totalPagos = response.totalElements;
      this.pagos = response.content;
    });

    this.prestamosPageRequests$.pipe(
      switchMap(request => {
        this.loadingPrestamos = true;
        return forkJoin({
          page: this.prestamoService.getPrestamos(
            request.page, request.size, 'fechaPrestamo', 'desc', '', this.personaId ?? undefined
          ),
          lookups: this.getPrestamoLookups()
        }).pipe(
          map(({ page, lookups }) => ({ page, lookups })),
          catchError(error => {
            this.messageService.add({
              severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial de préstamos.'
            });
            console.error('Error al cargar el historial paginado de préstamos:', error);
            return of(null);
          }),
          finalize(() => this.loadingPrestamos = false)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (!result) return;
      this.totalPrestamos = result.page.totalElements;
      this.prestamos = result.page.content.map(prestamo => ({
        ...prestamo,
        bibliotecario: result.lookups.personas.find(persona => persona.id === prestamo.idBibliotecario),
        estadoPrestamo: result.lookups.estados.find(estado => estado.id === prestamo.idEstadoPrestamo)
      }));
    });

    this.personaUuid = this.route.snapshot.paramMap.get('uuid');
    if (this.personaUuid) {
      this.loadPersonaDetalle(this.personaUuid);
    }
  }

  loadPersonaDetalle(uuid: string): void {
    this.loading = true;
    
    forkJoin({
      persona: this.personaService.getPersonaByUuid(uuid),
      tipos: this.catalogService.getTiposPersonas().pipe(catchError(() => of([]))) 
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ persona, tipos }) => {
        this.persona = persona;
        this.tiposPersona = tipos;
        
        this.cargarHistoriales(persona.id); 
        
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el perfil.' });
        this.router.navigate(['/admin/personas']);
      }
    });
  }

  cargarHistoriales(idPersona: number): void {
    this.personaId = idPersona;
    this.loadingPrestamosYMultas = true;
    this.solicitarPaginaPrestamos(0, this.prestamosPageSize);
    this.solicitarPaginaMultas(0, this.multasPageSize);
    this.solicitarPaginaPagos(0, this.pagosPageSize);
  }

  onPrestamosPageChange(event: any): void {
    this.prestamosPageSize = event.rows > 0 ? event.rows : this.prestamosPageSize;
    this.prestamosPage = this.prestamosPageSize > 0 ? Math.floor(event.first / this.prestamosPageSize) : 0;
    this.solicitarPaginaPrestamos(this.prestamosPage, this.prestamosPageSize);
  }

  private solicitarPaginaPrestamos(page: number, size: number): void {
    if (this.personaId === null) return;
    this.prestamosPage = page;
    this.prestamosPageSize = size;
    this.prestamosPageRequests$.next({ page, size });
  }

  private getPrestamoLookups(): Observable<PrestamoLookups> {
    if (!this.prestamoLookups$) {
      this.prestamoLookups$ = forkJoin({
        personas: this.prestamoService.getPersonas().pipe(catchError(() => of([]))),
        estados: this.catalogService.getEstadosPrestamos().pipe(catchError(() => of([])))
      }).pipe(
        takeUntilDestroyed(this.destroyRef),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.prestamoLookups$;
  }

  onMultasPageChange(event: any): void {
    this.multasPageSize = event.rows || this.multasPageSize;
    this.multasPage = Math.floor((event.first || 0) / this.multasPageSize);
    this.solicitarPaginaMultas(this.multasPage, this.multasPageSize);
  }

  onPagosPageChange(event: any): void {
    this.pagosPageSize = event.rows || this.pagosPageSize;
    this.pagosPage = Math.floor((event.first || 0) / this.pagosPageSize);
    this.solicitarPaginaPagos(this.pagosPage, this.pagosPageSize);
  }

  private solicitarPaginaMultas(page: number, size: number): void {
    this.multasPage = page;
    this.multasPageSize = size;
    this.multasPageRequests$.next({ page, size });
  }

  private solicitarPaginaPagos(page: number, size: number): void {
    this.pagosPage = page;
    this.pagosPageSize = size;
    this.pagosPageRequests$.next({ page, size });
  }

  getNombreCompleto(): string {
    if (!this.persona) return '';
    return `${this.persona.nombre} ${this.persona.apPaterno} ${this.persona.apMaterno || ''}`.trim();
  }

  getTipoPersonaNombre(idTipoPersona: number): string {
    const tipo = this.tiposPersona.find(t => t.id === idTipoPersona);
    return tipo?.nombre || 'Sin tipo';
  }

  getIniciales(): string {
    if (!this.persona) return '';
    return (this.persona.nombre.charAt(0) + (this.persona.apPaterno?.charAt(0) || '')).toUpperCase();
  }

  getEstadoPrestamoClass(estadoNombre: string = ''): string {
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

  getEstadoMultaClass(estadoNombre: string = ''): string {
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

  getEstadoSeverity(anulado: boolean): 'success' | 'danger' {
    return anulado ? 'danger' : 'success';
  }

  getEstadoTexto(anulado: boolean): string {
    return anulado ? 'ANULADO' : 'PAGADO';
  }

  volver(): void {
    this.router.navigate(['/admin/personas']);
  }
}
