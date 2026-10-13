/**
 * @file rbac.ts
 * @description Utilidades para Control de Acceso Basado en Roles (RBAC) en el frontend.
 * 
 * Reglas de Acceso por Rol:
 * - ADMIN: Acceso exclusivo al Dashboard operacional, Usuarios/Roles y control total de la plataforma.
 * - JEFE_BODEGA: Gestión de Inventario, Bodegas, OTs operacionales, Cotizaciones y Convenios.
 * - TECNICO_TERRENO: Órdenes de Trabajo asignadas y hardware/activos en terreno.
 * - CLIENTE_CONVENIO: Su convenio asignado, sus cotizaciones (OC), sus locales y solicitudes de soporte.
 * - CLIENTE_ESTANDAR: Cotizaciones de productos/servicios.
 */

export type UserRole = 
  | "ADMIN" 
  | "JEFE_BODEGA" 
  | "TECNICO_TERRENO" 
  | "CLIENTE_CONVENIO" 
  | "CLIENTE_ESTANDAR";

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador General",
  JEFE_BODEGA: "Jefe de Bodega y Logística",
  TECNICO_TERRENO: "Técnico en Terreno",
  CLIENTE_CONVENIO: "Cliente en Convenio",
  CLIENTE_ESTANDAR: "Cliente Estándar"
};

/**
 * Retorna la ruta principal por defecto a la que debe ser dirigido cada rol tras iniciar sesión
 * o cuando intenta acceder a un recurso denegado.
 */
export const getDefaultRouteForRole = (role?: string): string => {
  switch (role) {
    case "ADMIN":
      return "/dashboard";
    case "JEFE_BODEGA":
      return "/inventory";
    case "TECNICO_TERRENO":
      return "/work-orders";
    case "CLIENTE_CONVENIO":
      return "/quotations";
    case "CLIENTE_ESTANDAR":
      return "/quotations";
    default:
      return "/login";
  }
};

/**
 * Mapeo de rutas permitidas para cada rol
 */
export const ALLOWED_ROUTES_BY_ROLE: Record<string, string[]> = {
  ADMIN: [
    "/dashboard",
    "/agreements",
    "/quotations",
    "/inventory",
    "/work-orders",
    "/users"
  ],
  JEFE_BODEGA: [
    "/inventory",
    "/work-orders",
    "/quotations",
    "/agreements"
  ],
  TECNICO_TERRENO: [
    "/work-orders",
    "/inventory"
  ],
  CLIENTE_CONVENIO: [
    "/quotations",
    "/agreements",
    "/inventory",
    "/work-orders"
  ],
  CLIENTE_ESTANDAR: [
    "/quotations"
  ]
};

/**
 * Verifica si un rol específico tiene permiso para acceder a una ruta
 */
export const isRouteAllowedForRole = (route: string, role?: string): boolean => {
  if (!role) return false;
  const allowed = ALLOWED_ROUTES_BY_ROLE[role];
  if (!allowed) return false;
  return allowed.includes(route);
};
