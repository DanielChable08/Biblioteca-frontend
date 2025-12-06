// src/app/models/usuario.ts (o biblioteca.ts)
import { TipoPersona } from './biblioteca'; // Reutiliza si es aplicable

export interface Usuario {
  id: number;
  uuid: string;
  email: string;
  idPersona: number;
  roles?: number[];
}

// ✅ Usuario completo (con datos de persona)
export interface UsuarioCompleto extends Usuario {
  nombre: string;
  apPaterno: string;
  apMaterno?: string;
  telefono: string;
  idTipoPersona: number;
}

// ✅ Payload para crear usuario
export interface UsuarioPayload {
  email: string;
  password: string;
  nombre: string;
  apPaterno: string;
  apMaterno?: string;
  telefono: string;
  idTipoPersona: number;
}

// ✅ Payload para actualizar usuario
export interface UsuarioUpdatePayload {
  email?: string;
  password?: string;
  nombre?: string;
  apPaterno?: string;
  apMaterno?: string;
  telefono?: string;
  idTipoPersona?: number;
}