import { PagoMulta, PagoMultaPayload, PagoMultaDetalle } from '../models/biblioteca';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../models/page';

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

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

  getPagos(options: {
    page?: number; size?: number; sortBy?: string; sortDirection?: string; search?: string; lectorId?: number;
  } = {}): Observable<Page<PagoMulta>> {
    let params = new HttpParams()
      .set('page', options.page ?? 0)
      .set('size', options.size ?? 15)
      .set('sortBy', options.sortBy ?? 'id')
      .set('sortDirection', options.sortDirection ?? 'desc');
    if (options.search?.trim()) params = params.set('search', options.search.trim());
    if (options.lectorId !== undefined) params = params.set('lectorId', options.lectorId);
    return this.http.get<Page<PagoMulta>>(`${this.apiUrl}/pagos`, { headers: this.getHeaders(), params });
  }

  getPagoById(id: number): Observable<PagoMultaDetalle> {
    return this.http.get<PagoMultaDetalle>(`${this.apiUrl}/pagos/${id}`, { headers: this.getHeaders() });
  }

  registrarPago(pago: PagoMultaPayload, idempotencyKey: string): Observable<PagoMulta> {
    const headers = this.getHeaders().set('Idempotency-Key', idempotencyKey);
    return this.http.post<PagoMulta>(`${this.apiUrl}/pagos`, pago, { headers });
  }

  getPagosPorCajero(idCajero: number): Observable<PagoMulta[]> {
    return this.http.get<PagoMulta[]>(`${this.apiUrl}/pagos/cajero/${idCajero}`, { headers: this.getHeaders() });
  }

  anularPago(idPago: number, motivoAnulacion: string, anuladoPor: number): Observable<PagoMulta> {
    return this.http.put<PagoMulta>(`${this.apiUrl}/pagos/${idPago}/anular`, {
      motivoAnulacion,
      anuladoPor
    }, { headers: this.getHeaders() });
  }
}
