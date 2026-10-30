import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { DetallePrestamo, Prestamo } from '../../models/biblioteca';
import { getEstadoPrestamoClass } from '../../utils/estado-prestamo';

@Component({
  selector: 'app-prestamo-detalle',
  standalone: true,
  imports: [CommonModule, DatePipe, TableModule],
  templateUrl: './prestamo-detalle.html',
  styleUrls: ['./prestamo-detalle.css']
})
export class PrestamoDetalleComponent {
  @Input() prestamo: Prestamo | null = null;
  @Input() detalles: DetallePrestamo[] = [];
  @Input() loading = false;
  @Input() highlightPrestamoDetalleId: number | null = null;

  getEstadoClass(estadoNombre: string = ''): string {
    return getEstadoPrestamoClass(estadoNombre);
  }

  esDetalleResaltado(detalle: DetallePrestamo): boolean {
    return this.highlightPrestamoDetalleId !== null
      && this.highlightPrestamoDetalleId !== undefined
      && detalle.id === this.highlightPrestamoDetalleId;
  }
}
