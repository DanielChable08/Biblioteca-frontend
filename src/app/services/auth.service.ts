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
          localStorage.setItem('authToken', response.token);
        }
      })
    );
  }


  getUserRole(): string {
    const token = this.getToken();
    if (!token) {
      return 'USER';
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      const userRoles: string[] = payload.roles || payload.authorities || [];


      const isAdmin = userRoles.some(role => role === 'Administrador');

      return isAdmin ? 'ADMIN' : 'USER';

    } catch (e) {
      console.error('Error decodificando el token:', e);
      return 'USER';
    }
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  logout(): void {
    localStorage.removeItem('authToken');
    this.router.navigate(['/login']);
  }
}