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
export interface TipoPersona {
  id: number;
  uuid?: string;
  nombre: string; // "Bibliotecario", "Lector", etc.
}

export interface Persona {
  id: number;
  uuid: string;
  nombre: string;
  apPaterno: string;
  apMaterno: string;
  telefono?: string;
  idTipoPersona: number;
  tipoPersona?: TipoPersona; // Relación opcional
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

  // Propiedades opcionales para datos relacionados
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

// Agregar estas interfaces al archivo existente

// ============ PRÉSTAMO ============
export interface EstadoPrestamo extends Catalogo {}

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
