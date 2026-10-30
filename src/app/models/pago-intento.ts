import { PagoMultaPayload } from './biblioteca';

export interface PagoIntento {
  idempotencyKey: string;
  payload: PagoMultaPayload;
  totalSeleccionado: number;
}

export type RecuperacionPago =
  | { estado: 'none' }
  | { estado: 'invalid' }
  | { estado: 'found'; intento: PagoIntento };
