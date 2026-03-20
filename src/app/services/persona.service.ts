import { environment } from '../../environments/enviroment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Persona } from '../models/biblioteca';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PersonaService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL + '/personas';

  getPersonas(): Observable<Persona[]> {
    return this.http.get<Persona[]>(this.apiUrl);
  }

  getPersonaByUuid(uuid: string): Observable<Persona> {
    return this.http.get<Persona>(`${this.apiUrl}/${uuid}`);
  }

  createPersona(persona: Partial<Persona>): Observable<Persona> {
    return this.http.post<Persona>(this.apiUrl, persona);
  }

  updatePersona(uuid: string, persona: Partial<Persona>): Observable<Persona> {
    return this.http.put<Persona>(`${this.apiUrl}/${uuid}`, persona);
  }

  deletePersona(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${uuid}`);
  }

  getPersonaById(id: number): Observable<Persona> {
    return this.http.get<Persona>(`${this.apiUrl}/id/${id}`);
  }
}
