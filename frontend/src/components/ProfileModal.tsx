import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, User, Mail, Phone, MapPin, Lock, Loader2, CheckCircle2, AlertCircle, Shield, KeyRound } from "lucide-react";
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

        const user = await authService.getMe();
        setNombre(user.nombre || "");
        setApellido(user.apellido || "");
        setCorreo(user.correo || "");
        setRut(user.rut || "");
        setRol(user.rol || "");

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
