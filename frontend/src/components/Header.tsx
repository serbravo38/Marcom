import React, { useState } from "react";
import { Search, Bell, ChevronDown, Building2 } from "lucide-react";
import { ProfileModal } from "./ProfileModal";
import { NotificationsDropdown } from "./NotificationsDropdown";
import type { Usuario } from "../services/auth";

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const [currentUser] = useState<Usuario | null>(() => {
    const userJson = localStorage.getItem("marcom_user");
    return userJson ? JSON.parse(userJson) : null;
  });

  const userName = currentUser ? `${currentUser.nombre} ${currentUser.apellido}` : "Sergio Bravo";
  const userRole = currentUser?.rol || "ADMIN";
  const initials = currentUser?.nombre ? `${currentUser.nombre[0]}${currentUser.apellido ? currentUser.apellido[0] : ""}` : "SB";

  return (
    <header className="top-app-header">
      <div className="header-title-box">
        <h1>{title}</h1>
        <p>Monitoreo y gestión de infraestructura audiovisual</p>
      </div>

      <div className="header-controls-group">
        {/* Filter Dropdown Pill */}
        <button className="header-pill-btn" title="Filtrar por cliente">
          <Building2 size={15} style={{ color: "#38bdf8" }} />
          <span>Todos los Clientes</span>
          <ChevronDown size={14} style={{ color: "#64748b" }} />
        </button>

        {/* Search Input Box */}
        <div className="header-search-box">
          <Search size={15} />
          <input type="text" placeholder="Buscar..." aria-label="Buscar" />
        </div>

        {/* Notification Bell with Dropdown */}
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

          <NotificationsDropdown
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            onUnreadCountChange={setUnreadCount}
          />
        </div>

        {/* User Profile Trigger */}
        <button 
          className="header-user-profile" 
          onClick={() => setIsProfileOpen(true)}
          title="Ver y editar perfil de usuario"
        >
          <div className="header-user-avatar">
            {initials.toUpperCase()}
          </div>
          <div className="header-user-meta">
            <div className="name">{userName}</div>
            <div className="role">{userRole.replace("_", " ")}</div>
          </div>
        </button>
      </div>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
};

export default Header;
