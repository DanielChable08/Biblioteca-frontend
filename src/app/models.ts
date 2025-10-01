export interface Autor {
  id: number;
  nombre: string;
  apPaterno: string;
  apMaterno: string;
  uuid: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  uuid: string;
}

export interface Editorial {
  id: number;
  nombre: string;
  uuid: string;
}

export interface Idioma {
  id: number;
  nombre: string;
  uuid: string;
}

export interface TipoLibro {
  id: number;
  nombre:string;
  uuid: string;
}

export interface Libro {
  id: number;
  titulo: string;
  isbn: string;
  anho: string;
  resumen: string;
  edicion: string;
  pasta: string | null;
  imagen: string;
  paginas: number;
  uuid: string;
  idTipoLibro: number;
  idCategoria: number;
  idEditorial: number;
  idIdioma: number;
  idAutor: number;
  tipoLibro?: TipoLibro;
  categoria?: Categoria;
  editorial?: Editorial;
  idioma?: Idioma;
  autores?: Autor[];
  ubicacion?: string;
  estado?: string;
}

export interface Ejemplar {
  id: number;
  ubicacion: string;
  idLibro: number;
  idCondicionFisicaEjemplar: number;
  idEstadoEjemplar: number;
}

export interface EstadoEjemplar {
  id: number;
  nombre: string;
}