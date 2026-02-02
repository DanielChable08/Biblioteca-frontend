import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';

import { MultaService } from '../../services/multa.service';
import { PagoService } from '../../services/pago.service';
import { PrestamoService } from '../../services/prestamo.service';
import { PrintTicketService } from '../../services/print-ticket.service';
import { PagoMultaPayload } from '../../models/biblioteca';

@Component({
  selector: 'app-multa-pago',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    InputTextModule,
    CheckboxModule,
    InputNumberModule,
    DatePipe
  ],
  providers: [MessageService],
  templateUrl: './multa-pago.html',
  styleUrls: ['./multa-pago.css']
})
export class MultaPagoComponent implements OnInit {
  private multaService = inject(MultaService);
  private pagoService = inject(PagoService);
  private prestamoService = inject(PrestamoService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private printService = inject(PrintTicketService);

  multas: any[] = [];
  multasSeleccionadas: any[] = [];
  loading = false;
  procesando = false;
  montoRecibido: number = 0;
  totalSeleccionado: number = 0;
  cambio: number = 0;
  globalFilter: string = '';

  ngOnInit(): void {
    this.loadMultasPendientes();
  }

loadMultasPendientes(): void {
  this.loading = true;
  forkJoin({
    multas: this.multaService.getMultas(),
    estados: this.multaService.getEstadosMultas(),
    motivos: this.multaService.getMotivosMultas(),
    personas: this.prestamoService.getPersonas()
  }).pipe(
    map(({ multas, estados, motivos, personas }) => {
      const personasMap = new Map(personas.map(p => [p.id, p]));
      
      return multas
        .filter(m => {
          const estado = estados.find(e => e.id === m.idEstadoMulta);
          return estado?.nombre === 'Emitida' || estado?.nombre === 'Pendiente';
        })
        .map(m => ({
          ...m,
          estadoMulta: estados.find(e => e.id === m.idEstadoMulta),
          motivoMulta: motivos.find(mo => mo.id === m.idMotivoMulta),
          lector: m.idPersona ? personasMap.get(m.idPersona) : null,
          seleccionada: false
        }));
    }),
    finalize(() => this.loading = false)
  ).subscribe({
    next: (multasPendientes) => {
      this.multas = multasPendientes;
      
      const multaId = sessionStorage.getItem('multaIdSeleccionada');
      if (multaId) {
        setTimeout(() => {
          const multa = this.multas.find(m => m.id === +multaId);
          if (multa) {
            multa.seleccionada = true;
            this.actualizarTotal();
          }
          sessionStorage.removeItem('multaIdSeleccionada');
        }, 100);
      }
    },
    error: (err: any) => {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'No se pudieron cargar las multas.' 
      });
      console.error('Error al cargar multas:', err);
    }
  });
}


  actualizarTotal(): void {
    this.multasSeleccionadas = this.multas.filter(m => m.seleccionada);
    this.totalSeleccionado = this.multasSeleccionadas.reduce((sum, m) => sum + m.monto, 0);
    this.calcularCambio();
  }

  calcularCambio(): void {
    this.cambio = this.montoRecibido - this.totalSeleccionado;
  }

  toggleSeleccionTodos(event: any): void {
    const checked = event.checked;
    this.multas.forEach(m => m.seleccionada = checked);
    this.actualizarTotal();
  }

  todosSeleccionados(): boolean {
    return this.multas.length > 0 && this.multas.every(m => m.seleccionada);
  }

  getNombreLector(multa: any): string {
    if (!multa.lector) return 'N/A';
    return `${multa.lector.nombre} ${multa.lector.apPaterno || ''}`.trim();
  }

procesarPago(): void {
  if (this.multasSeleccionadas.length === 0) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: 'Debes seleccionar al menos una multa para pagar.'
    });
    return;
  }

  if (this.montoRecibido < this.totalSeleccionado) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Monto Insuficiente',
      detail: `El monto recibido debe ser al menos $${this.totalSeleccionado.toFixed(2)}`
    });
    return;
  }

  const lectorId = this.multasSeleccionadas[0]?.idPersona;
  
  if (!lectorId) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo identificar al lector de las multas.'
    });
    return;
  }

  this.procesando = true;

  const cajeroId = 1;
  const pagoData: PagoMultaPayload = {
    montoRecibido: this.montoRecibido,
    cajero: cajeroId,
    lectorPago: lectorId,
    idsMultas: this.multasSeleccionadas.map(m => m.id)
  };

  this.pagoService.registrarPago(pagoData).pipe(
    finalize(() => this.procesando = false)
  ).subscribe({
    next: () => {
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: `Pago registrado correctamente. Cambio: $${this.cambio.toFixed(2)}`
      });

      this.imprimirTicketPago();

      setTimeout(() => {
        this.router.navigate(['/admin/multas']);
      }, 2000);
    },
    error: (err) => {
      console.error('Error al registrar pago:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo registrar el pago.'
      });
    }
  });
}


  imprimirTicketPago(): void {
    const multasData = this.multasSeleccionadas.map(multa => ({
      motivo: multa.motivoMulta?.nombre || 'Sin motivo',
      monto: multa.monto,
      diasRetraso: multa.diasRetraso,
      montoPorDia: multa.montoPorDia
    }));

    const ticketData = {
      cajero: 'Cajero Principal',
      fechaPago: new Date(),
      multas: multasData,
      totalPagar: this.totalSeleccionado,
      montoRecibido: this.montoRecibido,
      cambio: this.cambio
    };

    this.printService.imprimirTicketPago(ticketData);
  }

  regresar(): void {
    this.router.navigate(['/admin/multas']);
  }

  applyFilterGlobal(table: any, event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    table.filterGlobal(filterValue, 'contains');
  }

  clearFilter(table: any): void {
    this.globalFilter = '';
    table.clear();
  }

  irAlIndexPagos() {
  this.router.navigate(['/admin/pagos']);
  
  }

}
