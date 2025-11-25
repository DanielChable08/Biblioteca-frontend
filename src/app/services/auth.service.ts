// src/app/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:8080/sdt/v1/auth';

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          // Guardar el token
          localStorage.setItem('authToken', response.token);
          
          // Guardar los datos del usuario
          const userData = {
            id: response.id,
            nombre: response.nombre,
            apPaterno: response.apPaterno,
            apMaterno: response.apMaterno,
            email: response.email,
            roles: response.roles
          };
          localStorage.setItem('userData', JSON.stringify(userData));
        }
      })
    );
  }

  // Obtener los datos del usuario desde localStorage
  private getUserData(): any {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('Error al parsear userData:', e);
        return null;
      }
    }
    return null;
  }

  getUserRole(): string {
    const userData = this.getUserData();
    if (!userData || !userData.roles) {
      return 'USER';
    }

    // roles es un array de objetos: [{ id: 1, name: "Administrador", ... }]
    const isAdmin = userData.roles.some((role: any) => 
      role.name === 'Administrador' || role.name === 'Bibliotecario'
    );
    
    return isAdmin ? 'ADMIN' : 'USER';
  }

  getRoleName(): string {
    const userData = this.getUserData();
    if (!userData || !userData.roles || userData.roles.length === 0) {
      return 'Usuario';
    }

    // Retornar el nombre del primer rol
    return userData.roles[0].name || 'Usuario';
  }

  getFullName(): string {
    const userData = this.getUserData();
    if (!userData) {
      return 'Usuario';
    }

    const nombre = userData.nombre || '';
    const apPaterno = userData.apPaterno || '';
    const apMaterno = userData.apMaterno || '';
    
    if (nombre && apPaterno) {
      return `${nombre} ${apPaterno} ${apMaterno}`.trim();
    }
    
    return userData.email || 'Usuario';
  }

  getUserInitials(): string {
    const userData = this.getUserData();
    if (!userData || !userData.nombre) {
      return 'U';
    }

    const nombre = userData.nombre;
    
    // Si el nombre tiene varios nombres (ej: "José Eduardo")
    const nombreParts = nombre.trim().split(/\s+/);
    if (nombreParts.length >= 2) {
      // "José Eduardo" -> "JE"
      return (nombreParts[0][0] + nombreParts[1][0]).toUpperCase();
    } else if (nombreParts.length === 1) {
      // Si solo hay un nombre, combinar con apellido
      const apPaterno = userData.apPaterno || '';
      if (apPaterno) {
        return (nombreParts[0][0] + apPaterno[0]).toUpperCase();
      }
      return nombreParts[0][0].toUpperCase();
    }
    
    return 'U';
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}
