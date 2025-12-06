// src/app/services/usuario.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { UsuarioCompleto, UsuarioPayload, UsuarioUpdatePayload } from '../models/usuario';
import { Persona } from '../models/biblioteca';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = 'http://localhost:8080/sdt/v1';

  constructor(private http: HttpClient) {}

  // ✅ OBTENER TODOS LOS USUARIOS
  getUsuarios(): Observable<UsuarioCompleto[]> {
    return forkJoin({
      usuarios: this.http.get<any[]>(`${this.apiUrl}/usuarios`),
      personas: this.http.get<Persona[]>(`${this.apiUrl}/personas`)
    }).pipe(
      map(({ usuarios, personas }) => {
        console.log('📥 Usuarios del backend:', usuarios);
        console.log('📥 Personas del backend:', personas);

        return usuarios.map((usuario: any) => {
          // Buscar persona asociada por email o idPersona
          const persona = personas.find((p: any) => 
            (p.email && usuario.email && p.email.toLowerCase() === usuario.email.toLowerCase()) ||
            (usuario.idPersona && p.id === usuario.idPersona)
          );

          return {
            id: usuario.id,
            uuid: usuario.uuid || `user-${usuario.id}`,
            email: usuario.email,
            idPersona: persona?.id || usuario.idPersona || 0,
            nombre: persona?.nombre || 'N/A',
            apPaterno: persona?.apPaterno || 'N/A',
            apMaterno: persona?.apMaterno || '',
            telefono: persona?.telefono || 'N/A',
            idTipoPersona: persona?.idTipoPersona || 0,
            rolNombre: usuario.role || 'Sin rol',
            active: usuario.active,
            creationDate: usuario.creationDate,
            lastAccess: usuario.lastAccess
          };
        });
      }),
      catchError((error) => {
        console.error('❌ Error al cargar usuarios:', error);
        throw error;
      })
    );
  }

  // ✅ OBTENER USUARIO POR ID
  getUsuarioById(id: number): Observable<UsuarioCompleto> {
    return forkJoin({
      usuario: this.http.get<any>(`${this.apiUrl}/usuarios/${id}`),
      personas: this.http.get<Persona[]>(`${this.apiUrl}/personas`)
    }).pipe(
      map(({ usuario, personas }) => {
        console.log('📥 Usuario obtenido:', usuario);
        console.log('📥 Personas disponibles:', personas);

        // Buscar persona asociada
        const persona = personas.find((p: any) => 
          (p.email && usuario.email && p.email.toLowerCase() === usuario.email.toLowerCase()) ||
          (usuario.idPersona && p.id === usuario.idPersona)
        );

        return {
          id: usuario.id,
          uuid: usuario.uuid || `user-${usuario.id}`,
          email: usuario.email,
          idPersona: persona?.id || usuario.idPersona || 0,
          nombre: persona?.nombre || usuario.nombre || 'N/A',
          apPaterno: persona?.apPaterno || usuario.apPaterno || 'N/A',
          apMaterno: persona?.apMaterno || usuario.apMaterno || '',
          telefono: persona?.telefono || usuario.telefono || 'N/A',
          idTipoPersona: persona?.idTipoPersona || usuario.idTipoPersona || 0,
          rolNombre: usuario.role || 'Sin rol',
          active: usuario.active,
          creationDate: usuario.creationDate,
          lastAccess: usuario.lastAccess
        };
      }),
      catchError((error) => {
        console.error('❌ Error al obtener usuario:', error);
        throw error;
      })
    );
  }

  // ✅ CREAR USUARIO
  createUsuario(usuarioData: UsuarioPayload): Observable<UsuarioCompleto> {
    // 1. Crear persona
    const personaPayload = {
      nombre: usuarioData.nombre,
      apPaterno: usuarioData.apPaterno,
      apMaterno: usuarioData.apMaterno || ' ', // ✅ Espacio para evitar validación @NotBlank
      telefono: usuarioData.telefono,
      idTipoPersona: usuarioData.idTipoPersona
    };

    console.log('📤 1. Creando persona:', personaPayload);

    return this.http.post<Persona>(`${this.apiUrl}/personas`, personaPayload).pipe(
      switchMap((persona: Persona) => {
        console.log('✅ Persona creada:', persona);

        // 2. Crear usuario con la persona creada
        const usuarioPayload = {
          email: usuarioData.email,
          password: usuarioData.password,
          idPersona: persona.id,
          rolesIds: [usuarioData.idTipoPersona] // ✅ Array de IDs de roles
        };

        console.log('📤 2. Creando usuario:', usuarioPayload);

        return this.http.post<any>(`${this.apiUrl}/usuarios`, usuarioPayload).pipe(
          map((usuario: any) => {
            console.log('✅ Usuario creado:', usuario);
            
            return {
              id: usuario.id,
              uuid: usuario.uuid || `user-${usuario.id}`,
              email: usuario.email,
              idPersona: persona.id,
              nombre: persona.nombre,
              apPaterno: persona.apPaterno,
              apMaterno: persona.apMaterno,
              telefono: persona.telefono,
              idTipoPersona: persona.idTipoPersona,
              rolNombre: usuario.role || 'Sin rol',
              active: usuario.active,
              creationDate: usuario.creationDate,
              lastAccess: usuario.lastAccess
            };
          })
        );
      }),
      catchError((error) => {
        console.error('❌ Error al crear usuario:', error);
        console.error('❌ Detalles del error:', error.error);
        throw error;
      })
    );
  }

  // ✅ ACTUALIZAR USUARIO
  updateUsuario(id: number, usuarioData: UsuarioUpdatePayload): Observable<UsuarioCompleto> {
    return this.http.get<any>(`${this.apiUrl}/usuarios/${id}`).pipe(
      switchMap((usuario: any) => {
        console.log('📥 Usuario a actualizar:', usuario);
        
        // Verificar si hay cambios en persona
        if (usuarioData.nombre || usuarioData.apPaterno || usuarioData.telefono || usuarioData.idTipoPersona) {
          return this.http.get<Persona[]>(`${this.apiUrl}/personas`).pipe(
            switchMap((personas: Persona[]) => {
              const persona = personas.find((p: any) => p.id === usuario.idPersona);
              const updates: Observable<any>[] = [];
              
              if (persona) {
                const personaPayload: any = {};
                if (usuarioData.nombre) personaPayload.nombre = usuarioData.nombre;
                if (usuarioData.apPaterno) personaPayload.apPaterno = usuarioData.apPaterno;
                if (usuarioData.apMaterno !== undefined) {
                  personaPayload.apMaterno = usuarioData.apMaterno || ' '; // ✅ Espacio si está vacío
                }
                if (usuarioData.telefono) personaPayload.telefono = usuarioData.telefono;
                if (usuarioData.idTipoPersona) personaPayload.idTipoPersona = usuarioData.idTipoPersona;

                if (Object.keys(personaPayload).length > 0) {
                  console.log('📤 Actualizando persona:', personaPayload);
                  updates.push(
                    this.http.put<Persona>(`${this.apiUrl}/personas/${persona.uuid}`, personaPayload)
                  );
                }
              }

              // Actualizar usuario (email y/o password)
              const usuarioPayload: any = {};
              if (usuarioData.email) usuarioPayload.email = usuarioData.email;
              if (usuarioData.password) usuarioPayload.password = usuarioData.password;

              if (Object.keys(usuarioPayload).length > 0) {
                console.log('📤 Actualizando usuario:', usuarioPayload);
                updates.push(
                  this.http.put<any>(`${this.apiUrl}/usuarios/${id}`, usuarioPayload)
                );
              }

              if (updates.length > 0) {
                return forkJoin(updates).pipe(
                  switchMap(() => {
                    console.log('✅ Actualizaciones completadas');
                    return this.getUsuarioById(id);
                  })
                );
              }

              return this.getUsuarioById(id);
            })
          );
        }

        // Solo actualizar usuario (email y/o password)
        const usuarioPayload: any = {};
        if (usuarioData.email) usuarioPayload.email = usuarioData.email;
        if (usuarioData.password) usuarioPayload.password = usuarioData.password;

        if (Object.keys(usuarioPayload).length === 0) {
          return this.getUsuarioById(id);
        }

        console.log('📤 Actualizando solo usuario:', usuarioPayload);
        return this.http.put<any>(`${this.apiUrl}/usuarios/${id}`, usuarioPayload).pipe(
          switchMap(() => this.getUsuarioById(id))
        );
      }),
      catchError((error) => {
        console.error('❌ Error al actualizar usuario:', error);
        throw error;
      })
    );
  }

  // ✅ ELIMINAR USUARIO
  deleteUsuario(id: number): Observable<void> {
    console.log('🗑️ Eliminando usuario:', id);
    return this.http.delete<void>(`${this.apiUrl}/usuarios/${id}`).pipe(
      catchError((error) => {
        console.error('❌ Error al eliminar usuario:', error);
        throw error;
      })
    );
  }

  // ✅ OBTENER TODAS LAS PERSONAS (helper)
  getPersonas(): Observable<Persona[]> {
    return this.http.get<Persona[]>(`${this.apiUrl}/personas`).pipe(
      catchError((error) => {
        console.error('❌ Error al obtener personas:', error);
        return of([]);
      })
    );
  }
}
