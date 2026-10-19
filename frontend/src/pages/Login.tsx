import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Mail, Loader2, KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { authService } from "../services/auth";
import { getDefaultRouteForRole } from "../utils/rbac";
import { validateStrongPassword, PasswordRequirementsChecklist } from "../utils/passwordValidation";

type AuthMode = "login" | "request_reset" | "reset_password" | "mfa_challenge";

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

  // MFA states
  const [mfaChallengeToken, setMfaChallengeToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check URL token or mode on mount
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    const modeParam = searchParams.get("mode");
    const emailParam = searchParams.get("correo");
    if (emailParam) {
      setEmail(emailParam);
    }
    if (tokenParam) {
      setResetToken(tokenParam);
      setMode("reset_password");
    } else if (modeParam === "reset") {
      setMode("reset_password");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Get access token, temporary password redirect, or MFA challenge
      const authData = await authService.login({ correo: email, clave: password });

      // Si el usuario ingresó con una contraseña temporal vigente, redirigir a creación de clave definitiva
      if (authData.requiere_cambio_clave) {
        setResetToken(authData.clave_temporal || password);
        setPassword("");
        setSuccessMessage("Contraseña temporal validada correctamente. Por seguridad, define ahora tu nueva contraseña definitiva.");
        setMode("reset_password");
        return;
      }

      // Si el usuario tiene 2FA activado, pasar a la pantalla de desafío 2FA
      if (authData.requiere_mfa && authData.token_temporal_mfa) {
        setMfaChallengeToken(authData.token_temporal_mfa);
        setMfaCode("");
        setMode("mfa_challenge");
        return;
      }

      if (authData.access_token) {
        localStorage.setItem("marcom_token", authData.access_token);

        // 2. Fetch and store user profile
        const userProfile = await authService.getMe();
        localStorage.setItem("marcom_user", JSON.stringify(userProfile));

        // 3. Redirect to role's authorized workspace
        navigate(getDefaultRouteForRole(userProfile.rol));
      }
    } catch (err: any) {
      setError(err?.message || "Credenciales incorrectas. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) {
      setError("Por favor ingresa el código de 6 dígitos o un código de respaldo.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const authData = await authService.verifyMfaLogin(mfaChallengeToken, mfaCode.trim());
      if (authData.access_token) {
        localStorage.setItem("marcom_token", authData.access_token);
        const userProfile = await authService.getMe();
        localStorage.setItem("marcom_user", JSON.stringify(userProfile));
        navigate(getDefaultRouteForRole(userProfile.rol));
      } else {
        setError("Error al validar la sesión.");
      }
    } catch (err: any) {
      setError(err?.message || "Código 2FA incorrecto o expirado.");
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
      setSuccessMessage(response.mensaje || "Se ha enviado una contraseña temporal a tu correo electrónico.");
      const tempPass = response.clave_temporal || response.token_temporal;
      if (tempPass) {
        setResetToken(tempPass);
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

    if (!resetToken.trim()) {
      setError("Debes ingresar la contraseña temporal enviada a tu correo.");
      return;
    }

    const validation = validateStrongPassword(newPassword);
    if (!validation.isValid) {
      setError(validation.errorMessage || "La contraseña no cumple con los requisitos de seguridad.");
      return;
    }

    if (newPassword.trim() === resetToken.trim()) {
      setError("La nueva contraseña definitiva debe ser diferente a la contraseña temporal.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(
        resetToken.trim(),
        newPassword,
        email.trim() ? email.trim() : undefined
      );
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
      setError(err?.message || "Error al restablecer la contraseña. Verifica tu contraseña temporal.");
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
        <div className="login-header" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <img 
              src="/logo_icon.png" 
              alt="MARCOM" 
              style={{ 
                height: "64px", 
                width: "auto", 
                objectFit: "contain",
                filter: "drop-shadow(0 0 20px rgba(0, 194, 255, 0.45))" 
              }} 
            />
          </div>
          <h2 className="accent-text-gradient" style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "1px", margin: "0 0 6px 0" }}>
            MARCOM
          </h2>
          <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", fontWeight: 500, margin: 0 }}>
            {mode === "login" && "Monitores Profesionales & Soluciones Digitales"}
            {mode === "mfa_challenge" && "Verificación de Seguridad en Dos Pasos (2FA)"}
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

        {/* 1.5. MODO DESAFÍO 2FA / MFA */}
        {mode === "mfa_challenge" && (
          <form onSubmit={handleVerifyMfa}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto",
                color: "#38bdf8"
              }}>
                <ShieldCheck size={28} />
              </div>
              <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.4, margin: 0 }}>
                Tu cuenta tiene activada la protección 2FA. Ingresa el código de <strong>6 dígitos</strong> de tu aplicación autenticadora o uno de tus códigos de respaldo.
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: "22px" }}>
              <label htmlFor="mfa-code" style={{ textAlign: "center", display: "block", marginBottom: "8px" }}>
                Código de Verificación
              </label>
              <input
                id="mfa-code"
                type="text"
                className="glass-input"
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontSize: "1.4rem",
                  letterSpacing: "4px",
                  fontWeight: 700,
                  padding: "12px 14px",
                  textTransform: "uppercase"
                }}
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\s+/g, ''))}
                autoFocus
                required
                maxLength={12}
              />
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
                  <span>Validando código...</span>
                </>
              ) : (
                <span>Verificar e Iniciar Sesión</span>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setMfaChallengeToken("");
                setMfaCode("");
                switchMode("login");
              }}
              style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "8px" }}
            >
              <ArrowLeft size={16} />
              <span>Volver e ingresar con otra cuenta</span>
            </button>
          </form>
        )}

        {/* 2. MODO SOLICITUD DE RECUPERACIÓN */}
        {mode === "request_reset" && (
          <form onSubmit={handleRequestReset}>
            <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.88rem", marginBottom: "20px", textAlign: "center", lineHeight: 1.45 }}>
              Ingresa el correo electrónico de tu cuenta y te enviaremos una <strong>contraseña temporal</strong> desde <code>contacto@marcomchile.cl</code> para recuperar tu acceso.
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
                  <span>Enviando contraseña temporal...</span>
                </>
              ) : (
                <span>Enviar Contraseña Temporal</span>
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
            <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.88rem", marginBottom: "16px", textAlign: "center", lineHeight: 1.45 }}>
              Ingresa la <strong>contraseña temporal</strong> enviada a tu correo y define tu nueva contraseña definitiva segura.
            </p>

            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label htmlFor="token">Contraseña Temporal Recibida</label>
              <div style={{ position: "relative" }}>
                <KeyRound size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
                <input
                  id="token"
                  type="text"
                  className="glass-input"
                  style={{ width: "100%", paddingLeft: "45px", fontFamily: "monospace", fontSize: "0.95rem", letterSpacing: "1px" }}
                  placeholder="Ej: Mc#4829Kp!"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label htmlFor="new-password">Nueva Contraseña Definitiva</label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
                <input
                  id="new-password"
                  type="password"
                  className="glass-input"
                  style={{ width: "100%", paddingLeft: "45px" }}
                  placeholder="Alfanumérica + carácter especial (mín. 8)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <PasswordRequirementsChecklist password={newPassword} />
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
                  minLength={8}
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
                <span>Guardar Nueva Contraseña</span>
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

        {/* Enlace para volver a la Portada Corporativa */}
        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "#38bdf8",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <ArrowLeft size={15} />
            <span>Volver al Sitio Corporativo (Portada)</span>
          </button>
        </div>
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

