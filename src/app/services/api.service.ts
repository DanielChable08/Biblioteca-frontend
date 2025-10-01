import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8080/sdt/v1';

  constructor(private http: HttpClient) { }

  getEditoriales(): Observable<any> {
    return this.http.get(`${this.baseUrl}/editoriales`);
  }

  getAutores(): Observable<any> {
    return this.http.get(`${this.baseUrl}/autores`);
  }

  getCategorias(): Observable<any> {
    return this.http.get(`${this.baseUrl}/categorias`);
  }

  getCondicionFisica(): Observable<any> {
    return this.http.get(`${this.baseUrl}/condicion-fisica-ejemplar`);
  }

  getIdiomas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/idiomas`);
  }

  getTiposLibros(): Observable<any> {
    return this.http.get(`${this.baseUrl}/tipos-libros`);
  }

  getEjemplares(): Observable<any> {
    return this.http.get(`${this.baseUrl}/ejemplares`);
  }

  getEstadosEjemplares(): Observable<any> {
    return this.http.get(`${this.baseUrl}/estados-ejemplares`);
  }

  getPrestamos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/prestamos`);
  }

  getLibros(): Observable<any> {
    return this.http.get(`${this.baseUrl}/libros`);
  }

  getLibroByUuid(uuid: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/libros/full/${uuid}`);
  }
}