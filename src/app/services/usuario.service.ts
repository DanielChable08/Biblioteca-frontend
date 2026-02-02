import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { 
  Usuario, 
  Persona, 
  UsuarioCompleto, 
  CrearUsuarioRequest,
  ActualizarUsuarioRequest,
  TipoPersona
} from '../models/usuario';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/sdt/v1';


  getUsuarios(): Observable<UsuarioCompleto[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios`).pipe(
      map((usuarios: Usuario[]) => {
        console.log(' Usuarios del backend:', usuarios);

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
      tap(usuarios => console.log(' Usuarios procesados:', usuarios)),
      catchError((error: any) => {
        console.error(' Error al obtener usuarios:', error);
        return throwError(() => error);
      })
    );
  }


  getUsuarioByUuid(uuid: string): Observable<UsuarioCompleto> {
    return this.http.get<Usuario>(`${this.apiUrl}/usuarios/${uuid}`).pipe(
      map((usuario: Usuario) => {
        console.log(' Usuario obtenido:', usuario);

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
      tap(usuario => console.log('Usuario completo:', usuario)),
      catchError((error: any) => {
        console.error(' Error al obtener usuario:', error);
        return throwError(() => error);
      })
    );
  }


  createUsuario(request: CrearUsuarioRequest): Observable<UsuarioCompleto> {
    return this.http.post<Persona>(`${this.apiUrl}/personas`, request.persona).pipe(
      tap(persona => console.log(' Persona creada:', persona)),
      
      switchMap((persona: Persona) => {
        const usuarioPayload = {
          email: request.usuario.email,
          password: request.usuario.password,
          idPersona: persona.id,
          roles: request.usuario.roles.map((rolId: number) => ({ id: rolId }))
        };

        console.log(' Paso 2: Creando usuario:', usuarioPayload);

        return this.http.post<Usuario>(`${this.apiUrl}/usuarios`, usuarioPayload).pipe(
          map((usuario: Usuario) => {
            console.log('Usuario creado:', usuario);

            return {
              id: usuario.id,
              uuid: usuario.uuid || `user-${usuario.id}`,
              email: usuario.email,
              active: usuario.active,
              creationDate: usuario.creationDate,
              lastAccess: usuario.lastAccess,
              rolNombre: usuario.role,
              
              idPersona: persona.id,
              personaUuid: persona.uuid,
              nombre: persona.nombre,
              apPaterno: persona.apPaterno,
              apMaterno: persona.apMaterno || '',
              telefono: persona.telefono,
              idTipoPersona: persona.idTipoPersona
            } as UsuarioCompleto;
          })
        );
      }),
      tap(usuarioCompleto => console.log(' Usuario completo creado:', usuarioCompleto)),
      catchError((error: any) => {
        console.error(' Error al crear usuario:', error);
        return throwError(() => error);
      })
    );
  }

  updateUsuario(
    uuid: string, 
    request: ActualizarUsuarioRequest
  ): Observable<UsuarioCompleto> {
    console.log(' Actualizando usuario:', uuid);
    console.log(' Request recibido:', request);

 
    return this.getUsuarioByUuid(uuid).pipe(
      switchMap((usuarioActual: UsuarioCompleto) => {
        const usuarioPayload: any = {};
        

        if (request.usuario?.email) {
          usuarioPayload.email = request.usuario.email;
        }
        
   
        if (request.usuario?.password && request.usuario.password.trim() !== '') {
          usuarioPayload.password = request.usuario.password;
          console.log(' Se actualizará la contraseña');
        } else {
          console.log(' No se actualizará la contraseña (campo vacío o no proporcionado)');
        }


        if (request.usuario?.roles && request.usuario.roles.length > 0) {
          usuarioPayload.roles = request.usuario.roles.map((rolId: number) => ({ id: rolId }));
        }

        if (usuarioActual.idPersona) {
          usuarioPayload.idPersona = usuarioActual.idPersona;
        }

        if (request.persona) {
          usuarioPayload.persona = {
            nombre: request.persona.nombre,
            apPaterno: request.persona.apPaterno,
            apMaterno: request.persona.apMaterno || '',
            telefono: request.persona.telefono,
            idTipoPersona: request.persona.idTipoPersona
          };
          console.log(' Se actualizarán los datos de persona');
        } else {
          console.log(' No se actualizarán los datos de persona');
        }

        console.log('Payload final de actualización:', usuarioPayload);

 
        return this.http.put<Usuario>(`${this.apiUrl}/usuarios/${uuid}`, usuarioPayload);
      }),
      switchMap(() => this.getUsuarioByUuid(uuid)),
      tap(usuario => console.log(' Usuario actualizado correctamente:', usuario)),
      catchError((error: any) => {
        console.error(' Error al actualizar usuario:', error);
        return throwError(() => error);
      })
    );
  }


  toggleUsuarioStatus(uuid: string, active: boolean): Observable<void> {
    console.log(` ${active ? 'Activando' : 'Desactivando'} usuario:`, uuid);

    return this.http.patch<void>(`${this.apiUrl}/usuarios/${uuid}/status`, { active }).pipe(
      tap(() => console.log(` Usuario ${active ? 'activado' : 'desactivado'}`)),
      catchError((error: any) => {
        console.error(' Error al cambiar estado:', error);
        

        console.log(' Intentando con PUT en lugar de PATCH...');
        return this.http.put<void>(`${this.apiUrl}/usuarios/${uuid}`, { active }).pipe(
          tap(() => console.log(` Usuario ${active ? 'activado' : 'desactivado'} con PUT`)),
          catchError((error2: any) => {
            console.error(' Error al cambiar estado con PUT:', error2);
            return throwError(() => error2);
          })
        );
      })
    );
  }


  deleteUsuario(uuid: string): Observable<void> {
    console.log(' Eliminando usuario:', uuid);
    return this.http.delete<void>(`${this.apiUrl}/usuarios/${uuid}`).pipe(
      tap(() => console.log('Usuario eliminado')),
      catchError((error: any) => {
        console.error(' Error al eliminar usuario:', error);
        return throwError(() => error);
      })
    );
  }

  getPersonas(): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${this.apiUrl}/personas`);
  }

  getTiposPersona(): Observable<TipoPersona[]> {
    return this.http.get<TipoPersona[]>(`${this.apiUrl}/tipos-persona`);
  }

}
