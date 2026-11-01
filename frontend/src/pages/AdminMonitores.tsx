/**
 * @file AdminMonitores.tsx
 * @description Panel administrativo exclusivo para gestión CRUD de monitores en venta del catálogo.
 * Permite al Administrador dar de alta nuevos equipos, modificar características/precios y eliminar ítems con confirmación de seguridad.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  Tv, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Save, 
  TrendingUp,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Star
} from "lucide-react";
import { 
  getMonitores, 
  createMonitor, 
  updateMonitor, 
  deleteMonitor, 
  resetMonitoresToDefault 
} from "../services/monitoresService";
import { type MonitorProduct, formatCLP } from "../data/monitoresCatalog";
import "./Catalog.css";

export const AdminMonitores: React.FC = () => {
  const [monitores, setMonitores] = useState<MonitorProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInches, setSelectedInches] = useState("all");
  
  // Modal de edición o creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<MonitorProduct | null>(null);
  
  // Modal de confirmación de eliminación
  const [monitorToDelete, setMonitorToDelete] = useState<MonitorProduct | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Formulario
  const [formData, setFormData] = useState<Omit<MonitorProduct, "id">>({
    model: "",
    brand: "Samsung",
    inches: 43,
    inchesLabel: "43''",
    resolution: "3840 x 2160 (4K UHD)",
    resolutionType: "4K UHD",
    brightnessNits: 500,
    operationHours: "24/7",
    aspectRatio: "16:9",
    smartPlatform: "Tizen 4.0 / MagicInfo S6",
    contrastRatio: "4000:1",
    viewingAngle: "178° / 178°",
    connectivity: ["HDMI 2.0 (x2)", "DisplayPort 1.2", "USB 2.0 (x2)", "RJ45 (LAN)", "RS232C"],
    specialFeatures: ["Panel antirreflejo 28%", "Sensor de temperatura integrado", "Wi-Fi integrado"],
    condition: "Reacondicionado Grado A (Testeo 100%)",
    warranty: "3 meses de garantía Marcom",
    marketPriceCLP: 235000,
    marketPriceUF: 6.2,
    originalPriceReferenceCLP: 650000,
    images: ["/monitores/QM43R/1.avif"],
    description: "Monitor profesional de alto rendimiento y uso continuo.",
    recommendedUses: ["Retail", "Menú Boards", "Salas de Control"]
  });

  // Texto auxiliar para inputs de arrays
  const [connectivityInput, setConnectivityInput] = useState("");
  const [specialFeaturesInput, setSpecialFeaturesInput] = useState("");

  // Referencias para subida y reemplazo de imágenes sin eliminar las demás
  const quickReplaceInputRef = useRef<HTMLInputElement | null>(null);
  const [quickReplaceMonitor, setQuickReplaceMonitor] = useState<MonitorProduct | null>(null);
  const modalAddImageInputRef = useRef<HTMLInputElement | null>(null);
  const modalReplaceImageInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceImageIndex, setReplaceImageIndex] = useState<number | null>(null);

  // Compresión de imagen a DataURL para almacenamiento ágil
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawDataUrl = ev.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 1200;
          let width = img.width;
          let height = img.height;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          } else {
            resolve(rawDataUrl);
          }
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Reemplazar imagen principal directamente desde la fila de la tabla
  const handleTriggerQuickImageReplace = (monitor: MonitorProduct) => {
    setQuickReplaceMonitor(monitor);
    if (quickReplaceInputRef.current) {
      quickReplaceInputRef.current.value = "";
      quickReplaceInputRef.current.click();
    }
  };

  const handleQuickImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickReplaceMonitor) return;
    if (!file.type.startsWith("image/")) {
      showNotification("Selecciona un archivo de imagen válido (JPG, PNG, WEBP, AVIF).", "error");
      return;
    }
    try {
      const dataUrl = await compressImageFile(file);
      const updatedImages = [...(quickReplaceMonitor.images || [])];
      if (updatedImages.length > 0) {
        updatedImages[0] = dataUrl;
      } else {
        updatedImages.push(dataUrl);
      }
      updateMonitor(quickReplaceMonitor.id, { images: updatedImages });
      refreshMonitores();
      showNotification(`Imagen de ${quickReplaceMonitor.model} actualizada sin perder sus demás datos.`);
    } catch {
      showNotification("No se pudo procesar la imagen seleccionada.", "error");
    } finally {
      setQuickReplaceMonitor(null);
      e.target.value = "";
    }
  };

  // Reemplazar una sola imagen específica dentro del modal
  const handleTriggerModalReplaceImage = (index: number) => {
    setReplaceImageIndex(index);
    if (modalReplaceImageInputRef.current) {
      modalReplaceImageInputRef.current.value = "";
      modalReplaceImageInputRef.current.click();
    }
  };

  const handleModalReplaceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replaceImageIndex === null) return;
    if (!file.type.startsWith("image/")) {
      showNotification("Selecciona un archivo de imagen válido.", "error");
      return;
    }
    try {
      const dataUrl = await compressImageFile(file);
      setFormData((prev) => {
        const nextImages = [...prev.images];
        nextImages[replaceImageIndex] = dataUrl;
        return { ...prev, images: nextImages };
      });
    } catch {
      showNotification("No se pudo cargar la imagen.", "error");
    } finally {
      setReplaceImageIndex(null);
      e.target.value = "";
    }
  };

  // Agregar nueva(s) imagen(es) dentro del modal sin borrar las existentes
  const handleModalAddImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          const dataUrl = await compressImageFile(file);
          uploadedUrls.push(dataUrl);
        }
      }
      if (uploadedUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls]
        }));
      }
    } catch {
      showNotification("No se pudo agregar la imagen.", "error");
    } finally {
      e.target.value = "";
    }
  };

  // Establecer una imagen como principal (mover a la posición 0)
  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setFormData((prev) => {
      const nextImages = [...prev.images];
      const [selected] = nextImages.splice(index, 1);
      nextImages.unshift(selected);
      return { ...prev, images: nextImages };
    });
  };

  // Eliminar una sola imagen de la galería sin borrar las demás
  const handleRemoveSingleImage = (index: number) => {
    if (formData.images.length <= 1) {
      showNotification("El monitor debe mantener al menos una imagen. Usa 'Cambiar' para reemplazarla.", "error");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const refreshMonitores = () => {
    setMonitores(getMonitores());
  };

  useEffect(() => {
    refreshMonitores();
  }, []);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtrado
  const filtered = useMemo(() => {
    return monitores.filter((m) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (!m.model.toLowerCase().includes(q) && !m.brand.toLowerCase().includes(q) && !m.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedInches !== "all") {
        if (selectedInches === "10" && m.inches > 15) return false;
        if (selectedInches === "32" && m.inches !== 32) return false;
        if (selectedInches === "37" && m.inches !== 37) return false;
        if (selectedInches === "43" && m.inches !== 43) return false;
        if (selectedInches === "49" && m.inches !== 49) return false;
      }
      return true;
    });
  }, [monitores, searchTerm, selectedInches]);

  // Abrir modal para Crear
  const handleOpenCreateModal = () => {
    setEditingMonitor(null);
    setFormData({
      model: "",
      brand: "Samsung",
      inches: 43,
      inchesLabel: "43''",
      resolution: "3840 x 2160 (4K UHD)",
      resolutionType: "4K UHD",
      brightnessNits: 500,
      operationHours: "24/7",
      aspectRatio: "16:9",
      smartPlatform: "Tizen 4.0",
      contrastRatio: "4000:1",
      viewingAngle: "178° / 178°",
      connectivity: ["HDMI", "USB", "RJ45"],
      specialFeatures: ["Uso intensivo continuo 24/7", "Antirreflejo"],
      condition: "Reacondicionado Grado A",
      warranty: "3 meses de garantía Marcom",
      marketPriceCLP: 220000,
      marketPriceUF: 5.8,
      originalPriceReferenceCLP: 590000,
      images: ["/monitores/QM43R/1.avif"],
      description: "Pantalla profesional de alta visibilidad para señalética y menús.",
      recommendedUses: ["Retail", "Vitrinismo", "Corporativo"]
    });
    setConnectivityInput("HDMI, USB, RJ45");
    setSpecialFeaturesInput("Uso intensivo continuo 24/7, Antirreflejo");
    setIsModalOpen(true);
  };

  // Abrir modal para Editar
  const handleOpenEditModal = (monitor: MonitorProduct) => {
    setEditingMonitor(monitor);
    setFormData({
      ...monitor,
      images: monitor.images && monitor.images.length > 0 ? [...monitor.images] : ["/monitores/QM43R/1.avif"]
    });
    setConnectivityInput(monitor.connectivity.join(", "));
    setSpecialFeaturesInput(monitor.specialFeatures.join(", "));
    setIsModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.model.trim()) {
      showNotification("El modelo del monitor es obligatorio.", "error");
      return;
    }

    const payload: Omit<MonitorProduct, "id"> = {
      ...formData,
      inchesLabel: `${formData.inches}''`,
      connectivity: connectivityInput.split(",").map((s) => s.trim()).filter(Boolean),
      specialFeatures: specialFeaturesInput.split(",").map((s) => s.trim()).filter(Boolean),
      images: formData.images.filter(Boolean).length > 0
        ? formData.images.filter(Boolean)
        : ["/monitores/QM43R/1.avif"],
      marketPriceUF: parseFloat((formData.marketPriceCLP / 38000).toFixed(1))
    };

    if (editingMonitor) {
      updateMonitor(editingMonitor.id, payload);
      showNotification(`Monitor ${payload.model} actualizado exitosamente.`);
    } else {
      createMonitor(payload);
      showNotification(`Nuevo monitor ${payload.model} agregado a la venta.`);
    }

    setIsModalOpen(false);
    refreshMonitores();
  };

  // Confirmar Eliminación con Seguridad
  const handleConfirmDelete = () => {
    if (!monitorToDelete) return;
    deleteMonitor(monitorToDelete.id);
    showNotification(`Monitor ${monitorToDelete.model} eliminado del catálogo.`);
    setMonitorToDelete(null);
    refreshMonitores();
  };

  // Restaurar Catálogo de Fábrica
  const handleResetCatalog = () => {
    if (window.confirm("¿Deseas restaurar el catálogo oficial por defecto con todos los monitores iniciales de Marcom?")) {
      resetMonitoresToDefault();
      refreshMonitores();
      showNotification("Catálogo restaurado a los valores oficiales iniciales.");
    }
  };

  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* INPUTS OCULTOS PARA REEMPLAZAR O SUBIR IMÁGENES SIN ELIMINAR EL MONITOR */}
      <input
        ref={quickReplaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleQuickImageFileChange}
        style={{ display: "none" }}
      />
      <input
        ref={modalReplaceImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleModalReplaceImageChange}
        style={{ display: "none" }}
      />
      <input
        ref={modalAddImageInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleModalAddImagesChange}
        style={{ display: "none" }}
      />

      {/* NOTIFICACIÓN TOAST */}
      {notification && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          background: notification.type === "success" ? "rgba(6, 95, 70, 0.95)" : "rgba(153, 27, 27, 0.95)",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontWeight: 600,
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* BARRA SUPERIOR DE ACCIONES */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleResetCatalog}
            className="catalog-btn-secondary"
            style={{ fontSize: "0.85rem", padding: "8px 14px" }}
            title="Restaurar monitores oficiales iniciales"
          >
            <RotateCcw size={15} /> Restaurar Catálogo
          </button>
          <Link to="/ventas" className="catalog-btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            <TrendingUp size={16} /> Control de Ventas
          </Link>
          <Link to="/catalogo" className="catalog-btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            <ArrowLeft size={16} /> Ver Catálogo Público
          </Link>
          <button onClick={handleOpenCreateModal} className="catalog-btn-primary" style={{ padding: "8px 18px", fontSize: "0.85rem" }}>
            <Plus size={16} /> Agregar Monitor
          </button>
        </div>
      </div>

        {/* MÉTRICAS RÁPIDAS DE INVENTARIO */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>Total de Modelos en Venta</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#38bdf8", marginTop: "4px" }}>{monitores.length}</div>
          </div>
          <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>Precio Mínimo</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#34d399", marginTop: "4px" }}>
              {monitores.length > 0 ? formatCLP(Math.min(...monitores.map((m) => m.marketPriceCLP))) : "$0"}
            </div>
          </div>
          <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>Precio Máximo</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fbbf24", marginTop: "4px" }}>
              {monitores.length > 0 ? formatCLP(Math.max(...monitores.map((m) => m.marketPriceCLP))) : "$0"}
            </div>
          </div>
          <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>Operación 24/7 Continua</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#c084fc", marginTop: "4px" }}>
              {monitores.filter((m) => m.operationHours === "24/7").length} modelos
            </div>
          </div>
        </div>

        {/* BUSCADOR Y FILTROS */}
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 280px" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input
              type="text"
              placeholder="Buscar por modelo (ej. QM43R, DB10D)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="contacto-form-input"
              style={{ paddingLeft: "38px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>Pulgadas:</span>
            {["all", "10", "32", "37", "43", "49"].map((inch) => (
              <button
                key={inch}
                className={`catalog-pill ${selectedInches === inch ? "active" : ""}`}
                onClick={() => setSelectedInches(inch)}
                style={{ padding: "6px 12px", fontSize: "0.78rem" }}
              >
                {inch === "all" ? "Todas" : `${inch}''`}
              </button>
            ))}
          </div>
        </div>

        {/* TABLA DE MONITORES */}
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "rgba(30, 41, 59, 0.7)", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1" }}>
                  <th style={{ padding: "14px 16px" }}>Equipo</th>
                  <th style={{ padding: "14px 16px" }}>Pulgadas</th>
                  <th style={{ padding: "14px 16px" }}>Resolución</th>
                  <th style={{ padding: "14px 16px" }}>Brillo</th>
                  <th style={{ padding: "14px 16px" }}>Horas</th>
                  <th style={{ padding: "14px 16px" }}>Precio Venta (CLP)</th>
                  <th style={{ padding: "14px 16px" }}>Condición</th>
                  <th style={{ padding: "14px 16px", textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <button
                          type="button"
                          onClick={() => handleTriggerQuickImageReplace(item)}
                          title="Clic para cambiar la imagen principal sin eliminar nada"
                          style={{
                            position: "relative",
                            width: "52px",
                            height: "52px",
                            borderRadius: "8px",
                            background: "#0b1329",
                            border: "1px solid rgba(56, 189, 248, 0.35)",
                            padding: "4px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            overflow: "hidden"
                          }}
                        >
                          <img
                            src={item.images[0] || "/placeholder_monitor.png"}
                            alt={item.model}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        </button>
                        <div>
                          <strong style={{ color: "#ffffff", fontSize: "0.95rem" }}>{item.brand} {item.model}</strong>
                          <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                            Ref: {formatCLP(item.originalPriceReferenceCLP)} · {item.images.length} {item.images.length === 1 ? "foto" : "fotos"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontWeight: 700, color: "#38bdf8" }}>{item.inchesLabel}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#cbd5e1" }}>
                      <div>{item.resolutionType}</div>
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{item.resolution.split(" ")[0]}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#cbd5e1" }}>
                      {item.brightnessNits} Nits
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: item.operationHours === "24/7" ? "rgba(56, 189, 248, 0.15)" : "rgba(251, 191, 36, 0.15)",
                        color: item.operationHours === "24/7" ? "#38bdf8" : "#fbbf24",
                        border: `1px solid ${item.operationHours === "24/7" ? "rgba(56, 189, 248, 0.3)" : "rgba(251, 191, 36, 0.3)"}`
                      }}>
                        {item.operationHours}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <strong style={{ color: "#34d399", fontSize: "1rem" }}>{formatCLP(item.marketPriceCLP)}</strong>
                      <div style={{ color: "#64748b", fontSize: "0.72rem" }}>~{item.marketPriceUF} UF</div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "0.8rem" }}>
                      {item.condition}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px", alignItems: "center", flexWrap: "nowrap" }}>
                        <button
                          type="button"
                          onClick={() => handleTriggerQuickImageReplace(item)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 12px",
                            borderRadius: "8px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            color: "#ffffff",
                            background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                            border: "1px solid #059669",
                            boxShadow: "0 2px 8px rgba(5, 150, 105, 0.32)",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          title="Cambiar imagen directamente sin abrir ni eliminar nada"
                        >
                          <ImageIcon size={14} /> Cambiar Imagen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "7px 12px",
                            borderRadius: "8px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            color: "#ffffff",
                            background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                            border: "1px solid #0284c7",
                            boxShadow: "0 2px 8px rgba(2, 132, 199, 0.32)",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          title="Modificar monitor"
                        >
                          <Edit3 size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setMonitorToDelete(item)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "7px 10px",
                            borderRadius: "8px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "#ffffff",
                            background: "linear-gradient(135deg, #dc2626 0%, #e11d48 100%)",
                            border: "1px solid #dc2626",
                            boxShadow: "0 2px 8px rgba(220, 38, 38, 0.32)",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          title="Eliminar monitor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* MODAL PARA CREAR / EDITAR MONITOR */}
      {isModalOpen && (
        <div className="catalog-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="catalog-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Tv size={22} color="#38bdf8" />
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "1.3rem", fontWeight: 800 }}>
                  {editingMonitor ? `Editar Monitor: ${editingMonitor.model}` : "Agregar Nuevo Monitor al Catálogo"}
                </h3>
              </div>
              <button className="catalog-modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. QM55R, DB10D"
                    className="contacto-form-input"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Marca *</label>
                  <input
                    type="text"
                    required
                    className="contacto-form-input"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Pulgadas (Número) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="contacto-form-input"
                    value={formData.inches}
                    onChange={(e) => setFormData({ ...formData, inches: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Tipo Resolución</label>
                  <select
                    className="contacto-form-input"
                    value={formData.resolutionType}
                    onChange={(e) => setFormData({ ...formData, resolutionType: e.target.value as any })}
                  >
                    <option value="4K UHD">4K UHD</option>
                    <option value="Full HD">Full HD</option>
                    <option value="Ultra-Wide">Ultra-Wide</option>
                    <option value="WXGA">WXGA</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Luminosidad (Nits) *</label>
                  <input
                    type="number"
                    required
                    className="contacto-form-input"
                    value={formData.brightnessNits}
                    onChange={(e) => setFormData({ ...formData, brightnessNits: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Horas de Operación</label>
                  <select
                    className="contacto-form-input"
                    value={formData.operationHours}
                    onChange={(e) => setFormData({ ...formData, operationHours: e.target.value as any })}
                  >
                    <option value="24/7">Continuo 24/7</option>
                    <option value="16/7">Comercial 16/7</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Precio Venta (CLP) *</label>
                  <input
                    type="number"
                    required
                    className="contacto-form-input"
                    value={formData.marketPriceCLP}
                    onChange={(e) => setFormData({ ...formData, marketPriceCLP: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Precio Referencia Nuevo (CLP)</label>
                  <input
                    type="number"
                    className="contacto-form-input"
                    value={formData.originalPriceReferenceCLP}
                    onChange={(e) => setFormData({ ...formData, originalPriceReferenceCLP: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Descripción Comercial</label>
                <textarea
                  rows={3}
                  className="contacto-form-input"
                  style={{ resize: "vertical" }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Garantía</label>
                  <input
                    type="text"
                    className="contacto-form-input"
                    value={formData.warranty}
                    onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Condición</label>
                  <input
                    type="text"
                    className="contacto-form-input"
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <label style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 700 }}>
                    Imágenes del Monitor ({formData.images.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => modalAddImageInputRef.current?.click()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(56, 189, 248, 0.45)",
                      background: "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: "#ffffff",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <Upload size={14} />
                    <span>Agregar Nueva Imagen</span>
                  </button>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "12px",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(15, 23, 42, 0.45)",
                  border: "1px solid rgba(148, 163, 184, 0.2)"
                }}>
                  {formData.images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        padding: "8px",
                        borderRadius: "10px",
                        background: idx === 0 ? "rgba(2, 132, 199, 0.12)" : "rgba(15, 23, 42, 0.65)",
                        border: idx === 0 ? "1.5px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.22)",
                        position: "relative"
                      }}
                    >
                      <div style={{
                        width: "100%",
                        height: "92px",
                        borderRadius: "8px",
                        background: "#090f20",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative"
                      }}>
                        <img
                          src={imgSrc}
                          alt={`Vista ${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                        {idx === 0 && (
                          <span style={{
                            position: "absolute",
                            top: "6px",
                            left: "6px",
                            padding: "2px 7px",
                            borderRadius: "999px",
                            background: "#0284c7",
                            color: "#ffffff",
                            fontSize: "0.66rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px"
                          }}>
                            <Star size={10} /> Principal
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleTriggerModalReplaceImage(idx)}
                          style={{
                            flex: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #0284c7",
                            background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                            color: "#ffffff",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                          title="Subir otra imagen para reemplazar únicamente esta fotografía"
                        >
                          <Upload size={12} /> Cambiar
                        </button>

                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            style={{
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #d97706",
                              background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
                              color: "#ffffff",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                            title="Establecer como imagen principal"
                          >
                            <Star size={12} />
                          </button>
                        )}

                        {formData.images.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSingleImage(idx)}
                            style={{
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #dc2626",
                              background: "linear-gradient(135deg, #dc2626 0%, #e11d48 100%)",
                              color: "#ffffff",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                            title="Quitar solo esta imagen"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Puertos / Conectividad (separados por coma)</label>
                  <input
                    type="text"
                    className="contacto-form-input"
                    value={connectivityInput}
                    onChange={(e) => setConnectivityInput(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Características Especiales (separadas por coma)</label>
                  <input
                    type="text"
                    className="contacto-form-input"
                    value={specialFeaturesInput}
                    onChange={(e) => setSpecialFeaturesInput(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
                <button type="button" className="catalog-btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="catalog-btn-primary" style={{ padding: "10px 24px" }}>
                  <Save size={16} /> {editingMonitor ? "Guardar Modificaciones" : "Publicar Monitor en Catálogo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN CON SEGURIDAD */}
      {monitorToDelete && (
        <div className="catalog-modal-overlay" onClick={() => setMonitorToDelete(null)}>
          <div className="catalog-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px", textAlign: "center", padding: "30px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle size={30} />
            </div>
            
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#ffffff", margin: "0 0 10px" }}>
              ¿Estás seguro que deseas eliminar este monitor?
            </h3>
            
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 24px" }}>
              Estás a punto de retirar de la venta pública el monitor <strong style={{ color: "#ffffff" }}>{monitorToDelete.brand} {monitorToDelete.model} ({monitorToDelete.inchesLabel})</strong>. Esta acción removerá el producto de la tienda.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button
                type="button"
                className="catalog-btn-secondary"
                onClick={() => setMonitorToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="catalog-btn-primary"
                style={{ background: "#ef4444", borderColor: "#ef4444" }}
                onClick={handleConfirmDelete}
              >
                <Trash2 size={16} /> Sí, Eliminar Monitor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonitores;
