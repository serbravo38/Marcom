/**
 * @file Facturacion.tsx
 * @description Módulo de Control General de Facturación y Libro de Ventas Contable.
 * Permite supervisar folios emitidos (Factura 33 y Boleta 39), montos netos, IVA 19%
 * y exportar la base completa estructurada en archivo CSV para carga en el Portal Mipyme del SII o software contable.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Calendar, 
  Eye, 
  FileText, 
  Printer, 
  X, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Percent, 
  Building2, 
  ArrowLeft 
} from "lucide-react";
import { 
  getSalesOrders, 
  getBillingSummary, 
  downloadBillingCSV, 
  type SalesOrder, 
  type BillingSummary 
} from "../services/salesService";
import { formatCLP } from "../data/monitoresCatalog";
import "./Catalog.css";

export const Facturacion: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [documentFilter, setDocumentFilter] = useState<"ALL" | "FACTURA" | "BOLETA">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APROBADO" | "PENDIENTE">("ALL");
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  useEffect(() => {
    setOrders(getSalesOrders());
  }, []);

  // Resumen contable consolidado
  const summary: BillingSummary = useMemo(() => getBillingSummary(orders), [orders]);

  // Filtrado de documentos
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (documentFilter !== "ALL" && ord.customer.tipoDocumento !== documentFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && ord.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesFolio = String(ord.dteFolio).includes(q);
        const matchesOrder = ord.orderId.toLowerCase().includes(q);
        const matchesName = ord.customer.nombre.toLowerCase().includes(q);
        const matchesRut = ord.customer.rut.toLowerCase().includes(q);
        const matchesRazon = ord.customer.razonSocial?.toLowerCase().includes(q);
        const matchesRutEmp = ord.customer.rutEmpresa?.toLowerCase().includes(q);
        const matchesEmail = ord.customer.email.toLowerCase().includes(q);

        if (!matchesFolio && !matchesOrder && !matchesName && !matchesRut && !matchesRazon && !matchesRutEmp && !matchesEmail) {
          return false;
        }
      }
      return true;
    });
  }, [orders, documentFilter, statusFilter, searchTerm]);

  const handleExportCSV = () => {
    downloadBillingCSV(filteredOrders);
  };

  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* BARRA SUPERIOR DE ACCIONES */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0, maxWidth: "700px" }}>
            Control general de facturación y libro de ventas. Genera y descarga el archivo CSV consolidado con desglose de valores netos e IVA 19% para el SII y contabilidad.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleExportCSV}
            className="catalog-btn-primary"
            style={{
              padding: "9px 18px",
              fontSize: "0.86rem",
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)"
            }}
            title="Descargar archivo CSV de facturación para control contable y cruce con SII"
          >
            <Download size={16} /> Exportar CSV Facturación
          </button>
          <Link to="/ventas" className="catalog-btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            <TrendingUp size={16} /> Control de Ventas
          </Link>
          <Link to="/catalogo" className="catalog-btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            <ArrowLeft size={16} /> Ver Catálogo
          </Link>
        </div>
      </div>

      {/* KPIS CONTABLES CONSOLIDADOS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {/* KPI 1: Monto Neto */}
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "14px", padding: "18px", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>Monto Neto Total</span>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
              {formatCLP(summary.totalNetoCLP)}
            </div>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Base imponible</span>
          </div>
        </div>

        {/* KPI 2: IVA 19% */}
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "14px", padding: "18px", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Percent size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>IVA Débito Fiscal (19%)</span>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#c084fc", marginTop: "2px" }}>
              {formatCLP(summary.totalIvaCLP)}
            </div>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Impuesto declarado</span>
          </div>
        </div>

        {/* KPI 3: Total Bruto Facturado */}
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(52, 211, 153, 0.2)", borderRadius: "14px", padding: "18px", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "rgba(52, 211, 153, 0.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Receipt size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>Total Facturado</span>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#34d399", marginTop: "2px" }}>
              {formatCLP(summary.totalBrutoCLP)}
            </div>
            <span style={{ fontSize: "0.72rem", color: "#38bdf8" }}>Neto + IVA</span>
          </div>
        </div>

        {/* KPI 4: Documentos Emitidos */}
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(251, 191, 36, 0.2)", borderRadius: "14px", padding: "18px", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>Documentos Emitidos</span>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fbbf24", marginTop: "2px" }}>
              {summary.facturasCount} Fact. • {summary.boletasCount} Bol.
            </div>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{orders.length} comprobantes en libro</span>
          </div>
        </div>
      </div>

      {/* BANNER INFORMATIVO MODELO CSV / SII */}
      <div style={{
        background: "rgba(15, 23, 42, 0.7)",
        border: "1px solid rgba(56, 189, 248, 0.2)",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <FileSpreadsheet size={22} color="#38bdf8" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: "#ffffff", fontSize: "0.92rem", display: "block" }}>
              Gestión de Facturación por Archivo CSV
            </strong>
            <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
              Los documentos de venta se registran con folios y montos netos/IVA para descarga en formato compatible con Excel y carga directa en el Portal Mipyme del SII.
            </span>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="catalog-btn-secondary"
          style={{
            padding: "7px 14px",
            fontSize: "0.82rem",
            color: "#34d399",
            borderColor: "rgba(52, 211, 153, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Download size={14} /> Descargar Archivo CSV ({filteredOrders.length})
        </button>
      </div>

      {/* BARRA DE HERRAMIENTAS Y FILTROS */}
      <div style={{
        background: "rgba(15, 23, 42, 0.7)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "20px",
        display: "flex",
        gap: "16px",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            placeholder="Buscar por Folio, RUT, Razón Social, Cliente o N° Orden..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="contacto-form-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>Tipo DTE:</span>
            <button
              className={`catalog-pill ${documentFilter === "ALL" ? "active" : ""}`}
              onClick={() => setDocumentFilter("ALL")}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              Todos ({orders.length})
            </button>
            <button
              className={`catalog-pill ${documentFilter === "FACTURA" ? "active" : ""}`}
              onClick={() => setDocumentFilter("FACTURA")}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              Factura (33) ({orders.filter((o) => o.customer.tipoDocumento === "FACTURA").length})
            </button>
            <button
              className={`catalog-pill ${documentFilter === "BOLETA" ? "active" : ""}`}
              onClick={() => setDocumentFilter("BOLETA")}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              Boleta (39) ({orders.filter((o) => o.customer.tipoDocumento === "BOLETA").length})
            </button>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center", borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: "12px" }}>
            <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>Estado:</span>
            <button
              className={`catalog-pill ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              Todos
            </button>
            <button
              className={`catalog-pill ${statusFilter === "APROBADO" ? "active" : ""}`}
              onClick={() => setStatusFilter("APROBADO")}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              Aprobados
            </button>
            <button
              className={`catalog-pill ${statusFilter === "PENDIENTE" ? "active" : ""}`}
              onClick={() => setStatusFilter("PENDIENTE")}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              Pendientes
            </button>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DEL LIBRO DE FACTURACIÓN */}
      <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "rgba(30, 41, 59, 0.7)", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1" }}>
                <th style={{ padding: "14px 16px" }}>Folio DTE</th>
                <th style={{ padding: "14px 16px" }}>Tipo Documento</th>
                <th style={{ padding: "14px 16px" }}>Fecha</th>
                <th style={{ padding: "14px 16px" }}>RUT Facturado</th>
                <th style={{ padding: "14px 16px" }}>Razón Social / Receptor</th>
                <th style={{ padding: "14px 16px" }}>Monto Neto</th>
                <th style={{ padding: "14px 16px" }}>IVA (19%)</th>
                <th style={{ padding: "14px 16px" }}>Total Bruto</th>
                <th style={{ padding: "14px 16px" }}>N° Orden</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Comprobante</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    No se encontraron registros de facturación con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isFactura = ord.customer.tipoDocumento === "FACTURA";
                  const rut = isFactura && ord.customer.rutEmpresa ? ord.customer.rutEmpresa : ord.customer.rut;
                  const razonSocial = isFactura && ord.customer.razonSocial ? ord.customer.razonSocial : ord.customer.nombre;
                  const neto = Math.round(ord.totalCLP / 1.19);
                  const iva = ord.totalCLP - neto;

                  return (
                    <tr key={ord.orderId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 800, color: "#38bdf8", fontSize: "0.95rem" }}>
                          #{ord.dteFolio}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          padding: "4px 9px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-block",
                          background: isFactura ? "rgba(56, 189, 248, 0.15)" : "rgba(168, 85, 247, 0.15)",
                          color: isFactura ? "#38bdf8" : "#c084fc",
                          border: `1px solid ${isFactura ? "rgba(56, 189, 248, 0.3)" : "rgba(168, 85, 247, 0.3)"}`
                        }}>
                          {isFactura ? "Factura Electrónica (33)" : "Boleta Electrónica (39)"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "0.82rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={13} /> {ord.dateFormatted.split(" ")[0]}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#cbd5e1", fontWeight: 600 }}>
                        {rut}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ color: "#ffffff", display: "block" }}>{razonSocial}</strong>
                        <span style={{ color: "#94a3b8", fontSize: "0.74rem" }}>
                          {ord.customer.comuna}, {ord.customer.region}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#cbd5e1" }}>
                        {formatCLP(neto)}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#38bdf8" }}>
                        {formatCLP(iva)}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ color: "#34d399", fontSize: "0.98rem" }}>
                          {formatCLP(ord.totalCLP)}
                        </strong>
                        <div style={{ color: "#64748b", fontSize: "0.72rem" }}>~{ord.totalUF} UF</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{ord.orderId}</span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="catalog-btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "0.8rem", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}
                        >
                          <Eye size={14} /> Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE DE COMPROBANTE DE VENTA (VOUCHER) */}
      {selectedOrder && (
        <div className="catalog-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="catalog-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px", padding: "26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "14px", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontWeight: 800 }}>
                <FileText size={20} />
                <span>Detalle de Facturación - Folio #{selectedOrder.dteFolio}</span>
              </div>
              <button className="catalog-modal-close" onClick={() => setSelectedOrder(null)}>
                <X size={18} />
              </button>
            </div>

            {/* CUERPO DEL COMPROBANTE */}
            <div style={{ background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
              <div style={{ textAlign: "center", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "14px" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ffffff" }}>MARCOM SpA</div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Soluciones Digitales y Equipamiento Profesional</div>
                <div style={{ fontSize: "0.78rem", color: "#34d399", fontWeight: 700, marginTop: "4px" }}>
                  VENTA APROBADA
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.85rem" }}>
                <span style={{ color: "#94a3b8" }}>Tipo Documento:</span>
                <strong style={{ color: selectedOrder.customer.tipoDocumento === "FACTURA" ? "#38bdf8" : "#c084fc" }}>
                  {selectedOrder.customer.tipoDocumento === "FACTURA" ? "Factura Electrónica (Código 33)" : "Boleta Electrónica (Código 39)"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.85rem" }}>
                <span style={{ color: "#94a3b8" }}>N° Folio Asignado:</span>
                <strong style={{ color: "#ffffff" }}>#{selectedOrder.dteFolio}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.85rem" }}>
                <span style={{ color: "#94a3b8" }}>N° Orden Comercio:</span>
                <strong style={{ color: "#38bdf8" }}>{selectedOrder.orderId}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.85rem" }}>
                <span style={{ color: "#94a3b8" }}>Fecha y Hora:</span>
                <span style={{ color: "#ffffff" }}>{selectedOrder.dateFormatted}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.85rem" }}>
                <span style={{ color: "#94a3b8" }}>Código Autorización:</span>
                <strong style={{ color: "#ffffff" }}>{selectedOrder.authorizationCode}</strong>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "10px 0", paddingTop: "10px" }}>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  Receptor Facturado:
                </span>
                <div style={{ fontSize: "0.85rem", color: "#ffffff" }}>
                  {selectedOrder.customer.tipoDocumento === "FACTURA" && selectedOrder.customer.razonSocial ? selectedOrder.customer.razonSocial : selectedOrder.customer.nombre}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  RUT: {selectedOrder.customer.tipoDocumento === "FACTURA" && selectedOrder.customer.rutEmpresa ? selectedOrder.customer.rutEmpresa : selectedOrder.customer.rut}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  {selectedOrder.customer.direccion}, {selectedOrder.customer.comuna}
                </div>
                {selectedOrder.customer.tipoDocumento === "FACTURA" && selectedOrder.customer.giroEmpresa && (
                  <div style={{ fontSize: "0.8rem", color: "#38bdf8", marginTop: "2px" }}>
                    Giro: {selectedOrder.customer.giroEmpresa}
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "10px 0", paddingTop: "10px" }}>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                  Ítems:
                </span>
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                    <span style={{ color: "#ffffff" }}>
                      {it.quantity}x {it.model} ({it.inchesLabel}) + {it.supportName}
                    </span>
                    <strong style={{ color: "#cbd5e1" }}>{formatCLP(it.totalPrice)}</strong>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "10px 0", paddingTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "2px 0" }}>
                  <span style={{ color: "#94a3b8" }}>Monto Neto:</span>
                  <span style={{ color: "#ffffff" }}>{formatCLP(Math.round(selectedOrder.totalCLP / 1.19))} CLP</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", padding: "2px 0" }}>
                  <span style={{ color: "#94a3b8" }}>IVA Débito Fiscal (19%):</span>
                  <span style={{ color: "#38bdf8" }}>{formatCLP(selectedOrder.totalCLP - Math.round(selectedOrder.totalCLP / 1.19))} CLP</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: 800, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "8px", marginTop: "6px" }}>
                  <span style={{ color: "#ffffff" }}>Total Documento:</span>
                  <span style={{ color: "#34d399" }}>{formatCLP(selectedOrder.totalCLP)} CLP</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="catalog-btn-secondary"
                onClick={() => window.print()}
                style={{ fontSize: "0.85rem" }}
              >
                <Printer size={15} /> Imprimir Comprobante
              </button>
              <button
                type="button"
                className="catalog-btn-primary"
                onClick={() => setSelectedOrder(null)}
                style={{ fontSize: "0.85rem" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Facturacion;
