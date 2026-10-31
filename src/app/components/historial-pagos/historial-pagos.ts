import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PagoService } from '../../services/pago.service';
import { PersonaService } from '../../services/persona.service';
import { PagoMulta } from '../../models/biblioteca';

interface PageRequest { page: number; size: number; }

@Component({
  selector: 'app-historial-pagos',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule, CardModule, ToastModule],
  providers: [MessageService],
  templateUrl: './historial-pagos.html',
  styleUrls: ['./historial-pagos.css']
})
export default class HistorialPagosComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private pagoService = inject(PagoService);
  private personaService = inject(PersonaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private pageRequests$ = new Subject<PageRequest>();

  pagos: PagoMulta[] = [];
  loading = false;
  lectorId!: number;
  nombreLector = 'Cargando...';
  totalPagos = 0;
  page = 0;
  pageSize = 10;

  ngOnInit(): void {
    this.lectorId = Number(this.route.snapshot.params['idLector']);
    this.nombreLector = sessionStorage.getItem(`lector_${this.lectorId}`) || `Lector ${this.lectorId}`;

    this.pageRequests$.pipe(
      switchMap(request => {
        this.loading = true;
        return this.pagoService.getPagos({
          page: request.page, size: request.size, sortBy: 'fechaPago', sortDirection: 'desc', lectorId: this.lectorId
        }).pipe(
          catchError(error => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el historial de pagos.' });
            console.error('Error al cargar pagos del lector:', error);
            return of(null);
          }),
          finalize(() => this.loading = false)
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(response => {
      if (!response) return;
      if (!response.content.length && response.totalElements > 0 && this.page > 0) {
        this.page = Math.max(0, response.totalPages - 1);
        this.cargarHistorialPagos();
        return;
      }
      this.pagos = response.content;
      this.totalPagos = response.totalElements;
    });

    if (!sessionStorage.getItem(`lector_${this.lectorId}`)) {
      this.personaService.getPersonaById(this.lectorId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: persona => {
          this.nombreLector = `${persona.nombre} ${persona.apPaterno || ''}`.trim();
          sessionStorage.setItem(`lector_${this.lectorId}`, this.nombreLector);
        },
        error: () => this.nombreLector = `Lector ${this.lectorId}`
      });
    }
    this.cargarHistorialPagos();
  }

  cargarHistorialPagos(): void {
    this.pageRequests$.next({ page: this.page, size: this.pageSize });
  }

  onPageChange(event: any): void {
    this.pageSize = event.rows || this.pageSize;
    this.page = Math.floor((event.first || 0) / this.pageSize);
    this.cargarHistorialPagos();
  }

  formatearFecha(fecha: string): string { return new Date(fecha).toLocaleString('es-MX'); }

  formatearMoneda(monto: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
  }

  getEstadoSeverity(anulado: boolean): string { return anulado ? 'danger' : 'success'; }
  getEstadoTexto(anulado: boolean): string { return anulado ? 'ANULADO' : 'PAGADO'; }
  volver(): void { this.router.navigate(['/admin/pagos']); }
}
