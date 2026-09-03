import React, { useState } from "react";
import { ShieldCheck, User } from "lucide-react";
import { ProfileModal } from "./ProfileModal";

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="main-header glass-panel">
      <h1 className="accent-text-gradient">{title}</h1>
      <div className="header-status" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          className="btn-secondary"
          onClick={() => setIsProfileOpen(true)}
          style={{
            padding: "6px 12px",
            fontSize: "0.85rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(56, 189, 248, 0.1)",
            borderColor: "rgba(56, 189, 248, 0.25)",
            color: "#38bdf8"
          }}
          title="Editar mis datos personales y perfil"
        >
          <User size={14} />
          <span>Mi Perfil</span>
        </button>

        <div className="status-indicator">
          <span className="pulse-dot"></span>
          <span>API Gateway Conectado</span>
        </div>
        <div className="security-badge">
          <ShieldCheck size={16} />
          <span>Sesión Segura</span>
        </div>
      </div>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
};
export default Header;
