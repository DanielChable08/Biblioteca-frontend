import { Libro, LibroPayload, Autor, Ejemplar, EjemplarPayload } from '../models/biblioteca';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/enviroment';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL + '/libros';
  private ejemplaresUrl = environment.apiURL + '/ejemplares';

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

  getAllLibrosAdmin(): Observable<Libro[]> {
    return this.http.get<Libro[]>(`${this.apiUrl}/todos-libros`);
  }

  getLibroByUuid(uuid: string): Observable<Libro> {
    return this.http.get<Libro>(`${this.apiUrl}/${uuid}`);
  }

  private crearFormData(libro: any, file: File | null): FormData {
    const formData = new FormData();
    
    Object.keys(libro).forEach(key => {
      const value = libro[key];
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });


    if (file) {
      formData.append('archivoMultipart', file); 
    }
    
    return formData;
  }

  createLibroConImagen(libro: Omit<LibroPayload, 'idAutores'>, file: File | null): Observable<Libro> {
    const formData = this.crearFormData(libro, file);
    return this.http.post<Libro>(this.apiUrl, formData); 
  }

  updateLibroConImagen(uuid: string, libro: Partial<LibroPayload>, file: File | null): Observable<Libro> {
    const formData = this.crearFormData(libro, file);
    return this.http.put<Libro>(`${this.apiUrl}/${uuid}`, formData);
  }

  deleteLibro(uuid: string): Observable<void> { 
    return this.http.put<void>(`${this.apiUrl}/${uuid}/eliminar`, {}); }

  reactivarLibro(uuid: string): Observable<void> { 
    return this.http.put<void>(`${this.apiUrl}/${uuid}/reactivar`, {}); }

  addAutoresToLibro(uuid: string, autoresPayload: { idAutor: number }[]): Observable<any> { 
    return this.http.post(`${this.apiUrl}/${uuid}/autores/carga-masiva`, autoresPayload); }

  getAutoresForLibro(uuid: string): Observable<Autor[]> { 
    return this.http.get<Autor[]>(`${this.apiUrl}/${uuid}/autores`); }
  
  getEjemplares(): Observable<Ejemplar[]> { 
    return this.http.get<Ejemplar[]>(this.ejemplaresUrl); }
  
  getEjemplarByUuid(uuid: string): Observable<Ejemplar> { 
    return this.http.get<Ejemplar>(`${this.ejemplaresUrl}/${uuid}`); }
  
  getEjemplaresByLibro(libroId: number): Observable<Ejemplar[]> { let httpParams = new HttpParams().set('idLibro', libroId.toString()); 
   return this.http.get<Ejemplar[]>(this.ejemplaresUrl, { params: httpParams }); }
  
  getEjemplaresDisponibles(): Observable<Ejemplar[]> { let httpParams = new HttpParams().set('idEstadoEjemplar', '1'); 
   return this.http.get<Ejemplar[]>(this.ejemplaresUrl, { params: httpParams }); }
  
  createEjemplar(ejemplar: EjemplarPayload): Observable<Ejemplar> { 
    return this.http.post<Ejemplar>(this.ejemplaresUrl, ejemplar); }
  
  updateEjemplar(uuid: string, ejemplar: EjemplarPayload): Observable<Ejemplar> { 
    return this.http.put<Ejemplar>(`${this.ejemplaresUrl}/${uuid}`, ejemplar); }
  
  deleteEjemplar(uuid: string): Observable<void> { 
    return this.http.delete<void>(`${this.ejemplaresUrl}/${uuid}`); }

  getLibroDesactivadoByUuid(uuid: string): Observable<Libro> {
    return this.http.get<Libro>(`${this.apiUrl}/${uuid}/desactivado`);
}
}