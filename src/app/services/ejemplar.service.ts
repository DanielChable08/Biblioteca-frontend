import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Ejemplar, EjemplarImpresion } from '../models/biblioteca'; 
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class EjemplarService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL + '/ejemplares';

  getEjemplares(): Observable<Ejemplar[]> {
    return this.http.get<Ejemplar[]>(this.apiUrl);
  }
  
  createEjemplar(ejemplarData: any): Observable<Ejemplar> {
    return this.http.post<Ejemplar>(this.apiUrl, ejemplarData);
  }

  listarEjemplaresImpresion(): Observable<EjemplarImpresion[]> {
    return this.http.get<EjemplarImpresion[]>(`${this.apiUrl}/impresion`);
  }

  
}