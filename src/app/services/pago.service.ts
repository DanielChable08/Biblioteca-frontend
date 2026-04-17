import { PagoMulta, PagoMultaPayload, PagoMultaDetalle } from '../models/biblioteca';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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

  getPagos(): Observable<PagoMulta[]> {
    return this.http.get<PagoMulta[]>(`${this.apiUrl}/pagos`, { headers: this.getHeaders() });
  }

  getPagoById(id: number): Observable<PagoMultaDetalle> {
    return this.http.get<PagoMultaDetalle>(`${this.apiUrl}/pagos/${id}`, { headers: this.getHeaders() });
  }

  registrarPago(pago: PagoMultaPayload): Observable<PagoMulta> {
    return this.http.post<PagoMulta>(`${this.apiUrl}/pagos`, pago, { headers: this.getHeaders() });
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
