// src/app/services/usuario.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, UsuarioPayload } from '../models/usuario'; // Asegúrate que la ruta sea correcta

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  // Ajusta la URL base según tu backend
  private apiUrl = 'http://localhost:8080/sdt/v1/usuarios'; // O '/auth', '/personas', etc.

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  getUsuarioByUuid(uuid: string): Observable<Usuario> { // O usa 'id' si es numérico
    return this.http.get<Usuario>(`${this.apiUrl}/${uuid}`);
  }

  createUsuario(usuarioData: UsuarioPayload): Observable<Usuario> {
    // Podría ser a /auth/register o a /usuarios dependiendo de tu backend
    return this.http.post<Usuario>(this.apiUrl, usuarioData);
  }

  updateUsuario(uuid: string, usuarioData: Partial<UsuarioPayload>): Observable<Usuario> { // O usa 'id'
    // No envíes la contraseña si no se está cambiando
    const payload = { ...usuarioData };
    if (!payload.password) {
      delete payload.password;
    }
    return this.http.put<Usuario>(`${this.apiUrl}/${uuid}`, payload);
  }

  deleteUsuario(uuid: string): Observable<void> { // O usa 'id'
    return this.http.delete<void>(`${this.apiUrl}/${uuid}`);
  }
}