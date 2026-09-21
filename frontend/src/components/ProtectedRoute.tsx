import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import type { Usuario } from "../services/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const location = useLocation();
  const token = localStorage.getItem("marcom_token");

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const userStr = localStorage.getItem("marcom_user");
      const user: Usuario = userStr ? JSON.parse(userStr) : null;
      if (!user || !allowedRoles.includes(user.rol)) {
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
            <p style={{ color: "hsl(var(--text-muted))", maxWidth: "450px", marginBottom: "25px", fontSize: "0.95rem" }}>
              Tu perfil (<strong>{user ? user.rol.replace("_", " ") : "Desconocido"}</strong>) no cuenta con las autorizaciones necesarias para visualizar este módulo.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.href = "/"}
              style={{ padding: "10px 24px" }}
            >
              Volver a Mi Panel Principal
            </button>
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
