import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Prestamo, DetallePrestamo, PrestamoPayload, DetallePrestamoPayload } from '../models/biblioteca';

@Injectable({
  providedIn: 'root'
})
export class PrestamoService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/sdt/v1';

  // PRÉSTAMOS
  getPrestamos(): Observable<Prestamo[]> {
    return this.http.get<Prestamo[]>(`${this.apiUrl}/prestamos`);
  }

  getPrestamoByUuid(uuid: string): Observable<Prestamo> {
    return this.http.get<Prestamo>(`${this.apiUrl}/prestamos/${uuid}`);
  }

  createPrestamo(prestamo: PrestamoPayload): Observable<Prestamo> {
    return this.http.post<Prestamo>(`${this.apiUrl}/prestamos`, prestamo);
  }

  updatePrestamo(uuid: string, prestamo: Partial<PrestamoPayload>): Observable<Prestamo> {
    return this.http.put<Prestamo>(`${this.apiUrl}/prestamos/${uuid}`, prestamo);
  }

  deletePrestamo(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/prestamos/${uuid}`);
  }

  cargarEnMasiva(uuid: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/prestamos/${uuid}/carga-masiva`, data);
  }

  // DETALLES DE PRÉSTAMO
  getDetallesPrestamo(prestamoUuid: string): Observable<DetallePrestamo[]> {
    return this.http.get<DetallePrestamo[]>(`${this.apiUrl}/prestamos/${prestamoUuid}/detalles`);
  }

  createDetallePrestamo(prestamoUuid: string, detalle: DetallePrestamoPayload): Observable<DetallePrestamo> {
    return this.http.post<DetallePrestamo>(`${this.apiUrl}/prestamos/${prestamoUuid}/detalles`, detalle);
  }

  cargarDetallesEnMasiva(prestamoUuid: string, idEjemplares: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/prestamos/${prestamoUuid}/detalles/carga-masiva`, {
      idEjemplares: idEjemplares
    });
  }

  devolverEjemplares(prestamoUuid: string, payload: { idEjemplar: number; fechaDevolucion: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/prestamos/${prestamoUuid}/detalles/devolver-ejemplares`, payload);
  }

  deleteDetallePrestamo(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/prestamos/detalles/${uuid}`);
  }
}
