import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Calculator, 
  Plus, 
  X, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Building2, 
  MapPin, 
  Tv, 
  Upload, 
  AlertCircle, 
  Printer, 
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from "lucide-react";
import { quotationsService, type Cotizacion } from "../services/quotations";
import { authService } from "../services/auth";
import { inventoryService, type CatalogoProductos, type Ubicacion } from "../services/inventory";

interface Agreement {
  convenio_id: string;
  nombre_empresa: string;
  rut: string;
  limite_credito: number;
  credito_usado: number;
  activo: boolean;
}

export const Quotations: React.FC = () => {
  // Data State
  const [quotations, setQuotations] = useState<Cotizacion[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [locations, setLocations] = useState<Ubicacion[]>([]);
  const [products, setProducts] = useState<CatalogoProductos[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [filterAgreement, setFilterAgreement] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showInternalDetails, setShowInternalDetails] = useState<boolean>(false);

  // Form Fields (Client facing parameters)
  const [selectedAgreementId, setSelectedAgreementId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [approvalDate, setApprovalDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [supportType, setSupportType] = useState<string>("ESTANDAR_CONVENIO");
  const [notes, setNotes] = useState<string>("");
  
  // Dynamic Items (Monitors / Equipment)
  const [items, setItems] = useState<{ producto_id: string; cantidad: number; precio_unitario?: number }[]>([
    { producto_id: "", cantidad: 1, precio_unitario: undefined }
  ]);

  // Approve / Upload Purchase Order Modal State
  const [isApproveModalOpen, setIsApproveModalOpen] = useState<boolean>(false);
  const [selectedQuotToApprove, setSelectedQuotToApprove] = useState<Cotizacion | null>(null);
  const [poNumber, setPoNumber] = useState<string>("");
  const [poFileUrl, setPoFileUrl] = useState<string>("");
  const [approvalNotes, setApprovalNotes] = useState<string>("");
  const [approveLoading, setApproveLoading] = useState<boolean>(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Printable Quotation Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedQuotToPrint, setSelectedQuotToPrint] = useState<Cotizacion | null>(null);

  // Load all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [quotsData, agrsData, locsData, prodsData] = await Promise.all([
        quotationsService.getQuotations().catch((e) => {
          console.warn("Quotations Service warning:", e);
          return [] as Cotizacion[];
        }),
        authService.getAgreements().catch((e) => {
          console.warn("Agreements Service warning:", e);
          return [] as Agreement[];
        }),
        inventoryService.getLocations().catch((e) => {
          console.warn("Locations Service warning:", e);
          return [] as Ubicacion[];
        }),
        inventoryService.getProducts().catch((e) => {
          console.warn("Products Service warning:", e);
          return [] as CatalogoProductos[];
        })
      ]);

      setQuotations(quotsData || []);
      setAgreements(agrsData || []);
      setLocations(locsData || []);
      setProducts(prodsData || []);
    } catch (err: any) {
      setError(err?.message || "Error al cargar información.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Locations based on selected Agreement
  const availableLocations = selectedAgreementId 
    ? locations.filter(loc => !loc.es_bodega && (loc.convenio_id === selectedAgreementId || !loc.convenio_id))
    : locations.filter(loc => !loc.es_bodega);

  const selectedAgreement = agreements.find(a => a.convenio_id === selectedAgreementId);
  const selectedLocation = locations.find(l => l.ubicacion_id === selectedLocationId);

  // Live calculation estimates for the modal
  const totalMonitors = items.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
  
  // Estimate distance internally
  const estimateInternalDistance = (loc?: Ubicacion): number => {
    if (!loc) return 25;
    const reg = (loc.region || "").toLowerCase();
    const com = (loc.comuna || "").toLowerCase();
    if (reg.includes("metropolitana") || reg.includes("santiago")) {
      if (["pudahuel", "maipu", "quilicura"].some(c => com.includes(c))) return 15;
      if (["las condes", "vitacura", "lo barnechea"].some(c => com.includes(c))) return 35;
      return 25;
    } else if (reg.includes("valparaíso") || reg.includes("valparaiso") || reg.includes("viña")) {
      return 125;
    } else if (reg.includes("o'higgins") || reg.includes("rancagua")) {
      return 95;
    } else if (reg.includes("biobío") || reg.includes("concepción")) {
      return 500;
    }
    return 60;
  };

  const estimatedKm = estimateInternalDistance(selectedLocation);
  const estimatedKmCost = estimatedKm * 450;
  const estimatedInstallCost = totalMonitors * 45000;
  const estimatedSupportCost = totalMonitors * 25000;

  const estimatedEquipmentCost = items.reduce((acc, item) => {
    const prod = products.find(p => p.producto_id === item.producto_id);
    let price = 350000;
    if (prod) {
      if (prod.pulgadas && prod.pulgadas >= 65) price = 480000;
      else if (prod.pulgadas && prod.pulgadas >= 43) price = 320000;
      else if (prod.pulgadas && prod.pulgadas >= 32) price = 210000;
    }
    return acc + (item.precio_unitario || price) * (Number(item.cantidad) || 0);
  }, 0);

  const estimatedNeto = estimatedEquipmentCost + estimatedInstallCost + estimatedSupportCost + estimatedKmCost;
  const estimatedIva = estimatedNeto * 0.19;
  const estimatedTotal = estimatedNeto + estimatedIva;

  const availableCredit = selectedAgreement ? (selectedAgreement.limite_credito - selectedAgreement.credito_usado) : 0;
  const isCreditSufficient = selectedAgreement ? (availableCredit >= estimatedTotal) : true;

  // Add Item to creation form
  const handleAddItem = () => {
    setItems([...items, { producto_id: "", cantidad: 1, precio_unitario: undefined }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  // Submit Create Quotation
  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgreementId || !selectedLocationId) {
      setCreateError("Por favor selecciona el cliente en convenio y el local de instalación.");
      return;
    }
    if (items.some(i => !i.producto_id || i.cantidad <= 0)) {
      setCreateError("Por favor selecciona todos los monitores / equipos con cantidades válidas.");
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError(null);

      await quotationsService.createQuotation({
        convenio_id: selectedAgreementId,
        ubicacion_id: selectedLocationId,
        fecha_solicitud_aprobacion: new Date(approvalDate).toISOString(),
        tipo_soporte: supportType,
        items: items.map(i => ({
          producto_id: i.producto_id,
          cantidad: Number(i.cantidad),
          precio_unitario: i.precio_unitario ? Number(i.precio_unitario) : undefined
        })),
        notas: notes
      });

      // Reset
      setIsCreateModalOpen(false);
      setSelectedAgreementId("");
      setSelectedLocationId("");
      setNotes("");
      setItems([{ producto_id: "", cantidad: 1, precio_unitario: undefined }]);
      
      await fetchData();
    } catch (err: any) {
      setCreateError(err?.message || "No se pudo registrar la cotización.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Submit Approval with Purchase Order (OC)
  const handleApproveWithPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotToApprove) return;
    if (!poNumber.trim()) {
      setApproveError("El número de Orden de Compra (OC) es obligatorio.");
      return;
    }

    try {
      setApproveLoading(true);
      setApproveError(null);

      await quotationsService.approveQuotationWithPO(selectedQuotToApprove.cotizacion_id, {
        orden_compra_numero: poNumber.trim(),
        orden_compra_adjunto: poFileUrl.trim() || undefined,
        notas: approvalNotes.trim() || undefined
      });

      setIsApproveModalOpen(false);
      setSelectedQuotToApprove(null);
      setPoNumber("");
      setPoFileUrl("");
      setApprovalNotes("");

      await fetchData();
    } catch (err: any) {
      setApproveError(err?.message || "Error al aprobar la cotización y cargar la orden de compra.");
    } finally {
      setApproveLoading(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (estado: string) => {
    switch (estado) {
      case "APROBADA":
        return (
          <span className="badge success" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={13} />
            <span>Aprobada</span>
          </span>
        );
      case "PENDIENTE_APROBACION":
        return (
          <span className="badge warning" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Clock size={13} />
            <span>Pendiente Aprobación</span>
          </span>
        );
      case "RECHAZADA":
        return (
          <span className="badge error" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <XCircle size={13} />
            <span>Rechazada</span>
          </span>
        );
      default:
        return <span className="badge">{estado}</span>;
    }
  };

  // Filtered List
  const filteredQuotations = quotations.filter(q => {
    const matchesAgreement = !filterAgreement || q.convenio_id === filterAgreement;
    const matchesStatus = !filterStatus || q.estado === filterStatus;
    const matchesSearch = !searchTerm || 
      q.numero_cotizacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.orden_compra_numero && q.orden_compra_numero.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesAgreement && matchesStatus && matchesSearch;
  });

  return (
    <div className="quotations-view animate-fade-in">
      {/* Top Banner / Actions Bar */}
      <div className="glass-panel card-container" style={{ marginBottom: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <div>
            <h2 className="accent-text-gradient" style={{ fontSize: "1.4rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
              <Calculator size={24} style={{ color: "hsl(var(--secondary))" }} />
              <span>Cotizaciones para Clientes en Convenio</span>
            </h2>
            <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.9rem", marginTop: "4px" }}>
              Cotización simplificada por local y monitores con cálculo interno automático de kilometraje, soporte e instalación.
            </p>
          </div>

          <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} />
            <span>Nueva Cotización</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginTop: "20px", paddingTop: "15px", borderTop: "1px solid var(--glass-border)" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--text-muted))" }} />
            <input
              type="text"
              className="glass-input"
              style={{ width: "100%", paddingLeft: "36px" }}
              placeholder="Buscar por N° Cotización u OC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="glass-input"
            value={filterAgreement}
            onChange={(e) => setFilterAgreement(e.target.value)}
          >
            <option value="">Todos los Convenios</option>
            {agreements.map(agr => (
              <option key={agr.convenio_id} value={agr.convenio_id}>
                {agr.nombre_empresa}
              </option>
            ))}
          </select>

          <select
            className="glass-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos los Estados</option>
            <option value="PENDIENTE_APROBACION">Pendiente de Aprobación</option>
            <option value="APROBADA">Aprobada con OC</option>
            <option value="RECHAZADA">Rechazada</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="badge error" style={{ width: "100%", padding: "14px", marginBottom: "20px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Quotations Table */}
      <div className="glass-panel card-container">
        <div className="panel-title">
          <span>Registro de Cotizaciones ({filteredQuotations.length})</span>
        </div>

        <div className="table-responsive">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
              <Loader2 className="spin" size={32} style={{ animation: "spin 1s linear infinite", color: "hsl(var(--primary))" }} />
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "45px 20px" }}>
              <Calculator size={42} style={{ color: "hsl(var(--text-muted))", opacity: 0.5, marginBottom: "12px" }} />
              <p style={{ color: "hsl(var(--text-muted))", fontSize: "1rem" }}>
                No se encontraron cotizaciones con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>N° Cotización</th>
                  <th>Cliente en Convenio</th>
                  <th>Local de Instalación</th>
                  <th>Día Solicitud Aprobación</th>
                  <th>Total Cotizado</th>
                  <th>Orden de Compra (OC)</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((quot) => {
                  const agreement = agreements.find(a => a.convenio_id === quot.convenio_id);
                  const location = locations.find(l => l.ubicacion_id === quot.ubicacion_id);
                  
                  return (
                    <tr key={quot.cotizacion_id}>
                      <td style={{ fontWeight: 700, color: "hsl(var(--secondary))" }}>
                        {quot.numero_cotizacion}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{agreement ? agreement.nombre_empresa : "Convenio"}</div>
                        <div style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>{agreement?.rut}</div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <MapPin size={14} style={{ color: "hsl(var(--primary))" }} />
                          <span>{location ? location.nombre : "Local"}</span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                          {location?.comuna || location?.region}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={13} style={{ color: "hsl(var(--text-muted))" }} />
                          <span>{new Date(quot.fecha_solicitud_aprobacion).toLocaleDateString('es-CL')}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                        ${Math.round(quot.monto_total).toLocaleString('es-CL')}
                        <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))", fontWeight: 400 }}>
                          (Neto: ${Math.round(quot.subtotal_neto).toLocaleString('es-CL')})
                        </div>
                      </td>
                      <td>
                        {quot.orden_compra_numero ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "4px 8px", borderRadius: "6px", color: "hsl(var(--success))", fontWeight: 600, fontSize: "0.85rem" }}>
                            <FileText size={13} />
                            <span>{quot.orden_compra_numero}</span>
                          </div>
                        ) : (
                          <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.85rem", fontStyle: "italic" }}>
                            Sin OC cargada
                          </span>
                        )}
                      </td>
                      <td>
                        {renderStatusBadge(quot.estado)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          {/* Print / View Proposal */}
                          <button
                            className="btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                            title="Ver / Imprimir Cotización"
                            onClick={() => {
                              setSelectedQuotToPrint(quot);
                              setIsPrintModalOpen(true);
                            }}
                          >
                            <Printer size={14} />
                            <span>Ver PDF</span>
                          </button>

                          {/* Action to Approve & Load PO */}
                          {quot.estado === "PENDIENTE_APROBACION" && (
                            <button
                              className="btn-primary"
                              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "linear-gradient(135deg, hsl(var(--success)), hsla(var(--success), 0.8))" }}
                              title="Cargar Orden de Compra y Aprobar"
                              onClick={() => {
                                setSelectedQuotToApprove(quot);
                                setPoNumber("");
                                setPoFileUrl("");
                                setApprovalNotes("");
                                setApproveError(null);
                                setIsApproveModalOpen(true);
                              }}
                            >
                              <Upload size={14} />
                              <span>Cargar OC</span>
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

      {/* CREATE QUOTATION MODAL */}
      {isCreateModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: "780px", width: "95%" }}>
            <button className="modal-close" onClick={() => setIsCreateModalOpen(false)}>
              <X size={20} />
            </button>

            <h3 className="accent-text-gradient" style={{ marginBottom: "20px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", fontSize: "1.3rem" }}>
              <Calculator size={22} style={{ color: "hsl(var(--secondary))" }} />
              <span>Nueva Cotización para Cliente en Convenio</span>
            </h3>

            {createError && (
              <div className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "18px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateQuotation}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "18px" }}>
                {/* 1. Cliente en Convenio */}
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Building2 size={14} style={{ color: "hsl(var(--secondary))" }} />
                    <span>Cliente con Convenio *</span>
                  </label>
                  <select
                    className="glass-input"
                    value={selectedAgreementId}
                    onChange={(e) => {
                      setSelectedAgreementId(e.target.value);
                      setSelectedLocationId(""); // reset local
                    }}
                    required
                  >
                    <option value="">Selecciona Empresa...</option>
                    {agreements.filter(a => a.activo).map(agr => (
                      <option key={agr.convenio_id} value={agr.convenio_id}>
                        {agr.nombre_empresa} ({agr.rut})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Local de Instalación */}
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={14} style={{ color: "hsl(var(--primary))" }} />
                    <span>Local / Sucursal de Instalación *</span>
                  </label>
                  <select
                    className="glass-input"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    required
                  >
                    <option value="">Selecciona Local...</option>
                    {availableLocations.map(loc => (
                      <option key={loc.ubicacion_id} value={loc.ubicacion_id}>
                        {loc.nombre} - {loc.comuna || loc.region} {loc.codigo_local ? `(${loc.codigo_local})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Informative summary of selected Agreement and Location */}
              {selectedAgreement && (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "0.85rem" }}>
                  <div>
                    <span style={{ color: "hsl(var(--text-muted))" }}>Límite de Crédito:</span>
                    <p style={{ fontWeight: 600 }}>${selectedAgreement.limite_credito.toLocaleString('es-CL')}</p>
                  </div>
                  <div>
                    <span style={{ color: "hsl(var(--text-muted))" }}>Crédito Usado:</span>
                    <p style={{ fontWeight: 600 }}>${selectedAgreement.credito_usado.toLocaleString('es-CL')}</p>
                  </div>
                  <div>
                    <span style={{ color: "hsl(var(--text-muted))" }}>Crédito Disponible:</span>
                    <p style={{ fontWeight: 700, color: availableCredit > 0 ? "hsl(var(--success))" : "hsl(var(--error))" }}>
                      ${availableCredit.toLocaleString('es-CL')}
                    </p>
                  </div>
                  {selectedLocation && (
                    <div>
                      <span style={{ color: "hsl(var(--text-muted))" }}>Dirección Destino:</span>
                      <p style={{ fontWeight: 600 }}>{selectedLocation.direccion}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Selección de Monitores / Equipos a Instalar */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <Tv size={16} style={{ color: "hsl(var(--secondary))" }} />
                    <span>Monitores y Equipos a Instalar *</span>
                  </label>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                    onClick={handleAddItem}
                  >
                    <Plus size={14} />
                    <span>Agregar Equipo</span>
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "12px", alignItems: "center", background: "rgba(255, 255, 255, 0.02)", padding: "10px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                      <div style={{ flex: 3 }}>
                        <select
                          className="glass-input"
                          style={{ width: "100%" }}
                          value={item.producto_id}
                          onChange={(e) => handleItemChange(idx, "producto_id", e.target.value)}
                          required
                        >
                          <option value="">Selecciona Monitor del Catálogo...</option>
                          {products.map(prod => (
                            <option key={prod.producto_id} value={prod.producto_id}>
                              {prod.nombre} {prod.pulgadas ? `(${prod.pulgadas}")` : ""} - {prod.marca}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ width: "110px" }}>
                        <input
                          type="number"
                          min="1"
                          className="glass-input"
                          style={{ width: "100%" }}
                          placeholder="Cantidad"
                          value={item.cantidad}
                          onChange={(e) => handleItemChange(idx, "cantidad", Number(e.target.value))}
                          required
                        />
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "8px", color: "hsl(var(--error))", borderColor: "rgba(239, 68, 68, 0.3)" }}
                          onClick={() => handleRemoveItem(idx)}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Día de la Solicitud de Aprobación y Soporte */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "20px" }}>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={14} style={{ color: "hsl(var(--warning))" }} />
                    <span>Día de la Solicitud de Aprobación *</span>
                  </label>
                  <input
                    type="date"
                    className="glass-input"
                    value={approvalDate}
                    onChange={(e) => setApprovalDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheck size={14} style={{ color: "hsl(var(--success))" }} />
                    <span>Nivel de Soporte Incluido</span>
                  </label>
                  <select
                    className="glass-input"
                    value={supportType}
                    onChange={(e) => setSupportType(e.target.value)}
                  >
                    <option value="ESTANDAR_CONVENIO">Soporte Estándar Convenio (On-site 5x8)</option>
                    <option value="PREMIUM_24_7">Soporte Premium 24/7 Crítico</option>
                    <option value="GARANTIA_EXTENDIDA">Garantía y Mantenimiento Preventivo</option>
                  </select>
                </div>
              </div>

              {/* Client Proposal Price Box */}
              <div style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "10px", padding: "18px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <span style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Total Cotización Integral (Equipos + Instalación + Soporte + Traslado)
                    </span>
                    <h4 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff" }}>
                      ${Math.round(estimatedTotal).toLocaleString('es-CL')} <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "hsl(var(--text-muted))" }}>CLP (IVA Incluido)</span>
                    </h4>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span className={`badge ${isCreditSufficient ? "success" : "error"}`}>
                      {isCreditSufficient ? "Crédito Convenio Disponible" : "Excede Límite de Crédito"}
                    </span>
                  </div>
                </div>

                {/* Collapsible Internal Calculations (Admin / Back-office) */}
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed rgba(255, 255, 255, 0.1)" }}>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "hsl(var(--text-muted))", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "0" }}
                    onClick={() => setShowInternalDetails(!showInternalDetails)}
                  >
                    <span>{showInternalDetails ? "Ocultar desglose interno" : "Ver desglose de cálculos internos (Back-office)"}</span>
                    {showInternalDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showInternalDetails && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginTop: "10px", fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                      <div>
                        <span>Equipos ({totalMonitors} un.):</span>
                        <p style={{ color: "#fff", fontWeight: 600 }}>${Math.round(estimatedEquipmentCost).toLocaleString('es-CL')}</p>
                      </div>
                      <div>
                        <span>Instalación en terreno:</span>
                        <p style={{ color: "#fff", fontWeight: 600 }}>${Math.round(estimatedInstallCost).toLocaleString('es-CL')}</p>
                      </div>
                      <div>
                        <span>Soporte Técnico:</span>
                        <p style={{ color: "#fff", fontWeight: 600 }}>${Math.round(estimatedSupportCost).toLocaleString('es-CL')}</p>
                      </div>
                      <div>
                        <span>Distancia Local ({estimatedKm} km):</span>
                        <p style={{ color: "#fff", fontWeight: 600 }}>${Math.round(estimatedKmCost).toLocaleString('es-CL')}</p>
                      </div>
                      <div>
                        <span>Subtotal Neto:</span>
                        <p style={{ color: "#fff", fontWeight: 600 }}>${Math.round(estimatedNeto).toLocaleString('es-CL')}</p>
                      </div>
                      <div>
                        <span>IVA (19%):</span>
                        <p style={{ color: "#fff", fontWeight: 600 }}>${Math.round(estimatedIva).toLocaleString('es-CL')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={createLoading}>
                  {createLoading ? (
                    <>
                      <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <span>Generar Cotización</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* APPROVE WITH PURCHASE ORDER (OC) MODAL */}
      {isApproveModalOpen && selectedQuotToApprove && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: "560px", width: "90%" }}>
            <button className="modal-close" onClick={() => setIsApproveModalOpen(false)}>
              <X size={20} />
            </button>

            <h3 className="accent-text-gradient" style={{ marginBottom: "15px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", fontSize: "1.25rem" }}>
              <Upload size={20} style={{ color: "hsl(var(--success))" }} />
              <span>Cargar Orden de Compra (OC) y Aprobar</span>
            </h3>

            <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "12px", marginBottom: "20px", fontSize: "0.85rem" }}>
              <p><strong>Cotización:</strong> {selectedQuotToApprove.numero_cotizacion}</p>
              <p><strong>Monto Total:</strong> ${Math.round(selectedQuotToApprove.monto_total).toLocaleString('es-CL')} CLP</p>
              <p><strong>Día Solicitud:</strong> {new Date(selectedQuotToApprove.fecha_solicitud_aprobacion).toLocaleDateString('es-CL')}</p>
            </div>

            {approveError && (
              <div className="badge error" style={{ width: "100%", padding: "10px", marginBottom: "18px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} />
                <span>{approveError}</span>
              </div>
            )}

            <form onSubmit={handleApproveWithPO}>
              <div className="form-group">
                <label>Número de Orden de Compra del Cliente *</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="ej: OC-COPEC-2026-9812"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Enlace o Referencia del Documento OC (Opcional)</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="https://drive.google.com/... o referencia"
                  value={poFileUrl}
                  onChange={(e) => setPoFileUrl(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "25px" }}>
                <label>Notas de Aprobación</label>
                <textarea
                  className="glass-input"
                  rows={3}
                  placeholder="Observaciones de recepción de la orden de compra..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              </div>

              <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "12px", marginBottom: "20px", fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "hsl(var(--success))", fontWeight: 600, marginBottom: "4px" }}>
                  <Check size={16} />
                  <span>Impacto Automático en el Sistema:</span>
                </div>
                <ul style={{ paddingLeft: "20px", lineHeight: "1.6" }}>
                  <li>Se genera la <strong>Orden de Trabajo (OT)</strong> para instalación en el local.</li>
                  <li>Se registra el <strong>Pedido de Facturación</strong> con cargo al crédito del convenio.</li>
                  <li>Se descuenta el monto del crédito disponible del cliente.</li>
                </ul>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn-secondary" onClick={() => setIsApproveModalOpen(false)}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ background: "linear-gradient(135deg, hsl(var(--success)), hsla(var(--success), 0.8))" }}
                  disabled={approveLoading}
                >
                  {approveLoading ? (
                    <>
                      <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <span>Aprobar y Cargar OC</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PRINTABLE / OFFICIAL PROPOSAL MODAL */}
      {isPrintModalOpen && selectedQuotToPrint && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: "860px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#0b1329", color: "#f8fafc", padding: "0", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.15)", boxShadow: "0 25px 80px rgba(0, 0, 0, 0.95), 0 0 40px rgba(56, 189, 248, 0.15)", overflow: "hidden", margin: "auto" }}>
            
            {/* Modal Header Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(15, 23, 42, 0.9)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={20} style={{ color: "#38bdf8" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#f1f5f9" }}>
                  Documento Oficial de Cotización #{selectedQuotToPrint.numero_cotizacion}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)", color: "#94a3b8", borderRadius: "50%", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Printable Document Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", maxHeight: "calc(90vh - 140px)" }}>
              <div id="printable-quotation" style={{ background: "#0f172a", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "24px" }}>
                {/* Header con estilo DTE / SII Chileno */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #334155", paddingBottom: "20px", marginBottom: "20px", gap: "20px" }}>
                  {/* Emisor Oficial */}
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: "1.4", margin: "0 0 8px 0" }}>
                      SOCIEDAD DE INSTALACIONES MARCOM COMPANIA LIMITADA
                    </h2>
                    <p style={{ fontSize: "0.85rem", color: "#e2e8f0", margin: "4px 0", fontWeight: 600 }}>
                      <strong>Giro:</strong> SERV. INSTAL. ARR. MANTEN. SISTEMAS DE CABLE TV
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "3px 0" }}>
                      <strong>Dirección:</strong> VICTOR SOTO ESPINOZA 1192 JARDINES PENAFLOR II - PENAFLOR
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "3px 0" }}>
                      <strong>Email:</strong> marcomena65@gmail.com
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 700, margin: "4px 0 0 0" }}>
                      S.I.I. - MAIPU
                    </p>
                  </div>

                  {/* Recuadro Oficial DTE / Timbre Tributario */}
                  <div style={{ minWidth: "260px", maxWidth: "280px", border: "3px solid #ef4444", borderRadius: "8px", padding: "12px 14px", textAlign: "center", background: "rgba(239, 68, 68, 0.04)" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ef4444", letterSpacing: "0.5px" }}>
                      R.U.T.: 76.248.165-0
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#ef4444", margin: "6px 0", textTransform: "uppercase", borderTop: "1px solid rgba(239, 68, 68, 0.3)", borderBottom: "1px solid rgba(239, 68, 68, 0.3)", padding: "4px 0" }}>
                      COTIZACIÓN / PROPUESTA
                    </div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#ef4444" }}>
                      Nº {selectedQuotToPrint.numero_cotizacion.replace("COT-", "")}
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ef4444", marginTop: "6px" }}>
                      S.I.I. - MAIPU
                    </div>
                  </div>
                </div>

                {/* Fecha y Estado Bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b", padding: "10px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.85rem" }}>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Fecha Emisión / Solicitud: </span>
                    <strong style={{ color: "#f8fafc" }}>{new Date(selectedQuotToPrint.fecha_solicitud_aprobacion).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#94a3b8" }}>Estado:</span>
                    {renderStatusBadge(selectedQuotToPrint.estado)}
                  </div>
                </div>

                {/* Client & Location Details */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", background: "#1e293b", padding: "16px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.85rem" }}>
                  <div>
                    <h4 style={{ color: "#38bdf8", marginBottom: "8px", fontWeight: 700, fontSize: "0.9rem" }}>DATOS DEL CLIENTE EN CONVENIO</h4>
                    <p style={{ margin: "4px 0" }}><strong>Empresa:</strong> {agreements.find(a => a.convenio_id === selectedQuotToPrint.convenio_id)?.nombre_empresa}</p>
                    <p style={{ margin: "4px 0" }}><strong>RUT:</strong> {agreements.find(a => a.convenio_id === selectedQuotToPrint.convenio_id)?.rut}</p>
                    <p style={{ margin: "4px 0" }}><strong>Modalidad:</strong> Crédito en Convenio</p>
                  </div>
                  <div>
                    <h4 style={{ color: "#38bdf8", marginBottom: "8px", fontWeight: 700, fontSize: "0.9rem" }}>LOCAL DE INSTALACIÓN</h4>
                    <p style={{ margin: "4px 0" }}><strong>Local:</strong> {locations.find(l => l.ubicacion_id === selectedQuotToPrint.ubicacion_id)?.nombre}</p>
                    <p style={{ margin: "4px 0" }}><strong>Dirección:</strong> {locations.find(l => l.ubicacion_id === selectedQuotToPrint.ubicacion_id)?.direccion}</p>
                    <p style={{ margin: "4px 0" }}><strong>Comuna / Región:</strong> {locations.find(l => l.ubicacion_id === selectedQuotToPrint.ubicacion_id)?.comuna || "Santiago"}, {locations.find(l => l.ubicacion_id === selectedQuotToPrint.ubicacion_id)?.region}</p>
                  </div>
                </div>

                {/* Scope & Items */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ color: "#38bdf8", marginBottom: "12px", fontWeight: 700, fontSize: "0.95rem" }}>DETALLE DEL SERVICIO Y EQUIPAMIENTO</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#334155", color: "#f8fafc", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px", borderRadius: "6px 0 0 0" }}>Descripción</th>
                        <th style={{ padding: "10px 12px", textAlign: "center" }}>Cantidad</th>
                        <th style={{ padding: "10px 12px", textAlign: "right" }}>Precio Unitario</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", borderRadius: "0 6px 0 0" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuotToPrint.items && selectedQuotToPrint.items.length > 0 ? (
                        selectedQuotToPrint.items.map((it, idx) => {
                          const prod = products.find(p => p.producto_id === it.producto_id);
                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid #334155" }}>
                              <td style={{ padding: "12px" }}>
                                <strong>{prod ? prod.nombre : "Monitor / Equipo"}</strong>
                                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>{prod?.marca} {prod?.pulgadas ? `(${prod.pulgadas}")` : ""} - {prod?.categoria}</div>
                              </td>
                              <td style={{ padding: "12px", textAlign: "center" }}>{it.cantidad}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>${Math.round(it.precio_unitario || 0).toLocaleString('es-CL')}</td>
                              <td style={{ padding: "12px", textAlign: "right", fontWeight: 600 }}>${Math.round(it.subtotal || 0).toLocaleString('es-CL')}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr style={{ borderBottom: "1px solid #334155" }}>
                          <td style={{ padding: "12px" }}>Servicio Integral de Monitores e Instalación en Local</td>
                          <td style={{ padding: "12px", textAlign: "center" }}>1</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>${Math.round(selectedQuotToPrint.monto_equipos).toLocaleString('es-CL')}</td>
                          <td style={{ padding: "12px", textAlign: "right", fontWeight: 600 }}>${Math.round(selectedQuotToPrint.monto_equipos).toLocaleString('es-CL')}</td>
                        </tr>
                      )}
                      <tr style={{ borderBottom: "1px solid #334155" }}>
                        <td style={{ padding: "12px" }}>
                          <strong>Servicio de Montaje, Soporte Técnico y Traslado a Local</strong>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>Plan: {selectedQuotToPrint.tipo_soporte} - Cobertura en terreno</div>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>1</td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          ${Math.round(selectedQuotToPrint.costo_instalacion + selectedQuotToPrint.costo_soporte + selectedQuotToPrint.monto_kilometraje).toLocaleString('es-CL')}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 600 }}>
                          ${Math.round(selectedQuotToPrint.costo_instalacion + selectedQuotToPrint.costo_soporte + selectedQuotToPrint.monto_kilometraje).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Financial Totals */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                  <div style={{ width: "280px", background: "#1e293b", padding: "14px 18px", borderRadius: "8px", fontSize: "0.9rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#94a3b8" }}>Subtotal Neto:</span>
                      <strong style={{ color: "#f8fafc" }}>${Math.round(selectedQuotToPrint.subtotal_neto).toLocaleString('es-CL')}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#94a3b8" }}>IVA (19%):</span>
                      <strong style={{ color: "#f8fafc" }}>${Math.round(selectedQuotToPrint.monto_iva).toLocaleString('es-CL')}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid #334155", fontWeight: 800, fontSize: "1.15rem", color: "#38bdf8" }}>
                      <span>TOTAL:</span>
                      <span>${Math.round(selectedQuotToPrint.monto_total).toLocaleString('es-CL')} CLP</span>
                    </div>
                  </div>
                </div>

                {/* OC Stamp if approved */}
                {selectedQuotToPrint.orden_compra_numero && (
                  <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "8px", padding: "14px 18px", marginTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "hsl(var(--success))", fontWeight: 700 }}>ORDEN DE COMPRA REGISTRADA</span>
                      <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: "2px 0 0 0" }}>N° {selectedQuotToPrint.orden_compra_numero}</p>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#94a3b8" }}>
                      Fecha Aprobación: {selectedQuotToPrint.fecha_aprobacion ? new Date(selectedQuotToPrint.fecha_aprobacion).toLocaleDateString('es-CL') : "Aprobada"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Modal Footer with Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(15, 23, 42, 0.95)" }}>
              <div style={{ fontSize: "0.95rem", color: "#94a3b8" }}>
                Total a Facturar: <strong style={{ color: "#38bdf8", fontSize: "1.1rem" }}>${Math.round(selectedQuotToPrint.monto_total).toLocaleString('es-CL')} CLP</strong>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="button" className="btn-secondary" onClick={() => setIsPrintModalOpen(false)}>
                  Cerrar
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  <span>Imprimir / Guardar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Quotations;
