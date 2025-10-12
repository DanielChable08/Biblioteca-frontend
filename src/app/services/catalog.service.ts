import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Autor, Catalogo, TipoPersona, EstadoEjemplar } from '../models/biblioteca';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/sdt/v1';

  getAutores(): Observable<Autor[]> {
    return this.http.get<Autor[]>(`${this.apiUrl}/autores`);
  }
  
  createAutor(autorData: { nombre: string, apPaterno: string, apMaterno: string }): Observable<Autor> {
    return this.http.post<Autor>(`${this.apiUrl}/autores`, autorData);
  }

  getCategorias(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/categorias`);
  }

  getEditoriales(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/editoriales`);
  }

  getIdiomas(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/idiomas`);
  }

  getTiposLibros(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/tipos-libros`);
  }

  getTiposPersonas(): Observable<TipoPersona[]> {
    return this.http.get<TipoPersona[]>(`${this.apiUrl}/tipos-personas`);
  }
  
  getEstadosEjemplares(): Observable<EstadoEjemplar[]> {
    return this.http.get<EstadoEjemplar[]>(`${this.apiUrl}/estados-ejemplares`);
  }

  getCondicionesFisicas(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/condicion-fisica-ejemplar`);
  }

  createCondicionFisica(data: { nombre: string }): Observable<Catalogo> {
    return this.http.post<Catalogo>(`${this.apiUrl}/condicion-fisica-ejemplar`, data);
  }

  createEstadoEjemplar(data: { nombre: string }): Observable<EstadoEjemplar> {
    return this.http.post<EstadoEjemplar>(`${this.apiUrl}/estados-ejemplares`, data);
  }
}