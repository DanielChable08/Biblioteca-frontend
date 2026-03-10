import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpBackend } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, map, of, catchError } from 'rxjs';

@Pipe({
  name: 'secureImage',
  standalone: true 
})
export class SecureImagePipe implements PipeTransform {
  private httpBackend = inject(HttpBackend);
  private sanitizer = inject(DomSanitizer);
  private http: HttpClient;

  constructor() {

    this.http = new HttpClient(this.httpBackend);
  }

  transform(url: string | undefined): Observable<SafeUrl | string> {
    if (!url || !url.startsWith('http')) {
        return of('assets/img/placeholder.png');
    }

    const token = sessionStorage.getItem('token');

    let headers = new HttpHeaders();
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get(url, { headers, responseType: 'blob' }).pipe(
      map(blob => {
        return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      }),
      catchError(err => {
        console.warn('Fallo carga imagen segura (pero la sesión está a salvo)');
        return of('assets/img/placeholder.png'); 
      })
    );
  }
}