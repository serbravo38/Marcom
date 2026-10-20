/**
 * @file Sidebar.tsx
 * @description Barra lateral principal de navegación y anclaje de sesión de usuario en Marcom.
 * 
 * Principios y Responsabilidades:
 * 1. Control de Acceso Basado en Roles (RBAC):
 *    Segmenta dinámicamente las rutas visibles según el rol del usuario autenticado:
 *    - ADMIN / JEFE_BODEGA: Acceso integral (Dashboard, Convenios, Cotizaciones, Inventario, OTs, Usuarios).
 *    - TECNICO_TERRENO: Enfoque en trabajo de campo (Inventario/Hardware asignado y Órdenes de Trabajo).
 *    - CLIENTE_CONVENIO / CLIENTE_ESTANDAR: Portal de cliente (Cotizaciones OC y Locales de su red).
 * 2. Anclaje de Sesión Único (Single User Session Anchor):
 *    Es la ubicación canónica exclusiva donde se despliega la identidad del usuario logeado
 *    (`nombre`, `apellido` y `rol`), evitando duplicidades en el encabezado superior.
 * 3. Gestión de Perfil y Cierre de Sesión:
 *    - Al hacer clic en la tarjeta del usuario se despliega `ProfileModal` para editar datos o gestionar 2FA.
 *    - El botón de cierre de sesión purga los tokens JWT de `localStorage` y redirige al flujo de login.
 */

