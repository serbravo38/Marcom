import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Loader2, CreditCard, AlertCircle, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { authService } from "../services/auth";

type Agreement = {
  convenio_id: string | number;
  nombre_empresa: string;
  rut: string;
  limite_credito: number;
  credito_usado: number;
  activo: boolean;
};

export const Agreements: React.FC = () => {
  const [currentUser] = useState<any>(() => {
    const userJson = localStorage.getItem("marcom_user");
    return userJson ? JSON.parse(userJson) : null;
  });

  const isClientRole = currentUser?.rol === "CLIENTE_CONVENIO";
  const isAdmin = currentUser?.rol === "ADMIN";

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [rut, setRut] = useState("");
  const [creditLimit, setCreditLimit] = useState(0);
  const [usedCredit, setUsedCredit] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal Confirmación Eliminar (Seguridad)
  const [agreementToDelete, setAgreementToDelete] = useState<Agreement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.getAgreements();
      setAgreements(data);
    } catch (err: any) {
      setError(err?.message || "Error al cargar convenios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingAgreement(null);
    setCompanyName("");
    setRut("");
    setCreditLimit(0);
    setUsedCredit(0);
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (agreement: Agreement) => {
    setEditingAgreement(agreement);
    setCompanyName(agreement.nombre_empresa);
    setRut(agreement.rut);
    setCreditLimit(agreement.limite_credito);
    setUsedCredit(agreement.credito_usado);
    setIsActive(agreement.activo);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      if (editingAgreement) {
        // Modo Edición (Solo ADMIN)
        await authService.updateAgreement(editingAgreement.convenio_id, {
          nombre_empresa: companyName.trim(),
          rut: rut.trim(),
          limite_credito: Number(creditLimit),
          credito_usado: Number(usedCredit),
          activo: isActive
        });
      } else {
        // Modo Creación
        await authService.createAgreement({
          nombre_empresa: companyName.trim(),
          rut: rut.trim(),
          limite_credito: Number(creditLimit),
          credito_usado: 0,
          activo: true
        });
      }

      setIsModalOpen(false);
      setEditingAgreement(null);
      fetchAgreements();
    } catch (err: any) {
      setModalError(err?.message || (editingAgreement ? "No se pudo actualizar el convenio." : "No se pudo registrar el convenio."));
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!agreementToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await authService.deleteAgreement(agreementToDelete.convenio_id);
      setAgreementToDelete(null);
      fetchAgreements();
    } catch (err: any) {
      setDeleteError(err?.message || "Ocurrió un error al intentar eliminar el convenio.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const clientAgreement = agreements.length > 0 ? agreements[0] : null;

  return (
    <div className="agreements-view animate-fade-in">
      {isClientRole && clientAgreement && (
        <div className="glass-panel" style={{ padding: "24px", marginBottom: "25px", borderRadius: "12px" }}>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 16px 0", color: "#fff" }}>
            Estado de Mi Convenio: {clientAgreement.nombre_empresa}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "14px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
              <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>RUT Empresa</span>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: "4px 0 0 0" }}>{clientAgreement.rut}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "14px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
              <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>Línea de Crédito</span>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: "4px 0 0 0", color: "hsl(var(--secondary))" }}>
                ${clientAgreement.limite_credito.toLocaleString('es-CL')}
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "14px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
              <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>Crédito Utilizado</span>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: "4px 0 0 0" }}>
                ${clientAgreement.credito_usado.toLocaleString('es-CL')}
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "14px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
              <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>Crédito Disponible</span>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, margin: "4px 0 0 0", color: "hsl(var(--success))" }}>
                ${Math.max(0, clientAgreement.limite_credito - clientAgreement.credito_usado).toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel card-container">
        <div className="panel-title">
          <span>{isClientRole ? "Mi Contrato Corporativo" : "Convenios Corporativos Registrados"}</span>
          {isAdmin && (
            <button className="btn-primary" onClick={handleOpenCreateModal}>
              <Plus size={16} />
              <span>Crear Convenio</span>
            </button>
          )}
        </div>

        {error && (
          <div className="badge error" style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px" }}>
            {error}
          </div>
        )}

        <div className="table-responsive">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 className="spin" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : agreements.length === 0 ? (
            <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "35px" }}>
              {isClientRole ? "No se encontró un convenio asociado a tu cuenta." : "No hay convenios creados aún."}
            </p>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>RUT</th>
                  <th>Límite de Crédito</th>
                  <th>Crédito Utilizado</th>
                  <th>Estado</th>
                  {isAdmin && <th style={{ textAlign: "right" }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {agreements.map((agreement) => (
                  <tr key={agreement.convenio_id}>
                    <td style={{ fontWeight: 600 }}>{agreement.nombre_empresa}</td>
                    <td>{agreement.rut}</td>
                    <td>${agreement.limite_credito.toLocaleString('es-CL')}</td>
                    <td>${agreement.credito_usado.toLocaleString('es-CL')}</td>
                    <td>
                      <span className={`badge ${agreement.activo ? "success" : "error"}`}>
                        {agreement.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.82rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer"
                            }}
                            onClick={() => handleOpenEditModal(agreement)}
                            title="Editar este convenio"
                          >
                            <Pencil size={14} />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.82rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                              background: "rgba(239, 68, 68, 0.12)",
                              color: "#f87171",
                              borderColor: "rgba(239, 68, 68, 0.3)"
                            }}
                            onClick={() => {
                              setAgreementToDelete(agreement);
                              setDeleteError(null);
                            }}
                            title="Eliminar este convenio"
                          >
                            <Trash2 size={14} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Crear / Editar Convenio */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }} className="accent-text-gradient">
              {editingAgreement ? <Pencil size={20} /> : <CreditCard size={20} />}
              <span>{editingAgreement ? "Editar Convenio Corporativo" : "Nuevo Convenio de Cliente"}</span>
            </h3>

            {modalError && (
              <div className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAgreement}>
              <div className="form-group">
                <label>Nombre de la Empresa</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Copec S.A."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>RUT de la Empresa</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="99.888.777-6"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Límite de Crédito ($)</label>
                <input
                  type="number"
                  className="glass-input"
                  placeholder="500000"
                  value={creditLimit || ""}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  required
                />
              </div>

              {editingAgreement && (
                <>
                  <div className="form-group">
                    <label>Crédito Utilizado ($)</label>
                    <input
                      type="number"
                      className="glass-input"
                      placeholder="0"
                      value={usedCredit}
                      onChange={(e) => setUsedCredit(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: "25px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        style={{ width: "18px", height: "18px", accentColor: "hsl(var(--primary))" }}
                      />
                      <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>Convenio Activo para Operaciones</span>
                    </label>
                  </div>
                </>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>
                  {modalLoading ? (
                    <>
                      <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingAgreement ? "Guardar Cambios" : "Registrar"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmación de Seguridad para Eliminar */}
      {agreementToDelete && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: "480px" }}>
            <button className="modal-close" onClick={() => setAgreementToDelete(null)}>
              <X size={20} />
            </button>
            <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                marginBottom: "16px"
              }}>
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
                Confirmación de Seguridad
              </h3>
              <p style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "#f87171",
                marginBottom: "12px",
                lineHeight: 1.4
              }}>
                ¿Estás seguro que deseas eliminar este convenio?
              </p>
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--glass-border)",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "16px",
                textAlign: "left",
                fontSize: "0.9rem"
              }}>
                <div style={{ color: "#fff", fontWeight: 600 }}>{agreementToDelete.nombre_empresa}</div>
                <div style={{ color: "hsl(var(--text-muted))", fontSize: "0.82rem" }}>RUT: {agreementToDelete.rut}</div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "hsl(var(--text-muted))", margin: 0 }}>
                Esta acción removerá el convenio de la plataforma y desvinculará sus registros asociados.
              </p>
            </div>

            {deleteError && (
              <div className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAgreementToDelete(null)}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: "#dc2626",
                  borderColor: "#b91c1c",
                  color: "#fff"
                }}
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar Convenio</span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
export default Agreements;
