import { Libro, LibroPayload, Autor, Ejemplar, EjemplarPayload, Areas, OptionLibro, LibroListado, VerLibro } from '../models/biblioteca';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { Page } from '../models/page';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL + '/libros';
  private ejemplaresUrl = environment.apiURL + '/ejemplares';

  listarLibros(page: number = 0, size: number = 15, sortField: string = 'id', sortOrder: string = 'desc', search = '', categoriaId?: number | null, areaIds: number[] = []): Observable<Page<LibroListado>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', `${sortField},${sortOrder}`);

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    if (categoriaId) {
      params = params.set('categoriaId', categoriaId);
    }

    areaIds.forEach(id => {
      params = params.append('areaIds', id);
    });

    return this.http.get<Page<LibroListado>>(`${this.apiUrl}`, { params });
  }

  listarLibrosDesactivados(page: number = 0, size: number = 15, sortField: string = 'id', sortOrder: string = 'desc', search = ''): Observable<Page<LibroListado>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', `${sortField},${sortOrder}`);

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<Page<LibroListado>>(`${this.apiUrl}/desactivados`, { params });
  }

  // Método para mostrar libros en un select/multiselect
  getOptionLibros(): Observable<OptionLibro[]> {
    return this.http.get<OptionLibro[]>(`${this.apiUrl}/option-libros`);
  }

  getAllLibrosAdmin(): Observable<Libro[]> {
    return this.http.get<Libro[]>(`${this.apiUrl}/todos-libros`);
  }

  getLibroByUuid(uuid: string): Observable<Libro> {
    return this.http.get<Libro>(`${this.apiUrl}/${uuid}/editar`);
  }

  verLibroPorUuid(uuid: string): Observable<VerLibro> {
    return this.http.get<VerLibro>(`${this.apiUrl}/${uuid}/ver`);
  }

  verLibroDesactivadoPorUuid(uuid: string): Observable<VerLibro> {
    return this.http.get<VerLibro>(`${this.apiUrl}/${uuid}/ver/desactivado`);
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
    return this.http.put<void>(`${this.apiUrl}/${uuid}/eliminar`, {});
  }

  reactivarLibro(uuid: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${uuid}/reactivar`, {});
  }

  addAutoresToLibro(uuid: string, autoresPayload: { idAutor: number }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${uuid}/autores/carga-masiva`, autoresPayload);
  }

  getAutoresForLibro(uuid: string): Observable<Autor[]> {
    return this.http.get<Autor[]>(`${this.apiUrl}/${uuid}/autores`);
  }

  addAreasToLibro(uuid: string, areasPayload: { idAutor: number }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${uuid}/areas/carga-masiva`, areasPayload);
  }

  getAreasForLibro(uuid: string): Observable<Areas[]> {
    return this.http.get<Areas[]>(`${this.apiUrl}/${uuid}/areas`);
  }

  exportarLibrosExcel(campos: string[]): Observable<Blob> {
    let params = new HttpParams;
    campos.forEach(c => params = params.append('campos', c));

    return this.http.get(`${this.apiUrl}/exportar/excel`, { params, responseType: 'blob' });
  }

  getEjemplares(): Observable<Ejemplar[]> {
    return this.http.get<Ejemplar[]>(this.ejemplaresUrl);
  }

  getEjemplaresDesactivados(): Observable<Ejemplar[]> {
    return this.http.get<Ejemplar[]>(`${this.ejemplaresUrl}/desactivados`);
  }

  getTodosEjemplares(): Observable<Ejemplar[]> {
    return this.http.get<Ejemplar[]>(`${this.ejemplaresUrl}/todos`);
  }

  getEjemplarByUuid(uuid: string): Observable<Ejemplar> {
    return this.http.get<Ejemplar>(`${this.ejemplaresUrl}/${uuid}`);
  }

  listarEjemplaresImpresion(): Observable<Ejemplar[]> {
    return this.http.get<Ejemplar[]>(`${this.ejemplaresUrl}/impresion`);
  }

  getEjemplaresByLibro(libroId: number): Observable<Ejemplar[]> {
    let httpParams = new HttpParams().set('idLibro', libroId.toString());
    return this.http.get<Ejemplar[]>(this.ejemplaresUrl, { params: httpParams });
  }

  getEjemplaresDisponibles(): Observable<Ejemplar[]> {
    let httpParams = new HttpParams().set('idEstadoEjemplar', '1');
    return this.http.get<Ejemplar[]>(this.ejemplaresUrl, { params: httpParams });
  }

  createEjemplar(ejemplar: EjemplarPayload): Observable<Ejemplar> {
    return this.http.post<Ejemplar>(this.ejemplaresUrl, ejemplar);
  }

  updateEjemplar(uuid: string, ejemplar: EjemplarPayload): Observable<Ejemplar> {
    return this.http.put<Ejemplar>(`${this.ejemplaresUrl}/${uuid}`, ejemplar);
  }

  desactivarEjemplar(uuid: string): Observable<void> {
    return this.http.put<void>(`${this.ejemplaresUrl}/${uuid}/desactivar`, {});
  }

  reactivarEjemplar(uuid: string): Observable<void> {
    return this.http.put<void>(`${this.ejemplaresUrl}/${uuid}/reactivar`, {});
  }

  deleteEjemplar(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.ejemplaresUrl}/${uuid}`);
  }

  exportarEjemplaresExcel(campos: string[]): Observable<Blob> {
    let params = new HttpParams;
    campos.forEach(c => params = params.append('campos', c));

    return this.http.get(`${this.ejemplaresUrl}/exportar/excel`, { params, responseType: 'blob' });
  }
}