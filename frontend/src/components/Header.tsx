import React, { useState } from "react";
import { Search, Bell, ChevronDown, Building2 } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(3);

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
      </div>
    </header>
  );
};

export default Header;
