/**
 * @file NotificationsDropdown.tsx
 * @description Centro de notificaciones y alertas operacionales del sistema Marcom.
 * 
 * Contexto Funcional:
 * En una red de cientos de pantallas y tótems distribuidos en el país, los operadores
 * deben ser notificados de forma prioritaria ante incidentes (desconexiones de red,
 * pantallas fuera de línea), asignación de nuevas órdenes de trabajo (OTs), confirmaciones
 * de mantenimiento preventivo y avisos de seguridad (2FA).
 * 
 * Decisiones Técnicas y UX:
 * 1. Menú Flotante con Backdrop-filter: Proporciona un panel translúcido de alta legibilidad
 *    anclado de forma relativa a la campana del encabezado.
 * 2. Accesibilidad y Manejo de Eventos:
 *    - Click Outside: Si el usuario hace clic fuera del menú, este se cierra automáticamente.
 *    - Escape Key: Presionar la tecla ESC descarta el panel de inmediato.
 *    - Todos los event listeners globales se remueven en la función de limpieza del efecto para evitar fugas.
 * 3. Persistencia en LocalStorage: Las notificaciones leídas, eliminadas o restablecidas
 *    mantienen su estado entre recargas del navegador.
 * 4. Filtrado por Pestañas: Permite conmutar rápidamente entre 'Todas' y 'No leídas'.
 */

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

/**
 * Esquema de una notificación del sistema.
 */
export interface SystemNotification {
  /** Identificador único alfanumérico */
  id: string;
  /** Título conciso del evento (ej. 'Pérdida de señal en monitor') */
  title: string;
  /** Detalle explicativo con contexto de la estación o equipo */
  message: string;
  /** Marca de tiempo humana relativa (ej. 'Hace 12 min') */
  timeAgo: string;
  /** Categoría del evento que determina el color e iconografía */
  type: "alert" | "work_order" | "success" | "info" | "security";
  /** Estado de lectura: true = leída, false = pendiente/nueva */
  read: boolean;
  /** Ruta interna opcional de navegación directa al módulo relacionado */
  link?: string;
  /** Etiqueta destacada (ej. código EDS de la estación o número de OT) */
  badge?: string;
}

/**
 * Conjunto de notificaciones iniciales de demostración para el centro de operaciones.
 */
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
  /** Controla la visibilidad del menú desplegable */
  isOpen: boolean;
  /** Callback para cerrar el menú */
  onClose: () => void;
  /** Notifica al componente Header la cantidad de notificaciones no leídas para actualizar la insignia */
  onUnreadCountChange: (count: number) => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange
}) => {
  // Inicialización perezosa (lazy initial state) recuperando desde localStorage
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    try {
      const saved = localStorage.getItem("marcom_notifications");
      return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });

  // Filtro activo entre 'all' (todas) y 'unread' (solo no leídas)
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cálculo de notificaciones pendientes
  const unreadCount = notifications.filter(n => !n.read).length;

  // Propagación del contador hacia el componente Header
  useEffect(() => {
    onUnreadCountChange(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  /**
   * Actualiza el estado local y sincroniza de forma atómica en localStorage.
   */
  const saveNotifications = (updated: SystemNotification[]) => {
    setNotifications(updated);
    localStorage.setItem("marcom_notifications", JSON.stringify(updated));
  };

  /**
   * Manejador de eventos globales para cierre por clic exterior o tecla Escape.
   */
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

  /**
   * Marca todas las notificaciones como leídas en una sola acción.
   */
  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  /**
   * Marca una notificación individual como leída al hacer clic en ella.
   */
  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(updated);
  };

  /**
   * Elimina individualmente una notificación de la lista.
   */
  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que el clic desencadene el markAsRead del elemento padre
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  /**
   * Vacía el registro completo de notificaciones.
   */
  const clearAllNotifications = () => {
    saveNotifications([]);
  };

  // Filtrado reactivo según la pestaña seleccionada
  const filtered = filterTab === "unread" 
    ? notifications.filter(n => !n.read) 
    : notifications;

  if (!isOpen) return null;

  /**
   * Renderiza el icono correspondiente al tipo de notificación con colores semánticos.
   */
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
      {/* Cabecera del Panel */}
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

      {/* Pestañas de Filtrado */}
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

      {/* Listado con Scroll Independiente */}
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

              {/* Botón para descartar notificación individual */}
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

      {/* Pie del Panel con Opción de Restablecer */}
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
