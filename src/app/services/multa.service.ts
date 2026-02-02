import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Multa, 
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
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // --- MÉTODOS DE MULTAS ---
  getMultas(): Observable<Multa[]> {
    return this.http.get<Multa[]>(`${this.apiUrl}/multas`, { headers: this.getHeaders() });
  }

  getMultaById(id: number): Observable<Multa> {
    return this.http.get<Multa>(`${this.apiUrl}/multas/${id}`, { headers: this.getHeaders() });
  }

  condonarMulta(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/multas/${id}/condonar`, {}, { headers: this.getHeaders() });
  }

  // --- MÉTODOS DE POLÍTICAS (Corregidos) ---

  getPoliticasConfig(): Observable<PoliticaMulta[]> {
    // Se agregó la ruta completa y las headers para evitar el 401
    return this.http.get<PoliticaMulta[]>(`${this.apiUrl}/politicas-multas`, { headers: this.getHeaders() });
  }

  getPoliticaVigente(): Observable<PoliticaMulta> {
    // Endpoint: /politicas-multas/vigentes (ajustado a tu lista inicial)
    return this.http.get<PoliticaMulta>(`${this.apiUrl}/politicas-multas/vigentes`, { headers: this.getHeaders() });
  }

  getPoliticaByUuid(uuid: string): Observable<PoliticaMulta> {
    return this.http.get<PoliticaMulta>(`${this.apiUrl}/politicas-multas/${uuid}`, { headers: this.getHeaders() });
  }


  // POST (Crear)
  createPolitica(politica: PoliticaMulta): Observable<PoliticaMulta> {
    return this.http.post<PoliticaMulta>(`${this.apiUrl}/politicas-multas`, politica, { headers: this.getHeaders() });
  }

  // PUT (Editar) - Asumiendo que tu backend recibe el UUID en la URL
  updatePolitica(uuid: string, politica: PoliticaMulta): Observable<PoliticaMulta> {
    return this.http.put<PoliticaMulta>(`${this.apiUrl}/politicas-multas/${uuid}`, politica, { headers: this.getHeaders() });
  }

  // DELETE (Eliminar)
  deletePolitica(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/politicas-multas/${uuid}`, { headers: this.getHeaders() });
  }

  // --- CATÁLOGOS ---
  getMotivosMultas(): Observable<MotivoMulta[]> {
    return this.http.get<MotivoMulta[]>(`${this.apiUrl}/motivos-multas`, { headers: this.getHeaders() });
  }

  getEstadosMultas(): Observable<EstadoMulta[]> {
    return this.http.get<EstadoMulta[]>(`${this.apiUrl}/estados-multas`, { headers: this.getHeaders() });
  }
}