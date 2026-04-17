import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { map, finalize } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

interface Pago {
  id: number;
  fechaPago: string;
  total: number;
  montoRecibido: number;
  cambio: number;
  moneda: string;
  metodoPago: string;
  folio: string;
  anulado: boolean;
  motivoAnulacion: string | null;
  fechaAnulacion: string | null;
  uuid: string;
  lectorPago: number;
  cajero: number;
  anuladoPor: number | null;
  lectorNombre?: string; 
}

interface Persona {
  id: number;
  nombre: string;
  apPaterno: string;
  apMaterno: string;
}

@Component({
  selector: 'app-pagos-index',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    InputTextModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './pagos-index.html',
  styleUrls: ['./pagos-index.css']
})
export default class PagosIndexComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private messageService = inject(MessageService);

  pagos: Pago[] = [];
  loading = false;
  apiUrl = environment.apiURL;

  ngOnInit(): void {
    this.cargarPagos();
  }

  cargarPagos(): void {
    this.loading = true;

    forkJoin({
      pagos: this.http.get<Pago[]>(`${this.apiUrl}/pagos`),
      personas: this.http.get<Persona[]>(`${this.apiUrl}/personas`)
    })
      .pipe(
        map(({ pagos, personas }) => {
          const personasMap = new Map(personas.map(p => [p.id, p]));

          return pagos.map(pago => {
            const persona = personasMap.get(pago.lectorPago);
            return {
              ...pago,
              lectorNombre: persona
                ? `${persona.nombre} ${persona.apPaterno || ''}`.trim()
                : `ID: ${pago.lectorPago}`
            };
          });
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: pagosConLector => {
          this.pagos = pagosConLector;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los pagos.'
          });
        }
      });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX');
  }

  formatearMoneda(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto);
  }

  getEstadoSeverity(anulado: boolean): string {
    return anulado ? 'danger' : 'success';
  }

  getEstadoTexto(anulado: boolean): string {
    return anulado ? 'ANULADO' : 'PAGADO';
  }

  verHistorialLector(idLector: number): void {
    this.router.navigate(['/admin/pagos/lector', idLector]);
  }

  irARegistrarPago(): void {
    this.router.navigate(['/admin/multas/pagar']);
  }
}
