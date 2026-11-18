import { Injectable } from '@angular/core';
import {
  AltaCompletaPrestamoPayload,
  PrestamoIntento,
  RecuperacionPrestamo
} from '../models/prestamo-intento';

const STORAGE_PREFIX = 'biblioteca:prestamo-intento:v1:';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class PrestamoIntentoService {
  preparar(userScope: string, payload: AltaCompletaPrestamoPayload): PrestamoIntento {
    if (!userScope.trim()) throw new Error('No fue posible identificar al usuario actual.');

    const existente = this.recuperar(userScope);
    if (existente.estado !== 'none') {
      throw new Error('Ya existe un intento de préstamo que debe resolverse primero.');
    }

    const intento: PrestamoIntento = {
      userScope,
      idempotencyKey: this.generarClave(),
      payload: this.clonarPayload(payload)
    };
    sessionStorage.setItem(this.storageKey(userScope), JSON.stringify(intento));
    return intento;
  }

  recuperar(userScope: string): RecuperacionPrestamo {
    try {
      const serialized = sessionStorage.getItem(this.storageKey(userScope));
      if (!serialized) return { estado: 'none' };

      const value: unknown = JSON.parse(serialized);
      if (!this.esIntentoValido(value, userScope)) return { estado: 'invalid' };

      return {
        estado: 'found',
        intento: {
          userScope: value.userScope,
          idempotencyKey: value.idempotencyKey,
          payload: this.clonarPayload(value.payload)
        }
      };
    } catch {
      return { estado: 'invalid' };
    }
  }

  limpiar(userScope: string, intento: PrestamoIntento): void {
    const actual = this.recuperar(userScope);
    if (actual.estado === 'found' && actual.intento.idempotencyKey === intento.idempotencyKey) {
      sessionStorage.removeItem(this.storageKey(userScope));
    }
  }

  limpiarInvalido(userScope: string): void {
    if (this.recuperar(userScope).estado === 'invalid') {
      sessionStorage.removeItem(this.storageKey(userScope));
    }
  }

  private clonarPayload(payload: AltaCompletaPrestamoPayload): AltaCompletaPrestamoPayload {
    return {
      prestamo: { ...payload.prestamo },
      idEjemplares: [...payload.idEjemplares].sort((a, b) => a - b)
    };
  }

  private storageKey(userScope: string): string {
    return `${STORAGE_PREFIX}${encodeURIComponent(userScope)}`;
  }

  private esIntentoValido(value: unknown, userScope: string): value is PrestamoIntento {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<PrestamoIntento>;
    const payload = candidate.payload;
    const prestamo = payload?.prestamo;
    const ids = payload?.idEjemplares;

    return Boolean(
      candidate.userScope === userScope &&
      typeof candidate.idempotencyKey === 'string' && UUID_PATTERN.test(candidate.idempotencyKey) &&
      prestamo &&
      typeof prestamo.fechaPrestamo === 'string' && prestamo.fechaPrestamo.length > 0 &&
      typeof prestamo.fechaLimite === 'string' && prestamo.fechaLimite.length > 0 &&
      Number.isInteger(prestamo.idBibliotecario) && prestamo.idBibliotecario > 0 &&
      Number.isInteger(prestamo.idLector) && prestamo.idLector > 0 &&
      Number.isInteger(prestamo.idEstadoPrestamo) && prestamo.idEstadoPrestamo > 0 &&
      Array.isArray(ids) && ids.length > 0 && ids.length <= 5 &&
      ids.every(id => Number.isInteger(id) && id > 0) &&
      new Set(ids).size === ids.length
    );
  }

  private generarClave(): string {
    if (typeof crypto === 'undefined') {
      throw new Error('El navegador no ofrece un generador seguro para la clave del préstamo.');
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
