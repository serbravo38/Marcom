import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Boxes, 
  Briefcase, 
  Calculator,
  LogOut,
  User,
  Settings
} from "lucide-react";
import { ProfileModal } from "./ProfileModal";
import type { Usuario } from "../services/auth";

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const userJson = localStorage.getItem("marcom_user");
    return userJson ? JSON.parse(userJson) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem("marcom_token");
    localStorage.removeItem("marcom_user");
    navigate("/login");
  };

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-brand">
        <img 
          src="/logo_icon.png" 
          alt="MARCOM" 
          style={{ 
            height: "36px", 
            width: "auto", 
            objectFit: "contain",
            filter: "drop-shadow(0 0 10px rgba(0, 194, 255, 0.45))" 
          }} 
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, letterSpacing: "1px", lineHeight: 1.1, color: "#fff" }}>
            MARCOM
          </h2>
          <span style={{ fontSize: "0.58rem", color: "#38bdf8", fontWeight: 600, letterSpacing: "0.6px", textTransform: "uppercase", marginTop: "2px" }}>
            Soluciones Digitales
          </span>
        </div>
      </div>

      <nav className="sidebar-menu">
        {/* Dashboard Link - Visible to all authenticated roles */}
        <NavLink 
          to="/" 
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <LayoutDashboard size={20} />
          <span>
            {currentUser?.rol === "CLIENTE_CONVENIO" || currentUser?.rol === "CLIENTE_ESTANDAR" 
              ? "Mi Portal" 
              : currentUser?.rol === "TECNICO_TERRENO"
              ? "Panel Técnico"
              : currentUser?.rol === "JEFE_BODEGA"
              ? "Panel Bodega"
              : "Dashboard"}
          </span>
        </NavLink>

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
                ? "Servicios y OTs"
                : "Órdenes de Trabajo"}
            </span>
          </NavLink>
        )}

        {/* Usuarios - Exclusivo ADMIN */}
        {currentUser && currentUser.rol === "ADMIN" && (
          <NavLink 
            to="/users" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <User size={20} />
            <span>Usuarios y Roles</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        {currentUser && (
          <div 
            className="user-badge" 
            onClick={() => setIsProfileOpen(true)}
            style={{ cursor: "pointer", transition: "all 0.2s ease" }}
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
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
      />
    </aside>
  );
};
export default Sidebar;
