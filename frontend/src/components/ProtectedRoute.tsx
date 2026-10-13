import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import type { Usuario } from "../services/auth";
import { getDefaultRouteForRole, ROLE_LABELS } from "../utils/rbac";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("marcom_token");

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const userStr = localStorage.getItem("marcom_user");
      const user: Usuario = userStr ? JSON.parse(userStr) : null;
      if (!user || !allowedRoles.includes(user.rol)) {
        const userRoleLabel = (user?.rol && ROLE_LABELS[user.rol]) || (user ? user.rol.replace("_", " ") : "Desconocido");
        const defaultPath = getDefaultRouteForRole(user?.rol);

        return (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            textAlign: "center",
            padding: "40px"
          }}>
            <div style={{
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              padding: "20px",
              borderRadius: "50%",
              marginBottom: "20px"
            }}>
              <ShieldAlert size={48} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "10px", color: "#fff" }}>
              Acceso Restringido
            </h2>
            <p style={{ color: "hsl(var(--text-muted))", maxWidth: "480px", marginBottom: "25px", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Tu perfil de <strong>{userRoleLabel}</strong> no cuenta con privilegios administrativos para acceder a esta vista. Solo puedes consultar y gestionar los módulos autorizados para tu función.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate(defaultPath)}
                style={{ padding: "10px 24px", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <ArrowLeft size={16} />
                <span>Ir a Mi Módulo Asignado</span>
              </button>
            </div>
          </div>
        );
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
