
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

export interface EstadoEjemplar extends Catalogo {}

export interface Ejemplar {
  id: number;
  codigo: string;
  ubicacion: string | null;
  uuid: string;
  idLibro: number;
  idCondicionFisicaEjemplar: number;
  idEstadoEjemplar: number;
  estado?: EstadoEjemplar;
}


export interface TipoPersona extends Catalogo {}

export interface Persona {
  id: number;
  nombre: string;
  apPaterno: string;
  apMaterno: string;
  telefono: string;
  idTipoPersona: number;
  uuid: string;
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

  autores?: Autor[]; 
  categoria?: Catalogo;
  editorial?: Catalogo;
  idioma?: Catalogo;
  tipoLibro?: Catalogo;
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

