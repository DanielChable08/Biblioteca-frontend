import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, map, of, catchError } from 'rxjs';

@Pipe({
  name: 'secureImage',
  standalone: true 
})
export class SecureImagePipe implements PipeTransform {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  transform(url: string | undefined): Observable<SafeUrl | string> {
    if (!url || !url.startsWith('http')) {
        return of(url || 'assets/img/placeholder.png');
    }

    // Hacemos la petición GET con responseType: 'blob'
    // El Interceptor de tu Auth (si lo tienes configurado) agregará el Token aquí
    return this.http.get(url, { responseType: 'blob' }).pipe(
      map(blob => {
        // Creamos una URL temporal local segura para el navegador
        return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      }),
      catchError(err => {
        console.error('Error cargando imagen protegida:', err);
        return of('assets/img/placeholder.png'); // Fallback si falla
      })
    );
  }
}