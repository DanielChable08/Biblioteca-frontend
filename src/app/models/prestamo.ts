import { Usuario } from './usuario';
import { Catalogo, Ejemplar } from './biblioteca';

// DETALLE DE PRÉSTAMO (cada ejemplar prestado)
export interface PrestamoDetalle {
  id?: number;
  idEjemplar: number;
  fechaDevolucion?: string | null;
  idEstadoEjemplar: number;        // CAMBIO: Este campo debe ser idEstadoEjemplar
  ejemplar?: Ejemplar;
  estadoEjemplar?: Catalogo;       // Relación opcional para mostrar el estado de cada ejemplar
}

// PRÉSTAMO PRINCIPAL
export interface Prestamo {
  id?: number;
  uuid?: string;
  fechaPrestamo: string;
  fechaLimite: string;
  idBibliotecario: number;
  idLector: number;
  idEstadoPrestamo: number;
  detalles?: PrestamoDetalle[];

  lector?: Usuario;
  bibliotecario?: Usuario;
  estadoPrestamo?: Catalogo;
}

// PAYLOAD PARA CREAR PRÉSTAMO PRINCIPAL
export interface PrestamoPayload {
  fechaPrestamo: string;
  fechaLimite: string;
  idBibliotecario: number;
  idLector: number;
  idEstadoPrestamo: number;
}

// PAYLOAD PARA DETALLE DE PRÉSTAMO
// Este es el modelo que enviarás en el array de carga masiva
export interface PrestamoDetallePayload {
  idEjemplar: number;
  fechaDevolucion?: string | null;
  idEstadoEjemplar: number;
}
