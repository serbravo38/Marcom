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
import { Search, Bell, ChevronDown, Building2 } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";

interface HeaderProps {
  /** Título principal de la sección activa (ej. 'Panel Principal', 'Gestión de Inventario') */
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  // Estado de apertura del panel flotante de notificaciones
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  // Contador reactivo de notificaciones no leídas
  const [unreadCount, setUnreadCount] = useState<number>(3);

  return (
    <header className="top-app-header">
      {/* Título de la vista y bajada descriptiva */}
      <div className="header-title-box">
        <h1>{title}</h1>
        <p>Monitoreo y gestión de infraestructura audiovisual</p>
      </div>

      <div className="header-controls-group">
        {/* Selector de ámbito de cliente (Multi-tenant filter) */}
        <button className="header-pill-btn" title="Filtrar por cliente o convenio">
          <Building2 size={15} style={{ color: "#38bdf8" }} />
          <span>Todos los Clientes</span>
          <ChevronDown size={14} style={{ color: "#64748b" }} />
        </button>

        {/* Campo de búsqueda rápida global */}
        <div className="header-search-box">
          <Search size={15} />
          <input type="text" placeholder="Buscar..." aria-label="Buscar activos o locales" />
        </div>

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
      </div>
    </header>
  );
};

export default Header;
