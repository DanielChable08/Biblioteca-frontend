import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  Multa, 
  CondonarMultaPayload,
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
  private apiUrl = environment.apiURL;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getMultas(): Observable<Multa[]> {
    return this.http.get<Multa[]>(`${this.apiUrl}/multas`, { headers: this.getHeaders() });
  }

  getMultaById(uuid: string): Observable<Multa> {
    return this.http.get<Multa>(`${this.apiUrl}/multas/${uuid}`, { headers: this.getHeaders() });
  }

  condonarMulta(uuid: string, payload: CondonarMultaPayload): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/multas/${uuid}/condonar`, payload, { headers: this.getHeaders() });
  }


  getPoliticasConfig(): Observable<PoliticaMulta[]> {
    return this.http.get<PoliticaMulta[]>(`${this.apiUrl}/politicas-multas`, { headers: this.getHeaders() });
  }

  getPoliticaVigente(): Observable<PoliticaMulta> {
    return this.http.get<PoliticaMulta>(`${this.apiUrl}/politicas-multas/vigentes`, { headers: this.getHeaders() });
  }

  getPoliticaByUuid(uuid: string): Observable<PoliticaMulta> {
    return this.http.get<PoliticaMulta>(`${this.apiUrl}/politicas-multas/${uuid}`, { headers: this.getHeaders() });
  }


  createPolitica(politica: PoliticaMulta): Observable<PoliticaMulta> {
    return this.http.post<PoliticaMulta>(`${this.apiUrl}/politicas-multas`, politica, { headers: this.getHeaders() });
  }

  updatePolitica(uuid: string, politica: PoliticaMulta): Observable<PoliticaMulta> {
    return this.http.put<PoliticaMulta>(`${this.apiUrl}/politicas-multas/${uuid}`, politica, { headers: this.getHeaders() });
  }

  deletePolitica(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/politicas-multas/${uuid}`, { headers: this.getHeaders() });
  }

  getMotivosMultas(): Observable<MotivoMulta[]> {
    return this.http.get<MotivoMulta[]>(`${this.apiUrl}/motivos-multas`, { headers: this.getHeaders() });
  }

  getEstadosMultas(): Observable<EstadoMulta[]> {
    return this.http.get<EstadoMulta[]>(`${this.apiUrl}/estados-multas`, { headers: this.getHeaders() });
  }
}
