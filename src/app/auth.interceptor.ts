import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // 1. Ignorar login para evitar bucles
  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  // 2. Clonar petición y agregar Token
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
      
      // --- LÓGICA DE PROTECCIÓN DE SESIÓN ---
      
      const esMetodoDeEscritura = req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE';
      const esErrorDeAutores = req.url.includes('/autores');

      // Solo cerramos sesión si es 401 Y es una petición de lectura (GET) normal.
      // Si es un POST/PUT (guardar libro) y da 401, suele ser el bug de Spring Boot 
      // redirigiendo a /error por un fallo SQL (Duplicado), así que NO cerramos sesión.
      if (error.status === 401 && !esMetodoDeEscritura && !esErrorDeAutores) {
        authService.logout();
        router.navigate(['/login'], { queryParams: { expired: 'true' } });
      }

      // Dejamos pasar el error para que el componente muestre la alerta roja
      return throwError(() => error);
    })
  );
};