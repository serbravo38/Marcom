import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2 } from "lucide-react";
import { authService } from "../services/auth";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Get access token
      const authData = await authService.login({ email, password });
      localStorage.setItem("marcom_token", authData.access_token);

      // 2. Fetch and store user profile
      const userProfile = await authService.getMe();
      localStorage.setItem("marcom_user", JSON.stringify(userProfile));

      // 3. Redirect to dashboard
      navigate("/");
    } catch (err: any) {
      setError(err?.message || "Credenciales incorrectas. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel animate-fade-in">
        <div className="login-header">
          <div className="login-logo">
            <Lock size={24} style={{ color: "#fff" }} />
          </div>
          <h2 className="accent-text-gradient">MARCOM</h2>
          <p>Plataforma Modular de Operaciones</p>
        </div>

        {error && (
          <div className="badge error" style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <div style={{ position: "relative" }}>
              <Mail size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
              <input
                id="email"
                type="email"
                className="glass-input"
                style={{ width: "100%", paddingLeft: "45px" }}
                placeholder="nombre@marcom.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "30px" }}>
            <label htmlFor="password">Contraseña</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
              <input
                id="password"
                type="password"
                className="glass-input"
                style={{ width: "100%", paddingLeft: "45px" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <span>Ingresar</span>
            )}
          </button>
        </form>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
export default Login;
