import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const userRole = authService.getUserRole();

  if (state.url.startsWith('/admin')) {
    if (userRole === 'ADMIN' || userRole === 'BIBLIOTECARIO') {
        return true;
    }
    
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};