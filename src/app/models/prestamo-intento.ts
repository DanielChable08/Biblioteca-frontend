import { Prestamo, PrestamoPayload, DetallePrestamo } from './biblioteca';

export interface AltaCompletaPrestamoPayload {
  prestamo: PrestamoPayload;
  idEjemplares: number[];
}

export interface AltaCompletaPrestamoResponse {
  prestamo: Prestamo;
  detalles: DetallePrestamo[];
}

export interface PrestamoIntento {
  userScope: string;
  idempotencyKey: string;
  payload: AltaCompletaPrestamoPayload;
}

export type RecuperacionPrestamo =
  | { estado: 'none' }
  | { estado: 'invalid' }
  | { estado: 'found'; intento: PrestamoIntento };
