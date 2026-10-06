/**
 * @file SalesControl.tsx
 * @description Panel de Control de Ventas de Monitores y Métricas Comerciales para el Administrador.
 * Muestra KPIs en tiempo real (facturación, unidades vendidas, ticket promedio, tasa de aprobación Flow) y el historial completo de transacciones con vouchers imprimibles.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  DollarSign, 
  ShoppingBag, 
  CreditCard, 
  Percent, 
  CheckCircle2, 
  Clock, 
  Search, 
  Printer, 
  Eye, 
  ArrowLeft, 
  Tv, 
  Layers, 
  BarChart3, 
  FileText, 
  Calendar,
  X
} from "lucide-react";
import { getSalesOrders, getSalesMetrics, type SalesOrder, type SalesMetrics } from "../services/salesService";
import { formatCLP } from "../data/monitoresCatalog";
import "./Catalog.css";

export const SalesControl: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APROBADO" | "PENDIENTE">("ALL");
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  const reloadData = () => {
    const ords = getSalesOrders();
    setOrders(ords);
    setMetrics(getSalesMetrics());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Filtrado de órdenes
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesOrder = o.orderId.toLowerCase().includes(q);
        const matchesName = o.customer.nombre.toLowerCase().includes(q);
        const matchesRut = o.customer.rut.toLowerCase().includes(q);
        const matchesEmail = o.customer.email.toLowerCase().includes(q);
        if (!matchesOrder && !matchesName && !matchesRut && !matchesEmail) {
          return false;
        }
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* BARRA SUPERIOR DE ACCIONES Y DESCRIPCIÓN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: 0, maxWidth: "700px" }}>
          Supervisa en tiempo real las ventas de equipamiento, ingresos percibidos y rendimiento comercial por categoría.
        </p>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link to="/admin/monitores" className="catalog-btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            <Tv size={16} /> Gestión Catálogo
          </Link>
          <Link to="/catalogo" className="catalog-btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            <ArrowLeft size={16} /> Ver Catálogo
          </Link>
        </div>
      </div>

        {/* TARJETAS DE KPIS PRINCIPALES */}
        {metrics && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            {/* KPI 1: Ingresos Totales */}
            <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "14px", padding: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DollarSign size={26} />
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>Total Recaudado</span>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
                  {formatCLP(metrics.totalRevenueCLP)}
                </div>
                <span style={{ fontSize: "0.74rem", color: "#38bdf8" }}>~{metrics.totalRevenueUF} UF</span>
              </div>
            </div>

            {/* KPI 2: Monitores Vendidos */}
            <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(52, 211, 153, 0.2)", borderRadius: "14px", padding: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(52, 211, 153, 0.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingBag size={26} />
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>Monitores Vendidos</span>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#34d399", marginTop: "2px" }}>
                  {metrics.totalUnitsSold} unidades
                </div>
                <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{metrics.approvedOrdersCount} transacciones</span>
              </div>
            </div>

            {/* KPI 3: Ticket Promedio */}
            <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(251, 191, 36, 0.2)", borderRadius: "14px", padding: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CreditCard size={26} />
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>Ticket Promedio</span>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#fbbf24", marginTop: "2px" }}>
                  {formatCLP(metrics.averageTicketCLP)}
                </div>
                <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Por orden pagada</span>
              </div>
            </div>

            {/* KPI 4: Tasa de Aprobación */}
            <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(192, 132, 252, 0.2)", borderRadius: "14px", padding: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(192, 132, 252, 0.15)", color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Percent size={26} />
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>Tasa de Aprobación</span>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#c084fc", marginTop: "2px" }}>
                  {metrics.approvalRatePercent}%
                </div>
                <span style={{ fontSize: "0.74rem", color: "#34d399" }}>Órdenes completadas</span>
              </div>
            </div>
          </div>
        )}

        {/* DESGLOSE GRÁFICO POR PULGADAS Y MODELO */}
        {metrics && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px", marginBottom: "28px" }}>
            {/* Desglose por Pulgadas */}
            <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#38bdf8", fontWeight: 700, fontSize: "0.95rem" }}>
                <BarChart3 size={18} />
                <span>Ventas por Tamaño de Pantalla (Pulgadas)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {metrics.salesByInches.map((item) => {
                  const percent = metrics.totalRevenueCLP > 0 ? Math.round((item.revenueCLP / metrics.totalRevenueCLP) * 100) : 0;
                  return (
                    <div key={item.inches}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                        <span style={{ color: "#ffffff", fontWeight: 700 }}>{item.inches} ({item.units} un.)</span>
                        <span style={{ color: "#34d399", fontWeight: 600 }}>{formatCLP(item.revenueCLP)} ({percent}%)</span>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${percent}%`, height: "100%", background: "linear-gradient(90deg, #38bdf8, #818cf8)", borderRadius: "4px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modelos más Vendidos */}
            <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#34d399", fontWeight: 700, fontSize: "0.95rem" }}>
                <Layers size={18} />
                <span>Modelos más Vendidos</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {metrics.salesByModel.slice(0, 5).map((m, idx) => (
                  <div key={m.model} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(2, 6, 23, 0.4)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                        {idx + 1}
                      </span>
                      <strong style={{ color: "#ffffff", fontSize: "0.9rem" }}>{m.model}</strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.9rem" }}>{m.units} un.</span>
                      <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{formatCLP(m.revenueCLP)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS */}
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px", marginBottom: "20px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 300px" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input
              type="text"
              placeholder="Buscar por N° Orden (MC-ORD-...), Cliente o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="contacto-form-input"
              style={{ paddingLeft: "38px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 600 }}>Estado:</span>
            <button
              className={`catalog-pill ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              Todas ({orders.length})
            </button>
            <button
              className={`catalog-pill ${statusFilter === "APROBADO" ? "active" : ""}`}
              onClick={() => setStatusFilter("APROBADO")}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              Aprobadas ({orders.filter((o) => o.status === "APROBADO").length})
            </button>
            <button
              className={`catalog-pill ${statusFilter === "PENDIENTE" ? "active" : ""}`}
              onClick={() => setStatusFilter("PENDIENTE")}
              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
            >
              Pendientes ({orders.filter((o) => o.status === "PENDIENTE").length})
            </button>
          </div>
        </div>

        {/* TABLA DE ÓRDENES DE VENTA */}
        <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "rgba(30, 41, 59, 0.7)", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1" }}>
                  <th style={{ padding: "14px 16px" }}>N° Orden</th>
                  <th style={{ padding: "14px 16px" }}>Fecha</th>
                  <th style={{ padding: "14px 16px" }}>Cliente & RUT</th>
                  <th style={{ padding: "14px 16px" }}>Equipos Comprados</th>
                  <th style={{ padding: "14px 16px" }}>Total Pagado</th>
                  <th style={{ padding: "14px 16px" }}>Pasarela</th>
                  <th style={{ padding: "14px 16px" }}>Estado</th>
                  <th style={{ padding: "14px 16px", textAlign: "right" }}>Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                      No se encontraron órdenes registradas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.orderId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 800, color: "#38bdf8", fontSize: "0.92rem" }}>
                          {ord.orderId}
                        </span>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          Folio #{ord.dteFolio}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "0.82rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={13} /> {ord.dateFormatted}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ color: "#ffffff", display: "block" }}>{ord.customer.nombre}</strong>
                        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                          RUT: {ord.customer.rut} • {ord.customer.tipoDocumento}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {ord.items.map((it, idx) => (
                            <span key={idx} style={{ color: "#cbd5e1", fontSize: "0.82rem" }}>
                              • {it.quantity}x <strong>{it.model}</strong> ({it.inchesLabel})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ color: "#34d399", fontSize: "1.02rem" }}>
                          {formatCLP(ord.totalCLP)}
                        </strong>
                        <div style={{ color: "#64748b", fontSize: "0.72rem" }}>
                          ~{ord.totalUF} UF
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "rgba(14, 165, 233, 0.15)",
                          color: "#38bdf8",
                          border: "1px solid rgba(14, 165, 233, 0.3)"
                        }}>
                          Flow
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: ord.status === "APROBADO" ? "rgba(16, 185, 129, 0.15)" : "rgba(251, 191, 36, 0.15)",
                          color: ord.status === "APROBADO" ? "#34d399" : "#fbbf24",
                          border: `1px solid ${ord.status === "APROBADO" ? "rgba(16, 185, 129, 0.3)" : "rgba(251, 191, 36, 0.3)"}`
                        }}>
                          {ord.status === "APROBADO" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {ord.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="catalog-btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "0.8rem", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}
                        >
                          <Eye size={14} /> Ver Voucher
                        </button>
                      </td>
                    </tr>
                  ))
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
                <span>Comprobante de Venta</span>
              </div>
              <button className="catalog-modal-close" onClick={() => setSelectedOrder(null)}>
                <X size={18} />
              </button>
            </div>

            {/* CUERPO DEL VOUCHER */}
            <div style={{ background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "18px", marginBottom: "20px" }}>
              <div style={{ textAlign: "center", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "14px" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ffffff" }}>MARCOM SpA</div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Soluciones Digitales y Equipamiento Profesional</div>
                <div style={{ fontSize: "0.78rem", color: "#34d399", fontWeight: 700, marginTop: "4px" }}>
                  VENTA APROBADA
                </div>
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
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.85rem" }}>
                <span style={{ color: "#94a3b8" }}>Documento Emitido:</span>
                <span style={{ color: "#ffffff" }}>
                  {selectedOrder.customer.tipoDocumento === "FACTURA" ? "Factura Electrónica" : "Boleta Electrónica"} (Folio #{selectedOrder.dteFolio})
                </span>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "10px 0", paddingTop: "10px" }}>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  Datos del Comprador:
                </span>
                <div style={{ fontSize: "0.85rem", color: "#ffffff" }}>{selectedOrder.customer.nombre}</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>RUT: {selectedOrder.customer.rut} • {selectedOrder.customer.email}</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{selectedOrder.customer.direccion}, {selectedOrder.customer.comuna}</div>
                {selectedOrder.customer.tipoDocumento === "FACTURA" && (
                  <div style={{ fontSize: "0.8rem", color: "#38bdf8", marginTop: "2px" }}>
                    Razón Social: {selectedOrder.customer.razonSocial} (RUT: {selectedOrder.customer.rutEmpresa})
                  </div>
                )}
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "10px 0", paddingTop: "10px" }}>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                  Monitores Adquiridos:
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

              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "10px", marginTop: "10px" }}>
                <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "1rem" }}>Total Pagado:</span>
                <span style={{ color: "#34d399", fontWeight: 800, fontSize: "1.2rem" }}>
                  {formatCLP(selectedOrder.totalCLP)} CLP
                </span>
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

export default SalesControl;
