import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  CheckCheck, 
  AlertTriangle, 
  Wrench, 
  CheckCircle2, 
  ShieldCheck, 
  Info, 
  X, 
  ChevronRight, 
  Trash2 
} from "lucide-react";
import { Link } from "react-router-dom";

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  type: "alert" | "work_order" | "success" | "info" | "security";
  read: boolean;
  link?: string;
  badge?: string;
}

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: "notif-1",
    title: "Pérdida de señal en monitor",
    message: "Tótem digital 55\" reporta desconexión prolongada en estación de servicio.",
    timeAgo: "Hace 12 min",
    type: "alert",
    read: false,
    link: "/inventory",
    badge: "EDS-10097"
  },
  {
    id: "notif-2",
    title: "Nueva OT-2025-0401 asignada",
    message: "Servicio de instalación programado para monitores industriales de alta luminosidad.",
    timeAgo: "Hace 45 min",
    type: "work_order",
    read: false,
    link: "/work-orders",
    badge: "OT Asignada"
  },
  {
    id: "notif-3",
    title: "Mantenimiento preventivo completado",
    message: "Calibración de pantalla y actualización de firmware concluidas con éxito.",
    timeAgo: "Hace 2 horas",
    type: "success",
    read: false,
    link: "/work-orders",
    badge: "Copec Las Condes"
  },
  {
    id: "notif-4",
    title: "Sesión protegida con 2FA",
    message: "Inicio de sesión seguro autenticado mediante código TOTP de doble factor.",
    timeAgo: "Hace 4 horas",
    type: "security",
    read: true,
    link: "/users",
    badge: "Seguridad"
  },
  {
    id: "notif-5",
    title: "Valores económicos actualizados",
    message: "Indicadores UF, Dólar y UTM sincronizados en vivo con el Banco Central para cotizaciones.",
    timeAgo: "Hoy 08:30",
    type: "info",
    read: true,
    link: "/quotations",
    badge: "UF en Vivo"
  }
];

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange
}) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    try {
      const saved = localStorage.getItem("marcom_notifications");
      return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });

  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calcular y reportar cantidad de no leídas
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    onUnreadCountChange(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  // Persistir cambios
  const saveNotifications = (updated: SystemNotification[]) => {
    setNotifications(updated);
    localStorage.setItem("marcom_notifications", JSON.stringify(updated));
  };

  // Cerrar al hacer clic fuera o presionar escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(updated);
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  const clearAllNotifications = () => {
    saveNotifications([]);
  };

  const filtered = filterTab === "unread" 
    ? notifications.filter(n => !n.read) 
    : notifications;

  if (!isOpen) return null;

  const getIcon = (type: SystemNotification["type"]) => {
    switch (type) {
      case "alert":
        return <AlertTriangle size={16} className="notif-type-icon alert" />;
      case "work_order":
        return <Wrench size={16} className="notif-type-icon work_order" />;
      case "success":
        return <CheckCircle2 size={16} className="notif-type-icon success" />;
      case "security":
        return <ShieldCheck size={16} className="notif-type-icon security" />;
      case "info":
      default:
        return <Info size={16} className="notif-type-icon info" />;
    }
  };

  return (
    <div className="notifications-dropdown-menu animate-fade-in" ref={dropdownRef}>
      {/* Header */}
      <div className="notif-dropdown-header">
        <div className="notif-header-title">
          <div className="notif-title-badge">
            <Bell size={16} />
            <span>Notificaciones</span>
          </div>
          {unreadCount > 0 && (
            <span className="notif-unread-count-pill">
              {unreadCount} nueva{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="notif-header-actions">
          {unreadCount > 0 && (
            <button 
              className="notif-action-text-btn" 
              onClick={markAllAsRead}
              title="Marcar todas las notificaciones como leídas"
            >
              <CheckCheck size={14} />
              <span>Marcar leídas</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              className="notif-action-icon-btn" 
              onClick={clearAllNotifications}
              title="Limpiar todas las notificaciones"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button 
            className="notif-action-icon-btn close" 
            onClick={onClose}
            title="Cerrar notificaciones"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-tabs">
        <button 
          className={`notif-tab-btn ${filterTab === "all" ? "active" : ""}`}
          onClick={() => setFilterTab("all")}
        >
          Todas ({notifications.length})
        </button>
        <button 
          className={`notif-tab-btn ${filterTab === "unread" ? "active" : ""}`}
          onClick={() => setFilterTab("unread")}
        >
          No leídas ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="notif-list-scroll">
        {filtered.length === 0 ? (
          <div className="notif-empty-state">
            <div className="notif-empty-icon">
              <CheckCircle2 size={32} />
            </div>
            <h4>Estás al día</h4>
            <p>
              {filterTab === "unread" 
                ? "No tienes notificaciones pendientes por leer." 
                : "No hay notificaciones activas en el sistema."}
            </p>
          </div>
        ) : (
          filtered.map((notif) => (
            <div
              key={notif.id}
              className={`notif-item-card ${notif.read ? "read" : "unread"}`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className="notif-icon-wrapper">
                {getIcon(notif.type)}
                {!notif.read && <span className="notif-unread-dot" />}
              </div>

              <div className="notif-content-col">
                <div className="notif-item-top">
                  <span className="notif-item-title">{notif.title}</span>
                  <span className="notif-item-time">{notif.timeAgo}</span>
                </div>

                <p className="notif-item-msg">{notif.message}</p>

                <div className="notif-item-footer">
                  {notif.badge && (
                    <span className="notif-item-tag">{notif.badge}</span>
                  )}
                  {notif.link && (
                    <Link 
                      to={notif.link} 
                      className="notif-link-btn"
                      onClick={() => onClose()}
                    >
                      <span>Ver módulo</span>
                      <ChevronRight size={12} />
                    </Link>
                  )}
                </div>
              </div>

              <button
                className="notif-dismiss-btn"
                title="Eliminar notificación"
                onClick={(e) => removeNotification(notif.id, e)}
              >
                <X size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="notif-dropdown-footer">
        <span>Marcom Centro de Eventos y Monitoreo</span>
        <button 
          className="notif-reset-defaults-btn"
          onClick={() => saveNotifications(DEFAULT_NOTIFICATIONS)}
          title="Restablecer notificaciones de ejemplo"
        >
          Restablecer
        </button>
      </div>
    </div>
  );
};
