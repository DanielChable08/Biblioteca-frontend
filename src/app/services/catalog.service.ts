import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Autor, 
  Catalogo, 
  TipoPersona, 
  EstadoEjemplar,
  Editorial,
  Idioma,
  TipoLibro,
  CondicionFisica,
  EstadoPrestamo 
} from '../models/biblioteca';
import { Rol } from '../models/usuario';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/sdt/v1';

  // Autores
  getAutores(): Observable<Autor[]> {
    return this.http.get<Autor[]>(`${this.apiUrl}/autores`);
  }

  getAutorByUuid(uuid: string): Observable<Autor> {
    return this.http.get<Autor>(`${this.apiUrl}/autores/${uuid}`);
  }

  createAutor(autorData: { nombre: string; apPaterno?: string; apMaterno?: string }): Observable<Autor> {
    return this.http.post<Autor>(`${this.apiUrl}/autores`, autorData);
  }

  updateAutor(uuid: string, autorData: { nombre: string; apPaterno?: string; apMaterno?: string }): Observable<Autor> {
    return this.http.put<Autor>(`${this.apiUrl}/autores/${uuid}`, autorData);
  }

  deleteAutor(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/autores/${uuid}`);
  }

  // Categorias
  getCategorias(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/categorias`);
  }

  getCategoriaByUuid(uuid: string): Observable<Catalogo> {
    return this.http.get<Catalogo>(`${this.apiUrl}/categorias/${uuid}`);
  }

  createCategoria(data: { nombre: string }): Observable<Catalogo> {
    return this.http.post<Catalogo>(`${this.apiUrl}/categorias`, data);
  }

  updateCategoria(uuid: string, data: { nombre: string }): Observable<Catalogo> {
    return this.http.put<Catalogo>(`${this.apiUrl}/categorias/${uuid}`, data);
  }

  deleteCategoria(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categorias/${uuid}`);
  }

  // Editoriales
  getEditoriales(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/editoriales`);
  }

  getEditorialByUuid(uuid: string): Observable<Catalogo> {
    return this.http.get<Catalogo>(`${this.apiUrl}/editoriales/${uuid}`);
  }

  createEditorial(data: { nombre: string }): Observable<Catalogo> {
    return this.http.post<Catalogo>(`${this.apiUrl}/editoriales`, data);
  }

  updateEditorial(uuid: string, data: { nombre: string }): Observable<Catalogo> {
    return this.http.put<Catalogo>(`${this.apiUrl}/editoriales/${uuid}`, data);
  }

  deleteEditorial(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/editoriales/${uuid}`);
  }

  // Idiomas
  getIdiomas(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/idiomas`);
  }

  getIdiomaByUuid(uuid: string): Observable<Catalogo> {
    return this.http.get<Catalogo>(`${this.apiUrl}/idiomas/${uuid}`);
  }

  createIdioma(data: { nombre: string }): Observable<Catalogo> {
    return this.http.post<Catalogo>(`${this.apiUrl}/idiomas`, data);
  }

  updateIdioma(uuid: string, data: { nombre: string }): Observable<Catalogo> {
    return this.http.put<Catalogo>(`${this.apiUrl}/idiomas/${uuid}`, data);
  }

  deleteIdioma(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/idiomas/${uuid}`);
  }

  // Tipos libros
  getTiposLibros(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/tipos-libros`);
  }

  getTipoLibroByUuid(uuid: string): Observable<Catalogo> {
    return this.http.get<Catalogo>(`${this.apiUrl}/tipos-libros/${uuid}`);
  }

  createTipoLibro(data: { nombre: string }): Observable<Catalogo> {
    return this.http.post<Catalogo>(`${this.apiUrl}/tipos-libros`, data);
  }

  updateTipoLibro(uuid: string, data: { nombre: string }): Observable<Catalogo> {
    return this.http.put<Catalogo>(`${this.apiUrl}/tipos-libros/${uuid}`, data);
  }

  deleteTipoLibro(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipos-libros/${uuid}`);
  }

  // Estados ejemplares
  getEstadosEjemplares(): Observable<EstadoEjemplar[]> {
    return this.http.get<EstadoEjemplar[]>(`${this.apiUrl}/estados-ejemplares`);
  }

  getEstadoEjemplarByUuid(uuid: string): Observable<EstadoEjemplar> {
    return this.http.get<EstadoEjemplar>(`${this.apiUrl}/estados-ejemplares/${uuid}`);
  }

  createEstadoEjemplar(data: { nombre: string }): Observable<EstadoEjemplar> {
    return this.http.post<EstadoEjemplar>(`${this.apiUrl}/estados-ejemplares`, data);
  }

  updateEstadoEjemplar(uuid: string, data: { nombre: string }): Observable<EstadoEjemplar> {
    return this.http.put<EstadoEjemplar>(`${this.apiUrl}/estados-ejemplares/${uuid}`, data);
  }

  deleteEstadoEjemplar(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/estados-ejemplares/${uuid}`);
  }

  // Condiciones fisicas
  getCondicionesFisicas(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/condicion-fisica-ejemplar`);
  }

  getCondicionFisicaByUuid(uuid: string): Observable<Catalogo> {
    return this.http.get<Catalogo>(`${this.apiUrl}/condicion-fisica-ejemplar/${uuid}`);
  }

  createCondicionFisica(data: { nombre: string }): Observable<Catalogo> {
    return this.http.post<Catalogo>(`${this.apiUrl}/condicion-fisica-ejemplar`, data);
  }

  updateCondicionFisica(uuid: string, data: { nombre: string }): Observable<Catalogo> {
    return this.http.put<Catalogo>(`${this.apiUrl}/condicion-fisica-ejemplar/${uuid}`, data);
  }

  deleteCondicionFisica(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/condicion-fisica-ejemplar/${uuid}`);
  }

  //Tipos de personas
  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.apiUrl}/rol`);
  }

  getTiposPersonas(): Observable<TipoPersona[]> {
    return this.http.get<TipoPersona[]>(`${this.apiUrl}/tipos-personas`);
  }

  getTiposPersona(): Observable<TipoPersona[]> {
    return this.http.get<TipoPersona[]>(`${this.apiUrl}/tipos-personas`);
  }

  getTipoPersonaByUuid(uuid: string): Observable<TipoPersona> {
    return this.http.get<TipoPersona>(`${this.apiUrl}/tipos-personas/${uuid}`);
  }

  createTipoPersona(data: { nombre: string }): Observable<TipoPersona> {
    return this.http.post<TipoPersona>(`${this.apiUrl}/tipos-personas`, data);
  }

  updateTipoPersona(uuid: string, data: { nombre: string }): Observable<TipoPersona> {
    return this.http.put<TipoPersona>(`${this.apiUrl}/tipos-personas/${uuid}`, data);
  }

  deleteTipoPersona(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipos-personas/${uuid}`);
  }

  // Estados de prestamos
  getEstadosPrestamos(): Observable<EstadoPrestamo[]> {
    return this.http.get<EstadoPrestamo[]>(`${this.apiUrl}/estados-prestamos`);
  }

  getEstadoPrestamoByUuid(uuid: string): Observable<EstadoPrestamo> {
    return this.http.get<EstadoPrestamo>(`${this.apiUrl}/estados-prestamos/${uuid}`);
  }

  createEstadoPrestamo(data: { nombre: string }): Observable<EstadoPrestamo> {
    return this.http.post<EstadoPrestamo>(`${this.apiUrl}/estados-prestamos`, data);
  }

  updateEstadoPrestamo(uuid: string, data: { nombre: string }): Observable<EstadoPrestamo> {
    return this.http.put<EstadoPrestamo>(`${this.apiUrl}/estados-prestamos/${uuid}`, data);
  }

  deleteEstadoPrestamo(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/estados-prestamos/${uuid}`);
  }
}
