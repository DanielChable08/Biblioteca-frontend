import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Procedencia } from '../models/biblioteca';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '../models/page';

@Injectable({
    providedIn: 'root'
})
export class ProcedenciaService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiURL + '/procedencias';

    listarProcedencias(page: number = 0, size: number = 15, sortField: string = 'nombre', sortOrder: string = 'asc', search = ''): Observable<Page<Procedencia>> {
        let params = new HttpParams()
            .set('page', page)
            .set('size', size)
            .set('sort', `${sortField},${sortOrder}`);

        if (search) params = params.set('search', search);

        return this.http.get<Page<Procedencia>>(`${this.apiUrl}`, { params });
    }

    listarProcedenciasDesactivadas(page: number = 0, size: number = 15, sortField: string = 'nombre', sortOrder: string = 'asc', search = ''): Observable<Page<Procedencia>> {
        let params = new HttpParams()
            .set('page', page)
            .set('size', size)
            .set('sort', `${sortField},${sortOrder}`);

        if (search) params = params.set('search', search);

        return this.http.get<Page<Procedencia>>(`${this.apiUrl}/desactivados`, { params });
    }

    listarOptionProcedencias(): Observable<Procedencia[]> {
        return this.http.get<Procedencia[]>(`${this.apiUrl}/options`);
    }

    buscarProcedenciaPorUuid(uuid: string): Observable<Procedencia> {
        return this.http.get<Procedencia>(`${this.apiUrl}/${uuid}`);
    }

    crearProcedencia(procedencia: Partial<Procedencia>): Observable<Procedencia> {
        return this.http.post<Procedencia>(this.apiUrl, procedencia);
    }

    actualizarProcedencia(uuid: string, procedencia: Partial<Procedencia>): Observable<Procedencia> {
        return this.http.put<Procedencia>(`${this.apiUrl}/${uuid}`, procedencia);
    }

    desactivarProcedencia(uuid: string): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/${uuid}/desactivar`, {});
    }

    reactivarProcedencia(uuid: string): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/${uuid}/reactivar`, {});
    }
}