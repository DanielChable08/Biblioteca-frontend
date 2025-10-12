import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ejemplar } from '../models/biblioteca'; 


@Injectable({
  providedIn: 'root'
})
export class EjemplarService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/sdt/v1/ejemplares';

  getEjemplares(): Observable<Ejemplar[]> {
    return this.http.get<Ejemplar[]>(this.apiUrl);
  }
  
  createEjemplar(ejemplarData: any): Observable<Ejemplar> {
    return this.http.post<Ejemplar>(this.apiUrl, ejemplarData);
  }
}