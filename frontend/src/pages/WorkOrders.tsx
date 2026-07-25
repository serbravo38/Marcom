import React, { useState, useEffect } from "react";
import { 
  Plus, 
  X, 
  Loader2, 
  Eye, 
  FileImage,
  Link2
} from "lucide-react";
import { workOrdersService, type WorkOrder } from "../services/workOrders";
import { authService, type User, type Agreement } from "../services/auth";
import { inventoryService, type Location, type Asset } from "../services/inventory";

export const WorkOrders: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected work order for detailed view modal
  const [selectedWo, setSelectedWo] = useState<WorkOrder | null>(null);

  // Modals Open State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLinkAssetOpen, setIsLinkAssetOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Work Order Form Fields
  const [woNumber, setWoNumber] = useState("");
  const [woAgreementId, setWoAgreementId] = useState("");
  const [woLocationId, setWoLocationId] = useState("");
  const [woTechId, setWoTechId] = useState("");
  const [woScheduledDate, setWoScheduledDate] = useState("");
  const [woNotes, setWoNotes] = useState("");

  // Link Asset Form Fields
  const [linkInstalledId, setLinkInstalledId] = useState("");
  const [linkRemovedId, setLinkRemovedId] = useState("");
  const [linkActionType, setLinkActionType] = useState("INSTALACION_NUEVA");

  // Evidence Form Fields
  const [evImageUrl, setEvImageUrl] = useState("");
  const [evSigUrl, setEvSigUrl] = useState("");
  const [evComments, setEvComments] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [wosData, usersData, agreementsData, locationsData, assetsData] = await Promise.all([
        workOrdersService.getWorkOrders(),
        authService.getUsers().catch(() => [] as User[]),
        authService.getAgreements().catch(() => [] as Agreement[]),
        inventoryService.getLocations().catch(() => [] as Location[]),
        inventoryService.getAssets().catch(() => [] as Asset[])
      ]);

      setWorkOrders(wosData);
      setTechnicians(usersData.filter(u => u.role === "TECNICO_TERRENO" || u.role === "ADMIN"));
      setAgreements(agreementsData);
      setLocations(locationsData);
      setAssets(assetsData);
      
      // Keep selected work order updated if it was open
      if (selectedWo) {
        const updatedWo = wosData.find(w => w.work_order_id === selectedWo.work_order_id);
        if (updatedWo) setSelectedWo(updatedWo);
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al cargar datos de órdenes de trabajo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await workOrdersService.createWorkOrder({
        order_number: woNumber,
        client_agreement_id: woAgreementId || null,
        location_id: woLocationId,
        assigned_technician_id: woTechId || null,
        status: "PENDIENTE",
        scheduled_date: new Date(woScheduledDate).toISOString(),
        notes: woNotes || null
      });
      setIsCreateOpen(false);
      // Reset form
      setWoNumber(""); setWoAgreementId(""); setWoLocationId(""); setWoTechId(""); setWoScheduledDate(""); setWoNotes("");
      fetchData();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo crear la orden de trabajo.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleLinkAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWo) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await workOrdersService.addWorkOrderAsset(selectedWo.work_order_id, {
        installed_asset_id: linkInstalledId || null,
        removed_asset_id: linkRemovedId || null,
        action_type: linkActionType
      });
      setIsLinkAssetOpen(false);
      setLinkInstalledId(""); setLinkRemovedId(""); setLinkActionType("INSTALACION_NUEVA");
      fetchData();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo vincular el activo.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWo) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await workOrdersService.uploadEvidence(selectedWo.work_order_id, {
        image_url: evImageUrl,
        signature_url: evSigUrl || null,
        comments: evComments || null
      });
      setIsEvidenceOpen(false);
      setEvImageUrl(""); setEvSigUrl(""); setEvComments("");
      fetchData();
    } catch (err: any) {
      setModalError(err?.message || "No se pudo registrar la evidencia.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedWo) return;
    try {
      const updated = await workOrdersService.updateWorkOrder(selectedWo.work_order_id, {
        status: status,
        completion_date: status === "COMPLETADA" ? new Date().toISOString() : null
      });
      setSelectedWo(updated);
      fetchData();
    } catch (err: any) {
      alert("Error al actualizar el estado: " + err.message);
    }
  };

  return (
    <div className="work-orders-view animate-fade-in">
      {error && (
        <div className="badge error" style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px" }}>
          {error}
        </div>
      )}

      <div className="glass-panel card-container">
        <div className="panel-title">
          <span>Órdenes de Trabajo en Terreno</span>
          <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} />
            <span>Crear OT</span>
          </button>
        </div>

        <div className="table-responsive">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 className="spin" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : workOrders.length === 0 ? (
            <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "35px" }}>
              No hay órdenes de trabajo programadas.
            </p>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>N° Orden</th>
                  <th>Cliente (Convenio)</th>
                  <th>Ubicación</th>
                  <th>Técnico Asignado</th>
                  <th>Fecha Programada</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => {
                  const agreement = agreements.find(a => a.agreement_id === wo.client_agreement_id);
                  const location = locations.find(l => l.location_id === wo.location_id);
                  const tech = technicians.find(t => t.user_id === wo.assigned_technician_id);
                  return (
                    <tr key={wo.work_order_id}>
                      <td style={{ fontWeight: 600 }}>{wo.order_number}</td>
                      <td>{agreement ? agreement.company_name : "Cliente Estándar"}</td>
                      <td>{location ? location.name : "N/A"}</td>
                      <td>{tech ? `${tech.first_name} ${tech.last_name}` : "Sin Asignar"}</td>
                      <td>{new Date(wo.scheduled_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${
                          wo.status === "COMPLETADA" ? "success" : 
                          wo.status === "CANCELADA" ? "error" : 
                          wo.status === "EN_PROCESO" ? "secondary" : "warning"
                        }`}>
                          {wo.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          onClick={() => setSelectedWo(wo)}
                        >
                          <Eye size={14} />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Create Work Order Modal */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => setIsCreateOpen(false)}><X size={20} /></button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600 }} className="accent-text-gradient">Programar Nueva Orden de Trabajo</h3>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleCreateWorkOrder}>
              <div className="form-row">
                <div className="form-group">
                  <label>Número de Orden</label>
                  <input type="text" className="glass-input" placeholder="OT-2026-001" value={woNumber} onChange={e=>setWoNumber(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Fecha Programada</label>
                  <input type="datetime-local" className="glass-input" value={woScheduledDate} onChange={e=>setWoScheduledDate(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Ubicación / Bodega / Tienda Cliente</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={woLocationId} onChange={e=>setWoLocationId(e.target.value)} required>
                  <option value="">Selecciona ubicación...</option>
                  {locations.map(l=><option key={l.location_id} value={l.location_id}>{l.name} - {l.address}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Convenio Asociado (Opcional)</label>
                  <select className="glass-input" style={{ background: "#1b2030" }} value={woAgreementId} onChange={e=>setWoAgreementId(e.target.value)}>
                    <option value="">Ninguno / Cliente Estándar</option>
                    {agreements.map(a=><option key={a.agreement_id} value={a.agreement_id}>{a.company_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Asignar Técnico</label>
                  <select className="glass-input" style={{ background: "#1b2030" }} value={woTechId} onChange={e=>setWoTechId(e.target.value)}>
                    <option value="">Sin asignar / Pendiente</option>
                    {technicians.map(t=><option key={t.user_id} value={t.user_id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "25px" }}>
                <label>Notas de Programación</label>
                <textarea className="glass-input" placeholder="Instrucciones especiales para el técnico..." value={woNotes} onChange={e=>setWoNotes(e.target.value)} style={{ minHeight: "80px", resize: "none" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>Programar OT</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Work Order View Modal */}
      {selectedWo && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: "600px" }}>
            <button className="modal-close" onClick={() => setSelectedWo(null)}><X size={20} /></button>
            <h3 style={{ marginBottom: "5px", fontWeight: 600 }} className="accent-text-gradient">Detalle de la Orden: {selectedWo.order_number}</h3>
            <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", marginBottom: "25px" }}>
              Programada para: {new Date(selectedWo.scheduled_date).toLocaleString()}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Status Section */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "15px", borderRadius: "8px" }}>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))", display: "block" }}>Estado actual</span>
                  <span className={`badge ${
                    selectedWo.status === "COMPLETADA" ? "success" : 
                    selectedWo.status === "CANCELADA" ? "error" : "warning"
                  }`} style={{ fontSize: "0.9rem", marginTop: "4px" }}>
                    {selectedWo.status}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {selectedWo.status !== "COMPLETADA" && (
                    <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleUpdateStatus("COMPLETADA")}>
                      Completar
                    </button>
                  )}
                  {selectedWo.status !== "CANCELADA" && (
                    <button className="btn-logout" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleUpdateStatus("CANCELADA")}>
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* Linked Assets involved */}
              <div>
                <h4 className="panel-title" style={{ fontSize: "1rem" }}>
                  <span>Equipos Instalados/Retirados</span>
                  <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => setIsLinkAssetOpen(true)}>
                    <Link2 size={12} />
                    <span>Vincular Activo</span>
                  </button>
                </h4>
                {(!selectedWo.assets || selectedWo.assets.length === 0) ? (
                  <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))" }}>No se han declarado activos para esta orden.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedWo.assets.map(a => {
                      const inst = assets.find(as => as.asset_id === a.installed_asset_id);
                      const rem = assets.find(as => as.asset_id === a.removed_asset_id);
                      return (
                        <div key={a.wo_asset_id} style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)", padding: "10px 14px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.03)" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{a.action_type}</span>
                          <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                            {inst && `Instalado: SN-${inst.serial_number}`}
                            {rem && ` | Retirado: SN-${rem.serial_number}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Field Evidence */}
              <div>
                <h4 className="panel-title" style={{ fontSize: "1rem" }}>
                  <span>Evidencias y Firmas de Terreno</span>
                  <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => setIsEvidenceOpen(true)}>
                    <FileImage size={12} />
                    <span>Subir Evidencia</span>
                  </button>
                </h4>
                {(!selectedWo.evidences || selectedWo.evidences.length === 0) ? (
                  <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))" }}>No se han registrado evidencias para este trabajo.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    {selectedWo.evidences.map(e => (
                      <div key={e.evidence_id} className="glass-panel" style={{ padding: "12px", borderRadius: "8px" }}>
                        <img src={e.image_url} alt="Evidencia" style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px", marginBottom: "8px" }} />
                        <p style={{ fontSize: "0.8rem", fontWeight: 500 }} className="accent-text-gradient">{e.comments || "Sin comentarios"}</p>
                        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>{new Date(e.captured_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Asset Form Modal */}
      {isLinkAssetOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: "450px" }}>
            <button className="modal-close" onClick={() => setIsLinkAssetOpen(false)}><X size={20} /></button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600 }} className="accent-text-gradient">Vincular Activo a la OT</h3>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleLinkAsset}>
              <div className="form-group">
                <label>Tipo de Acción</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={linkActionType} onChange={e=>setLinkActionType(e.target.value)}>
                  <option value="INSTALACION_NUEVA">INSTALACIÓN NUEVA</option>
                  <option value="REEMPLAZO_POR_FALLA">REEMPLAZO POR FALLA</option>
                  <option value="RETIRO">RETIRO DE EQUIPO</option>
                </select>
              </div>
              <div className="form-group">
                <label>Activo Instalado (Opcional)</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={linkInstalledId} onChange={e=>setLinkInstalledId(e.target.value)}>
                  <option value="">Selecciona activo...</option>
                  {assets.map(a=><option key={a.asset_id} value={a.asset_id}>{a.product?.name} (SN: {a.serial_number})</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: "25px" }}>
                <label>Activo Retirado (Opcional)</label>
                <select className="glass-input" style={{ background: "#1b2030" }} value={linkRemovedId} onChange={e=>setLinkRemovedId(e.target.value)}>
                  <option value="">Selecciona activo...</option>
                  {assets.map(a=><option key={a.asset_id} value={a.asset_id}>{a.product?.name} (SN: {a.serial_number})</option>)}
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={() => setIsLinkAssetOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>Vincular</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Evidence Form Modal */}
      {isEvidenceOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: "450px" }}>
            <button className="modal-close" onClick={() => setIsEvidenceOpen(false)}><X size={20} /></button>
            <h3 style={{ marginBottom: "25px", fontWeight: 600 }} className="accent-text-gradient">Subir Evidencia Fotográfica</h3>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleUploadEvidence}>
              <div className="form-group">
                <label>URL de la Imagen (Simulada)</label>
                <input type="text" className="glass-input" placeholder="https://ejemplo.com/evidencia1.jpg" value={evImageUrl} onChange={e=>setEvImageUrl(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>URL de la Firma del Cliente (Opcional)</label>
                <input type="text" className="glass-input" placeholder="https://ejemplo.com/firma.png" value={evSigUrl} onChange={e=>setEvSigUrl(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: "25px" }}>
                <label>Comentarios del Trabajo</label>
                <input type="text" className="glass-input" placeholder="Instalación exitosa, equipo probado..." value={evComments} onChange={e=>setEvComments(e.target.value)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={() => setIsEvidenceOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>Registrar Evidencia</button>
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
export default WorkOrders;
