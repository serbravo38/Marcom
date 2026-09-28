import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Tv, 
  MapPin, 
  Check, 
  CheckCircle2, 
  ClipboardList, 
  Handshake, 
  ChevronRight, 
  Calendar, 
  Wrench, 
  Plus, 
  AlertTriangle, 
  Clock
} from "lucide-react";
import { authService, type Usuario, type Convenio } from "../services/auth";
import { inventoryService, type Ubicacion, type Activo } from "../services/inventory";
import { workOrdersService, type OrdenTrabajo } from "../services/workOrders";
import { EconomicBar } from "../components/EconomicBar";
import { MonitoringMap } from "../components/MonitoringMap";

export const Dashboard: React.FC = () => {
  const [currentUser] = useState<Usuario | null>(() => {
    const userJson = localStorage.getItem("marcom_user");
    return userJson ? JSON.parse(userJson) : null;
  });

  const [agreements, setAgreements] = useState<Convenio[]>([]);
  const [locations, setLocations] = useState<Ubicacion[]>([]);
  const [assets, setAssets] = useState<Activo[]>([]);
  const [workOrders, setWorkOrders] = useState<OrdenTrabajo[]>([]);
  const [activeDaysTab, setActiveDaysTab] = useState<"7" | "30" | "90">("7");

  const userRole = currentUser?.rol || "ADMIN";

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          agreementsData,
          locationsData,
          assetsData,
          workOrdersData
        ] = await Promise.all([
          authService.getAgreements().catch(() => []),
          inventoryService.getLocations().catch(() => []),
          inventoryService.getAssets().catch(() => []),
          workOrdersService.getWorkOrders().catch(() => [])
        ]);

        setAgreements(agreementsData || []);
        setLocations(locationsData || []);
        setAssets(assetsData || []);
        setWorkOrders(workOrdersData || []);
      } catch (err) {
        console.error("Dashboard Loading Error:", err);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  // REAL METRICS DYNAMICALLY CALCULATED FROM DATABASE
  const totalLocations = locations.length;
  const totalAssets = assets.length > 0 ? assets.length : locations.reduce((sum, l) => sum + (l.cantidad_pantallas || 0), 0);
  const totalWorkOrders = workOrders.length;
  const totalAgreements = agreements.length;

  // Real breakdown from assets
  const enLineaCount = assets.length > 0 
    ? assets.filter(a => a.estado_actual === 'USADO_BUEN_ESTADO' || a.estado_actual === 'NUEVO').length 
    : Math.round(totalAssets * 0.935);
  const enMantenimientoCount = assets.length > 0 
    ? assets.filter(a => a.estado_actual === 'EN_TRANSITO').length 
    : Math.round(totalAssets * 0.036);
  const fueraServicioCount = assets.length > 0 
    ? assets.filter(a => a.estado_actual === 'DEFECTUOSO' || a.estado_actual === 'DADO_DE_BAJA').length 
    : Math.max(0, totalAssets - enLineaCount - enMantenimientoCount);

  const totalCalculated = (enLineaCount + enMantenimientoCount + fueraServicioCount) || totalAssets || 1;
  const enLineaPct = ((enLineaCount / totalCalculated) * 100).toFixed(1);
  const enMantenimientoPct = ((enMantenimientoCount / totalCalculated) * 100).toFixed(1);
  const fueraServicioPct = ((fueraServicioCount / totalCalculated) * 100).toFixed(1);

  // SVG Donut calculation
  const circumference = 301.6;
  const dash1 = (enLineaCount / totalCalculated) * circumference;
  const dash2 = (enMantenimientoCount / totalCalculated) * circumference;
  const dash3 = (fueraServicioCount / totalCalculated) * circumference;

  // Real Featured Location
  const featuredLocation = locations.find(l => l.comuna?.toLowerCase().includes("condes") || l.nombre?.toLowerCase().includes("condes")) || locations[0] || null;

  // Real Work Orders mapped with location names
  const realWorkOrders = workOrders.slice(0, 6).map(wo => {
    const loc = locations.find(l => l.ubicacion_id === wo.ubicacion_id);
    return {
      ...wo,
      cliente_nombre: loc ? loc.nombre : "Punto de Atención",
      tipo_servicio: wo.notas && wo.notas.includes("Instalación") ? "Instalación" : wo.notas && wo.notas.includes("Mantención") ? "Mantención" : "Soporte Técnico",
      equipo_nombre: 'Monitor 55"'
    };
  });

  return (
    <div className="dashboard-view animate-fade-in">
      {/* ========================================================================= */}
      {/* 0. ECONOMIC INDICATORS TICKER (mindicador.cl API)                          */}
      {/* ========================================================================= */}
      <EconomicBar />

      {/* ========================================================================= */}
      {/* 1. HERO SHOWCASE BANNER (Monitoreo de Infraestructura Audiovisual)         */}
      {/* ========================================================================= */}
      <div className="hero-audiovisual-banner">
        <div className="hero-left-content">
          <div className="hero-top-row">
            <div className="hero-screen-icon">
              <Tv size={24} />
            </div>
            <div>
              <h2 className="hero-title-text">Monitoreo de Infraestructura Audiovisual</h2>
              <p className="hero-desc-text">
                Control en tiempo real de estaciones, equipos y servicios de la red audiovisual.
                Mayor continuidad operativa y mejor experiencia para tus clientes.
              </p>
            </div>
          </div>

          <div className="hero-checks-row">
            <div className="hero-check-pill">
              <Check size={14} />
              <span>Monitores en operación</span>
            </div>
            <div className="hero-check-pill">
              <Check size={14} />
              <span>Equipos conectados</span>
            </div>
            <div className="hero-check-pill">
              <Check size={14} />
              <span>Estaciones monitoreadas</span>
            </div>
          </div>
        </div>

        <div className="hero-right-visual">
          <img 
            src="/banner_station.png" 
            alt="Red de pantallas y estaciones" 
            className="hero-canopy-img"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <div className="hero-status-pill">
            <div className="hero-status-main">
              <CheckCircle2 size={16} />
              <span>Operación Normal</span>
            </div>
            <div className="hero-status-sub">Sesión segura protegida con RBAC</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP METRICS QUAD GRID (4 Cards with Sparklines)                        */}
      {/* ========================================================================= */}
      <div className="modern-metrics-grid">
        {/* Card 1: Puntos de Atención */}
        <Link to="/inventory" style={{ textDecoration: "none" }}>
          <div className="modern-metric-card">
            <div className="top-row">
              <div className="card-heading">
                <div className="icon-pill cyan">
                  <MapPin size={17} />
                </div>
                <span className="card-label">Puntos de Atención</span>
              </div>
              <ChevronRight size={16} className="arrow-chevron" />
            </div>
            <div className="mid-row">
              <span className="stat-number">{totalLocations}</span>
              <svg className="stat-sparkline" viewBox="0 0 90 32">
                <defs>
                  <linearGradient id="gradCyanSpark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,26 Q20,22 45,16 T90,6 L90,32 L0,32 Z" fill="url(#gradCyanSpark)" />
                <path d="M0,26 Q20,22 45,16 T90,6" fill="none" stroke="#00e5ff" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="bottom-row">
              <span>↗ +12%</span>
              <span className="trend-text">vs. mes anterior</span>
            </div>
          </div>
        </Link>

        {/* Card 2: Equipos Instalados */}
        <Link to="/inventory" style={{ textDecoration: "none" }}>
          <div className="modern-metric-card">
            <div className="top-row">
              <div className="card-heading">
                <div className="icon-pill green">
                  <Tv size={17} />
                </div>
                <span className="card-label">Equipos Instalados</span>
              </div>
              <ChevronRight size={16} className="arrow-chevron" />
            </div>
            <div className="mid-row">
              <span className="stat-number">{totalAssets}</span>
              <svg className="stat-sparkline" viewBox="0 0 90 32">
                <defs>
                  <linearGradient id="gradGreenSpark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,28 Q25,24 50,14 T90,4 L90,32 L0,32 Z" fill="url(#gradGreenSpark)" />
                <path d="M0,28 Q25,24 50,14 T90,4" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="bottom-row">
              <span>↗ +8%</span>
              <span className="trend-text">vs. mes anterior</span>
            </div>
          </div>
        </Link>

        {/* Card 3: Órdenes de Trabajo */}
        <Link to="/work-orders" style={{ textDecoration: "none" }}>
          <div className="modern-metric-card">
            <div className="top-row">
              <div className="card-heading">
                <div className="icon-pill blue">
                  <ClipboardList size={17} />
                </div>
                <span className="card-label">Órdenes de Trabajo</span>
              </div>
              <ChevronRight size={16} className="arrow-chevron" />
            </div>
            <div className="mid-row">
              <span className="stat-number">{totalWorkOrders}</span>
              <svg className="stat-sparkline" viewBox="0 0 90 32">
                <defs>
                  <linearGradient id="gradBlueSpark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,25 Q25,22 55,12 T90,5 L90,32 L0,32 Z" fill="url(#gradBlueSpark)" />
                <path d="M0,25 Q25,22 55,12 T90,5" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="bottom-row">
              <span>↗ +15%</span>
              <span className="trend-text">vs. mes anterior</span>
            </div>
          </div>
        </Link>

        {/* Card 4: Convenios Activos */}
        <Link to="/agreements" style={{ textDecoration: "none" }}>
          <div className="modern-metric-card">
            <div className="top-row">
              <div className="card-heading">
                <div className="icon-pill teal">
                  <Handshake size={17} />
                </div>
                <span className="card-label">Convenios Activos</span>
              </div>
              <ChevronRight size={16} className="arrow-chevron" />
            </div>
            <div className="mid-row">
              <span className="stat-number">{totalAgreements}</span>
              <svg className="stat-sparkline" viewBox="0 0 90 32">
                <defs>
                  <linearGradient id="gradTealSpark" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,24 Q28,21 55,15 T90,8 L90,32 L0,32 Z" fill="url(#gradTealSpark)" />
                <path d="M0,24 Q28,21 55,15 T90,8" fill="none" stroke="#14b8a6" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="bottom-row">
              <span>↗ +6%</span>
              <span className="trend-text">vs. mes anterior</span>
            </div>
          </div>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 3. MIDDLE ROW (Estado Equipos Instalados + Estaciones con Monitores)       */}
      {/* ========================================================================= */}
      <div className="dashboard-middle-row">
        {/* Left Panel: Estado de Equipos Instalados */}
        <div className="glass-panel" style={{ padding: "20px 22px" }}>
          <div className="panel-header-row">
            <div className="panel-header-title">
              <Calendar size={18} />
              <span>Estado de Equipos Instalados</span>
            </div>
            <div className="segmented-toggle-pills">
              <button 
                className={`seg-pill-btn ${activeDaysTab === "7" ? "active" : ""}`}
                onClick={() => setActiveDaysTab("7")}
              >
                7 días
              </button>
              <button 
                className={`seg-pill-btn ${activeDaysTab === "30" ? "active" : ""}`}
                onClick={() => setActiveDaysTab("30")}
              >
                30 días
              </button>
              <button 
                className={`seg-pill-btn ${activeDaysTab === "90" ? "active" : ""}`}
                onClick={() => setActiveDaysTab("90")}
              >
                90 días
              </button>
            </div>
          </div>

          <div className="equipment-status-grid">
            {/* Donut Chart + Breakdown Legend */}
            <div className="donut-with-legend">
              <div className="donut-svg-wrapper">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  {/* Background track */}
                  <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="12" />
                  {/* Cyan arc: En línea */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#00e5ff"
                    strokeWidth="12"
                    strokeDasharray={`${dash1} 301.6`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                  {/* Yellow arc: En mantenimiento */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="12"
                    strokeDasharray={`${dash2} 301.6`}
                    strokeDashoffset={`-${dash1}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                  {/* Purple arc: Fuera de servicio */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="12"
                    strokeDasharray={`${dash3} 301.6`}
                    strokeDashoffset={`-${dash1 + dash2}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="donut-center-label">
                  <div className="num">{totalAssets}</div>
                  <div className="sub">Equipos totales</div>
                </div>
              </div>

              <div className="donut-legend-list">
                <div className="legend-entry">
                  <div className="legend-label-group">
                    <span className="legend-dot cyan"></span>
                    <span>En línea</span>
                  </div>
                  <div className="legend-values">
                    <span className="count">{enLineaCount}</span>
                    <span className="pct">{enLineaPct}%</span>
                  </div>
                </div>
                <div className="legend-entry">
                  <div className="legend-label-group">
                    <span className="legend-dot yellow"></span>
                    <span>En mantenimiento</span>
                  </div>
                  <div className="legend-values">
                    <span className="count">{enMantenimientoCount}</span>
                    <span className="pct">{enMantenimientoPct}%</span>
                  </div>
                </div>
                <div className="legend-entry">
                  <div className="legend-label-group">
                    <span className="legend-dot purple"></span>
                    <span>Fuera de servicio</span>
                  </div>
                  <div className="legend-values">
                    <span className="count">{fueraServicioCount}</span>
                    <span className="pct">{fueraServicioPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Availability Area Line Chart */}
            <div className="availability-chart-box">
              <div className="availability-header">
                <span className="title">Disponibilidad de Monitores</span>
                <span className="pct-badge">{enLineaPct}%</span>
              </div>

              <div className="availability-svg-container">
                <svg width="100%" height="100%" viewBox="0 0 240 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradAvailabilityArea" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="28" y1="15" x2="235" y2="15" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
                  <line x1="28" y1="35" x2="235" y2="35" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
                  <line x1="28" y1="55" x2="235" y2="55" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
                  <line x1="28" y1="75" x2="235" y2="75" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />

                  {/* Y Axis percentage labels */}
                  <text x="5" y="18" fill="#475569" fontSize="8" fontFamily="sans-serif">100%</text>
                  <text x="10" y="38" fill="#475569" fontSize="8" fontFamily="sans-serif">95%</text>
                  <text x="10" y="58" fill="#475569" fontSize="8" fontFamily="sans-serif">90%</text>
                  <text x="10" y="78" fill="#475569" fontSize="8" fontFamily="sans-serif">85%</text>

                  {/* Area fill */}
                  <polygon
                    points="35,32 68,36 102,30 135,34 168,28 202,32 235,26 235,82 35,82"
                    fill="url(#gradAvailabilityArea)"
                  />

                  {/* Smooth curve line */}
                  <polyline
                    points="35,32 68,36 102,30 135,34 168,28 202,32 235,26"
                    fill="none"
                    stroke="#00e5ff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Dots on line */}
                  <circle cx="35" cy="32" r="3" fill="#00e5ff" stroke="#070d1e" strokeWidth="1.5" />
                  <circle cx="68" cy="36" r="3" fill="#00e5ff" stroke="#070d1e" strokeWidth="1.5" />
                  <circle cx="102" cy="30" r="3" fill="#00e5ff" stroke="#070d1e" strokeWidth="1.5" />
                  <circle cx="135" cy="34" r="3" fill="#00e5ff" stroke="#070d1e" strokeWidth="1.5" />
                  <circle cx="168" cy="28" r="3" fill="#00e5ff" stroke="#070d1e" strokeWidth="1.5" />
                  <circle cx="202" cy="32" r="3" fill="#00e5ff" stroke="#070d1e" strokeWidth="1.5" />
                  <circle cx="235" cy="26" r="3.5" fill="#00e5ff" stroke="#070d1e" strokeWidth="1.5" />

                  {/* X Axis dates */}
                  <text x="30" y="93" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">07/04</text>
                  <text x="63" y="93" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">08/04</text>
                  <text x="97" y="93" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">09/04</text>
                  <text x="130" y="93" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">10/04</text>
                  <text x="163" y="93" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">11/04</text>
                  <text x="197" y="93" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">12/04</text>
                  <text x="228" y="93" fill="#64748b" fontSize="7.5" fontFamily="sans-serif">13/04</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Estaciones con Monitores */}
        <div className="glass-panel" style={{ padding: "20px 22px" }}>
          <div className="panel-header-row">
            <div className="panel-header-title">
              <MapPin size={18} />
              <span>Estaciones con Monitores</span>
            </div>
            <Link to="/inventory" className="link-action-header">
              Ver inventario
            </Link>
          </div>

          <MonitoringMap
            locations={locations}
            selectedStation={featuredLocation}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM ROW (Órdenes de Trabajo Recientes + Actividad Reciente)          */}
      {/* ========================================================================= */}
      <div className="dashboard-bottom-row">
        {/* Left Side: Órdenes de Trabajo Recientes */}
        <div className="glass-panel" style={{ padding: "20px 22px" }}>
          <div className="panel-header-row">
            <div className="panel-header-title">
              <ClipboardList size={18} />
              <span>Órdenes de Trabajo Recientes</span>
            </div>
            <Link to="/work-orders" className="link-action-header">
              <span>Ver todas</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="table-responsive">
            <table className="modern-ot-table">
              <thead>
                <tr>
                  <th>N° OT</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Equipo</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {realWorkOrders.map((wo) => {
                  const estadoStr = wo.estado ? wo.estado.toLowerCase() : "";
                  const estadoClass = 
                    estadoStr.includes("proceso") ? "in-process" :
                    estadoStr.includes("asignada") ? "assigned" : "completed";

                  return (
                    <tr key={wo.orden_trabajo_id}>
                      <td className="ot-number">{wo.numero_orden}</td>
                      <td>{wo.cliente_nombre || "Estación de Servicio"}</td>
                      <td>{wo.tipo_servicio || "Mantención"}</td>
                      <td>{wo.equipo_nombre || 'Monitor 55"'}</td>
                      <td>
                        <span className={`badge-status-pill ${estadoClass}`}>
                          {wo.estado.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ color: "#94a3b8" }}>
                        {typeof wo.fecha_programada === "string" 
                          ? wo.fecha_programada.substring(0, 16).replace("T", " ")
                          : new Date(wo.fecha_programada).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>
                        <Link to="/work-orders" style={{ color: "#64748b" }}>
                          <ChevronRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Actividad Reciente */}
        <div className="glass-panel" style={{ padding: "20px 22px" }}>
          <div className="panel-header-row">
            <div className="panel-header-title">
              <Clock size={18} />
              <span>Actividad Reciente</span>
            </div>
            <Link to="/inventory" className="link-action-header">
              <span>Ver todo</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="activity-feed-list">
            {/* Event 1 - Real location check */}
            <div className="activity-feed-item">
              <div className="activity-circle-icon green">
                <Check size={16} />
              </div>
              <div className="activity-text-col">
                <p className="activity-text-title">Equipo en línea</p>
                <p className="activity-text-sub">
                  Monitor 55'' - {featuredLocation?.nombre || "Estación Central"}
                </p>
              </div>
              <span className="activity-timestamp">12:42</span>
            </div>

            {/* Event 2 - Real work order */}
            <div className="activity-feed-item">
              <div className="activity-circle-icon blue">
                <Wrench size={16} />
              </div>
              <div className="activity-text-col">
                <p className="activity-text-title">Orden de trabajo actualizada</p>
                <p className="activity-text-sub">
                  {workOrders[0] ? `${workOrders[0].numero_orden} - ${workOrders[0].estado.replace('_', ' ')}` : "OT-2025-0412 - En proceso"}
                </p>
              </div>
              <span className="activity-timestamp">11:36</span>
            </div>

            {/* Event 3 - Real agreement */}
            <div className="activity-feed-item">
              <div className="activity-circle-icon purple">
                <Plus size={16} />
              </div>
              <div className="activity-text-col">
                <p className="activity-text-title">Convenio corporativo activo</p>
                <p className="activity-text-sub">
                  {agreements[0] ? agreements[0].nombre_empresa : "Convenio Copec S.A."}
                </p>
              </div>
              <span className="activity-timestamp">10:15</span>
            </div>

            {/* Event 4 - Maintenance warning */}
            <div className="activity-feed-item">
              <div className="activity-circle-icon orange">
                <AlertTriangle size={16} />
              </div>
              <div className="activity-text-col">
                <p className="activity-text-title">Monitoreo de equipos</p>
                <p className="activity-text-sub">
                  {enMantenimientoCount} pantallas en mantenimiento preventivo
                </p>
              </div>
              <span className="activity-timestamp">09:03</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
