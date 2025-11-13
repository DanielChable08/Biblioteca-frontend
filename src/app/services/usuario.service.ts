// src/app/services/usuario.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, UsuarioPayload} from '../models/usuario';
import { Persona } from '../models/biblioteca';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:8080/sdt/v1/usuarios'; 

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }


  getUsuarioByUuid(uuid: string): Observable<Usuario> { 
    return this.http.get<Usuario>(`${this.apiUrl}/${uuid}`);
  }

  createUsuario(usuarioData: UsuarioPayload): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, usuarioData);
  }

  updateUsuario(uuid: string, usuarioData: Partial<UsuarioPayload>): Observable<Usuario> {
    const payload = { ...usuarioData };
    if (!payload.password) {
      delete payload.password;
    }
    return this.http.put<Usuario>(`${this.apiUrl}/${uuid}`, payload);
  }

  deleteUsuario(uuid: string): Observable<void> { 
    return this.http.delete<void>(`${this.apiUrl}/${uuid}`);
  }

   getPersonas(): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${this.apiUrl}/personas`);
  }

  getPersonaByUuid(uuid: string): Observable<Persona> {
    return this.http.get<Persona>(`${this.apiUrl}/personas/${uuid}`);
  }

  getBibliotecarios(): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${this.apiUrl}/personas?idTipoPersona=1`);
  }

  getLectores(): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${this.apiUrl}/personas?idTipoPersona=2`);
  }
}