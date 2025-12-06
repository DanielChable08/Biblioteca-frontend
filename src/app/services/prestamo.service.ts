import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Prestamo, 
  DetallePrestamo, 
  PrestamoPayload, 
  DetallePrestamoPayload,
  Persona, 
  EstadoEjemplar
} from '../models/biblioteca';

@Injectable({
  providedIn: 'root'
})
export class PrestamoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/sdt/v1';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (token) {
      return new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  getPrestamos(): Observable<Prestamo[]> {
    return this.http.get<Prestamo[]>(`${this.apiUrl}/prestamos`);
  }

  getPrestamoByUuid(uuid: string): Observable<Prestamo> {
    return this.http.get<Prestamo>(`${this.apiUrl}/prestamos/${uuid}`);
  }

  getPersonas(): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${this.apiUrl}/personas`);
  }

  createPrestamo(prestamo: PrestamoPayload): Observable<Prestamo> {
    return this.http.post<Prestamo>(`${this.apiUrl}/prestamos`, prestamo);
  }

  updatePrestamo(uuid: string, prestamo: Partial<PrestamoPayload>): Observable<Prestamo> {
    return this.http.put<Prestamo>(`${this.apiUrl}/prestamos/${uuid}`, prestamo);
  }

  deletePrestamo(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/prestamos/${uuid}`, { headers: this.getHeaders() });
  }

  getDetallesPrestamo(prestamoUuid: string): Observable<DetallePrestamo[]> {
    return this.http.get<DetallePrestamo[]>(`${this.apiUrl}/prestamos/${prestamoUuid}/detalles`);
  }

  createDetallePrestamo(prestamoUuid: string, detalle: DetallePrestamoPayload): Observable<DetallePrestamo> {
    return this.http.post<DetallePrestamo>(`${this.apiUrl}/prestamos/${prestamoUuid}/detalles`, detalle);
  }

  cargarDetallesEnMasiva(prestamoUuid: string, detalles: DetallePrestamoPayload[]): Observable<any> {
    const url = `${this.apiUrl}/prestamos/${prestamoUuid}/detalles/carga-masiva`;
    console.log('📤 POST a:', url);
    console.log('📦 Payload:', JSON.stringify(detalles, null, 2));
    return this.http.post<any>(url, detalles);
  }

  getEstadosEjemplares(): Observable<EstadoEjemplar[]> {
    return this.http.get<EstadoEjemplar[]>(`${this.apiUrl}/estados-ejemplares`);
  }

  devolverEjemplares(prestamoUuid: string, detallesIds: number[]): Observable<any> {
    const url = `${this.apiUrl}/prestamos/devolucion`;
    const payload = { 
      prestamoUuid: prestamoUuid,
      detallesIds: detallesIds 
    };
    console.log('📤 POST devolución a:', url);
    console.log('📦 Payload:', payload);
    return this.http.post(url, payload, { headers: this.getHeaders() });
  }

  deleteDetallePrestamo(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/prestamos/detalles/${uuid}`, { headers: this.getHeaders() });
  }
}
