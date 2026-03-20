import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { map, finalize } from 'rxjs/operators';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/enviroment';

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
}

interface Persona {
  id: number;
  nombre: string;
  apPaterno: string;
  apMaterno: string;
}

@Component({
  selector: 'app-historial-pagos',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    CardModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './historial-pagos.html',
  styleUrls: ['./historial-pagos.css']
})
export default class HistorialPagosComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);

  pagos: Pago[] = [];
  loading = false;
  lectorId!: number;
  nombreLector: string = 'Cargando...';
  totalPagado = 0;
  totalPagos = 0;

  private apiUrl = environment.apiURL;

  ngOnInit(): void {
    this.lectorId = Number(this.route.snapshot.params['idLector']);
    
    this.nombreLector = sessionStorage.getItem(`lector_${this.lectorId}`) || `Lector ${this.lectorId}`;
    
    this.cargarHistorialPagos();
  }

  cargarHistorialPagos(): void {
    this.loading = true;

    forkJoin({
      pagos: this.http.get<Pago[]>(`${this.apiUrl}/pagos`),
      personas: this.http.get<Persona[]>(`${this.apiUrl}/personas`)
    })
      .pipe(
        map(({ pagos, personas }) => {
          const personasMap = new Map(personas.map(p => [p.id, p]));
          
          const pagosEnriquecidos = pagos.map(pago => ({
            ...pago,
            lectorNombre: personasMap.get(pago.lectorPago)?.nombre || `Lector ${pago.lectorPago}`
          }));

          if (!sessionStorage.getItem(`lector_${this.lectorId}`)) {
            const lector = personas.find(p => p.id === this.lectorId);
            if (lector) {
              this.nombreLector = `${lector.nombre} ${lector.apPaterno || ''}`.trim();
              sessionStorage.setItem(`lector_${this.lectorId}`, this.nombreLector);
            }
          }

          return pagosEnriquecidos;
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (todosLosPagos) => {
          this.pagos = todosLosPagos
            .filter(p => p.lectorPago === this.lectorId)
            .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());

          this.totalPagos = this.pagos.length;
          this.totalPagado = this.pagos
            .filter(p => !p.anulado)
            .reduce((sum, p) => sum + p.total, 0);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar el historial de pagos'
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

  volver(): void {
    this.router.navigate(['/admin/pagos']);
  }
}
