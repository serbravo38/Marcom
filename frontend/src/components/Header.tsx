/**
 * @file Header.tsx
 * @description Encabezado superior unificado del panel de administración y operaciones de Marcom.
 * 
 * Principios de Diseño y Arquitectura UI:
 * 1. Título y Contexto Dinámico: Refleja la vista activa enviada desde el enrutador (`Layout` en `App.tsx`),
 *    acompañado de un subtítulo explicativo de la plataforma.
 * 2. Unicidad de Identidad de Usuario (Single Source of Truth):
 *    Se evita intencionalmente duplicar el nombre y avatar del usuario en este encabezado,
 *    ya que la tarjeta de sesión canónica (con nombre, rol, configuración de 2FA y cierre de sesión)
 *    está consolidada en la base de la barra lateral izquierda (`Sidebar.tsx`).
 * 3. Centro de Notificaciones Integrado:
 *    Aloja la campanita de alertas con insignia de conteo dinámico sincronizada
 *    bidireccionalmente con el componente `NotificationsDropdown`.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, Building2, LogOut, Menu } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  /** Título principal de la sección activa (ej. 'Panel Principal', 'Gestión de Inventario') */
  title: string;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onToggleMobileSidebar }) => {
  const navigate = useNavigate();
  // Estado de apertura del panel flotante de notificaciones
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  // Contador reactivo de notificaciones no leídas
  const [unreadCount, setUnreadCount] = useState<number>(3);

  const currentUser = React.useMemo(() => {
    try {
      const u = localStorage.getItem("marcom_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("marcom_token");
    localStorage.removeItem("marcom_user");
    navigate("/login");
  };

  return (
    <header className="top-app-header">
      {/* Título de la vista y bajada descriptiva */}
      <div className="header-title-box" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {onToggleMobileSidebar && (
          <button
            type="button"
            className="mobile-sidebar-toggle-btn"
            onClick={onToggleMobileSidebar}
            aria-label="Abrir menú de navegación"
            title="Menú"
          >
            <Menu size={22} />
          </button>
        )}
        <div>
          <h1>{title}</h1>
          <p>Monitoreo y gestión de infraestructura audiovisual</p>
        </div>
      </div>

      <div className="header-controls-group">
        {/* Selector de ámbito de cliente (Multi-tenant filter, visible para administradores y jefatura) */}
        {currentUser && ["ADMIN", "JEFE_BODEGA"].includes(currentUser.rol) && (
          <button className="header-pill-btn" title="Filtrar por cliente o convenio">
            <Building2 size={15} style={{ color: "#38bdf8" }} />
            <span>Todos los Clientes</span>
            <ChevronDown size={14} style={{ color: "#64748b" }} />
          </button>
        )}

        {/* Campo de búsqueda rápida global */}
        <div className="header-search-box">
          <Search size={15} />
          <input type="text" placeholder="Buscar..." aria-label="Buscar activos o locales" />
        </div>

        {/* Selector de Tema Claro / Oscuro */}
        <ThemeToggle />

        {/* Campana de Notificaciones con Menú Desplegable */}
        <div className="header-notif-wrapper">
          <button 
            type="button"
            className={`header-icon-circle ${isNotifOpen ? "active" : ""}`} 
            title={unreadCount > 0 ? `${unreadCount} notificaciones del sistema` : "Notificaciones del sistema"}
            onClick={() => setIsNotifOpen(prev => !prev)}
            aria-label="Notificaciones"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="header-notif-badge">{unreadCount}</span>
            )}
          </button>

          {/* Menú flotante de notificaciones */}
          <NotificationsDropdown
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            onUnreadCountChange={setUnreadCount}
          />
        </div>

        {/* Identidad de Usuario y Botón Directo de Cerrar Sesión en Header */}
        {currentUser && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", borderLeft: "1px solid rgba(255, 255, 255, 0.1)", paddingLeft: "12px" }}>
            <div 
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
              title={`Usuario: ${currentUser.nombre} ${currentUser.apellido} (${currentUser.rol})`}
            >
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0284c7, #38bdf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.82rem",
                boxShadow: "0 2px 8px rgba(56, 189, 248, 0.3)"
              }}>
                {currentUser.nombre ? currentUser.nombre.charAt(0).toUpperCase() : "U"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                <span className="header-user-name" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  {currentUser.nombre}
                </span>
                <span style={{ fontSize: "0.68rem", color: "#64748b" }}>
                  {currentUser.rol?.replace("_", " ")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.22)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                e.currentTarget.style.color = "#f87171";
              }}
              title="Cerrar Sesión de la Plataforma"
              aria-label="Cerrar Sesión"
            >
              <LogOut size={14} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </div>
    </header>

  );
};

export default Header;