import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Boxes, 
  Briefcase, 
  Calculator,
  User,
  Settings,
  Globe,
  Monitor,
  TrendingUp,
  Tv,
  FileSpreadsheet,
  X
} from "lucide-react";
import { ProfileModal } from "./ProfileModal";
import type { Usuario } from "../services/auth";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  // Estado de visibilidad del modal de perfil de usuario
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Estado del usuario activo recuperado de la sesión local
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const userJson = localStorage.getItem("marcom_user");
    return userJson ? JSON.parse(userJson) : null;
  });

  return (
    <aside className={`sidebar glass-panel ${isOpen ? "mobile-open" : ""}`}>
      {/* Logotipo e Identidad de Marca con Alto Contraste Corporativo */}
      <div className="sidebar-brand" style={{ justifyContent: "space-between" }}>
        <div className="sidebar-brand-identity">
          <div className="sidebar-logo-box">
            <img 
              src="/logo_icon.png" 
              alt="MARCOM" 
              className="sidebar-logo-img"
            />
          </div>
          <div className="sidebar-brand-text">
            <h2 className="sidebar-brand-title">
              MARCOM
            </h2>
            <span className="sidebar-brand-subtitle">
              Soluciones Digitales
            </span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={onClose}
            aria-label="Cerrar menú lateral"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Menú de Navegación con Filtrado RBAC Estricto */}
      <nav className="sidebar-menu">
        {/* Dashboard - Exclusivo para usuarios con privilegios de Administrador (ADMIN) */}
        {currentUser?.rol === "ADMIN" && (
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
        )}

        {/* Convenios - ADMIN, JEFE_BODEGA, CLIENTE_CONVENIO */}
        {currentUser && ["ADMIN", "JEFE_BODEGA", "CLIENTE_CONVENIO"].includes(currentUser.rol) && (
          <NavLink 
            to="/agreements" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <FileText size={20} />
            <span>{currentUser.rol === "CLIENTE_CONVENIO" ? "Mi Convenio" : "Convenios"}</span>
          </NavLink>
        )}

        {/* Cotizaciones - ADMIN, JEFE_BODEGA, CLIENTE_CONVENIO, CLIENTE_ESTANDAR */}
        {currentUser && ["ADMIN", "JEFE_BODEGA", "CLIENTE_CONVENIO", "CLIENTE_ESTANDAR"].includes(currentUser.rol) && (
          <NavLink 
            to="/quotations" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Calculator size={20} />
            <span>{currentUser.rol === "CLIENTE_CONVENIO" ? "Mis Cotizaciones (OC)" : "Cotizaciones"}</span>
          </NavLink>
        )}

        {/* Inventario / Locales - ADMIN, JEFE_BODEGA, TECNICO_TERRENO, CLIENTE_CONVENIO */}
        {currentUser && ["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO", "CLIENTE_CONVENIO"].includes(currentUser.rol) && (
          <NavLink 
            to="/inventory" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Boxes size={20} />
            <span>
              {currentUser.rol === "CLIENTE_CONVENIO" 
                ? "Mis Locales y Pantallas" 
                : currentUser.rol === "TECNICO_TERRENO"
                ? "Activos y Hardware"
                : "Inventario"}
            </span>
          </NavLink>
        )}

        {/* Órdenes de Trabajo - ADMIN, JEFE_BODEGA, TECNICO_TERRENO, CLIENTE_CONVENIO */}
        {currentUser && ["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO", "CLIENTE_CONVENIO"].includes(currentUser.rol) && (
          <NavLink 
            to="/work-orders" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <Briefcase size={20} />
            <span>
              {currentUser.rol === "TECNICO_TERRENO" 
                ? "Mis Órdenes de Trabajo" 
                : currentUser.rol === "CLIENTE_CONVENIO"
                ? "Solicitudes de Soporte" 
                : "Órdenes de Trabajo"}
            </span>
          </NavLink>
        )}

        {/* Gestión de Usuarios y Permisos - Exclusivo Administradores */}
        {currentUser && currentUser.rol === "ADMIN" && (
          <NavLink 
            to="/users" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <User size={20} />
            <span>Usuarios y Roles</span>
          </NavLink>
        )}

        {/* Catálogo de Monitores Reacondicionados */}
        <NavLink 
          to="/catalogo" 
          className="sidebar-link"
          style={{ opacity: 0.95 }}
          title="Ver catálogo de ventas de monitores reacondicionados"
        >
          <Monitor size={20} />
          <span>Catálogo Monitores</span>
        </NavLink>

        {/* Gestión de Catálogo de Monitores - Exclusivo ADMIN */}
        {currentUser && currentUser.rol === "ADMIN" && (
          <NavLink 
            to="/admin/monitores" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            title="Administración CRUD de monitores del catálogo"
          >
            <Tv size={20} />
            <span>Gestión Monitores</span>
          </NavLink>
        )}

        {/* Control de Ventas de Monitores - Exclusivo ADMIN */}
        {currentUser && currentUser.rol === "ADMIN" && (
          <NavLink 
            to="/ventas" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            title="Control de ventas y métricas comerciales"
          >
            <TrendingUp size={20} />
            <span>Control de Ventas</span>
          </NavLink>
        )}

        {/* Control de Facturación y Libro de Ventas CSV - Exclusivo ADMIN */}
        {currentUser && currentUser.rol === "ADMIN" && (
          <NavLink 
            to="/facturacion" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            title="Control general de facturación y libro de ventas CSV"
          >
            <FileSpreadsheet size={20} />
            <span>Facturación</span>
          </NavLink>
        )}

        {/* Portada Corporativa Pública */}
        <NavLink 
          to="/" 
          className="sidebar-link"
          style={{ opacity: 0.85, marginTop: "4px" }}
          title="Ver sitio web y presentación corporativa de Marcom"
        >
          <Globe size={20} />
          <span>Sitio Corporativo</span>
        </NavLink>
      </nav>

      {/* Pie de la Barra Lateral: Tarjeta Canónica de Usuario y Acciones */}
      <div className="sidebar-footer">
        {/* Selector de Ámbito de Cliente - Solo visible para Administradores y Jefatura */}
        {currentUser && ["ADMIN", "JEFE_BODEGA"].includes(currentUser.rol) && (
          <div className="sidebar-client-dropdown" title="Cambiar filtro de cliente">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Boxes size={16} style={{ color: "#38bdf8" }} />
              <span>Todos los Clientes</span>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>▼</span>
          </div>
        )}

        {/* Tarjeta Canónica del Usuario Logeado (Acceso a Perfil y 2FA) */}
        {currentUser && (
          <div 
            className="user-badge" 
            onClick={() => setIsProfileOpen(true)}
            style={{ cursor: "pointer", transition: "all 0.2s ease", marginTop: "4px" }}
            title="Haz clic para ver y editar tu perfil"
          >
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-info" style={{ flex: 1 }}>
              <p className="user-name">{currentUser.nombre} {currentUser.apellido}</p>
              <p className="user-role">{currentUser.rol.replace("_", " ")}</p>
            </div>
            <Settings size={14} style={{ opacity: 0.6, color: "var(--accent-color, #38bdf8)" }} />
          </div>
        )}
      </div>

      {/* Modal de Configuración de Perfil y Doble Factor (2FA) */}
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
      />
    </aside>
  );
};

export default Sidebar;
