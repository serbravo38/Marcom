import { api } from "./api";

export interface Usuario {
  usuario_id: string;
  rut: string;
  correo: string;
  nombre: string;
  apellido: string;
  rol: "ADMIN" | "JEFE_BODEGA" | "TECNICO_TERRENO" | "CLIENTE_CONVENIO" | "CLIENTE_ESTANDAR";
  activo: boolean;
  creado_en: string;
}

export interface Convenio {
  convenio_id: string;
  nombre_empresa: string;
  rut: string;
  limite_credito: number;
  credito_usado: number;
  activo: boolean;
  creado_en: string;
}

export interface RespuestaIniciarSesion {
  access_token: string;
  token_type: string;
}

export interface RespuestaRecuperacion {
  mensaje: string;
  token_temporal?: string;
}

export const authService = {
  login: async (credenciales: any): Promise<RespuestaIniciarSesion> => {
    return api.post<RespuestaIniciarSesion>("/auth/iniciar-sesion", credenciales);
  },

  requestPasswordReset: async (correo: string): Promise<RespuestaRecuperacion> => {
    return api.post<RespuestaRecuperacion>("/auth/solicitar-recuperacion", { correo });
  },

  resetPassword: async (token: string, nueva_clave: string): Promise<RespuestaRecuperacion> => {
    return api.post<RespuestaRecuperacion>("/auth/restablecer-clave", { token, nueva_clave });
  },

  register: async (datosUsuario: any): Promise<Usuario> => {
    return api.post<Usuario>("/auth/registrar", datosUsuario);
  },


  getMe: async (): Promise<Usuario> => {
    return api.get<Usuario>("/usuarios/me");
  },

  getUsers: async (): Promise<Usuario[]> => {
    return api.get<Usuario[]>("/usuarios");
  },

  createUser: async (datosUsuario: any): Promise<Usuario> => {
    return api.post<Usuario>("/usuarios", datosUsuario);
  },

  updateUser: async (usuarioId: string, datosUsuario: any): Promise<Usuario> => {
    return api.put<Usuario>(`/usuarios/${usuarioId}`, datosUsuario);
  },

  deleteUser: async (usuarioId: string): Promise<any> => {
    return api.delete(`/usuarios/${usuarioId}`);
  },

  getUserById: async (usuarioId: string): Promise<Usuario> => {
    return api.get<Usuario>(`/usuarios/${usuarioId}`);
  },

  createProfile: async (usuarioId: string, datosPerfil: any): Promise<any> => {
    return api.post(`/usuarios/${usuarioId}/perfil`, datosPerfil);
  },

  // Convenios CRUD
  createAgreement: async (datosConvenio: any): Promise<Convenio> => {
    return api.post<Convenio>("/convenios", datosConvenio);
  },

  getAgreements: async (): Promise<Convenio[]> => {
    return api.get<Convenio[]>("/convenios");
  }
};
