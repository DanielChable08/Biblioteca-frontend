import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Multa, 
  MultaCompleta,
  MultaPayload,
  MotivoMulta,
  EstadoMulta,
  PoliticaMulta
} from '../models/biblioteca';

@Injectable({
  providedIn: 'root'
})
export class MultaService {
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

  // Multas
  getMultas(): Observable<Multa[]> {
    return this.http.get<Multa[]>(`${this.apiUrl}/multas`, { headers: this.getHeaders() });
  }

  getMultaById(id: number): Observable<Multa> {
    return this.http.get<Multa>(`${this.apiUrl}/multas/${id}`, { headers: this.getHeaders() });
  }

  getMultasPorLector(idLector: number): Observable<Multa[]> {
    return this.http.get<Multa[]>(`${this.apiUrl}/multas/lector/${idLector}`, { headers: this.getHeaders() });
  }

  getMultasPorEstado(idEstado: number): Observable<Multa[]> {
    return this.http.get<Multa[]>(`${this.apiUrl}/multas/estado/${idEstado}`, { headers: this.getHeaders() });
  }

  createMulta(multa: MultaPayload): Observable<Multa> {
    return this.http.post<Multa>(`${this.apiUrl}/multas`, multa, { headers: this.getHeaders() });
  }

  condonarMulta(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/multas/${id}/condonar`, {}, { headers: this.getHeaders() });
  }

  deleteMulta(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/multas/${id}`, { headers: this.getHeaders() });
  }

  // Catálogos
  getMotivosMultas(): Observable<MotivoMulta[]> {
    return this.http.get<MotivoMulta[]>(`${this.apiUrl}/motivos-multas`, { headers: this.getHeaders() });
  }

  getEstadosMultas(): Observable<EstadoMulta[]> {
    return this.http.get<EstadoMulta[]>(`${this.apiUrl}/estados-multas`, { headers: this.getHeaders() });
  }

  getPoliticaVigente(): Observable<PoliticaMulta> {
    return this.http.get<PoliticaMulta>(`${this.apiUrl}/politicas-multas/vigente`, { headers: this.getHeaders() });
  }
}
