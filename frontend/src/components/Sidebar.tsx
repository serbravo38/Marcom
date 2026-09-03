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
        <span className="brand-dot"></span>
        <h2>MARCOM</h2>
      </div>

      <nav className="sidebar-menu">
        <NavLink 
          to="/" 
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/agreements" 
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <FileText size={20} />
          <span>Convenios</span>
        </NavLink>

        <NavLink 
          to="/quotations" 
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <Calculator size={20} />
          <span>Cotizaciones</span>
        </NavLink>

        <NavLink 
          to="/inventory" 
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <Boxes size={20} />
          <span>Inventario</span>
        </NavLink>

        <NavLink 
          to="/work-orders" 
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <Briefcase size={20} />
          <span>Órdenes de Trabajo</span>
        </NavLink>

        {currentUser && currentUser.rol === "ADMIN" && (
          <NavLink 
            to="/users" 
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <User size={20} />
            <span>Usuarios</span>
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
