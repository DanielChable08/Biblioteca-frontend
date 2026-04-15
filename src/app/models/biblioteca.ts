export interface Catalogo {
  id: number;
  nombre: string;
  uuid: string;
}

export interface Autor {
  id: number;
  uuid: string;
  nombre: string;
  apPaterno?: string;
  apMaterno?: string; 
  displayName?: string;
}

export interface Areas extends Catalogo {}

export interface Editorial extends Catalogo {}

export interface Idioma extends Catalogo {}

export interface TipoLibro extends Catalogo {}

export interface CondicionFisica extends Catalogo {}

export interface EstadoEjemplar extends Catalogo {}

export interface EstadoPrestamo extends Catalogo {}

export interface MotivoMulta extends Catalogo {}

export interface EstadoMulta extends Catalogo {}

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

export interface Persona {
  id: number;
  uuid: string;
  nombre: string;
  apPaterno: string;
  apMaterno?: string;
  telefono: string;
  idTipoPersona: number;
  tipoPersona?: TipoPersona;
}

export interface TipoPersona {
  id: number;
  uuid: string;
  nombre: string;
}

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
  areas?: Areas[]; 
  autores?: Autor[];
  categoria?: Catalogo;
  editorial?: Editorial;
  idioma?: Idioma;
  tipoLibro?: TipoLibro;
  imagen?: string;
  ejemplares?: Ejemplar[];
  activo?: boolean;
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
  idAreas: number[]; 
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
  estadoPrestamo?: EstadoPrestamo;
  multa?: Multa;
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

export interface PoliticaMulta {
  id: number;
  diasGracia: number;
  multaDiaria: number;
  multaMaxima: number | null;
  vigente: boolean;
  uuid: string;
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
  montoPorDia?: number;
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

export interface PagoMulta {
  id: number;
  fechaPago: string;
  total: number;
  montoRecibido: number;
  cambio: number;
  moneda: string;
  metodoPago: string;
  folio: string;
  anulado: boolean;
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  uuid: string;
  lectorPago: Persona; 
  cajero: Persona;       
  anuladoPor?: Persona;
}

export interface PagoMultaPayload {
  montoRecibido: number;
  cajero: number;
  lectorPago: number;
  idsMultas: number[];
}

export interface PagoMultaDetalle {
  pago: PagoMulta;
  multas: Multa[];
}

export interface MultaCompleta extends Multa {
  nombreLector: string;
  apellidoLector: string;
  libroTitulo: string;
  codigoEjemplar: string;
  diasAtraso: number;
}

export interface PrestamoCompleto extends Prestamo {
  lectorNombre: string;
  bibliotecarioNombre: string;
  totalEjemplares: number;
  ejemplaresDevueltos: number;
  ejemplaresPendientes: number;
}

export interface DashboardStats {
  totalLibros: number;
  totalEjemplares: number;
  ejemplaresDisponibles: number;
  ejemplaresPrestados: number;
  prestamosActivos: number;
  prestamosVencidos: number;
  multasPendientes: number;
  multasPagadas: number;
  totalMultasEmitidas: number;
}