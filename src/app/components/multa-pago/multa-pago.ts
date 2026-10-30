import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { finalize } from 'rxjs/operators';
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
import { PagoIntentoService } from '../../services/pago-intento.service';
import { PagoIntento } from '../../models/pago-intento';
import { PagoMulta, PagoMultaPayload } from '../../models/biblioteca';
import { AuthService } from '../../services/auth.service';

const RESULTADO_INCIERTO =
  'No pudimos confirmar el resultado del pago. Puedes volver a consultar la operación sin generar un nuevo cobro.';

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
  private authService = inject(AuthService);
  private pagoIntentoService = inject(PagoIntentoService);
  private intentoUserScope: string | null = null;

  multas: any[] = [];
  multasSeleccionadas: any[] = [];
  private catalogoMultas: any[] = [];
  loading = false;
  procesando = false;
  intentoPendiente: PagoIntento | null = null;
  intentoNoRecuperable = false;
  montoRecibido = 0;
  totalSeleccionado = 0;
  cambio = 0;
  globalFilter = '';

  get edicionBloqueada(): boolean {
    return this.procesando || this.intentoPendiente !== null || this.intentoNoRecuperable;
  }

  get intentoDeUsuarioActual(): boolean {
    return this.intentoUserScope !== null &&
      this.intentoUserScope === this.authService.getCurrentUserScope();
  }

  ngOnInit(): void {
    const userScope = this.authService.getCurrentUserScope();
    if (userScope) {
      const recuperacion = this.pagoIntentoService.recuperar(userScope);
      if (recuperacion.estado === 'found') {
        this.intentoPendiente = recuperacion.intento;
        this.intentoUserScope = userScope;
        this.restaurarDatosDelIntento();
      } else if (recuperacion.estado === 'invalid') {
        this.intentoNoRecuperable = true;
      }
    }
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
        const todasLasMultas = multas.map(m => ({
          ...m,
          estadoMulta: estados.find(e => e.id === m.idEstadoMulta),
          motivoMulta: motivos.find(mo => mo.id === m.idMotivoMulta),
          lector: m.idPersona ? personasMap.get(m.idPersona) : null,
          seleccionada: false
        }));

        return {
          todasLasMultas,
          multasPendientes: todasLasMultas.filter(m =>
            m.estadoMulta?.nombre === 'Emitida' || m.estadoMulta?.nombre === 'Pendiente'
          )
        };
      }),
      finalize(() => this.loading = false)
    ).subscribe({
      next: ({ todasLasMultas, multasPendientes }) => {
        this.catalogoMultas = todasLasMultas;
        this.multas = multasPendientes;

        if (this.intentoPendiente) {
          this.restaurarDatosDelIntento();
        } else if (!this.intentoNoRecuperable) {
          const multaId = sessionStorage.getItem('multaIdSeleccionada');
          if (multaId) {
            const multa = this.multas.find(m => m.id === +multaId);
            if (multa) {
              multa.seleccionada = true;
              this.actualizarTotal();
            }
            sessionStorage.removeItem('multaIdSeleccionada');
          }
        }
      },
      error: (err: unknown) => {
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
    if (this.edicionBloqueada) return;
    this.multasSeleccionadas = this.multas.filter(m => m.seleccionada);
    this.totalSeleccionado = this.multasSeleccionadas.reduce((sum, m) => sum + m.monto, 0);
    this.calcularCambio();
  }

  calcularCambio(): void {
    if (this.edicionBloqueada) return;
    this.cambio = this.montoRecibido - this.totalSeleccionado;
  }

  toggleSeleccionTodos(event: any): void {
    if (this.edicionBloqueada || this.loading) return;
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
    if (this.procesando || this.loading) return;
    if (this.intentoNoRecuperable) {
      this.messageService.add({
        severity: 'error',
        summary: 'Pago pendiente de revisión',
        detail: 'No se pudo leer con seguridad el intento guardado. No se iniciará otro pago en esta sesión.'
      });
      return;
    }
    if (this.intentoPendiente) {
      this.enviarIntento(this.intentoPendiente);
      return;
    }

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

    const userScope = this.authService.getCurrentUserScope();
    if (!userScope) {
      this.messageService.add({
        severity: 'error',
        summary: 'Sesión no identificada',
        detail: 'No se pudo asociar el intento de pago a la cuenta activa. Inicia sesión de nuevo.'
      });
      return;
    }

    const pagoData: PagoMultaPayload = {
      montoRecibido: this.montoRecibido,
      cajero: this.authService.getCurrentPersonaId() || 1,
      lectorPago: lectorId,
      idsMultas: this.multasSeleccionadas.map(m => m.id)
    };

    try {
      this.intentoPendiente = this.pagoIntentoService.preparar(
        userScope,
        pagoData,
        this.totalSeleccionado
      );
      this.intentoUserScope = userScope;
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo preparar el pago',
        detail: 'No se enviará el pago porque no fue posible guardar su clave de recuperación en esta sesión.'
      });
      console.error('No se pudo preparar el intento de pago:', error);
      return;
    }

    this.enviarIntento(this.intentoPendiente);
  }

  private enviarIntento(intento: PagoIntento): void {
    if (this.procesando) return;
    if (!this.intentoUserScope || this.intentoUserScope !== this.authService.getCurrentUserScope()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Cuenta diferente',
        detail: 'Este intento pertenece a otra cuenta y no se enviará con la sesión actual.'
      });
      return;
    }
    this.procesando = true;

    this.pagoService.registrarPago(intento.payload, intento.idempotencyKey).subscribe({
      next: (pago) => this.confirmarPago(intento, pago),
      error: (error: unknown) => this.manejarErrorPago(intento, error)
    });
  }

  private confirmarPago(intento: PagoIntento, pago: PagoMulta): void {
    const multasDelTicket = [...this.multasSeleccionadas];
    const total = pago?.total ?? intento.totalSeleccionado;
    const recibido = pago?.montoRecibido ?? intento.payload.montoRecibido;
    const cambio = pago?.cambio ?? recibido - total;

    this.limpiarIntento(intento);
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: `Pago registrado correctamente. Cambio: $${cambio.toFixed(2)}`
    });

    if (multasDelTicket.length === intento.payload.idsMultas.length) {
      this.imprimirTicketPago(multasDelTicket, total, recibido, cambio);
    }

    this.multasSeleccionadas = [];
    this.multas.forEach(m => m.seleccionada = false);
    this.totalSeleccionado = 0;
    this.montoRecibido = 0;
    this.cambio = 0;
    this.loadMultasPendientes();

    setTimeout(() => this.router.navigate(['/admin/multas']), 2000);
  }

  private manejarErrorPago(intento: PagoIntento, error: unknown): void {
    this.procesando = false;
    const httpError = error instanceof HttpErrorResponse ? error : null;
    const mensaje = this.obtenerMensajeBackend(httpError);

    if (httpError && this.esResultadoIncierto(httpError, mensaje)) {
      const detalle = httpError.status === 409
        ? 'El backend devolvió un conflicto no identificado. No pudimos confirmar el estado del pago; el intento se conserva para un reintento seguro.'
        : RESULTADO_INCIERTO;
      this.messageService.add({
        severity: 'warn',
        summary: 'Pago pendiente de confirmación',
        detail: detalle
      });
      console.warn('El resultado del pago quedó incierto.', {
        status: httpError.status,
        idempotencyKey: intento.idempotencyKey
      });
      return;
    }

    const conflictoMulta = httpError?.status === 409 && this.esConflictoPorMulta(mensaje);
    this.limpiarIntento(intento);

    if (conflictoMulta) {
      this.multasSeleccionadas = [];
      this.multas.forEach(m => m.seleccionada = false);
      this.totalSeleccionado = 0;
      this.montoRecibido = 0;
      this.cambio = 0;
      this.messageService.add({
        severity: 'warn',
        summary: 'Multa no disponible',
        detail: 'Una o más multas ya fueron pagadas o cambiaron de estado. Se actualizó la lista.'
      });
      this.loadMultasPendientes();
      return;
    }

    if (httpError?.status === 409 && this.esConflictoClave(mensaje)) {
      console.warn('El backend rechazó la clave por datos distintos.', {
        status: httpError.status,
        idempotencyKey: intento.idempotencyKey
      });
    } else if (httpError?.status === 409) {
      console.warn('El backend rechazó definitivamente el pago.', {
        status: httpError.status,
        idempotencyKey: intento.idempotencyKey
      });
    }

    this.messageService.add({
      severity: 'error',
      summary: httpError?.status === 409 ? 'Pago rechazado' : 'Error',
      detail: mensaje || 'No se pudo registrar el pago.'
    });
  }

  private limpiarIntento(intento: PagoIntento): void {
    const userScope = this.intentoUserScope;
    if (userScope) {
      try {
        this.pagoIntentoService.limpiar(userScope, intento);
      } catch (error) {
        console.warn('No se pudo limpiar el intento confirmado o rechazado.', {
          idempotencyKey: intento.idempotencyKey
        });
      }
    }
    this.intentoPendiente = null;
    this.intentoUserScope = null;
    this.procesando = false;
  }

  private restaurarDatosDelIntento(): void {
    const intento = this.intentoPendiente;
    if (!intento) return;

    const ids = new Set(intento.payload.idsMultas);
    for (const multa of this.multas) multa.seleccionada = ids.has(multa.id);
    this.multasSeleccionadas = this.catalogoMultas.filter(m => ids.has(m.id));
    this.totalSeleccionado = intento.totalSeleccionado;
    this.montoRecibido = intento.payload.montoRecibido;
    this.cambio = this.montoRecibido - this.totalSeleccionado;
  }

  private obtenerMensajeBackend(error: HttpErrorResponse | null): string {
    const detalle = error?.error?.error;
    return typeof detalle === 'string' ? detalle : '';
  }

  private esResultadoIncierto(error: HttpErrorResponse, mensaje: string): boolean {
    if (error.status === 0 || error.status >= 500 || error.status === 408 || error.status === 429) {
      return true;
    }
    if (error.status !== 409) return false;
    if (/está siendo procesad[ao]/i.test(mensaje)) return true;

    // Only conflicts with a known final meaning can discard the saved operation.
    return !this.esConflictoClave(mensaje) && !this.esConflictoPorMulta(mensaje);
  }

  private esConflictoClave(mensaje: string): boolean {
    return /clave Idempotency-Key ya fue utilizada con datos distintos/i.test(mensaje);
  }

  private esConflictoPorMulta(mensaje: string): boolean {
    return /multa(?:\s+\d+)?\s+ya (?:está asociada a un pago|está pagada o condonada)/i.test(mensaje) ||
      /no se encuentra en un estado válido para recibir pagos/i.test(mensaje);
  }

  private imprimirTicketPago(
    multasSeleccionadas: any[],
    totalSeleccionado: number,
    montoRecibido: number,
    cambio: number
  ): void {
    const multasData = multasSeleccionadas.map(multa => ({
      motivo: multa.motivoMulta?.nombre || 'Sin motivo',
      monto: multa.monto,
      diasRetraso: multa.diasRetraso,
      montoPorDia: multa.montoPorDia
    }));

    this.printService.imprimirTicketPago({
      cajero: 'Cajero Principal',
      fechaPago: new Date(),
      multas: multasData,
      totalPagar: totalSeleccionado,
      montoRecibido,
      cambio
    });
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

  irAlIndexPagos(): void {
    this.router.navigate(['/admin/pagos']);
  }
}
