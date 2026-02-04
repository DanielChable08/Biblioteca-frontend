import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpBackend } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, map, of, catchError } from 'rxjs';

@Pipe({
  name: 'secureImage',
  standalone: true 
})
export class SecureImagePipe implements PipeTransform {
  // 1. Inyectamos HttpBackend para saltarnos los interceptores
  private httpBackend = inject(HttpBackend);
  private sanitizer = inject(DomSanitizer);
  private http: HttpClient;

  constructor() {
    // Creamos un cliente HTTP nuevo que NO tiene interceptores
    // Esto evita que un error 401 en la imagen te cierre la sesión.
    this.http = new HttpClient(this.httpBackend);
  }

  transform(url: string | undefined): Observable<SafeUrl | string> {
    if (!url || !url.startsWith('http')) {
        return of('assets/img/placeholder.png');
    }

    // 2. Buscamos el token en sessionStorage (donde lo tienes tú)
    const token = sessionStorage.getItem('token');

    let headers = new HttpHeaders();
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // 3. Hacemos la petición
    return this.http.get(url, { headers, responseType: 'blob' }).pipe(
      map(blob => {
        return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      }),
      catchError(err => {
        console.warn('Fallo carga imagen segura (pero la sesión está a salvo)');
        // Devolvemos el placeholder si falla
        return of('assets/img/placeholder.png'); 
      })
    );
  }
}