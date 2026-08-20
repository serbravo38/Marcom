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

export const authService = {
  login: async (credenciales: any): Promise<RespuestaIniciarSesion> => {
    return api.post<RespuestaIniciarSesion>("/auth/iniciar-sesion", credenciales);
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
