// ============ INTERFACES BASE ============
export interface Catalogo {
  id: number;
  nombre: string;
  uuid: string;
}

export interface Autor {
  id: number;
  nombre: string;
  apPaterno: string;
  apMaterno: string;
  uuid: string;
}

// ============ EXTENSIONES DE CATALOGO ============
export interface Editorial extends Catalogo {}

export interface Idioma extends Catalogo {}

export interface TipoLibro extends Catalogo {}

export interface CondicionFisica extends Catalogo {}

export interface EstadoEjemplar extends Catalogo {}

export interface EstadoPrestamo extends Catalogo {}

export interface MotivoMulta extends Catalogo {}

export interface EstadoMulta extends Catalogo {}

// ============ EJEMPLAR ============
export interface Ejemplar {
  id: number;
  codigo: string;
  ubicacion: string | null;
  uuid: string;
  idLibro: number;
  idCondicionFisicaEjemplar: number;
  idEstadoEjemplar: number;
  estado?: EstadoEjemplar;
  condicionFisica?: CondicionFisica;
  libro?: Libro;
}

// ============ PERSONA ============
export interface Persona {
  id: number;
  uuid: string;
  nombre: string;
  apPaterno: string;
  apMaterno?: string;
  telefono: string;
  idTipoPersona: number;
}

export interface TipoPersona {
  id: number;
  uuid: string;
  nombre: string;
}

// ============ LIBRO ============
export interface Libro {
  id: number;
  titulo: string;
  isbn: string;
  anho: string;
  resumen: string;
  edicion: string;
  paginas: number;
  pasta: string | null;
  idTipoLibro: number;
  idCategoria: number;
  idEditorial: number;
  idIdioma: number;
  uuid: string;

  autores?: Autor[];
  categoria?: Catalogo;
  editorial?: Editorial;
  idioma?: Idioma;
  tipoLibro?: TipoLibro;
  imagen?: string;
  ejemplares?: Ejemplar[];
}

export interface LibroPayload {
  titulo: string;
  isbn: string;
  anho: string;
  resumen: string;
  edicion: string;
  paginas: number;
  idTipoLibro: number;
  idCategoria: number;
  idEditorial: number;
  idIdioma: number;
  idAutores: number[];
}

export interface EjemplarPayload {
  codigo: string;
  ubicacion: string | null;
  idLibro: number;
  idCondicionFisicaEjemplar: number;
  idEstadoEjemplar: number;
}

export interface PersonaPayload {
  nombre: string;
  apPaterno: string;
  apMaterno: string;
  telefono: string;
  idTipoPersona: number;
}

// ============ PRÉSTAMO ============
export interface Prestamo {
  id?: number;
  uuid?: string;
  fechaPrestamo: string;
  fechaLimite: string;
  idBibliotecario: number;
  idLector: number;
  idEstadoPrestamo: number;
  detalles?: DetallePrestamo[];
  lector?: Persona;
  bibliotecario?: Persona;
  estadoPrestamo?: EstadoPrestamo;
}

export interface DetallePrestamo {
  id?: number;
  uuid?: string;
  idPrestamo?: number;
  idEjemplar: number;
  fechaDevolucion?: string | null;
  idEstadoPrestamo: number;
  ejemplar?: Ejemplar;
  estadoEjemplar?: EstadoEjemplar;
}

export interface PrestamoPayload {
  fechaPrestamo: string;
  fechaLimite: string;
  idBibliotecario: number;
  idLector: number;
  idEstadoPrestamo: number;
}

export interface DetallePrestamoPayload {
  idEjemplar: number;
  fechaDevolucion?: string | null;
  idEstadoPrestamo: number;
}

// ============ MULTAS ============
export interface PoliticaMulta {
  id: number;
  uuid: string;
  diasGracia: number;
  multaDiaria: number;
  multaMaxima: number;
  vigente: boolean;
}

export interface Multa {
  id: number;
  monto: number;
  fechaEmision: string;
  idPrestamoDetalle: number;
  idMotivoMulta: number;
  idEstadoMulta: number;
  idPersona?: number; 
  diasRetraso?: number;
  motivoMulta?: MotivoMulta;
  estadoMulta?: EstadoMulta;
  prestamoDetalle?: DetallePrestamo;
  lector?: Persona;
}

export interface MultaPayload {
  monto: number;
  idPrestamoDetalle: number;
  idMotivoMulta: number;
  idEstadoMulta: number;
}

// ============ PAGOS ============
export interface PagoMulta {
  id: number;
  montoRecibido: number;
  fechaPago: string;
  cajero: number;
  multas?: Multa[];
  cajeroPersona?: Persona;
}

export interface PagoMultaPayload {
  montoRecibido: number;
  cajero: number;
  idsMultas: number[];
}

// ============ VISTA COMPLETA (para consultas JOIN) ============
export interface MultaCompleta extends Multa {
  nombreLector: string;
  apellidoLector: string;
  libroTitulo: string;
  codigoEjemplar: string;
  diasAtraso: number; 
}
