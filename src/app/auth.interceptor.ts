// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  console.log('🔄 Interceptor ejecutándose para:', req.url);
  
  const authService = inject(AuthService);
  const authToken = authService.getToken();

  if (authToken) {
    console.log('✅ Token encontrado:', authToken.substring(0, 20) + '...');
    
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
    
    return next(authReq);
  }

  console.warn('⚠️ NO HAY TOKEN - Request sin autorización');
  return next(req);
};
