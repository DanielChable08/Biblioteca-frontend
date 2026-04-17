import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { 
  Usuario, 
  Persona, 
  UsuarioCompleto, 
  ActualizarUsuarioRequest,
  TipoPersona
} from '../models/usuario';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiURL;

  getUsuarios(): Observable<UsuarioCompleto[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios`).pipe(
      map((usuarios: Usuario[]) => {
        return usuarios.map(usuario => {
          const persona: Persona | null = usuario.persona;
          return {
            id: usuario.id,
            uuid: usuario.uuid || `user-${usuario.id}`,
            email: usuario.email,
            active: usuario.active,
            creationDate: usuario.creationDate,
            lastAccess: usuario.lastAccess,
            rolNombre: usuario.role,
            idPersona: persona?.id || null,
            personaUuid: persona?.uuid || '',
            nombre: persona?.nombre || 'Sin asignar',
            apPaterno: persona?.apPaterno || '',
            apMaterno: persona?.apMaterno || '',
            telefono: persona?.telefono || 'N/A',
            idTipoPersona: persona?.idTipoPersona || 0
          } as UsuarioCompleto;
        });
      }),
      catchError((error: any) => throwError(() => error))
    );
  }

  getUsuarioByUuid(uuid: string): Observable<UsuarioCompleto> {
    return this.http.get<Usuario>(`${this.apiUrl}/usuarios/${uuid}`).pipe(
      map((usuario: Usuario) => {
        const persona: Persona | null = usuario.persona;
        return {
          id: usuario.id,
          uuid: usuario.uuid || `user-${usuario.id}`,
          email: usuario.email,
          active: usuario.active,
          creationDate: usuario.creationDate,
          lastAccess: usuario.lastAccess,
          rolNombre: usuario.role,
          idPersona: persona?.id || null,
          personaUuid: persona?.uuid || '',
          nombre: persona?.nombre || '',
          apPaterno: persona?.apPaterno || '',
          apMaterno: persona?.apMaterno || '',
          telefono: persona?.telefono || '',
          idTipoPersona: persona?.idTipoPersona || 0
        } as UsuarioCompleto;
      }),
      catchError((error: any) => throwError(() => error))
    );
  }

  createUsuario(request: any): Observable<UsuarioCompleto> {
    if (request.persona) {
      return this.http.post<Persona>(`${this.apiUrl}/personas`, request.persona).pipe(
        switchMap((persona: Persona) => {
          const usuarioPayload = {
            email: request.usuario.email,
            password: request.usuario.password,
            idPersona: persona.id,
            roles: request.usuario.roles.map((rolId: number) => ({ id: rolId }))
          };
          return this.crearRegistroUsuario(usuarioPayload, persona);
        }),
        catchError((error: any) => throwError(() => error))
      );
    } 
    else {
      const usuarioPayload = {
        email: request.email,
        password: request.password,
        idPersona: request.idPersona, 
        roles: request.roles.map((rolId: number) => ({ id: rolId }))
      };
      return this.crearRegistroUsuario(usuarioPayload, null);
    }
  }

  private crearRegistroUsuario(usuarioPayload: any, personaRef: Persona | null): Observable<UsuarioCompleto> {
    return this.http.post<Usuario>(`${this.apiUrl}/usuarios`, usuarioPayload).pipe(
      map((usuario: Usuario) => {
        const persona = personaRef || usuario.persona || {} as Persona;
        return {
          id: usuario.id,
          uuid: usuario.uuid,
          email: usuario.email,
          active: usuario.active,
          creationDate: usuario.creationDate,
          lastAccess: usuario.lastAccess,
          rolNombre: usuario.role,
          idPersona: persona.id,
          personaUuid: persona.uuid,
          nombre: persona.nombre || 'Usuario Creado',
          apPaterno: persona.apPaterno || '',
          apMaterno: persona.apMaterno || '',
          telefono: persona.telefono || '',
          idTipoPersona: persona.idTipoPersona || 0
        } as UsuarioCompleto;
      })
    );
  }

  updateUsuario(uuid: string, request: ActualizarUsuarioRequest): Observable<UsuarioCompleto> {
    const usuarioPayload: any = {
      email: request.usuario?.email
    };
    
    if (request.usuario?.password && request.usuario.password.trim() !== '') {
      usuarioPayload.password = request.usuario.password;
    }

    if (request.usuario?.roles && request.usuario.roles.length > 0) {
      usuarioPayload.roles = request.usuario.roles.map((rolId: number) => ({ id: rolId }));
    }

    if (request.persona) {
      usuarioPayload.persona = request.persona;
    }

    return this.http.put<UsuarioCompleto>(`${this.apiUrl}/usuarios/${uuid}`, usuarioPayload).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  
  toggleUsuarioStatus(uuid: string, active: boolean): Observable<void> {
    const url = active 
      ? `${this.apiUrl}/usuarios/${uuid}/reactivar` 
      : `${this.apiUrl}/usuarios/${uuid}/eliminar`;

    return this.http.put<void>(url, {}).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  deleteUsuario(uuid: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/usuarios/${uuid}/eliminar`, {}).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }

  getPersonas(): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${this.apiUrl}/personas`);
  }

  getTiposPersona(): Observable<TipoPersona[]> {
    return this.http.get<TipoPersona[]>(`${this.apiUrl}/tipos-persona`);
  }

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/roles`).pipe(
      catchError((error: any) => throwError(() => error))
    );
  }
}