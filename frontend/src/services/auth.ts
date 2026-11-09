import { api } from "./api";

export interface PerfilCliente {
  perfil_id?: string;
  usuario_id?: string;
  convenio_id?: string | null;
  telefono?: string;
  direccion?: string;
  region?: string;
  comuna?: string;
}

export interface Usuario {
  usuario_id: string;
  rut: string;
  correo: string;
  nombre: string;
  apellido: string;
  rol: "ADMIN" | "JEFE_BODEGA" | "TECNICO_TERRENO" | "CLIENTE_CONVENIO" | "CLIENTE_ESTANDAR";
  activo: boolean;
  intentos_fallidos?: number;
  bloqueado_hasta?: string | null;
  mfa_habilitado?: boolean;
  creado_en: string;
  perfil?: PerfilCliente | null;
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
  access_token?: string;
  token_type?: string;
  requiere_mfa?: boolean;
  token_temporal_mfa?: string;
  requiere_cambio_clave?: boolean;
  clave_temporal?: string;
}

export interface RespuestaRecuperacion {
  mensaje: string;
  token_temporal?: string;
  clave_temporal?: string;
}

export interface RespuestaConfigurarMFA {
  secreto_manual: string;
  qr_codigo_base64: string;
  otpauth_url: string;
}

export interface RespuestaActivarMFA {
  mensaje: string;
  mfa_habilitado: boolean;
  codigos_respaldo: string[];
}

export interface AuditoriaEvento {
  auditoria_id: string;
  usuario_id?: string | null;
  correo_usuario?: string | null;
  nombre_usuario?: string | null;
  rol_usuario?: string | null;
  modulo: string;
  accion: string;
  descripcion: string;
  metodo_http?: string | null;
  ruta_endpoint?: string | null;
  codigo_respuesta?: number | null;
  direccion_ip?: string | null;
  dispositivo_user_agent?: string | null;
  detalle_json?: string | null;
  fecha_evento: string;
}

export const authService = {
  login: async (credenciales: any): Promise<RespuestaIniciarSesion> => {
    return api.post<RespuestaIniciarSesion>("/auth/iniciar-sesion", credenciales);
  },

  verifyMfaLogin: async (tokenTemporal: string, codigoTotp: string): Promise<RespuestaIniciarSesion> => {
    return api.post<RespuestaIniciarSesion>("/auth/verificar-mfa", {
      token_temporal: tokenTemporal,
      codigo_totp: codigoTotp
    });
  },

  setupMfa: async (): Promise<RespuestaConfigurarMFA> => {
    return api.post<RespuestaConfigurarMFA>("/auth/mfa/configurar", {});
  },

  activateMfa: async (codigoTotp: string): Promise<RespuestaActivarMFA> => {
    return api.post<RespuestaActivarMFA>("/auth/mfa/activar", { codigo_totp: codigoTotp });
  },

  deactivateMfa: async (clave: string, codigoTotp: string): Promise<{ mensaje: string }> => {
    return api.post<{ mensaje: string }>("/auth/mfa/desactivar", { clave, codigo_totp: codigoTotp });
  },

  requestPasswordReset: async (correo: string): Promise<RespuestaRecuperacion> => {
    return api.post<RespuestaRecuperacion>("/auth/solicitar-recuperacion", { correo });
  },

  resetPassword: async (token: string, nueva_clave: string, correo?: string): Promise<RespuestaRecuperacion> => {
    return api.post<RespuestaRecuperacion>("/auth/restablecer-clave", {
      token,
      nueva_clave,
      ...(correo ? { correo } : {})
    });
  },

  register: async (datosUsuario: any): Promise<Usuario> => {
    return api.post<Usuario>("/auth/registrar", datosUsuario);
  },

  getMe: async (): Promise<Usuario> => {
    return api.get<Usuario>("/usuarios/me");
  },

  updateMe: async (datos: any): Promise<Usuario> => {
    return api.put<Usuario>("/usuarios/me", datos);
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

  updateAgreement: async (convenioId: string | number, datosConvenio: any): Promise<Convenio> => {
    return api.patch<Convenio>(`/convenios/${convenioId}`, datosConvenio);
  },

  deleteAgreement: async (convenioId: string | number): Promise<any> => {
    return api.delete(`/convenios/${convenioId}`);
  },

  getAgreements: async (): Promise<Convenio[]> => {
    return api.get<Convenio[]>("/convenios");
  },

  // Auditoría y Bitácora de Usuarios
  getAuditLogs: async (params?: {
    modulo?: string;
    accion?: string;
    rol_usuario?: string;
    busqueda?: string;
    limit?: number;
  }): Promise<AuditoriaEvento[]> => {
    const query = new URLSearchParams();
    if (params?.modulo && params.modulo !== "TODOS") query.set("modulo", params.modulo);
    if (params?.accion && params.accion !== "TODAS") query.set("accion", params.accion);
    if (params?.rol_usuario && params.rol_usuario !== "TODOS") query.set("rol_usuario", params.rol_usuario);
    if (params?.busqueda && params.busqueda.trim()) query.set("busqueda", params.busqueda.trim());
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return api.get<AuditoriaEvento[]>(`/auditoria${qs ? `?${qs}` : ""}`);
  },

  registerAuditEvent: async (evento: Partial<AuditoriaEvento>): Promise<AuditoriaEvento> => {
    return api.post<AuditoriaEvento>("/auditoria/registrar-evento", evento);
  }
};
