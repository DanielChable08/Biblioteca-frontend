import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Libro, LibroPayload, Autor, Ejemplar, EjemplarPayload } from '../models/biblioteca';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/sdt/v1/libros';
  private ejemplaresUrl = 'http://localhost:8080/sdt/v1/ejemplares';

  // ==================== LIBROS ====================

  getLibros(params?: any): Observable<Libro[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    return this.http.get<Libro[]>(this.apiUrl, { params: httpParams });
  }

  getLibroByUuid(uuid: string): Observable<Libro> {
    return this.http.get<Libro>(`${this.apiUrl}/${uuid}`);
  }

  createLibro(libro: Omit<LibroPayload, 'idAutores'>): Observable<Libro> {
    return this.http.post<Libro>(this.apiUrl, libro);
  }

  updateLibro(uuid: string, libro: Partial<LibroPayload>): Observable<Libro> {
    return this.http.put<Libro>(`${this.apiUrl}/${uuid}`, libro);
  }

  deleteLibro(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${uuid}`);
  }

  // ==================== AUTORES ====================

  addAutoresToLibro(uuid: string, autoresPayload: { idAutor: number }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${uuid}/autores/carga-masiva`, autoresPayload);
  }

  getAutoresForLibro(uuid: string): Observable<Autor[]> {
    return this.http.get<Autor[]>(`${this.apiUrl}/${uuid}/autores`);
  }

  // ==================== EJEMPLARES ====================

  getEjemplares(): Observable<Ejemplar[]> {
    return this.http.get<Ejemplar[]>(this.ejemplaresUrl);
  }

  getEjemplarByUuid(uuid: string): Observable<Ejemplar> {
    return this.http.get<Ejemplar>(`${this.ejemplaresUrl}/${uuid}`);
  }

  getEjemplaresByLibro(libroId: number): Observable<Ejemplar[]> {
    let httpParams = new HttpParams().set('idLibro', libroId.toString());
    return this.http.get<Ejemplar[]>(this.ejemplaresUrl, { params: httpParams });
  }

  getEjemplaresDisponibles(): Observable<Ejemplar[]> {
    // Asume que idEstadoEjemplar 1 = Disponible
    // Ajusta este número según tu base de datos
    let httpParams = new HttpParams().set('idEstadoEjemplar', '1');
    return this.http.get<Ejemplar[]>(this.ejemplaresUrl, { params: httpParams });
  }

  createEjemplar(ejemplar: EjemplarPayload): Observable<Ejemplar> {
    return this.http.post<Ejemplar>(this.ejemplaresUrl, ejemplar);
  }

  updateEjemplar(uuid: string, ejemplar: EjemplarPayload): Observable<Ejemplar> {
    return this.http.put<Ejemplar>(`${this.ejemplaresUrl}/${uuid}`, ejemplar);
  }

  deleteEjemplar(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.ejemplaresUrl}/${uuid}`);
  }
}
