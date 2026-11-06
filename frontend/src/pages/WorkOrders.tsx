import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  X, 
  Loader2, 
  Eye, 
  Link2,
  Camera,
  CheckCircle2,
  Trash2,
  Maximize2,
  Image as ImageIcon,
  FileText,
  ArrowLeft,
  Edit2,
  RotateCcw,
  PenTool,
  Eraser,
  UserCheck
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
  const [currentUser] = useState<Usuario | null>(() => {
    const userJson = localStorage.getItem("marcom_user");
    return userJson ? JSON.parse(userJson) : null;
  });

  const userRole = currentUser?.rol || "CLIENTE_ESTANDAR";
  const isClient = userRole === "CLIENTE_CONVENIO" || userRole === "CLIENTE_ESTANDAR";
  const isTech = userRole === "TECNICO_TERRENO";
  const isAdminOrJefe = userRole === "ADMIN" || userRole === "JEFE_BODEGA";

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
  const [editingWo, setEditingWo] = useState<OrdenTrabajo | null>(null);

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Work Order Form Fields (Create)
  const [woNumber, setWoNumber] = useState("");
  const [woAgreementId, setWoAgreementId] = useState("");
  const [woLocationId, setWoLocationId] = useState("");
  const [woTechId, setWoTechId] = useState("");
  const [woScheduledDate, setWoScheduledDate] = useState("");
  const [woNotes, setWoNotes] = useState("");

  // Work Order Form Fields (Edit / Reopen)
  const [editStatus, setEditStatus] = useState<OrdenTrabajo["estado"]>("PENDIENTE");
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editLocationId, setEditLocationId] = useState("");
  const [editAgreementId, setEditAgreementId] = useState("");
  const [editTechId, setEditTechId] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Link Asset Form Fields
  const [linkInstalledId, setLinkInstalledId] = useState("");
  const [linkRemovedId, setLinkRemovedId] = useState("");
  const [linkActionType, setLinkActionType] = useState("INSTALACION_NUEVA");

  // Evidence & Mobile Digital Signature Form Fields
  const [evImageUrl, setEvImageUrl] = useState("");
  const [evImageFileName, setEvImageFileName] = useState("");
  const [evImageFileSize, setEvImageFileSize] = useState("");
  const [evSigUrl, setEvSigUrl] = useState("");
  const [evSigFileName, setEvSigFileName] = useState("");
  const [evComments, setEvComments] = useState("");
  const [evSigMode, setEvSigMode] = useState<"PANTALLA" | "ARCHIVO">("PANTALLA");
  const [evReceiverName, setEvReceiverName] = useState("");
  const [evReceiverRoleOrRut, setEvReceiverRoleOrRut] = useState("");
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingSigRef = useRef(false);

  const initSignatureCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Línea guía de firma
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(24, canvas.height - 34);
    ctx.lineTo(canvas.width - 24, canvas.height - 34);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FIRME AQUÍ CON EL DEDO EN LA PANTALLA DEL CELULAR", canvas.width / 2, canvas.height - 14);
  };

  useEffect(() => {
    if (modalView === "SUBIR_EVIDENCIA" && evSigMode === "PANTALLA" && !hasDrawnSignature) {
      setTimeout(() => initSignatureCanvas(), 40);
    }
  }, [modalView, evSigMode, selectedWo]);

  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleSigPointerStart = (clientX: number, clientY: number) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pt = getCanvasPoint(canvas, clientX, clientY);
    isDrawingSigRef.current = true;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    // Dibujar un punto si es un toque corto
    ctx.lineTo(pt.x + 0.2, pt.y + 0.2);
    ctx.stroke();
    setHasDrawnSignature(true);
    setModalError(null);
  };

  const handleSigPointerMove = (clientX: number, clientY: number) => {
    if (!isDrawingSigRef.current) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pt = getCanvasPoint(canvas, clientX, clientY);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handleSigPointerEnd = () => {
    if (!isDrawingSigRef.current) return;
    isDrawingSigRef.current = false;
    const canvas = sigCanvasRef.current;
    if (canvas) {
      setEvSigUrl(canvas.toDataURL("image/png"));
      setEvSigFileName("Firma_Recepcion_Movil.png");
    }
  };

  const handleClearSignaturePad = () => {
    setHasDrawnSignature(false);
    setEvSigUrl("");
    setEvSigFileName("");
    initSignatureCanvas();
  };

  const buildFinalStampedSignatureUrl = (): string | null => {
    if (evSigMode === "ARCHIVO") {
      return evSigUrl || null;
    }
    if (!hasDrawnSignature || !sigCanvasRef.current) {
      return evSigUrl || null;
    }
    const srcCanvas = sigCanvasRef.current;
    const outCanvas = document.createElement("canvas");
    outCanvas.width = srcCanvas.width;
    outCanvas.height = srcCanvas.height + 42;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) return srcCanvas.toDataURL("image/png");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    ctx.drawImage(srcCanvas, 0, 0);

    // Pie de firma auditable con datos de recepción y fecha/hora
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, srcCanvas.height, outCanvas.width, 42);
    ctx.strokeStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(0, srcCanvas.height);
    ctx.lineTo(outCanvas.width, srcCanvas.height);
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 11px Inter, Arial, sans-serif";
    ctx.textAlign = "left";
    const recName = evReceiverName.trim() || "Recepción Conforme en Terreno";
    const recRole = evReceiverRoleOrRut.trim() ? ` (${evReceiverRoleOrRut.trim()})` : "";
    ctx.fillText(`Recepcionado por: ${recName}${recRole}`, 12, srcCanvas.height + 16);

    ctx.fillStyle = "#475569";
    ctx.font = "10px Inter, Arial, sans-serif";
    const stampDate = new Date().toLocaleString("es-CL");
    ctx.fillText(`OT: ${selectedWo?.numero_orden || ""}  |  Fecha recepción: ${stampDate}`, 12, srcCanvas.height + 33);

    return outCanvas.toDataURL("image/png");
  };

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
        notas: woNotes || null
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

  const toDatetimeLocalValue = (isoStr?: string) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenEditWo = (wo: OrdenTrabajo) => {
    setEditingWo(wo);
    setEditStatus(wo.estado);
    setEditScheduledDate(toDatetimeLocalValue(wo.fecha_programada));
    setEditLocationId(wo.ubicacion_id || "");
    setEditAgreementId(wo.convenio_cliente_id || "");
    setEditTechId(wo.tecnico_asignado_id || "");
    setEditNotes(wo.notas || wo.notes || "");
    setModalError(null);
  };

  const handleSaveEditWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWo) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const updated = await workOrdersService.updateWorkOrder(editingWo.orden_trabajo_id, {
        estado: editStatus,
        fecha_programada: editScheduledDate ? new Date(editScheduledDate).toISOString() : editingWo.fecha_programada,
        ubicacion_id: editLocationId,
        convenio_cliente_id: editAgreementId || null,
        tecnico_asignado_id: editTechId || null,
        notas: editNotes || null,
        fecha_termino: editStatus === "COMPLETADA" ? (editingWo.fecha_termino || new Date().toISOString()) : null
      });

      setEditingWo(null);
      if (selectedWo && selectedWo.orden_trabajo_id === updated.orden_trabajo_id) {
        setSelectedWo(updated);
      }
      setSuccessMessage(`Orden de trabajo ${updated.numero_orden} actualizada exitosamente (Estado: ${updated.estado}).`);
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchData(false);
    } catch (err: any) {
      setModalError(err?.message || "No se pudo actualizar la orden de trabajo.");
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

  const openEvidenceAndClosureView = (wo: OrdenTrabajo) => {
    setSelectedWo(wo);
    const loc = locations.find(l => l.ubicacion_id === wo.ubicacion_id);
    setEvReceiverName(loc?.nombre_encargado || "");
    setEvReceiverRoleOrRut(loc ? `Encargado ${loc.nombre}` : "");
    setHasDrawnSignature(false);
    setEvSigUrl("");
    setEvSigFileName("");
    setEvSigMode("PANTALLA");
    setModalView("SUBIR_EVIDENCIA");
    setModalError(null);
    setDetailSuccessMessage(null);
  };

  const submitEvidenceAndOptionallyFinish = async (finalizeWorkOrder: boolean) => {
    if (!selectedWo) return;
    if (!evImageUrl) {
      setModalError("Por favor toma una foto del trabajo con la cámara o selecciona una imagen de la galería.");
      return;
    }

    const finalSignatureUrl = buildFinalStampedSignatureUrl();

    if (finalizeWorkOrder) {
      if (!evReceiverName.trim()) {
        setModalError("Para recepcionar y cerrar la orden, ingresa el nombre de la persona que recepciona el trabajo.");
        return;
      }
      if (!finalSignatureUrl) {
        setModalError("Para cerrar la orden, la persona que recepciona debe firmar con su dedo en la pantalla del teléfono (o adjuntar acta firmada).");
        return;
      }
    }

    const receiverHeader = evReceiverName.trim()
      ? `[Recepcionado por: ${evReceiverName.trim()}${evReceiverRoleOrRut.trim() ? ` - ${evReceiverRoleOrRut.trim()}` : ""}] `
      : "";
    const combinedComments = `${receiverHeader}${evComments.trim() || "Trabajo recepcionado conforme en terreno"}`.trim();

    setModalLoading(true);
    setModalError(null);
    try {
      const createdEvidence = await workOrdersService.uploadEvidence(selectedWo.orden_trabajo_id, {
        url_imagen: evImageUrl,
        url_firma: finalSignatureUrl || null,
        comentarios: combinedComments || null
      });

      let updatedWoState: OrdenTrabajo | null = null;
      if (finalizeWorkOrder && selectedWo.estado !== "COMPLETADA") {
        updatedWoState = await workOrdersService.updateWorkOrder(selectedWo.orden_trabajo_id, {
          estado: "COMPLETADA",
          fecha_termino: new Date().toISOString()
        });
      }

      // Update selected work order state directly for instant feedback
      setSelectedWo(prev => {
        if (!prev) return null;
        const currentEvidencias = prev.evidencias || [];
        return {
          ...prev,
          estado: updatedWoState ? updatedWoState.estado : prev.estado,
          fecha_termino: updatedWoState ? updatedWoState.fecha_termino : prev.fecha_termino,
          evidencias: [createdEvidence, ...currentEvidencias]
        };
      });

      // Also update workOrders list in place
      setWorkOrders(prevList => prevList.map(wo => {
        if (wo.orden_trabajo_id === selectedWo.orden_trabajo_id) {
          const currentEvidencias = wo.evidencias || [];
          return {
            ...wo,
            estado: updatedWoState ? updatedWoState.estado : wo.estado,
            fecha_termino: updatedWoState ? updatedWoState.fecha_termino : wo.fecha_termino,
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
      setEvReceiverName("");
      setEvReceiverRoleOrRut("");
      setHasDrawnSignature(false);
      setModalError(null);

      // Display feedback notifications
      const msg = finalizeWorkOrder
        ? `Trabajo recepcionado con firma digital y Orden ${selectedWo.numero_orden} CERRADA (COMPLETADA).`
        : "Evidencia fotográfica y firma guardadas con éxito.";
      setSuccessMessage(msg);
      setDetailSuccessMessage(msg);
      setTimeout(() => {
        setSuccessMessage(null);
        setDetailSuccessMessage(null);
      }, 6000);

      // Refresh in background without full screen spinner
      await fetchData(false);
    } catch (err: any) {
      setModalError(err?.message || "No se pudo registrar la evidencia y firma.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitEvidenceAndOptionallyFinish(false);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedWo) return;
    if (status === "COMPLETADA") {
      const hasSignedReception = (selectedWo.evidencias || []).some(ev => Boolean(ev.url_firma));
      if (!hasSignedReception) {
        openEvidenceAndClosureView(selectedWo);
        setModalError("Para cerrar la orden, captura la evidencia fotográfica y solicita la firma de recepción en la pantalla del teléfono.");
        return;
      }
    }
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
          <span>
            {isTech 
              ? "Mis Órdenes de Trabajo Asignadas" 
              : isClient 
              ? "Órdenes de Trabajo y Servicios en Mis Locales" 
              : "Órdenes de Trabajo en Terreno"}
          </span>
          {isAdminOrJefe && (
            <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              <span>Crear OT</span>
            </button>
          )}
        </div>

        <div className="table-responsive">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 className="spin" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : workOrders.length === 0 ? (
            <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "35px" }}>
              {isTech 
                ? "No tienes órdenes de trabajo asignadas en este momento." 
                : isClient
                ? "No hay órdenes de trabajo activas en tus locales."
                : "No hay órdenes de trabajo programadas."}
            </p>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>N° Orden</th>
                  {!isClient && <th>Cliente (Convenio)</th>}
                  <th>Ubicación / Local</th>
                  {!isTech && <th>Técnico Asignado</th>}
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
                      {!isClient && <td>{agreement ? agreement.nombre_empresa : "Cliente Estándar"}</td>}
                      <td>{location ? `${location.codigo_local ? `[${location.codigo_local}] ` : ""}${location.nombre}${location.comuna ? ` (${location.comuna})` : ""}` : "N/A"}</td>
                      {!isTech && <td>{tech ? `${tech.nombre} ${tech.apellido}` : "Sin Asignar"}</td>}
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
                        <div style={{ display: "inline-flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
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
                            <span>{isTech ? "Atender / Ver" : "Ver"}</span>
                          </button>

                          {!isClient && wo.estado !== "COMPLETADA" && wo.estado !== "CANCELADA" && (
                            <button
                              type="button"
                              className="btn-primary"
                              style={{
                                padding: "6px 12px",
                                fontSize: "0.8rem",
                                background: "#059669",
                                borderColor: "#047857",
                                color: "#ffffff",
                                fontWeight: 700
                              }}
                              title="Tomar foto, capturar firma de recepción en el celular y cerrar orden"
                              onClick={() => openEvidenceAndClosureView(wo)}
                            >
                              <PenTool size={14} />
                              <span>Foto / Firma Cierre</span>
                            </button>
                          )}

                          {isAdminOrJefe && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                              title="Editar o reabrir Orden de Trabajo"
                              onClick={() => handleOpenEditWo(wo)}
                            >
                              <Edit2 size={14} />
                              <span>Editar</span>
                            </button>
                          )}
                        </div>
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

      {/* Edit / Reopen Work Order Modal */}
      {editingWo && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => setEditingWo(null)}><X size={20} /></button>
            <h3 style={{ marginBottom: "6px", fontWeight: 600 }} className="accent-text-gradient">
              Editar Orden de Trabajo: {editingWo.numero_orden}
            </h3>
            <p style={{ fontSize: "0.84rem", color: "hsl(var(--text-muted))", marginBottom: "20px" }}>
              Modifica los datos de la orden o cambia su estado a <strong>PENDIENTE</strong> / <strong>EN_PROCESO</strong> para reabrirla.
            </p>
            {modalError && <p className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "15px" }}>{modalError}</p>}
            <form onSubmit={handleSaveEditWorkOrder}>
              <div className="form-row">
                <div className="form-group">
                  <label>Estado de la Orden (Permite Reabrir OT)</label>
                  <select className="glass-input" value={editStatus} onChange={e => setEditStatus(e.target.value as OrdenTrabajo["estado"])} required>
                    <option value="PENDIENTE">PENDIENTE (Reabrir / Por iniciar)</option>
                    <option value="ASIGNADA">ASIGNADA</option>
                    <option value="EN_PROCESO">EN_PROCESO (Reabrir en terreno)</option>
                    <option value="COMPLETADA">COMPLETADA</option>
                    <option value="CANCELADA">CANCELADA</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha Programada</label>
                  <input type="datetime-local" className="glass-input" value={editScheduledDate} onChange={e => setEditScheduledDate(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Ubicación / Bodega / Tienda Cliente</label>
                <select className="glass-input" value={editLocationId} onChange={e => setEditLocationId(e.target.value)} required>
                  <option value="">Selecciona ubicación...</option>
                  {locations.map(l => (
                    <option key={l.ubicacion_id} value={l.ubicacion_id}>
                      {l.codigo_local ? `[${l.codigo_local}] ` : ""}{l.nombre} {l.comuna ? `(${l.comuna}) ` : ""}- {l.direccion}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Convenio Asociado (Opcional)</label>
                  <select className="glass-input" value={editAgreementId} onChange={e => setEditAgreementId(e.target.value)}>
                    <option value="">Ninguno / Cliente Estándar</option>
                    {agreements.map(a => <option key={a.convenio_id} value={a.convenio_id}>{a.nombre_empresa}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Asignar Técnico</label>
                  <select className="glass-input" value={editTechId} onChange={e => setEditTechId(e.target.value)}>
                    <option value="">Sin asignar / Pendiente</option>
                    {technicians.map(t => <option key={t.usuario_id} value={t.usuario_id}>{t.nombre} {t.apellido}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "25px" }}>
                <label>Notas de Programación</label>
                <textarea className="glass-input" placeholder="Instrucciones especiales o motivo de reapertura..." value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ minHeight: "80px", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingWo(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={modalLoading}>Guardar Cambios</button>
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
                    ? "Recepción y Cierre de Trabajo (Foto + Firma Móvil)" 
                    : modalView === "VINCULAR_ACTIVO" 
                    ? "Vincular Activo a la OT" 
                    : `Detalle de la Orden: ${selectedWo.numero_orden}`}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "hsl(var(--text-muted))", margin: "4px 0 0 0" }}>
                  {modalView === "SUBIR_EVIDENCIA" 
                    ? `Orden ${selectedWo.numero_orden} - Fotografía del equipo instalado y firma de recepción en pantalla` 
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

                  {/* Operational status buttons */}
                  {!isClient && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {isAdminOrJefe && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          onClick={() => handleOpenEditWo(selectedWo)}
                        >
                          <Edit2 size={14} />
                          <span>Editar Orden</span>
                        </button>
                      )}
                      {isAdminOrJefe && (selectedWo.estado === "COMPLETADA" || selectedWo.estado === "CANCELADA") && (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                          onClick={() => handleUpdateStatus("EN_PROCESO")}
                          title="Reabrir orden de trabajo en terreno"
                        >
                          <RotateCcw size={14} />
                          <span>Reabrir Orden</span>
                        </button>
                      )}
                      {isTech && selectedWo.estado !== "EN_PROCESO" && selectedWo.estado !== "COMPLETADA" && (
                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem", borderColor: "#38bdf8", color: "#38bdf8" }} onClick={() => handleUpdateStatus("EN_PROCESO")}>
                          Iniciar Trabajo
                        </button>
                      )}
                      {selectedWo.estado !== "COMPLETADA" && (
                        <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => handleUpdateStatus("COMPLETADA")}>
                          {isTech ? "Recepcionar y Finalizar" : "Completar"}
                        </button>
                      )}
                      {isAdminOrJefe && selectedWo.estado !== "CANCELADA" && (
                        <button className="btn-logout" style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }} onClick={() => handleUpdateStatus("CANCELADA")}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Linked Assets involved */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Equipos Instalados/Retirados</h4>
                    {!isClient && (
                      <button className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => { setModalView("VINCULAR_ACTIVO"); setModalError(null); }}>
                        <Link2 size={12} />
                        <span>Vincular Activo</span>
                      </button>
                    )}
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
                      <span>Evidencias y Firmas de Recepción en Terreno</span>
                    </h4>
                    {!isClient && (
                      <button className="btn-primary" style={{ padding: "5px 12px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => openEvidenceAndClosureView(selectedWo)}>
                        <PenTool size={14} />
                        <span>Subir Foto / Firma Recepción</span>
                      </button>
                    )}
                  </div>

                  {(!selectedWo.evidencias || selectedWo.evidencias.length === 0) ? (
                    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "8px", padding: "24px", textAlign: "center" }}>
                      <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", margin: 0 }}>
                        No se han registrado evidencias fotográficas ni firmas de recepción para este trabajo.
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
                            <p style={{ fontSize: "0.8rem", fontWeight: 600, margin: "0 0 6px 0", color: "#fff", lineHeight: 1.3 }}>
                              {e.comentarios || "Fotografía de trabajo en terreno"}
                            </p>
                            {e.url_firma && (
                              <div style={{ background: "#ffffff", borderRadius: "6px", padding: "4px 6px", marginBottom: "6px", border: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <img
                                  src={e.url_firma}
                                  alt="Firma Recepción"
                                  style={{ maxHeight: "42px", maxWidth: "100%", objectFit: "contain", display: "block" }}
                                />
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.74rem", color: "hsl(var(--text-muted))" }}>
                                📅 {new Date(e.fecha_captura).toLocaleDateString()}
                              </span>
                              {e.url_firma && (
                                <span className="badge success" style={{ fontSize: "0.68rem", padding: "2px 6px" }}>
                                  ✍️ Recepcionado
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

            {/* TAB 2: SUBIR EVIDENCIA Y FIRMA DE RECEPCIÓN MÓVIL */}
            {modalView === "SUBIR_EVIDENCIA" && (
              <form onSubmit={handleUploadEvidence}>
                {/* 1. Main Evidence Photo Picker */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <Camera size={15} style={{ color: "hsl(var(--accent-primary))" }} />
                    <span>1. Foto del Trabajo Realizado (.JPG / .PNG) *</span>
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
                        border: "2px dashed rgba(56, 189, 248, 0.35)", 
                        borderRadius: "12px", 
                        padding: "16px 14px", 
                        textAlign: "center",
                        background: "rgba(15, 23, 42, 0.35)"
                      }}
                    >
                      {/* Input 1: Cámara directa del celular */}
                      <input 
                        id="evidence-camera-input"
                        type="file" 
                        accept="image/*"
                        capture="environment"
                        style={{ display: "none" }}
                        onChange={handleEvidenceImageFileChange}
                      />
                      {/* Input 2: Galería de fotos del celular o computador */}
                      <input 
                        id="evidence-file-input"
                        type="file" 
                        accept="image/jpeg, image/jpg, image/png, image/webp" 
                        style={{ display: "none" }}
                        onChange={handleEvidenceImageFileChange}
                      />

                      <Camera size={28} style={{ color: "hsl(var(--accent-primary))", margin: "0 auto 6px auto" }} />
                      <h5 style={{ margin: "0 0 4px 0", fontSize: "0.92rem", fontWeight: 700 }}>
                        Captura o sube la evidencia del monitor instalado
                      </h5>
                      <p style={{ margin: "0 0 12px 0", fontSize: "0.76rem", color: "hsl(var(--text-muted))" }}>
                        Abre directamente la cámara trasera del celular o elige una foto de la galería
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            background: "#0284c7",
                            color: "#ffffff"
                          }}
                          onClick={() => document.getElementById("evidence-camera-input")?.click()}
                        >
                          <Camera size={16} />
                          <span>Tomar Foto (Cámara)</span>
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          style={{
                            padding: "10px 12px",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px"
                          }}
                          onClick={() => document.getElementById("evidence-file-input")?.click()}
                        >
                          <ImageIcon size={16} />
                          <span>Subir de Galería</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Recepción Conforme y Firma Digital desde el Teléfono */}
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid rgba(56, 189, 248, 0.28)",
                    borderRadius: "12px",
                    padding: "14px",
                    marginBottom: "14px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                    <label style={{ fontSize: "0.84rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", margin: 0, color: "#38bdf8" }}>
                      <UserCheck size={16} />
                      <span>2. Recepción del Trabajo y Firma en Teléfono *</span>
                    </label>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <button
                        type="button"
                        className={evSigMode === "PANTALLA" ? "btn-primary" : "btn-secondary"}
                        style={{ padding: "4px 10px", fontSize: "0.73rem" }}
                        onClick={() => setEvSigMode("PANTALLA")}
                      >
                        ✍️ Firmar en Pantalla
                      </button>
                      <button
                        type="button"
                        className={evSigMode === "ARCHIVO" ? "btn-primary" : "btn-secondary"}
                        style={{ padding: "4px 10px", fontSize: "0.73rem" }}
                        onClick={() => setEvSigMode("ARCHIVO")}
                      >
                        📎 Subir Acta
                      </button>
                    </div>
                  </div>

                  {/* Datos de quien recepciona el trabajo */}
                  <div className="form-row" style={{ marginBottom: "10px", gap: "10px" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "0.76rem", marginBottom: "4px" }}>Nombre de quien recepciona *</label>
                      <input
                        type="text"
                        className="glass-input"
                        style={{ padding: "7px 10px", fontSize: "0.83rem" }}
                        placeholder="Ej: Juan Pérez (Jefe de Local)"
                        value={evReceiverName}
                        onChange={e => setEvReceiverName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "0.76rem", marginBottom: "4px" }}>Cargo o RUT (Opcional)</label>
                      <input
                        type="text"
                        className="glass-input"
                        style={{ padding: "7px 10px", fontSize: "0.83rem" }}
                        placeholder="Ej: 15.432.198-K / Encargado"
                        value={evReceiverRoleOrRut}
                        onChange={e => setEvReceiverRoleOrRut(e.target.value)}
                      />
                    </div>
                  </div>

                  {evSigMode === "PANTALLA" ? (
                    <div>
                      <div
                        style={{
                          position: "relative",
                          background: "#ffffff",
                          borderRadius: "10px",
                          border: hasDrawnSignature ? "2px solid #10b981" : "2px solid #94a3b8",
                          overflow: "hidden",
                          touchAction: "none",
                          userSelect: "none"
                        }}
                      >
                        <canvas
                          ref={sigCanvasRef}
                          width={480}
                          height={155}
                          style={{
                            width: "100%",
                            height: "145px",
                            display: "block",
                            cursor: "crosshair",
                            touchAction: "none"
                          }}
                          onMouseDown={e => handleSigPointerStart(e.clientX, e.clientY)}
                          onMouseMove={e => handleSigPointerMove(e.clientX, e.clientY)}
                          onMouseUp={handleSigPointerEnd}
                          onMouseLeave={handleSigPointerEnd}
                          onTouchStart={e => {
                            e.preventDefault();
                            const t = e.touches[0];
                            if (t) handleSigPointerStart(t.clientX, t.clientY);
                          }}
                          onTouchMove={e => {
                            e.preventDefault();
                            const t = e.touches[0];
                            if (t) handleSigPointerMove(t.clientX, t.clientY);
                          }}
                          onTouchEnd={e => {
                            e.preventDefault();
                            handleSigPointerEnd();
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                        <span style={{ fontSize: "0.75rem", color: hasDrawnSignature ? "#34d399" : "hsl(var(--text-muted))", fontWeight: hasDrawnSignature ? 600 : 400 }}>
                          {hasDrawnSignature
                            ? "✅ Firma de recepción capturada en pantalla"
                            : "👆 Pídele al encargado que firme con su dedo en el recuadro blanco"}
                        </span>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.74rem", display: "inline-flex", alignItems: "center", gap: "5px" }}
                          onClick={handleClearSignaturePad}
                        >
                          <Eraser size={13} />
                          <span>Borrar Firma</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {evSigUrl ? (
                        <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)" }}>
                          <span style={{ fontSize: "0.8rem", color: "#fff" }}>
                            ✍️ {evSigFileName || "Acta firmada adjuntada"}
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
                            style={{ width: "100%", padding: "10px", fontSize: "0.8rem", borderStyle: "dashed" }}
                            onClick={() => document.getElementById("sig-file-input")?.click()}
                          >
                            <FileText size={14} style={{ marginRight: "6px" }} />
                            <span>+ Adjuntar foto de acta o firma en papel</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Comments */}
                <div className="form-group" style={{ marginBottom: "18px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>3. Observaciones de Cierre / Recepción</label>
                  <textarea 
                    className="glass-input" 
                    rows={2}
                    style={{ resize: "vertical", fontSize: "0.84rem", padding: "8px 12px" }}
                    placeholder="ej: Monitor instalado y operativo en sala principal. Se entrega conforme..." 
                    value={evComments} 
                    onChange={e=>setEvComments(e.target.value)} 
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" className="btn-secondary" onClick={() => { setModalView("DETALLE"); setModalError(null); }}>
                    Cancelar / Volver
                  </button>
                  <button type="submit" className="btn-secondary" disabled={modalLoading || !evImageUrl} style={{ fontWeight: 700 }}>
                    {modalLoading ? (
                      <>
                        <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={15} />
                        <span>Guardar Avance</span>
                      </>
                    )}
                  </button>
                  {selectedWo.estado !== "COMPLETADA" && (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={modalLoading || !evImageUrl}
                      style={{
                        background: "#059669",
                        borderColor: "#047857",
                        color: "#ffffff",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                      onClick={() => submitEvidenceAndOptionallyFinish(true)}
                    >
                      <CheckCircle2 size={16} />
                      <span>Recepcionar con Firma y Cerrar Orden</span>
                    </button>
                  )}
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
                  <span style={{ fontSize: "0.75rem", color: "#34d399", display: "block", marginBottom: "6px", fontWeight: 700 }}>
                    ✍️ Firma de Recepción Conforme
                  </span>
                  <div style={{ background: "#ffffff", borderRadius: "8px", padding: "6px 10px", display: "inline-block", border: "1px solid #cbd5e1" }}>
                    <img 
                      src={previewEvidence.url_firma} 
                      alt="Firma de Recepción" 
                      style={{ height: "75px", maxWidth: "260px", objectFit: "contain", display: "block" }} 
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
