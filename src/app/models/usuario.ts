// src/app/models/usuario.ts (o biblioteca.ts)
import { TipoPersona } from './biblioteca'; // Reutiliza si es aplicable

export interface Usuario {
  id: number; // o string si usas UUID
  nombre: string;
  apPaterno: string;
  apMaterno?: string;
  telefono: string;
  email: string; // Asumiendo que el email es el username
  uuid: string; // Si tu backend usa UUIDs
  idTipoPersona: number; // o roleId, etc.
  tipoPersona?: TipoPersona; // Para mostrar el nombre del rol
  // Añade otros campos que devuelva tu API (fechaCreacion, activo, etc.)
}

// Interfaz opcional para el payload de creación/actualización si difiere
export interface UsuarioPayload {
  nombre: string;
  apPaterno: string;
  apMaterno?: string;
  telefono: string;
  email: string;
  password?: string; // Incluye password solo al crear o cambiar
  idTipoPersona: number;
}