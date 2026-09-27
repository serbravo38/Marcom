import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, User, Mail, Phone, MapPin, Lock, Loader2, CheckCircle2, AlertCircle, Shield, KeyRound, Smartphone, Copy, Check, ShieldCheck, ShieldAlert } from "lucide-react";
import { authService } from "../services/auth";
import type { Usuario } from "../services/auth";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updatedUser: Usuario) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onProfileUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [rut, setRut] = useState("");
  const [rol, setRol] = useState("");
  
  // Profile specific
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");

  // Password change section
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA / MFA States
  const [mfaHabilitado, setMfaHabilitado] = useState(false);
  const [mfaConfigMode, setMfaConfigMode] = useState(false);
  const [mfaDeactivateMode, setMfaDeactivateMode] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{ secreto_manual: string; qr_codigo_base64: string; otpauth_url: string } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([]);
  const [mfaDeactPassword, setMfaDeactPassword] = useState("");
  const [mfaDeactCode, setMfaDeactCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadProfile = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        setSuccessMsg(null);
        setChangePassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Reset MFA UI states
        setMfaConfigMode(false);
        setMfaDeactivateMode(false);
        setMfaSetupData(null);
        setMfaVerifyCode("");
        setMfaBackupCodes([]);
        setMfaError(null);
        setMfaSuccess(null);

        const user = await authService.getMe();
        setNombre(user.nombre || "");
        setApellido(user.apellido || "");
        setCorreo(user.correo || "");
        setRut(user.rut || "");
        setRol(user.rol || "");
        setMfaHabilitado(Boolean(user.mfa_habilitado));

        if (user.perfil) {
          setTelefono(user.perfil.telefono || "");
          setDireccion(user.perfil.direccion || "");
          setRegion(user.perfil.region || "");
          setComuna(user.perfil.comuna || "");
        }
      } catch (err: any) {
        setError(err?.message || "Error al cargar la información del perfil.");
      } finally {
        setInitialLoading(false);
      }
    };

    loadProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (changePassword) {
      if (!currentPassword) {
        setError("Debes ingresar tu contraseña actual para cambiarla.");
        return;
      }
      if (newPassword.length < 6) {
        setError("La nueva contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("La nueva contraseña y su confirmación no coinciden.");
        return;
      }
    }

    try {
      setLoading(true);

      const updatePayload: any = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        region: region.trim(),
        comuna: comuna.trim()
      };

      if (changePassword && newPassword) {
        updatePayload.clave_actual = currentPassword;
        updatePayload.nueva_clave = newPassword;
      }

      const updatedUser = await authService.updateMe(updatePayload);
      
      // Update local storage
      localStorage.setItem("marcom_user", JSON.stringify(updatedUser));
      
      setSuccessMsg("¡Tus datos han sido actualizados exitosamente!");
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      // Clear password fields
      setChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Auto close after 1.4s
      setTimeout(() => {
        onClose();
      }, 1400);

    } catch (err: any) {
      setError(err?.message || "Error al actualizar los datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartMfaSetup = async () => {
    try {
      setMfaLoading(true);
      setMfaError(null);
      setMfaSuccess(null);
      const data = await authService.setupMfa();
      setMfaSetupData(data);
      setMfaConfigMode(true);
      setMfaDeactivateMode(false);
    } catch (err: any) {
      setMfaError(err?.message || "Error al iniciar configuración 2FA.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmMfaActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaVerifyCode.trim() || mfaVerifyCode.length !== 6) {
      setMfaError("Por favor ingresa el código de 6 dígitos que muestra tu app.");
      return;
    }
    try {
      setMfaLoading(true);
      setMfaError(null);
      const res = await authService.activateMfa(mfaVerifyCode.trim());
      setMfaHabilitado(true);
      setMfaBackupCodes(res.codigos_respaldo);
      setMfaConfigMode(false);
      setMfaSuccess(res.mensaje);
      
      const user = await authService.getMe();
      localStorage.setItem("marcom_user", JSON.stringify(user));
      if (onProfileUpdated) onProfileUpdated(user);
    } catch (err: any) {
      setMfaError(err?.message || "Código incorrecto o expirado. Verifica la hora de tu teléfono.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDeactivateMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaDeactPassword || !mfaDeactCode) {
      setMfaError("Debes ingresar tu contraseña y un código 2FA o de respaldo.");
      return;
    }
    try {
      setMfaLoading(true);
      setMfaError(null);
      const res = await authService.deactivateMfa(mfaDeactPassword, mfaDeactCode.trim());
      setMfaHabilitado(false);
      setMfaDeactivateMode(false);
      setMfaBackupCodes([]);
      setMfaDeactPassword("");
      setMfaDeactCode("");
      setMfaSuccess(res.mensaje);

      const user = await authService.getMe();
      localStorage.setItem("marcom_user", JSON.stringify(user));
      if (onProfileUpdated) onProfileUpdated(user);
    } catch (err: any) {
      setMfaError(err?.message || "Error al desactivar 2FA. Verifica tus datos.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    if (mfaBackupCodes.length > 0) {
      navigator.clipboard.writeText(mfaBackupCodes.join("\n"));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2500);
    }
  };

  return createPortal(
    <div 
      className="profile-modal-backdrop animate-fade-in"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 999999,
        boxSizing: "border-box",
        overflowY: "auto"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div 
        className="glass-panel" 
        style={{ 
          maxWidth: "620px", 
          width: "100%", 
          maxHeight: "92vh", 
          overflowY: "auto",
          borderRadius: "20px",
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.15)",
          padding: "28px 32px",
          position: "relative",
          margin: "auto"
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ 
              width: "48px", 
              height: "48px", 
              borderRadius: "14px", 
              background: "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(99, 102, 241, 0.25))", 
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(56, 189, 248, 0.2)"
            }}>
              <User size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }} className="accent-text-gradient">
                Mi Perfil y Cuenta
              </h3>
              <p style={{ margin: "3px 0 0 0", fontSize: "0.85rem", color: "hsl(var(--text-muted))" }}>
                Actualiza tu información personal y credenciales de acceso
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            style={{ 
              background: "rgba(255, 255, 255, 0.06)", 
              border: "1px solid rgba(255, 255, 255, 0.1)", 
              color: "hsl(var(--text-muted))", 
              borderRadius: "50%", 
              width: "34px", 
              height: "34px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "hsl(var(--text-muted))";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {initialLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "12px" }}>
            <Loader2 className="spin" style={{ animation: "spin 1s linear infinite", color: "var(--accent-color, #38bdf8)" }} size={36} />
            <span style={{ fontSize: "0.9rem", color: "hsl(var(--text-muted))" }}>Cargando datos del perfil...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="badge error" style={{ width: "100%", padding: "12px", marginBottom: "18px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", boxSizing: "border-box" }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ width: "100%", padding: "12px", marginBottom: "18px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", boxSizing: "border-box" }}>
                <CheckCircle2 size={18} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Readonly Identity summary */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "16px", 
              marginBottom: "22px", 
              background: "rgba(255, 255, 255, 0.03)", 
              padding: "14px 18px", 
              borderRadius: "12px", 
              border: "1px solid rgba(255, 255, 255, 0.06)" 
            }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>RUT Identificador:</span>
                <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f1f5f9" }}>{rut || "—"}</span>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rol Asignado:</span>
                <span className="badge primary" style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
                  <Shield size={12} />
                  <span>{rol.replace("_", " ")}</span>
                </span>
              </div>
            </div>

            {/* Section 1: Personal Info */}
            <div style={{ marginBottom: "22px" }}>
              <h4 style={{ fontSize: "0.92rem", color: "var(--accent-color, #38bdf8)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                <User size={16} />
                <span>Información Personal</span>
              </h4>

              <div className="form-row" style={{ marginBottom: "14px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="modal-nombre">Nombre</label>
                  <input
                    id="modal-nombre"
                    type="text"
                    className="glass-input"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="modal-apellido">Apellido</label>
                  <input
                    id="modal-apellido"
                    type="text"
                    className="glass-input"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="modal-correo">Correo Electrónico</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
                  <input
                    id="modal-correo"
                    type="email"
                    className="glass-input"
                    style={{ width: "100%", paddingLeft: "42px" }}
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Location */}
            <div style={{ marginBottom: "22px" }}>
              <h4 style={{ fontSize: "0.92rem", color: "var(--accent-color, #38bdf8)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                <MapPin size={16} />
                <span>Contacto y Ubicación</span>
              </h4>

              <div className="form-row" style={{ marginBottom: "14px" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="modal-telefono">Teléfono de Contacto</label>
                  <div style={{ position: "relative" }}>
                    <Phone size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
                    <input
                      id="modal-telefono"
                      type="text"
                      className="glass-input"
                      style={{ width: "100%", paddingLeft: "42px" }}
                      placeholder="+56 9 1234 5678"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="modal-direccion">Dirección</label>
                  <input
                    id="modal-direccion"
                    type="text"
                    className="glass-input"
                    placeholder="Av. Providencia 1234"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="modal-region">Región</label>
                  <input
                    id="modal-region"
                    type="text"
                    className="glass-input"
                    placeholder="Metropolitana"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="modal-comuna">Comuna</label>
                  <input
                    id="modal-comuna"
                    type="text"
                    className="glass-input"
                    placeholder="Santiago"
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Password Security */}
            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "18px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: changePassword ? "16px" : "0" }}>
                <span style={{ fontSize: "0.92rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Lock size={16} style={{ color: "#38bdf8" }} />
                  <span>Seguridad de Contraseña</span>
                </span>
                <button
                  type="button"
                  onClick={() => setChangePassword(!changePassword)}
                  style={{
                    background: changePassword ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.15)",
                    border: `1px solid ${changePassword ? "rgba(239, 68, 68, 0.3)" : "rgba(56, 189, 248, 0.3)"}`,
                    color: changePassword ? "#fca5a5" : "#38bdf8",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "all 0.2s ease"
                  }}
                >
                  {changePassword ? "Cancelar cambio de contraseña" : "Cambiar mi contraseña"}
                </button>
              </div>

              {changePassword && (
                <div style={{ background: "rgba(0,0,0,0.25)", padding: "18px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", marginTop: "12px" }}>
                  <div className="form-group" style={{ marginBottom: "14px" }}>
                    <label htmlFor="modal-current-password">Contraseña Actual (para validar cambios)</label>
                    <div style={{ position: "relative" }}>
                      <KeyRound size={16} style={{ position: "absolute", left: "14px", top: "14px", color: "rgba(255,255,255,0.4)" }} />
                      <input
                        id="modal-current-password"
                        type="password"
                        className="glass-input"
                        style={{ width: "100%", paddingLeft: "42px" }}
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required={changePassword}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label htmlFor="modal-new-password">Nueva Contraseña (mín. 6 caracteres)</label>
                      <input
                        id="modal-new-password"
                        type="password"
                        className="glass-input"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={6}
                        required={changePassword}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label htmlFor="modal-confirm-password">Confirmar Nueva Contraseña</label>
                      <input
                        id="modal-confirm-password"
                        type="password"
                        className="glass-input"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={6}
                        required={changePassword}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: 2FA / MFA Security */}
            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "18px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: (mfaConfigMode || mfaDeactivateMode || mfaBackupCodes.length > 0) ? "16px" : "0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldCheck size={18} style={{ color: mfaHabilitado ? "#34d399" : "#38bdf8" }} />
                  <div>
                    <span style={{ fontSize: "0.92rem", fontWeight: 600, display: "block" }}>
                      Autenticación de Doble Factor (2FA / MFA)
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))" }}>
                      Protege tu cuenta con Google Authenticator o Microsoft Authenticator (RFC 6238)
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span 
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: mfaHabilitado ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                      color: mfaHabilitado ? "#34d399" : "#94a3b8",
                      border: `1px solid ${mfaHabilitado ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.12)"}`
                    }}
                  >
                    {mfaHabilitado ? "PROTEGIDO" : "DESACTIVADO"}
                  </span>

                  {!mfaHabilitado && !mfaConfigMode && (
                    <button
                      type="button"
                      onClick={handleStartMfaSetup}
                      disabled={mfaLoading}
                      style={{
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <Smartphone size={14} />
                      <span>{mfaLoading ? "Iniciando..." : "Configurar 2FA"}</span>
                    </button>
                  )}

                  {mfaHabilitado && !mfaDeactivateMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setMfaDeactivateMode(true);
                        setMfaError(null);
                        setMfaSuccess(null);
                      }}
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#fca5a5",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        fontWeight: 500
                      }}
                    >
                      Desactivar 2FA
                    </button>
                  )}
                </div>
              </div>

              {/* MFA Messages */}
              {mfaError && (
                <div className="badge error" style={{ width: "100%", padding: "10px", margin: "12px 0", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", boxSizing: "border-box" }}>
                  <AlertCircle size={16} />
                  <span>{mfaError}</span>
                </div>
              )}

              {mfaSuccess && (
                <div style={{ width: "100%", padding: "10px", margin: "12px 0", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.86rem", boxSizing: "border-box" }}>
                  <CheckCircle2 size={16} />
                  <span>{mfaSuccess}</span>
                </div>
              )}

              {/* Backup codes panel when activated */}
              {mfaBackupCodes.length > 0 && (
                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "16px", borderRadius: "12px", margin: "14px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontWeight: 600, fontSize: "0.9rem" }}>
                      <CheckCircle2 size={18} />
                      <span>Códigos de Respaldo de Emergencia</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyBackupCodes}
                      style={{
                        background: copiedCodes ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#fff",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      {copiedCodes ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCodes ? "¡Copiados!" : "Copiar todos"}</span>
                    </button>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.75)", margin: "0 0 10px 0" }}>
                    Cada código es de un solo uso. Guárdalos en un lugar seguro para iniciar sesión si pierdes acceso a tu teléfono.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                    {mfaBackupCodes.map((code, idx) => (
                      <div key={idx} style={{ background: "rgba(0, 0, 0, 0.3)", padding: "6px 8px", borderRadius: "6px", textAlign: "center", fontFamily: "monospace", fontSize: "0.85rem", color: "#f1f5f9", fontWeight: 600 }}>
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MFA Setup Wizard */}
              {mfaConfigMode && mfaSetupData && (
                <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "20px", borderRadius: "14px", border: "1px solid rgba(56, 189, 248, 0.25)", marginTop: "14px" }}>
                  <div style={{ textAlign: "center", marginBottom: "16px" }}>
                    <h5 style={{ margin: "0 0 6px 0", fontSize: "1rem", color: "#38bdf8", fontWeight: 600 }}>
                      Enrolar Dispositivo Autenticador
                    </h5>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.75)" }}>
                      1. Abre Google Authenticator, Microsoft Authenticator o Authy en tu teléfono y escanea este código QR:
                    </p>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                    <div style={{ background: "#fff", padding: "10px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                      <img 
                        src={mfaSetupData.qr_codigo_base64} 
                        alt="Código QR 2FA" 
                        style={{ width: "160px", height: "160px", display: "block" }} 
                      />
                    </div>
                  </div>

                  <div style={{ textAlign: "center", marginBottom: "18px" }}>
                    <span style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))", display: "block", marginBottom: "4px" }}>
                      ¿No puedes escanear el código? Ingresa esta clave secreta manualmente:
                    </span>
                    <code style={{ background: "rgba(255, 255, 255, 0.08)", padding: "4px 10px", borderRadius: "6px", fontSize: "0.9rem", letterSpacing: "2px", color: "#38bdf8", fontWeight: 600 }}>
                      {mfaSetupData.secreto_manual}
                    </code>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "16px" }}>
                    <p style={{ margin: "0 0 10px 0", fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.8)", textAlign: "center" }}>
                      2. Ingresa el código de <strong>6 dígitos</strong> generado en tu teléfono para confirmar la vinculación:
                    </p>
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", maxWidth: "340px", margin: "0 auto 14px auto" }}>
                      <input
                        type="text"
                        className="glass-input"
                        placeholder="000000"
                        maxLength={6}
                        value={mfaVerifyCode}
                        onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                        style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "3px", fontWeight: 700, width: "160px" }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleConfirmMfaActivation}
                        disabled={mfaLoading || mfaVerifyCode.length !== 6}
                        className="btn-primary"
                        style={{ padding: "8px 16px", whiteSpace: "nowrap" }}
                      >
                        {mfaLoading ? <Loader2 size={16} className="spin" /> : "Confirmar"}
                      </button>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setMfaConfigMode(false);
                          setMfaSetupData(null);
                          setMfaVerifyCode("");
                          setMfaError(null);
                        }}
                        style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.5)", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Cancelar configuración de 2FA
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MFA Deactivate Confirmation */}
              {mfaDeactivateMode && (
                <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "16px", borderRadius: "12px", marginTop: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#fca5a5", marginBottom: "10px", fontWeight: 600, fontSize: "0.9rem" }}>
                    <ShieldAlert size={18} />
                    <span>Confirmar Desactivación de 2FA</span>
                  </div>
                  <p style={{ margin: "0 0 14px 0", fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.75)" }}>
                    Para desactivar el doble factor de autenticación, confirma tu contraseña actual y un código generado por tu app o de respaldo.
                  </p>

                  <div className="form-row" style={{ marginBottom: "12px" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.78rem" }}>Contraseña Actual</label>
                      <input
                        type="password"
                        className="glass-input"
                        placeholder="••••••••"
                        value={mfaDeactPassword}
                        onChange={(e) => setMfaDeactPassword(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.78rem" }}>Código 2FA / Respaldo</label>
                      <input
                        type="text"
                        className="glass-input"
                        placeholder="6 dígitos o código"
                        value={mfaDeactCode}
                        onChange={(e) => setMfaDeactCode(e.target.value.trim())}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setMfaDeactivateMode(false);
                        setMfaDeactPassword("");
                        setMfaDeactCode("");
                        setMfaError(null);
                      }}
                      style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDeactivateMfa}
                      disabled={mfaLoading || !mfaDeactPassword || !mfaDeactCode}
                      style={{
                        background: "#ef4444",
                        border: "none",
                        color: "#fff",
                        padding: "6px 16px",
                        borderRadius: "6px",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      {mfaLoading ? "Desactivando..." : "Desactivar Permanentemente"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "20px" }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={onClose} 
                disabled={loading}
                style={{ padding: "10px 20px" }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
                style={{ padding: "10px 24px", minWidth: "150px", justifyContent: "center" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Cambios</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ProfileModal;
