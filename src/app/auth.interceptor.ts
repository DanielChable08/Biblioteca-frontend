import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Inyectamos el servicio de autenticación
  const authService = inject(AuthService);
  // Obtenemos el token que guardamos en el localStorage
  const authToken = authService.getToken();

  // Si existe un token, clonamos la petición y le añadimos el encabezado
  if (authToken) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
    // Enviamos la petición clonada con el token
    return next(authReq);
  }

  // Si no hay token (como en la pantalla de login), dejamos pasar la petición original
  return next(req);
};