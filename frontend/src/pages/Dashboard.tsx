import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  MapPin, 
  Boxes, 
  Shuffle, 
  TrendingUp, 
  AlertCircle, 
  Calculator,
  Briefcase,
  CheckCircle2,
  Clock,
  Building,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { authService, type Usuario, type Convenio } from "../services/auth";
import { inventoryService } from "../services/inventory";
import { workOrdersService } from "../services/workOrders";
import { quotationsService } from "../services/quotations";
import { MetricCard } from "../components/MetricCard";

type StockMovement = {
  movimiento_id: string | number;
  motivo: string;
  creado_en: string | Date;
};

type DashboardWorkOrder = {
  orden_trabajo_id: string | number;
  numero_orden: string;
  fecha_programada: string | Date;
  estado: string;
  notas?: string;
};

type DashboardQuotation = {
  cotizacion_id: string;
  numero_cotizacion: string;
  monto_total: number;
  estado: string;
  creado_en: string;
};

export const Dashboard: React.FC = () => {
  const [currentUser] = useState<Usuario | null>(() => {
    const userJson = localStorage.getItem("marcom_user");
    return userJson ? JSON.parse(userJson) : null;
  });

  const [agreements, setAgreements] = useState<Convenio[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<DashboardWorkOrder[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [quotations, setQuotations] = useState<DashboardQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = currentUser?.rol || "CLIENTE_ESTANDAR";

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const promises: Promise<any>[] = [];

        // Role-based modular fetching to avoid unnecessary or unauthorized API calls
        if (["ADMIN", "JEFE_BODEGA", "CLIENTE_CONVENIO"].includes(userRole)) {
          promises.push(authService.getAgreements().catch(() => []));
        } else {
          promises.push(Promise.resolve([]));
        }

        if (["ADMIN", "JEFE_BODEGA", "CLIENTE_CONVENIO", "TECNICO_TERRENO"].includes(userRole)) {
          promises.push(inventoryService.getLocations().catch(() => []));
        } else {
          promises.push(Promise.resolve([]));
        }

        if (["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO"].includes(userRole)) {
          promises.push(inventoryService.getProducts().catch(() => []));
          promises.push(inventoryService.getAssets().catch(() => []));
        } else {
          promises.push(Promise.resolve([]));
          promises.push(Promise.resolve([]));
        }

        if (["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO", "CLIENTE_CONVENIO"].includes(userRole)) {
          promises.push(workOrdersService.getWorkOrders().catch(() => []));
        } else {
          promises.push(Promise.resolve([]));
        }

        if (["ADMIN", "JEFE_BODEGA"].includes(userRole)) {
          promises.push(inventoryService.getMovements().catch(() => []));
        } else {
          promises.push(Promise.resolve([]));
        }

        if (["ADMIN", "JEFE_BODEGA", "CLIENTE_CONVENIO", "CLIENTE_ESTANDAR"].includes(userRole)) {
          promises.push(quotationsService.getQuotations().catch(() => []));
        } else {
          promises.push(Promise.resolve([]));
        }

        const [
          agreementsData,
          locationsData,
          productsData,
          assetsData,
          workOrdersData,
          movementsData,
          quotationsData
        ] = await Promise.all(promises);

        setAgreements(agreementsData || []);
        setLocations(locationsData || []);
        setProducts(productsData || []);
        setAssets(assetsData || []);
        setWorkOrders(workOrdersData || []);
        setMovements(movementsData || []);
        setQuotations(quotationsData || []);
      } catch (err: any) {
        console.error("Dashboard Loading Error:", err);
        setError("Algunos servicios no respondieron. Mostrando datos parciales.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  // Calculations for roles
  const myAgreement = agreements.length > 0 ? agreements[0] : null;
  const pendingQuotations = quotations.filter(q => q.estado === "PENDIENTE_APROBACION" || q.estado === "BORRADOR");
  const inProgressWorkOrders = workOrders.filter(w => w.estado === "EN_PROCESO" || w.estado === "ASIGNADA");
  const completedWorkOrders = workOrders.filter(w => w.estado === "COMPLETADA");

  const formatCLP = (val: number) => {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(val || 0);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div className="badge primary" style={{ padding: "12px 24px", fontSize: "0.95rem" }}>
          Cargando métricas y panel...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-view animate-fade-in">
      {error && (
        <div className="badge warning" style={{ width: "100%", padding: "12px", marginBottom: "25px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "8px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Role Welcome Banner */}
      <div className="glass-panel" style={{ padding: "20px 24px", marginBottom: "24px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 4px 0", color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
            <span>Bienvenido, {currentUser ? `${currentUser.nombre} ${currentUser.apellido}` : "Usuario"}</span>
            <span className={`badge ${
              userRole === "ADMIN" ? "primary" :
              userRole === "JEFE_BODEGA" ? "warning" :
              userRole === "TECNICO_TERRENO" ? "secondary" : "success"
            }`} style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
              {userRole.replace("_", " ")}
            </span>
          </h2>
          <p style={{ margin: 0, color: "hsl(var(--text-muted))", fontSize: "0.9rem" }}>
            {userRole === "ADMIN" && "Panel de control global del sistema, gestión de cuentas y contratos."}
            {userRole === "JEFE_BODEGA" && "Monitoreo logístico de inventario, stock en bodega y distribución de hardware."}
            {userRole === "TECNICO_TERRENO" && "Panel de gestión de visitas técnicas, asignaciones y captura de evidencias en terreno."}
            {userRole === "CLIENTE_CONVENIO" && `Portal corporativo ${myAgreement ? `- ${myAgreement.nombre_empresa}` : ""}. Gestión de solicitudes y seguimiento de locales.`}
            {userRole === "CLIENTE_ESTANDAR" && "Portal de atención y seguimiento de cotizaciones y pedidos."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))" }}>
            Sesión segura protegida con RBAC
          </span>
          <ShieldCheck size={18} style={{ color: "var(--color-primary, #38bdf8)" }} />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. VISTA CLIENTE CONVENIO                                     */}
      {/* ------------------------------------------------------------- */}
      {userRole === "CLIENTE_CONVENIO" && (
        <>
          <div className="metrics-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: "25px" }}>
            <MetricCard 
              title="Límite de Crédito" 
              value={myAgreement ? formatCLP(myAgreement.limite_credito) : "$0"} 
              icon={<Building size={20} />} 
              color="primary"
              description="Línea de crédito autorizada"
            />
            <MetricCard 
              title="Crédito Utilizado" 
              value={myAgreement ? formatCLP(myAgreement.credito_usado) : "$0"} 
              icon={<TrendingUp size={20} />} 
              color={myAgreement && myAgreement.credito_usado > (myAgreement.limite_credito * 0.8) ? "warning" : "secondary"}
              description={`Disponible: ${myAgreement ? formatCLP(Math.max(0, myAgreement.limite_credito - myAgreement.credito_usado)) : "$0"}`}
            />
            <MetricCard 
              title="Cotizaciones por Aprobar" 
              value={pendingQuotations.length} 
              icon={<Calculator size={20} />} 
              color={pendingQuotations.length > 0 ? "warning" : "success"}
              description="Esperando tu Orden de Compra (OC)"
            />
            <MetricCard 
              title="Mis Locales / Puntos" 
              value={locations.length} 
              icon={<MapPin size={20} />} 
              color="success"
              description="Estaciones y tiendas asociadas"
            />
          </div>

          {/* Credit Limit Usage Progress Bar */}
          {myAgreement && myAgreement.limite_credito > 0 && (
            <div className="glass-panel" style={{ padding: "18px 24px", marginBottom: "25px", borderRadius: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.85rem" }}>
                <span style={{ fontWeight: 600 }}>Uso de Línea de Crédito del Convenio</span>
                <span style={{ color: "hsl(var(--text-muted))" }}>
                  {((myAgreement.credito_usado / myAgreement.limite_credito) * 100).toFixed(1)}% utilizado
                </span>
              </div>
              <div style={{ height: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "5px", overflow: "hidden" }}>
                <div 
                  style={{ 
                    height: "100%", 
                    width: `${Math.min(100, (myAgreement.credito_usado / myAgreement.limite_credito) * 100)}%`,
                    background: myAgreement.credito_usado > (myAgreement.limite_credito * 0.8) 
                      ? "linear-gradient(90deg, #f59e0b, #ef4444)" 
                      : "linear-gradient(90deg, #38bdf8, #6366f1)",
                    borderRadius: "5px",
                    transition: "width 0.4s ease"
                  }} 
                />
              </div>
            </div>
          )}

          <div className="dashboard-grid">
            {/* Pending Quotations awaiting PO */}
            <div className="glass-panel card-container animate-fade-in">
              <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Cotizaciones Pendientes de OC</span>
                <Link to="/quotations" className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: "4px" }}>
                  Ver Todas <ArrowRight size={12} />
                </Link>
              </div>

              <div className="table-responsive">
                {pendingQuotations.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "24px" }}>
                    No tienes cotizaciones pendientes de aprobación.
                  </p>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>N° Cotización</th>
                        <th>Monto Total</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingQuotations.slice(0, 5).map(q => (
                        <tr key={q.cotizacion_id}>
                          <td style={{ fontWeight: 600 }}>{q.numero_cotizacion}</td>
                          <td>{formatCLP(q.monto_total)}</td>
                          <td><span className="badge warning">{q.estado.replace("_", " ")}</span></td>
                          <td>
                            <Link to="/quotations" className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                              Adjuntar OC
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Work Orders for Client Locations */}
            <div className="glass-panel card-container animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Servicios y OTs en Tus Locales</span>
                <Link to="/work-orders" className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "4px 10px", display: "flex", alignItems: "center", gap: "4px" }}>
                  Ver Todas <ArrowRight size={12} />
                </Link>
              </div>

              <div className="table-responsive">
                {workOrders.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "24px" }}>
                    No hay órdenes de trabajo activas en tus locales.
                  </p>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>N° Orden</th>
                        <th>Programación</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.slice(0, 5).map(wo => (
                        <tr key={wo.orden_trabajo_id}>
                          <td style={{ fontWeight: 600 }}>{wo.numero_orden}</td>
                          <td>{new Date(wo.fecha_programada).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${
                              wo.estado === "COMPLETADA" ? "success" : 
                              wo.estado === "CANCELADA" ? "error" : "warning"
                            }`}>
                              {wo.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. VISTA TÉCNICO EN TERRENO                                   */}
      {/* ------------------------------------------------------------- */}
      {userRole === "TECNICO_TERRENO" && (
        <>
          <div className="metrics-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "25px" }}>
            <MetricCard 
              title="Mis Órdenes Asignadas" 
              value={workOrders.length} 
              icon={<Briefcase size={20} />} 
              color="primary"
              description="Total en tu bandeja"
            />
            <MetricCard 
              title="En Proceso / Hoy" 
              value={inProgressWorkOrders.length} 
              icon={<Clock size={20} />} 
              color="warning"
              description="Atenciones activas"
            />
            <MetricCard 
              title="Completadas" 
              value={completedWorkOrders.length} 
              icon={<CheckCircle2 size={20} />} 
              color="success"
              description="Con evidencias registradas"
            />
          </div>

          <div className="glass-panel card-container animate-fade-in" style={{ marginBottom: "25px" }}>
            <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Mis Órdenes de Trabajo Programadas</span>
              <Link to="/work-orders" className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}>
                Ver Módulo de Terreno <ArrowRight size={14} />
              </Link>
            </div>

            <div className="table-responsive">
              {workOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px", color: "hsl(var(--text-muted))" }}>
                  <Briefcase size={36} style={{ opacity: 0.3, marginBottom: "8px" }} />
                  <p>No tienes órdenes de trabajo asignadas en este momento.</p>
                </div>
              ) : (
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>N° Orden</th>
                      <th>Fecha Programada</th>
                      <th>Estado Actual</th>
                      <th>Notas / Instrucciones</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrders.slice(0, 8).map(wo => (
                      <tr key={wo.orden_trabajo_id}>
                        <td style={{ fontWeight: 600 }}>{wo.numero_orden}</td>
                        <td>{new Date(wo.fecha_programada).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${
                            wo.estado === "COMPLETADA" ? "success" : 
                            wo.estado === "EN_PROCESO" ? "secondary" : "warning"
                          }`}>
                            {wo.estado}
                          </span>
                        </td>
                        <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {wo.notas || "Sin observaciones adicionales"}
                        </td>
                        <td>
                          <Link to="/work-orders" className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                            Atender
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. VISTA JEFE DE BODEGA                                       */}
      {/* ------------------------------------------------------------- */}
      {userRole === "JEFE_BODEGA" && (
        <>
          <div className="metrics-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "25px" }}>
            <MetricCard 
              title="Activos Físicos Seriados" 
              value={assets.length} 
              icon={<TrendingUp size={20} />} 
              color="primary"
              description="Equipos inventariados"
            />
            <MetricCard 
              title="Modelos en Catálogo" 
              value={products.length} 
              icon={<Boxes size={20} />} 
              color="secondary"
              description="Monitores, POS, Equipamiento"
            />
            <MetricCard 
              title="Bodegas y Puntos" 
              value={locations.length} 
              icon={<MapPin size={20} />} 
              color="warning"
              description="Centros de distribución y locales"
            />
            <MetricCard 
              title="Movimientos de Stock" 
              value={movements.length} 
              icon={<Shuffle size={20} />} 
              color="success"
              description="Trazabilidad registrada"
            />
          </div>

          <div className="dashboard-grid">
            {/* Recent stock movements */}
            <div className="glass-panel card-container animate-fade-in">
              <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Últimos Movimientos de Stock</span>
                <Link to="/inventory" className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  Ir a Inventario
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {movements.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                    No hay movimientos de stock recientes.
                  </p>
                ) : (
                  movements.slice(0, 6).map((m) => (
                    <div key={m.movimiento_id} style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "10px" }}>
                      <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center" }}>
                        <Shuffle size={16} style={{ color: "var(--color-primary, #38bdf8)" }} />
                      </div>
                      <div>
                        <p style={{ fontSize: "0.85rem", fontWeight: 500, margin: "0 0 2px 0" }}>{m.motivo}</p>
                        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))", margin: 0 }}>
                          {new Date(m.creado_en).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Work orders dispatch coordinator */}
            <div className="glass-panel card-container animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Despacho para Órdenes de Trabajo</span>
                <Link to="/work-orders" className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  Ver OTs
                </Link>
              </div>

              <div className="table-responsive">
                {workOrders.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                    No hay órdenes de trabajo pendientes.
                  </p>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>N° Orden</th>
                        <th>Programación</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.slice(0, 6).map((wo) => (
                        <tr key={wo.orden_trabajo_id}>
                          <td style={{ fontWeight: 600 }}>{wo.numero_orden}</td>
                          <td>{new Date(wo.fecha_programada).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${
                              wo.estado === "COMPLETADA" ? "success" : 
                              wo.estado === "CANCELADA" ? "error" : "warning"
                            }`}>
                              {wo.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. VISTA ADMIN GLOBAL / OTROS                                 */}
      {/* ------------------------------------------------------------- */}
      {(userRole === "ADMIN" || userRole === "CLIENTE_ESTANDAR") && (
        <>
          <div className="metrics-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <MetricCard 
              title="Convenios Activos" 
              value={agreements.length} 
              icon={<FileText size={20} />} 
              color="primary"
              description="Contratos corporativos vigentes"
            />
            <MetricCard 
              title="Cotizaciones Emitidas" 
              value={quotations.length} 
              icon={<Calculator size={20} />} 
              color="secondary"
              description="Propuestas y solicitudes de OC"
            />
            <MetricCard 
              title="Catálogo de Equipos" 
              value={products.length} 
              icon={<Boxes size={20} />} 
              color="success"
              description="Modelos de monitores y POS"
            />
            <MetricCard 
              title="Bodegas e Instalaciones" 
              value={locations.length} 
              icon={<MapPin size={20} />} 
              color="warning"
              description="Puntos de stock y locales"
            />
            <MetricCard 
              title="Total Activos Seriados" 
              value={assets.length} 
              icon={<TrendingUp size={20} />} 
              color="primary"
              description="Equipos físicos monitoreados"
            />
          </div>

          <div className="dashboard-grid">
            {/* Left Side: Recent Work Orders */}
            <div className="glass-panel card-container animate-fade-in">
              <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Órdenes de Trabajo Recientes</span>
                <span className="badge primary">{workOrders.length} Totales</span>
              </div>

              <div className="table-responsive">
                {workOrders.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                    No hay órdenes de trabajo registradas.
                  </p>
                ) : (
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Número</th>
                        <th>Programación</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.slice(0, 5).map((wo) => (
                        <tr key={wo.orden_trabajo_id}>
                          <td style={{ fontWeight: 600 }}>{wo.numero_orden}</td>
                          <td>{new Date(wo.fecha_programada).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${
                              wo.estado === "COMPLETADA" ? "success" : 
                              wo.estado === "CANCELADA" ? "error" : "warning"
                            }`}>
                              {wo.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right Side: Recent Movements */}
            <div className="glass-panel card-container animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="panel-title">
                <span>Movimientos de Stock</span>
                <Shuffle size={18} style={{ color: "hsl(var(--text-muted))" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {movements.length === 0 ? (
                  <p style={{ color: "hsl(var(--text-muted))", textAlign: "center", padding: "20px" }}>
                    No hay movimientos de stock recientes.
                  </p>
                ) : (
                  movements.slice(0, 5).map((m) => (
                    <div key={m.movimiento_id} style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.02)", paddingBottom: "12px" }}>
                      <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center" }}>
                        <Shuffle size={16} style={{ color: "hsl(var(--secondary))" }} />
                      </div>
                      <div>
                        <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>{m.motivo}</p>
                        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>
                          {new Date(m.creado_en).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

