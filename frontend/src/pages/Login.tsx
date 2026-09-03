import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Mail, Loader2, KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { authService } from "../services/auth";

type AuthMode = "login" | "request_reset" | "reset_password";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode state
  const [mode, setMode] = useState<AuthMode>("login");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check URL token on mount
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setResetToken(tokenParam);
      setMode("reset_password");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Get access token
      const authData = await authService.login({ correo: email, clave: password });
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

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await authService.requestPasswordReset(email);
      setSuccessMessage(response.mensaje || "Código de recuperación generado.");
      if (response.token_temporal) {
        setResetToken(response.token_temporal);
      }
      // Move to step 2 (reset password)
      setMode("reset_password");
    } catch (err: any) {
      setError(err?.message || "Error al procesar la solicitud de recuperación.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!resetToken.trim()) {
      setError("Debes ingresar el token o código de recuperación.");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(resetToken.trim(), newPassword);
      setSuccessMessage(response.mensaje || "¡Contraseña actualizada exitosamente!");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");
      // Return to login after 2 seconds or on user action
      setTimeout(() => {
        setMode("login");
      }, 2500);
    } catch (err: any) {
      setError(err?.message || "Error al restablecer la contraseña. Verifica el token.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setError(null);
    setSuccessMessage(null);
    setMode(newMode);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-panel animate-fade-in" style={{ maxWidth: "440px", width: "100%" }}>
        <div className="login-header">
          <div className="login-logo">
            {mode === "login" ? (
              <Lock size={24} style={{ color: "#fff" }} />
            ) : mode === "request_reset" ? (
              <Mail size={24} style={{ color: "#fff" }} />
            ) : (
              <KeyRound size={24} style={{ color: "#fff" }} />
            )}
          </div>
          <h2 className="accent-text-gradient">MARCOM</h2>
          <p>
            {mode === "login" && "Plataforma Modular de Operaciones"}
            {mode === "request_reset" && "Recuperación de Contraseña"}
            {mode === "reset_password" && "Restablecer Nueva Contraseña"}
          </p>
        </div>

        {error && (error.toLowerCase().includes("bloquead") || error.toLowerCase().includes("bloqueo")) ? (
          <div
            style={{
              width: "100%",
              padding: "16px",
              marginBottom: "20px",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              textAlign: "left"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f87171", fontWeight: 600, fontSize: "0.95rem" }}>
              <ShieldAlert size={20} />
              <span>Bloqueo Temporal de Seguridad (5 min)</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.4, color: "rgba(255, 255, 255, 0.9)" }}>
              {error}
            </p>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => switchMode("request_reset")}
                style={{
                  alignSelf: "flex-start",
                  marginTop: "6px",
                  background: "rgba(239, 68, 68, 0.25)",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 500
                }}
              >
                <KeyRound size={14} />
                <span>Restablecer contraseña para desbloquear ahora</span>
              </button>
            )}
          </div>
        ) : error ? (
          <div
            className="badge error"
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "20px",
              borderRadius: "8px",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        {successMessage && (
          <div
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "20px",
              borderRadius: "8px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "0.9rem"
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. MODO INICIO DE SESIÓN */}
        {mode === "login" && (
          <form onSubmit={handleLogin}>
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

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label htmlFor="password" style={{ margin: 0 }}>Contraseña</label>
                <button
                  type="button"
                  onClick={() => switchMode("request_reset")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-color, #38bdf8)",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
              style={{ width: "100%", justifyContent: "center", marginTop: "10px" }}
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
        )}

        {/* 2. MODO SOLICITUD DE RECUPERACIÓN */}
        {mode === "request_reset" && (
          <form onSubmit={handleRequestReset}>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem", marginBottom: "20px", textAlign: "center" }}>
              Ingresa el correo electrónico asociado a tu cuenta para generar tu código de recuperación.
            </p>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label htmlFor="reset-email">Correo Electrónico</label>
              <div style={{ position: "relative" }}>
                <Mail size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
                <input
                  id="reset-email"
                  type="email"
                  className="glass-input"
                  style={{ width: "100%", paddingLeft: "45px" }}
                  placeholder="nombre@marcom.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", marginBottom: "16px" }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                  <span>Generando código...</span>
                </>
              ) : (
                <span>Continuar a Restablecimiento</span>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => switchMode("login")}
              style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "8px" }}
            >
              <ArrowLeft size={16} />
              <span>Volver al inicio de sesión</span>
            </button>
          </form>
        )}

        {/* 3. MODO RESTABLECER CONTRASEÑA */}
        {mode === "reset_password" && (
          <form onSubmit={handleResetPassword}>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.88rem", marginBottom: "16px", textAlign: "center" }}>
              Ingresa tu código de recuperación y define tu nueva contraseña segura.
            </p>

            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label htmlFor="token">Código / Token de Recuperación</label>
              <div style={{ position: "relative" }}>
                <KeyRound size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
                <input
                  id="token"
                  type="text"
                  className="glass-input"
                  style={{ width: "100%", paddingLeft: "45px", fontFamily: "monospace", fontSize: "0.85rem" }}
                  placeholder="Pega aquí el código de recuperación"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label htmlFor="new-password">Nueva Contraseña</label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
                <input
                  id="new-password"
                  type="password"
                  className="glass-input"
                  style={{ width: "100%", paddingLeft: "45px" }}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "22px" }}>
              <label htmlFor="confirm-password">Confirmar Nueva Contraseña</label>
              <div style={{ position: "relative" }}>
                <ShieldCheck size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
                <input
                  id="confirm-password"
                  type="password"
                  className="glass-input"
                  style={{ width: "100%", paddingLeft: "45px" }}
                  placeholder="Repite tu nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", marginBottom: "14px" }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                  <span>Actualizando contraseña...</span>
                </>
              ) : (
                <span>Restablecer Contraseña</span>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => switchMode("login")}
              style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "8px" }}
            >
              <ArrowLeft size={16} />
              <span>Cancelar y volver al login</span>
            </button>
          </form>
        )}
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

