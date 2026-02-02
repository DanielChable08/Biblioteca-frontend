import { Usuario } from './usuario';
import { Catalogo, Ejemplar } from './biblioteca';


export interface PrestamoDetalle {
  id?: number;
  idEjemplar: number;
  fechaDevolucion?: string | null;
  idEstadoEjemplar: number;        
  ejemplar?: Ejemplar;
  estadoEjemplar?: Catalogo;       
}

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


export interface PrestamoPayload {
  fechaPrestamo: string;
  fechaLimite: string;
  idBibliotecario: number;
  idLector: number;
  idEstadoPrestamo: number;
}


export interface PrestamoDetallePayload {
  idEjemplar: number;
  fechaDevolucion?: string | null;
  idEstadoEjemplar: number;
}


export interface PoliticaMulta {
  id: number;
  diasGracia: number;
  multaDiaria: number;
  multaMaxima: number | null;
  vigente: boolean;
  uuid: string;
}