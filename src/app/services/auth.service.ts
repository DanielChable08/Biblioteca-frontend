import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:8080/sdt/v1/auth';
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(!!sessionStorage.getItem('token'));
  
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (!response || !response.token) {
          throw new Error('Respuesta inválida del servidor');
        }
        
        sessionStorage.setItem('token', response.token);
        
        let nombre = response.nombre || null;
        let apPaterno = response.apPaterno || null;
        let apMaterno = response.apMaterno || null;
        let idPersona = response.idPersona || null;
        
        if (response.persona) {
          nombre = response.persona.nombre || nombre;
          apPaterno = response.persona.apPaterno || apPaterno;
          apMaterno = response.persona.apMaterno || apMaterno;
          idPersona = response.persona.id || idPersona;
        }
        
        const userData = {
          id: response.id,
          idPersona: idPersona || response.id,
          nombre: nombre,
          apPaterno: apPaterno,
          apMaterno: apMaterno,
          email: response.email,
          roles: response.roles || []
        };

        sessionStorage.setItem('userData', JSON.stringify(userData));
        this.isAuthenticatedSubject.next(true);
      }),
      catchError((error) => throwError(() => error))
    );
  }

  private getUserData(): any {
    const userData = sessionStorage.getItem('userData');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  getUserRole(): string {
    const userData = this.getUserData();
    
    if (!userData || !userData.roles || userData.roles.length === 0) {
      return 'USER';
    }

    const isAdmin = userData.roles.some((role: any) => {
      const roleName = typeof role === 'string' ? role : role.name;
      return roleName === 'Administrador' || roleName === 'ADMIN';
    });
    
    if (isAdmin) return 'ADMIN';

    const isBibliotecario = userData.roles.some((role: any) => {
        const roleName = typeof role === 'string' ? role : role.name;
        return roleName === 'Bibliotecario';
    });

    if (isBibliotecario) return 'BIBLIOTECARIO';
    
    return 'USER';
  }


  isAdmin(): boolean {
      return this.getUserRole() === 'ADMIN';
  }

  canAccessAdminPanel(): boolean {
      const role = this.getUserRole();
      return role === 'ADMIN' || role === 'BIBLIOTECARIO';
  }

  getRoleName(): string {
    const userData = this.getUserData();
    if (!userData || !userData.roles || userData.roles.length === 0) {
      return 'Usuario';
    }
    const firstRole = userData.roles[0];
    return typeof firstRole === 'string' ? firstRole : firstRole.name || 'Usuario';
  }

  getFullName(): string {
    const userData = this.getUserData();
    if (!userData) return 'Usuario';

    const nombre = userData.nombre || '';
    const apPaterno = userData.apPaterno || '';
    const apMaterno = userData.apMaterno || '';
    
    if (nombre && apPaterno) {
      return `${nombre} ${apPaterno} ${apMaterno}`.trim();
    }
    
    if (userData.email) {
      return userData.email.split('@')[0];
    }
    return 'Usuario';
  }

  getUserInitials(): string {
    const userData = this.getUserData();
    if (!userData) return 'U';
    
    if (userData.nombre) {
      const nombreParts = userData.nombre.trim().split(/\s+/);
      if (nombreParts.length >= 2) {
        return (nombreParts[0][0] + nombreParts[1][0]).toUpperCase();
      } else if (nombreParts.length === 1 && userData.apPaterno) {
        return (nombreParts[0][0] + userData.apPaterno[0]).toUpperCase();
      } else if (nombreParts.length === 1) {
        return nombreParts[0][0].toUpperCase();
      }
    }
    if (userData.email) {
      return userData.email[0].toUpperCase();
    }
    return 'U';
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    if (!this.isAuthenticatedSubject.value) {
        const token = sessionStorage.getItem('token');
        if (token) {
            this.isAuthenticatedSubject.next(true);
            return true;
        }
    }
    return this.isAuthenticatedSubject.value;
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userData');
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }
}