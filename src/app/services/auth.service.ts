import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private router: Router) { }

  login(email: string, password: string): boolean {
    if (email === 'bibliotecario@email.com' && password === 'password') {
      localStorage.setItem('user', JSON.stringify({ email: email, role: 'bibliotecario' }));
      return true;
    }
    return false;
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return localStorage.getItem('user') !== null;
  }

  isBibliotecario(): boolean {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return this.isAuthenticated() && user.role === 'bibliotecario';
  }
}