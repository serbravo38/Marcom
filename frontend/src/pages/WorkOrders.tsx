import React, { useState, useEffect } from "react";
import { 
  Plus, 
  X, 
  Loader2, 
  Eye, 
  Link2,
  UploadCloud,
  Camera,
  CheckCircle2,
  Trash2,
  Maximize2,
  Image as ImageIcon,
  FileText,
  ArrowLeft
} from "lucide-react";
import { workOrdersService, type OrdenTrabajo, type EvidenciaTerreno } from "../services/workOrders";
import { authService, type Usuario, type Convenio } from "../services/auth";
import { inventoryService, type Ubicacion, type Activo } from "../services/inventory";

// Helper para optimizar y convertir imágenes JPG/PNG a base64 Data URL
const processImageFile = (file: File, maxWidth = 1600, maxHeight = 1200, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("No se pudo decodificar el archivo de imagen."));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
    reader.readAsDataURL(file);
  });
};

export const WorkOrders: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<OrdenTrabajo[]>([]);
  const [technicians, setTechnicians] = useState<Usuario[]>([]);
  const [agreements, setAgreements] = useState<Convenio[]>([]);
  const [locations, setLocations] = useState<Ubicacion[]>([]);
  const [assets, setAssets] = useState<Activo[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [detailSuccessMessage, setDetailSuccessMessage] = useState<string | null>(null);

  // Selected work order for detailed view modal
  const [selectedWo, setSelectedWo] = useState<OrdenTrabajo | null>(null);
  const [modalView, setModalView] = useState<"DETALLE" | "SUBIR_EVIDENCIA" | "VINCULAR_ACTIVO">("DETALLE");
  const [previewEvidence, setPreviewEvidence] = useState<EvidenciaTerreno | null>(null);

  // Modals Open State
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
  const [evImageFileName, setEvImageFileName] = useState("");
  const [evImageFileSize, setEvImageFileSize] = useState("");
  const [evSigUrl, setEvSigUrl] = useState("");
  const [evSigFileName, setEvSigFileName] = useState("");
  const [evComments, setEvComments] = useState("");

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const [wosData, usersData, agreementsData, locationsData, assetsData] = await Promise.all([
        workOrdersService.getWorkOrders(),
        authService.getUsers().catch(() => [] as Usuario[]),
        authService.getAgreements().catch(() => [] as Convenio[]),
        inventoryService.getLocations().catch(() => [] as Ubicacion[]),
        inventoryService.getAssets().catch(() => [] as Activo[])
      ]);

      setWorkOrders(wosData);
      setTechnicians(usersData.filter(u => u.rol === "TECNICO_TERRENO" || u.rol === "ADMIN"));
      setAgreements(agreementsData);
      setLocations(locationsData);
      setAssets(assetsData);
      
      // Keep selected work order updated if it was open
      setSelectedWo(current => {
        if (!current) return null;
        const updatedWo = wosData.find(w => w.orden_trabajo_id === current.orden_trabajo_id);
        return updatedWo || current;
      });
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al cargar datos de órdenes de trabajo.");
    } finally {
      if (showLoading) setLoading(false);
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
        numero_orden: woNumber,
        convenio_cliente_id: woAgreementId || null,
        ubicacion_id: woLocationId,
        tecnico_asignado_id: woTechId || null,
        estado: "PENDIENTE",
        fecha_programada: new Date(woScheduledDate).toISOString(),
        notes: woNotes || null
      });
      setIsCreateOpen(false);
      // Reset form
      setWoNumber(""); setWoAgreementId(""); setWoLocationId(""); setWoTechId(""); setWoScheduledDate(""); setWoNotes("");
      setSuccessMessage("Orden de trabajo programada exitosamente.");
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchData(false);
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
      await workOrdersService.addWorkOrderAsset(selectedWo.orden_trabajo_id, {
        activo_instalado_id: linkInstalledId || null,
        activo_retirado_id: linkRemovedId || null,
        tipo_accion: linkActionType
      });
      setModalView("DETALLE");
      setLinkInstalledId(""); setLinkRemovedId(""); setLinkActionType("INSTALACION_NUEVA");
      setDetailSuccessMessage("Activo vinculado exitosamente.");
      setTimeout(() => setDetailSuccessMessage(null), 5000);
      fetchData(false);
    } catch (err: any) {
      setModalError(err?.message || "No se pudo vincular el activo.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleEvidenceImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModalError(null);
    try {
      setEvImageFileName(file.name);
      setEvImageFileSize("Procesando imagen...");
      const optimizedDataUrl = await processImageFile(file, 1280, 960, 0.82);
      const estKb = Math.round((optimizedDataUrl.length * 3) / 4 / 1024);
      setEvImageFileSize(`${estKb} KB (Optimizado JPG)`);
      setEvImageUrl(optimizedDataUrl);
    } catch (err: any) {
      setModalError(err?.message || "Error al procesar la imagen JPG.");
    }
  };

  const handleEvidenceSigFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModalError(null);
    try {
      setEvSigFileName(file.name);
      const optimizedDataUrl = await processImageFile(file, 800, 600, 0.85);
      setEvSigUrl(optimizedDataUrl);
    } catch (err: any) {
      setModalError(err?.message || "Error al procesar el archivo de firma.");
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWo) return;
    if (!evImageUrl) {
      setModalError("Por favor selecciona un archivo de imagen JPG.");
      return;
    }
    setModalLoading(true);
    setModalError(null);
    try {
      const createdEvidence = await workOrdersService.uploadEvidence(selectedWo.orden_trabajo_id, {
        url_imagen: evImageUrl,
        url_firma: evSigUrl || null,
        comentarios: evComments || null
      });

      // Update selected work order state directly for instant feedback
      setSelectedWo(prev => {
        if (!prev) return null;
        const currentEvidencias = prev.evidencias || [];
        return {
          ...prev,
          evidencias: [createdEvidence, ...currentEvidencias]
        };
      });

      // Also update workOrders list in place
      setWorkOrders(prevList => prevList.map(wo => {
        if (wo.orden_trabajo_id === selectedWo.orden_trabajo_id) {
          const currentEvidencias = wo.evidencias || [];
          return {
            ...wo,
            evidencias: [createdEvidence, ...currentEvidencias]
          };
        }
        return wo;
      }));

      // Automatically switch back to detail view and reset inputs
      setModalView("DETALLE");
      setEvImageUrl(""); 
      setEvImageFileName(""); 
      setEvImageFileSize(""); 
      setEvSigUrl(""); 
      setEvSigFileName(""); 
      setEvComments(""); 
      setModalError(null);

      // Display feedback notifications
      setSuccessMessage("Evidencia fotográfica actualizada con éxito.");
      setDetailSuccessMessage("Evidencia fotográfica registrada y actualizada con éxito.");
      setTimeout(() => {
        setSuccessMessage(null);
        setDetailSuccessMessage(null);
      }, 6000);

      // Refresh in background without full screen spinner
      await fetchData(false);
    } catch (err: any) {
      setModalError(err?.message || "No se pudo registrar la evidencia.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedWo) return;
    try {
      const updated = await workOrdersService.updateWorkOrder(selectedWo.orden_trabajo_id, {
        estado: status,
        fecha_termino: status === "COMPLETADA" ? new Date().toISOString() : null
      });
      setSelectedWo(updated);
      setDetailSuccessMessage(`Estado actualizado a ${status}.`);
      setTimeout(() => setDetailSuccessMessage(null), 4000);
      fetchData(false);
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

      {successMessage && (
        <div style={{ width: "100%", padding: "12px 16px", marginBottom: "20px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", boxSizing: "border-box" }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
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
                  const agreement = agreements.find(a => a.convenio_id === wo.convenio_cliente_id);
                  const location = locations.find(l => l.ubicacion_id === wo.ubicacion_id);
                  const tech = technicians.find(t => t.usuario_id === wo.tecnico_asignado_id);
                  return (
                    <tr key={wo.orden_trabajo_id}>
                      <td style={{ fontWeight: 600 }}>{wo.numero_orden}</td>
                      <td>{agreement ? agreement.nombre_empresa : "Cliente Estándar"}</td>
                      <td>{location ? `${location.codigo_local ? `[${location.codigo_local}] ` : ""}${location.nombre}${location.comuna ? ` (${location.comuna})` : ""}` : "N/A"}</td>
                      <td>{tech ? `${tech.nombre} ${tech.apellido}` : "Sin Asignar"}</td>
                      <td>{new Date(wo.fecha_programada).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${
                          wo.estado === "COMPLETADA" ? "success" : 
                          wo.estado === "CANCELADA" ? "error" : 
                          wo.estado === "EN_PROCESO" ? "secondary" : "warning"
                        }`}>
                          {wo.estado}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          onClick={() => {
                            setSelectedWo(wo);
                            setModalView("DETALLE");
                            setModalError(null);
                            setDetailSuccessMessage(null);
                          }}
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
                  {locations.map(l=><option key={l.ubicacion_id} value={l.ubicacion_id}>{l.codigo_local ? `[${l.codigo_local}] ` : ""}{l.nombre} {l.comuna ? `(${l.comuna}) ` : ""}- {l.direccion}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Convenio Asociado (Opcional)</label>
                  <select className="glass-input" style={{ background: "#1b2030" }} value={woAgreementId} onChange={e=>setWoAgreementId(e.target.value)}>
                    <option value="">Ninguno / Cliente Estándar</option>
                    {agreements.map(a=><option key={a.convenio_id} value={a.convenio_id}>{a.nombre_empresa}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Asignar Técnico</label>
                  <select className="glass-input" style={{ background: "#1b2030" }} value={woTechId} onChange={e=>setWoTechId(e.target.value)}>
                    <option value="">Sin asignar / Pendiente</option>
                    {technicians.map(t=><option key={t.usuario_id} value={t.usuario_id}>{t.nombre} {t.apellido}</option>)}
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

      {/* Detailed Work Order View Modal & Unified Sub-views */}
      {selectedWo && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: modalView === "SUBIR_EVIDENCIA" ? "560px" : modalView === "VINCULAR_ACTIVO" ? "500px" : "620px", transition: "max-width 0.2s ease" }}>
            
            {/* Header with optional Back navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                {modalView !== "DETALLE" && (
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ padding: "4px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}
                    onClick={() => { setModalView("DETALLE"); setModalError(null); }}
                  >
                    <ArrowLeft size={14} />
                    <span>Volver al Detalle</span>
                  </button>
                )}
                <h3 style={{ margin: 0, fontWeight: 600 }} className="accent-text-gradient">
                  {modalView === "SUBIR_EVIDENCIA" 
                    ? "Subir Evidencia Fotográfica" 
                    : modalView === "VINCULAR_ACTIVO" 
                    ? "Vincular Activo a la OT" 
                    : `Detalle de la Orden: ${selectedWo.numero_orden}`}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "hsl(var(--text-muted))", margin: "4px 0 0 0" }}>
                  {modalView === "SUBIR_EVIDENCIA" 
                    ? `Orden ${selectedWo.numero_orden} - Carga fotografías del trabajo realizado en terreno` 
                    : modalView === "VINCULAR_ACTIVO" 
                    ? `Orden ${selectedWo.numero_orden} - Asocia activos instalados o retirados` 
                    : `Programada para: ${new Date(selectedWo.fecha_programada).toLocaleString()}`}
                </p>
              </div>

              <button 
                className="modal-close" 
                style={{ position: "static" }} 
                onClick={() => { setSelectedWo(null); setDetailSuccessMessage(null); setModalView("DETALLE"); }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>
                {modalError}
              </p>
            )}

            {detailSuccessMessage && modalView === "DETALLE" && (
              <div style={{ width: "100%", padding: "10px 14px", marginBottom: "16px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", boxSizing: "border-box" }}>
                <CheckCircle2 size={16} />
                <span>{detailSuccessMessage}</span>
              </div>
            )}

            {/* TAB 1: DETALLE DE LA ORDEN */}
            {modalView === "DETALLE" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Status Section */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "15px", borderRadius: "8px" }}>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))", display: "block" }}>Estado actual</span>
                    <span className={`badge ${
                      selectedWo.estado === "COMPLETADA" ? "success" : 
                      selectedWo.estado === "CANCELADA" ? "error" : "warning"
                    }`} style={{ fontSize: "0.9rem", marginTop: "4px" }}>
                      {selectedWo.estado}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {selectedWo.estado !== "COMPLETADA" && (
                      <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleUpdateStatus("COMPLETADA")}>
                        Completar
                      </button>
                    )}
                    {selectedWo.estado !== "CANCELADA" && (
                      <button className="btn-logout" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleUpdateStatus("CANCELADA")}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* Linked Assets involved */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Equipos Instalados/Retirados</h4>
                    <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => { setModalView("VINCULAR_ACTIVO"); setModalError(null); }}>
                      <Link2 size={12} />
                      <span>Vincular Activo</span>
                    </button>
                  </div>
                  {(!selectedWo.activos || selectedWo.activos.length === 0) ? (
                    <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", margin: 0 }}>No se han declarado activos para esta orden.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedWo.activos.map(a => {
                        const inst = assets.find(as => as.activo_id === a.activo_instalado_id);
                        const rem = assets.find(as => as.activo_id === a.activo_retirado_id);
                        return (
                          <div key={a.activo_ot_id} style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.01)", padding: "10px 14px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.03)" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{a.tipo_accion}</span>
                            <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                              {inst && `Instalado: SN-${inst.numero_serie}`}
                              {rem && ` | Retirado: SN-${rem.numero_serie}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Field Evidence */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                      <Camera size={16} style={{ color: "hsl(var(--accent-primary))" }} />
                      <span>Evidencias y Firmas de Terreno</span>
                    </h4>
                    <button className="btn-primary" style={{ padding: "5px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => { setModalView("SUBIR_EVIDENCIA"); setModalError(null); }}>
                      <Plus size={14} />
                      <span>Subir Foto / Evidencia</span>
                    </button>
                  </div>

                  {(!selectedWo.evidencias || selectedWo.evidencias.length === 0) ? (
                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "8px", padding: "24px", textAlign: "center" }}>
                      <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", margin: 0 }}>
                        No se han registrado evidencias fotográficas para este trabajo.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      {selectedWo.evidencias.map(e => (
                        <div 
                          key={e.evidencia_id} 
                          className="glass-panel" 
                          style={{ padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", position: "relative", cursor: "pointer", transition: "transform 0.2s" }}
                          onClick={() => setPreviewEvidence(e)}
                        >
                          <div style={{ position: "relative", width: "100%", height: "130px", borderRadius: "6px", overflow: "hidden", background: "#0a0d18" }}>
                            <img 
                              src={e.url_imagen} 
                              alt="Evidencia" 
                              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                            />
                            <div style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.6)", padding: "4px", borderRadius: "4px", color: "#fff" }}>
                              <Maximize2 size={13} />
                            </div>
                          </div>

                          <div style={{ marginTop: "8px" }}>
                            <p style={{ fontSize: "0.82rem", fontWeight: 600, margin: "0 0 3px 0", color: "#fff" }}>
                              {e.comentarios || "Fotografía de trabajo en terreno"}
                            </p>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.74rem", color: "hsl(var(--text-muted))" }}>
                                📅 {new Date(e.fecha_captura).toLocaleDateString()}
                              </span>
                              {e.url_firma && (
                                <span className="badge success" style={{ fontSize: "0.68rem", padding: "1px 5px" }}>
                                  Con firma
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SUBIR EVIDENCIA */}
            {modalView === "SUBIR_EVIDENCIA" && (
              <form onSubmit={handleUploadEvidence}>
                {/* Main Evidence Photo Picker */}
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <Camera size={15} style={{ color: "hsl(var(--accent-primary))" }} />
                    <span>Foto del Trabajo Realizado (.JPG / .PNG) *</span>
                  </label>

                  {evImageUrl ? (
                    <div style={{ border: "1px solid rgba(46, 213, 115, 0.4)", borderRadius: "10px", padding: "12px", background: "rgba(46, 213, 115, 0.03)", display: "flex", gap: "14px", alignItems: "center" }}>
                      <img 
                        src={evImageUrl} 
                        alt="Preview" 
                        style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }} 
                      />
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2ed573", fontSize: "0.85rem", fontWeight: 600 }}>
                          <CheckCircle2 size={16} />
                          <span>{evImageFileName || "Imagen cargada"}</span>
                        </div>
                        {evImageFileSize && (
                          <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))", display: "block", marginTop: "2px" }}>
                            Tamaño optimizado: {evImageFileSize}
                          </span>
                        )}
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          style={{ marginTop: "8px", padding: "3px 10px", fontSize: "0.75rem", color: "#ff4757" }}
                          onClick={() => {
                            setEvImageUrl("");
                            setEvImageFileName("");
                            setEvImageFileSize("");
                          }}
                        >
                          <Trash2 size={12} style={{ marginRight: "4px" }} />
                          Cambiar foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      style={{ 
                        border: "2px dashed rgba(255,255,255,0.18)", 
                        borderRadius: "10px", 
                        padding: "24px 16px", 
                        textAlign: "center",
                        background: "rgba(255,255,255,0.015)",
                        cursor: "pointer"
                      }}
                      onClick={() => document.getElementById("evidence-file-input")?.click()}
                    >
                      <input 
                        id="evidence-file-input"
                        type="file" 
                        accept="image/jpeg, image/jpg, image/png, image/webp" 
                        style={{ display: "none" }}
                        onChange={handleEvidenceImageFileChange}
                      />
                      <UploadCloud size={34} style={{ color: "hsl(var(--accent-primary))", margin: "0 auto 8px auto" }} />
                      <h5 style={{ margin: "0 0 4px 0", fontSize: "0.9rem", color: "#fff" }}>
                        Haz clic para seleccionar o tomar una foto JPG
                      </h5>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>
                        Soporta fotos desde el computador o cámara móvil
                      </p>
                    </div>
                  )}
                </div>

                {/* Optional Signature File Picker */}
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={15} style={{ color: "hsl(var(--accent-primary))" }} />
                    <span>Firma o Acta del Cliente (Opcional)</span>
                  </label>

                  {evSigUrl ? (
                    <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)" }}>
                      <span style={{ fontSize: "0.8rem", color: "#fff" }}>
                        ✍️ {evSigFileName || "Firma adjuntada"}
                      </span>
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                        onClick={() => {
                          setEvSigUrl("");
                          setEvSigFileName("");
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input 
                        type="file" 
                        id="sig-file-input"
                        accept="image/png, image/jpeg, image/jpg" 
                        style={{ display: "none" }}
                        onChange={handleEvidenceSigFileChange}
                      />
                      <button 
                        type="button" 
                        className="btn-secondary"
                        style={{ width: "100%", padding: "8px", fontSize: "0.8rem", borderStyle: "dashed" }}
                        onClick={() => document.getElementById("sig-file-input")?.click()}
                      >
                        + Adjuntar imagen de firma o acta escaneada
                      </button>
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className="form-group" style={{ marginBottom: "22px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Comentarios u Observaciones del Trabajo</label>
                  <textarea 
                    className="glass-input" 
                    rows={2}
                    style={{ resize: "vertical", fontSize: "0.85rem", padding: "8px 12px" }}
                    placeholder="ej: Pantalla Samsung 65 instalada en tótem principal y probada con éxito..." 
                    value={evComments} 
                    onChange={e=>setEvComments(e.target.value)} 
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" className="btn-secondary" onClick={() => { setModalView("DETALLE"); setModalError(null); }}>
                    Cancelar / Volver
                  </button>
                  <button type="submit" className="btn-primary" disabled={modalLoading || !evImageUrl}>
                    {modalLoading ? (
                      <>
                        <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={15} />
                        <span>Registrar Evidencia</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: VINCULAR ACTIVO */}
            {modalView === "VINCULAR_ACTIVO" && (
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
                    {assets.map(a=><option key={a.activo_id} value={a.activo_id}>{a.producto?.nombre} (SN: {a.numero_serie})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: "25px" }}>
                  <label>Activo Retirado (Opcional)</label>
                  <select className="glass-input" style={{ background: "#1b2030" }} value={linkRemovedId} onChange={e=>setLinkRemovedId(e.target.value)}>
                    <option value="">Selecciona activo...</option>
                    {assets.map(a=><option key={a.activo_id} value={a.activo_id}>{a.producto?.nombre} (SN: {a.numero_serie})</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" className="btn-secondary" onClick={() => { setModalView("DETALLE"); setModalError(null); }}>
                    Cancelar / Volver
                  </button>
                  <button type="submit" className="btn-primary" disabled={modalLoading}>
                    {modalLoading ? "Guardando..." : "Vincular Activo"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Lightbox Modal for Evidence Zoom */}
      {previewEvidence && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setPreviewEvidence(null)}>
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: "980px", 
              width: "92vw", 
              padding: "24px", 
              display: "flex", 
              flexDirection: "column", 
              gap: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", fontSize: "1.05rem" }} className="accent-text-gradient">
                <ImageIcon size={20} />
                <span>Vista Completa de Evidencia en Terreno</span>
              </h4>
              <button 
                className="modal-close" 
                onClick={() => setPreviewEvidence(null)} 
                style={{ position: "static", background: "rgba(255,255,255,0.06)", borderRadius: "6px", padding: "6px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* High-Resolution Photo Container */}
            <div 
              style={{ 
                width: "100%", 
                minHeight: "420px", 
                maxHeight: "72vh", 
                background: "#04060a", 
                borderRadius: "10px", 
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden", 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center",
                position: "relative"
              }}
            >
              <img 
                src={previewEvidence.url_imagen} 
                alt="Evidencia en Terreno" 
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: "70vh", 
                  width: "auto", 
                  height: "auto", 
                  objectFit: "contain",
                  display: "block" 
                }} 
              />
            </div>

            {/* Details and Signature Bar */}
            <div 
              style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                gap: "16px", 
                background: "rgba(255,255,255,0.025)", 
                padding: "14px 20px", 
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.05)"
              }}
            >
              <div style={{ flexGrow: 1 }}>
                <strong style={{ display: "block", color: "#fff", fontSize: "0.95rem", marginBottom: "4px" }}>
                  {previewEvidence.comentarios || "Evidencia fotográfica en terreno"}
                </strong>
                <span style={{ fontSize: "0.82rem", color: "hsl(var(--text-muted))" }}>
                  📅 Fecha de Captura: {new Date(previewEvidence.fecha_captura).toLocaleString()}
                </span>
              </div>

              {previewEvidence.url_firma && (
                <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: "18px" }}>
                  <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))", display: "block", marginBottom: "6px", fontWeight: 500 }}>
                    ✍️ Firma del Cliente
                  </span>
                  <div style={{ background: "#ffffff", borderRadius: "6px", padding: "4px 8px", display: "inline-block" }}>
                    <img 
                      src={previewEvidence.url_firma} 
                      alt="Firma del Cliente" 
                      style={{ height: "45px", maxWidth: "150px", objectFit: "contain", display: "block" }} 
                    />
                  </div>
                </div>
              )}
            </div>
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
