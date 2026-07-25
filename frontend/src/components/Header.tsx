import React from "react";
import { ShieldCheck } from "lucide-react";

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="main-header glass-panel">
      <h1 className="accent-text-gradient">{title}</h1>
      <div className="header-status">
        <div className="status-indicator">
          <span className="pulse-dot"></span>
          <span>API Gateway Conectado</span>
        </div>
        <div className="security-badge">
          <ShieldCheck size={16} />
          <span>Sesión Segura</span>
        </div>
      </div>
    </header>
  );
};
export default Header;
