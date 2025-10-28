// src/app/services/usuario.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
// Define an interface for the user payload and response if needed
// import { Usuario, UsuarioPayload } from '../models/usuario'; // Create this model file if needed

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  // Adjust the API URL according to your backend endpoint for users
  private apiUrl = 'http://localhost:8080/sdt/v1/usuarios'; // Or maybe '/auth/register'? Check your backend.

  createUsuario(usuarioData: any): Observable<any> { // Replace 'any' with your Usuario interface
    // You might need to adjust the endpoint, e.g., /auth/register or /usuarios
    return this.http.post<any>(this.apiUrl, usuarioData);
  }

  // Add other methods like getUsuarios, updateUsuario, deleteUsuario as needed
}