import React, { useState, useEffect } from "react";
import { Plus, X, Loader2, CreditCard, AlertCircle } from "lucide-react";
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
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [rut, setRut] = useState("");
  const [creditLimit, setCreditLimit] = useState(0);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      await authService.createAgreement({
        nombre_empresa: companyName,
        rut,
        limite_credito: Number(creditLimit),
        credito_usado: 0,
        activo: true
      });
      
      // Reset form and close modal
      setCompanyName("");
      setRut("");
      setCreditLimit(0);
      setIsModalOpen(false);
      
      // Refresh list
      fetchAgreements();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo registrar el convenio.");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="agreements-view animate-fade-in">
      <div className="glass-panel card-container">
        <div className="panel-title">
          <span>Convenios Corporativos Registrados</span>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Crear Convenio</span>
          </button>
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
              No hay convenios creados aún. Haz clic en "Crear Convenio" para registrar el primero.
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Agreement Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }} className="accent-text-gradient">
              <CreditCard size={20} />
              <span>Nuevo Convenio de Cliente</span>
            </h3>

            {modalError && (
              <div className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAgreement}>
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

              <div className="form-group" style={{ marginBottom: "30px" }}>
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
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
                    <span>Registrar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
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
