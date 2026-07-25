import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Boxes, 
  Briefcase, 
  LogOut,
  User
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const userJson = localStorage.getItem("marcom_user");
  const user = userJson ? JSON.parse(userJson) : null;

  const handleLogout = () => {
    localStorage.removeItem("marcom_token");
    localStorage.removeItem("marcom_user");
    navigate("/login");
  };

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-brand">
        <span className="brand-dot"></span>
        <h2>APT MARCOM</h2>
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
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="user-badge">
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-info">
              <p className="user-name">{user.first_name} {user.last_name}</p>
              <p className="user-role">{user.role}</p>
            </div>
          </div>
        )}
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
