import { Injectable } from '@angular/core';
import { PagoMultaPayload } from '../models/biblioteca';
import { PagoIntento, RecuperacionPago } from '../models/pago-intento';

const STORAGE_PREFIX = 'biblioteca:pago-intento:v1:';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class PagoIntentoService {
  preparar(userScope: string, payload: PagoMultaPayload, totalSeleccionado: number): PagoIntento {
    const existente = this.recuperar(userScope);
    if (existente.estado !== 'none') {
      throw new Error('Ya existe un intento de pago que debe resolverse primero.');
    }

    const intento: PagoIntento = {
      idempotencyKey: this.generarClave(),
      payload: {
        montoRecibido: payload.montoRecibido,
        cajero: payload.cajero,
        lectorPago: payload.lectorPago,
        idsMultas: [...payload.idsMultas]
      },
      totalSeleccionado
    };

    this.guardar(userScope, intento);
    return intento;
  }

  recuperar(userScope: string): RecuperacionPago {
    try {
      const serialized = sessionStorage.getItem(this.storageKey(userScope));
      if (!serialized) return { estado: 'none' };

      const value: unknown = JSON.parse(serialized);
      if (!this.esIntentoValido(value)) return { estado: 'invalid' };

      return {
        estado: 'found',
        intento: {
          idempotencyKey: value.idempotencyKey,
          payload: {
            montoRecibido: value.payload.montoRecibido,
            cajero: value.payload.cajero,
            lectorPago: value.payload.lectorPago,
            idsMultas: [...value.payload.idsMultas]
          },
          totalSeleccionado: value.totalSeleccionado
        }
      };
    } catch {
      return { estado: 'invalid' };
    }
  }

  limpiar(userScope: string, intento: PagoIntento): void {
    const key = this.storageKey(userScope);
    const actual = this.recuperar(userScope);
    if (actual.estado === 'found' && actual.intento.idempotencyKey === intento.idempotencyKey) {
      sessionStorage.removeItem(key);
    }
  }

  private guardar(userScope: string, intento: PagoIntento): void {
    sessionStorage.setItem(this.storageKey(userScope), JSON.stringify(intento));
  }

  private storageKey(userScope: string): string {
    return `${STORAGE_PREFIX}${encodeURIComponent(userScope)}`;
  }

  private esIntentoValido(value: unknown): value is PagoIntento {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<PagoIntento>;
    const payload = candidate.payload;
    return Boolean(
      typeof candidate.idempotencyKey === 'string' && UUID_PATTERN.test(candidate.idempotencyKey) &&
      typeof candidate.totalSeleccionado === 'number' && Number.isFinite(candidate.totalSeleccionado) &&
      payload && typeof payload === 'object' &&
      typeof payload.montoRecibido === 'number' && Number.isFinite(payload.montoRecibido) &&
      Number.isInteger(payload.cajero) && payload.cajero > 0 &&
      Number.isInteger(payload.lectorPago) && payload.lectorPago > 0 &&
      Array.isArray(payload.idsMultas) && payload.idsMultas.length > 0 &&
      payload.idsMultas.every(id => Number.isInteger(id) && id > 0)
    );
  }

  private generarClave(): string {
    if (typeof crypto === 'undefined') {
      throw new Error('El navegador no ofrece un generador seguro para la clave de pago.');
    }
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
