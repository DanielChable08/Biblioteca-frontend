import { environment } from '../../environments/enviroment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Ejemplar } from '../models/biblioteca'; 
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

  
}