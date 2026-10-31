import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, Subject, of } from 'rxjs';
import { catchError, debounceTime, finalize } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { PagoService } from '../../services/pago.service';
import { PagoMulta } from '../../models/biblioteca';
import { Page } from '../../models/page';

@Component({
  selector: 'app-pagos-index',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule, ToastModule, InputTextModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './pagos-index.html',
  styleUrls: ['./pagos-index.css']
})
export default class PagosIndexComponent implements OnInit, OnDestroy {
  private pagoService = inject(PagoService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private request?: Subscription;
  private searchRequests$ = new Subject<string>();
  private searchSubscription?: Subscription;

  pagos: PagoMulta[] = [];
  loading = false;
  globalFilter = '';
  totalRecords = 0;
  page = 0;
  pageSize = 10;
  sortBy = 'fechaPago';
  sortDirection = 'desc';

  ngOnInit(): void {
    this.searchSubscription = this.searchRequests$.pipe(debounceTime(300)).subscribe(search => {
      this.globalFilter = search;
      this.page = 0;
      this.cargarPagos();
    });
    this.cargarPagos();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.searchSubscription?.unsubscribe();
  }

  cargarPagos(): void {
    this.request?.unsubscribe();
    this.loading = true;
    this.request = this.pagoService.getPagos({
      page: this.page, size: this.pageSize, sortBy: this.sortBy,
      sortDirection: this.sortDirection, search: this.globalFilter
    }).pipe(
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los pagos.' });
        return of(null);
      }),
      finalize(() => this.loading = false)
    ).subscribe((response: Page<PagoMulta> | null) => {
      if (!response) return;
      if (response.content.length === 0 && response.totalElements > 0 && this.page > 0) {
        this.page = Math.max(0, response.totalPages - 1);
        this.cargarPagos();
        return;
      }
      this.pagos = response.content;
      this.totalRecords = response.totalElements;
    });
  }

  onPageChange(event: any): void {
    this.pageSize = event.rows || this.pageSize;
    this.page = Math.floor((event.first || 0) / this.pageSize);
    if (event.sortField) this.sortBy = event.sortField;
    if (event.sortOrder) this.sortDirection = event.sortOrder === 1 ? 'asc' : 'desc';
    this.cargarPagos();
  }

  buscar(event: Event): void {
    this.searchRequests$.next((event.target as HTMLInputElement).value);
  }

  limpiarBusqueda(): void {
    this.globalFilter = '';
    this.page = 0;
    this.cargarPagos();
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX');
  }

  formatearMoneda(monto: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
  }

  getEstadoSeverity(anulado: boolean): string { return anulado ? 'danger' : 'success'; }
  getEstadoTexto(anulado: boolean): string { return anulado ? 'ANULADO' : 'PAGADO'; }

  verHistorialLector(idLector: number | { id: number }): void {
    this.router.navigate(['/admin/pagos/lector', typeof idLector === 'number' ? idLector : idLector.id]);
  }

  irARegistrarPago(): void { this.router.navigate(['/admin/multas/pagar']); }
}
