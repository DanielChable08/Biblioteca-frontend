import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      
      
      const esMetodoDeEscritura = req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE';
      const esErrorDeAutores = req.url.includes('/autores');
      const esErrorDeRoles = req.url.includes('/roles');


      if (error.status === 401 && !esMetodoDeEscritura && !esErrorDeAutores && !esErrorDeRoles) {
        authService.logout();
        router.navigate(['/login'], { queryParams: { expired: 'true' } });
      }

      return throwError(() => error);
    })
  );
};