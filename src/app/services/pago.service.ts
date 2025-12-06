import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagoMulta, PagoMultaPayload } from '../models/biblioteca';

@Injectable({
  providedIn: 'root'
})
export class PagoService {
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

  getPagos(): Observable<PagoMulta[]> {
    return this.http.get<PagoMulta[]>(`${this.apiUrl}/pagos`, { headers: this.getHeaders() });
  }

  getPagoById(id: number): Observable<PagoMulta> {
    return this.http.get<PagoMulta>(`${this.apiUrl}/pagos/${id}`, { headers: this.getHeaders() });
  }

  registrarPago(pago: PagoMultaPayload): Observable<PagoMulta> {
    return this.http.post<PagoMulta>(`${this.apiUrl}/pagos`, pago, { headers: this.getHeaders() });
  }

  getPagosPorCajero(idCajero: number): Observable<PagoMulta[]> {
    return this.http.get<PagoMulta[]>(`${this.apiUrl}/pagos/cajero/${idCajero}`, { headers: this.getHeaders() });
  }
}
