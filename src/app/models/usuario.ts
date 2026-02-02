

export interface Rol {
  id: number;
  name: string;
  description?: string;
}

export interface TipoPersona {
  id: number;
  nombre: string;
}

export interface Persona {
  id: number;
  uuid: string;
  nombre: string;
  apPaterno: string;
  apMaterno?: string;
  telefono: string;
  idTipoPersona: number;
}

export interface Usuario {
  id: number;
  uuid: string;
  email: string;
  active: boolean;
  creationDate: string;
  lastAccess: string;
  role: string; 
  persona: Persona | null;
}


export interface UsuarioCompleto {
  id: number;
  uuid: string;
  email: string;
  active: boolean;
  creationDate: string;
  lastAccess: string;
  rolNombre: string;

  idPersona: number | null;   // <- agrégalo si no está
  personaUuid: string;

  nombre: string;
  apPaterno: string;
  apMaterno: string;
  telefono: string;
  idTipoPersona: number;

  roles: number[];            // <- requerido por el error
}



export interface CrearUsuarioRequest {
  persona: {
    nombre: string;
    apPaterno: string;
    apMaterno: string;
    telefono: string;
    idTipoPersona: number;
  };
  usuario: {
    email: string;
    password: string;
    roles: number[]; 
  };
}


export interface ActualizarUsuarioRequest {
  persona?: {
    nombre?: string;
    apPaterno?: string;
    apMaterno?: string;
    telefono?: string;
    idTipoPersona?: number;
  };
  usuario?: {
    email?: string;
    password?: string;
    roles?: number[];
  };
}
