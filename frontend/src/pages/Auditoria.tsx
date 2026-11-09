import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Download,
  Eye,
  X,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Activity,
  LogIn,
  Loader2,
  Filter
} from "lucide-react";
import { authService, type AuditoriaEvento } from "../services/auth";

const MODULO_LABELS: Record<string, string> = {
  SESION_AUTH: "Sesiones y Autenticación",
  ORDENES_TRABAJO: "Órdenes de Trabajo y Firmas",
  INVENTARIO_QR: "Inventario, Locales y QR",
  FACTURACION_DTE: "Facturación, Cotizaciones y DTE",
  USUARIOS_CONVENIOS: "Usuarios y Convenios",
  PORTADA_CMS: "Portada Web Corporativa"
};

const ACCION_LABELS: Record<string, { label: string; badgeClass: string }> = {
  LOGIN_EXITOSO: { label: "Inicio de Sesión", badgeClass: "success" },
  LOGIN_CLAVE_TEMPORAL: { label: "Ingreso Clave Temporal", badgeClass: "warning" },
  DESAFIO_MFA: { label: "Desafío 2FA", badgeClass: "secondary" },
  MFA_VERIFICADO: { label: "2FA Verificado", badgeClass: "success" },
  MFA_ACTIVADO: { label: "2FA Activado", badgeClass: "success" },
  MFA_DESACTIVADO: { label: "2FA Desactivado", badgeClass: "warning" },
  CIERRE_SESION: { label: "Cierre de Sesión", badgeClass: "secondary" },
  LOGIN_FALLIDO: { label: "Login Fallido", badgeClass: "error" },
  CUENTA_BLOQUEADA: { label: "Cuenta Bloqueada", badgeClass: "error" },
  ACCESO_DENEGADO: { label: "Acceso Denegado (403)", badgeClass: "error" },
  CREACION: { label: "Creación / Registro", badgeClass: "success" },
  ACTUALIZACION: { label: "Actualización", badgeClass: "secondary" },
  CIERRE_OT_FIRMA: { label: "Cierre OT + Firma Móvil", badgeClass: "success" },
  ELIMINACION: { label: "Eliminación", badgeClass: "warning" }
};

const isMobileUserAgent = (ua?: string | null): boolean => {
  if (!ua) return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
};

export const Auditoria: React.FC = () => {
  const [logs, setLogs] = useState<AuditoriaEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedModulo, setSelectedModulo] = useState("TODOS");
  const [selectedAccion, setSelectedAccion] = useState("TODAS");
  const [selectedRol, setSelectedRol] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedEvent, setSelectedEvent] = useState<AuditoriaEvento | null>(null);

  const fetchAuditLogs = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const data = await authService.getAuditLogs({
        modulo: selectedModulo,
        accion: selectedAccion,
        rol_usuario: selectedRol,
        limit: 500
      });
      setLogs(data);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar la bitácora de auditoría de usuarios.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(true);
  }, [selectedModulo, selectedAccion, selectedRol]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const q = searchTerm.trim().toLowerCase();
    return logs.filter(item =>
      (item.correo_usuario || "").toLowerCase().includes(q) ||
      (item.nombre_usuario || "").toLowerCase().includes(q) ||
      (item.descripcion || "").toLowerCase().includes(q) ||
      (item.ruta_endpoint || "").toLowerCase().includes(q) ||
      (item.direccion_ip || "").toLowerCase().includes(q) ||
      (item.accion || "").toLowerCase().includes(q)
    );
  }, [logs, searchTerm]);

  const kpis = useMemo(() => {
    const total = filteredLogs.length;
    const loginsExitosos = filteredLogs.filter(
      l => l.accion === "LOGIN_EXITOSO" || l.accion === "MFA_VERIFICADO" || l.accion === "LOGIN_CLAVE_TEMPORAL"
    ).length;
    const alertasSeguridad = filteredLogs.filter(
      l => l.accion === "LOGIN_FALLIDO" || l.accion === "CUENTA_BLOQUEADA" || l.accion === "ACCESO_DENEGADO" || (l.codigo_respuesta && l.codigo_respuesta >= 400)
    ).length;
    const movimientosOperativos = filteredLogs.filter(
      l => ["CREACION", "ACTUALIZACION", "CIERRE_OT_FIRMA", "ELIMINACION"].includes(l.accion)
    ).length;

    return { total, loginsExitosos, alertasSeguridad, movimientosOperativos };
  }, [filteredLogs]);

  const handleExportCsv = () => {
    const headers = [
      "ID Auditoria",
      "Fecha y Hora",
      "Nombre Usuario",
      "Correo Usuario",
      "Rol",
      "Modulo",
      "Accion",
      "Descripcion del Movimiento",
      "Metodo HTTP",
      "Ruta Endpoint",
      "Codigo HTTP",
      "Direccion IP",
      "Dispositivo"
    ];

    const escapeCsv = (val: any) => {
      const s = String(val ?? "").replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredLogs.map(item => [
      escapeCsv(item.auditoria_id),
      escapeCsv(new Date(item.fecha_evento).toLocaleString("es-CL")),
      escapeCsv(item.nombre_usuario || "N/A"),
      escapeCsv(item.correo_usuario || "N/A"),
      escapeCsv(item.rol_usuario || "N/A"),
      escapeCsv(MODULO_LABELS[item.modulo] || item.modulo),
      escapeCsv(ACCION_LABELS[item.accion]?.label || item.accion),
      escapeCsv(item.descripcion),
      escapeCsv(item.metodo_http || ""),
      escapeCsv(item.ruta_endpoint || ""),
      escapeCsv(item.codigo_respuesta ?? ""),
      escapeCsv(item.direccion_ip || ""),
      escapeCsv(isMobileUserAgent(item.dispositivo_user_agent) ? "Telefono Movil" : "Computador / Web")
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Auditoria_Usuarios_Marcom_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="audit-view animate-fade-in">
      {error && (
        <div className="badge error" style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px" }}>
          {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "22px"
        }}
      >
        <div className="glass-panel" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(56, 189, 248, 0.14)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))", display: "block" }}>Eventos en Bitácora</span>
            <strong style={{ fontSize: "1.55rem", fontWeight: 800 }}>{kpis.total}</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogIn size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))", display: "block" }}>Inicios de Sesión Exitosos</span>
            <strong style={{ fontSize: "1.55rem", fontWeight: 800, color: "#34d399" }}>{kpis.loginsExitosos}</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.16)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))", display: "block" }}>Movimientos de Usuarios</span>
            <strong style={{ fontSize: "1.55rem", fontWeight: 800, color: "#818cf8" }}>{kpis.movimientosOperativos}</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(244, 63, 94, 0.15)", color: "#fb7185", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "hsl(var(--text-muted))", display: "block" }}>Intentos Fallidos / Alertas</span>
            <strong style={{ fontSize: "1.55rem", fontWeight: 800, color: "#fb7185" }}>{kpis.alertasSeguridad}</strong>
          </div>
        </div>
      </div>

      {/* Main Audit Panel */}
      <div className="glass-panel card-container">
        <div className="panel-title" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={20} style={{ color: "hsl(var(--accent-primary))" }} />
            <span>Bitácora de Inicios de Sesión y Movimientos de Usuarios</span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", fontSize: "0.82rem" }}
              onClick={() => fetchAuditLogs(true)}
            >
              <RefreshCw size={15} />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", fontSize: "0.82rem" }}
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
            >
              <Download size={15} />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr",
            gap: "12px",
            marginBottom: "18px",
            alignItems: "end"
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: "0.76rem", display: "flex", alignItems: "center", gap: "5px" }}>
              <Search size={13} />
              <span>Buscar por usuario, correo, movimiento o IP</span>
            </label>
            <input
              type="text"
              className="glass-input"
              placeholder="Ej: admin@marcom.cl, firma, OT-2026, QR, 192.168..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: "0.76rem", display: "flex", alignItems: "center", gap: "5px" }}>
              <Filter size={13} />
              <span>Módulo del Sistema</span>
            </label>
            <select
              className="glass-input"
              value={selectedModulo}
              onChange={e => setSelectedModulo(e.target.value)}
            >
              <option value="TODOS">Todos los módulos</option>
              <option value="SESION_AUTH">Sesiones y Autenticación</option>
              <option value="ORDENES_TRABAJO">Órdenes de Trabajo y Firmas</option>
              <option value="INVENTARIO_QR">Inventario, Locales y QR</option>
              <option value="FACTURACION_DTE">Facturación, Cotizaciones y DTE</option>
              <option value="USUARIOS_CONVENIOS">Usuarios y Convenios</option>
              <option value="PORTADA_CMS">Portada Web Corporativa</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: "0.76rem" }}>Tipo de Acción</label>
            <select
              className="glass-input"
              value={selectedAccion}
              onChange={e => setSelectedAccion(e.target.value)}
            >
              <option value="TODAS">Todas las acciones</option>
              <option value="LOGIN_EXITOSO">Inicio de Sesión Exitoso</option>
              <option value="LOGIN_FALLIDO">Intento de Login Fallido</option>
              <option value="CUENTA_BLOQUEADA">Cuenta Bloqueada</option>
              <option value="CIERRE_OT_FIRMA">Cierre OT con Firma Móvil</option>
              <option value="CREACION">Creación / Nuevo Registro</option>
              <option value="ACTUALIZACION">Actualización / Edición</option>
              <option value="ELIMINACION">Eliminación</option>
              <option value="ACCESO_DENEGADO">Acceso Denegado (403)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: "0.76rem" }}>Rol del Usuario</label>
            <select
              className="glass-input"
              value={selectedRol}
              onChange={e => setSelectedRol(e.target.value)}
            >
              <option value="TODOS">Todos los roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="JEFE_BODEGA">JEFE_BODEGA</option>
              <option value="TECNICO_TERRENO">TECNICO_TERRENO</option>
              <option value="CLIENTE_CONVENIO">CLIENTE_CONVENIO</option>
              <option value="CLIENTE_ESTANDAR">CLIENTE_ESTANDAR</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="table-responsive">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "45px" }}>
              <Loader2 className="spin" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "hsl(var(--text-muted))" }}>
              No se encontraron registros de auditoría con los filtros seleccionados.
            </div>
          ) : (
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario / Correo</th>
                  <th>Rol</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Descripción del Movimiento</th>
                  <th>Dispositivo / IP</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(item => {
                  const accionMeta = ACCION_LABELS[item.accion] || {
                    label: item.accion,
                    badgeClass: "secondary"
                  };
                  const isMobile = isMobileUserAgent(item.dispositivo_user_agent);

                  return (
                    <tr key={item.auditoria_id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                        {new Date(item.fecha_evento).toLocaleString("es-CL")}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                          {item.nombre_usuario || "Usuario"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>
                          {item.correo_usuario || "Sin correo"}
                        </div>
                      </td>
                      <td>
                        <span className="badge secondary" style={{ fontSize: "0.72rem" }}>
                          {item.rol_usuario || "N/A"}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                        {MODULO_LABELS[item.modulo] || item.modulo}
                      </td>
                      <td>
                        <span className={`badge ${accionMeta.badgeClass}`} style={{ fontSize: "0.74rem" }}>
                          {accionMeta.label}
                        </span>
                      </td>
                      <td style={{ maxWidth: "340px", fontSize: "0.83rem", lineHeight: 1.35 }}>
                        {item.descripcion}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          {isMobile ? (
                            <>
                              <Smartphone size={14} style={{ color: "#38bdf8" }} />
                              <span>Celular</span>
                            </>
                          ) : (
                            <>
                              <Monitor size={14} style={{ color: "#94a3b8" }} />
                              <span>Web / PC</span>
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "hsl(var(--text-muted))" }}>
                          IP: {item.direccion_ip || "127.0.0.1"}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "5px 10px", fontSize: "0.76rem", display: "inline-flex", alignItems: "center", gap: "5px" }}
                          onClick={() => setSelectedEvent(item)}
                        >
                          <Eye size={13} />
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

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div
            className="modal-content glass-panel"
            style={{ maxWidth: "600px" }}
            onClick={e => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setSelectedEvent(null)}>
              <X size={20} />
            </button>

            <h3 style={{ marginBottom: "6px", fontWeight: 700 }} className="accent-text-gradient">
              Detalle de Registro de Auditoría
            </h3>
            <p style={{ fontSize: "0.82rem", color: "hsl(var(--text-muted))", marginBottom: "18px" }}>
              ID de Evento: <code>{selectedEvent.auditoria_id}</code>
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                background: "rgba(15, 23, 42, 0.45)",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: "16px",
                fontSize: "0.84rem"
              }}
            >
              <div>
                <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.75rem", display: "block" }}>Usuario</span>
                <strong>{selectedEvent.nombre_usuario || "N/A"}</strong>
                <div style={{ fontSize: "0.78rem", color: "#38bdf8" }}>{selectedEvent.correo_usuario}</div>
              </div>
              <div>
                <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.75rem", display: "block" }}>Fecha y Hora Exacta</span>
                <strong>{new Date(selectedEvent.fecha_evento).toLocaleString("es-CL")}</strong>
                <div style={{ fontSize: "0.76rem", color: "hsl(var(--text-muted))" }}>Rol: {selectedEvent.rol_usuario}</div>
              </div>
              <div>
                <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.75rem", display: "block" }}>Módulo / Acción</span>
                <strong>{MODULO_LABELS[selectedEvent.modulo] || selectedEvent.modulo}</strong>
                <div style={{ fontSize: "0.78rem" }}>{ACCION_LABELS[selectedEvent.accion]?.label || selectedEvent.accion}</div>
              </div>
              <div>
                <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.75rem", display: "block" }}>Endpoint y Estado HTTP</span>
                <strong>
                  {selectedEvent.metodo_http || "POST"} {selectedEvent.ruta_endpoint || "/"}
                </strong>
                <div style={{ fontSize: "0.78rem", color: (selectedEvent.codigo_respuesta || 200) < 400 ? "#34d399" : "#fb7185" }}>
                  Código HTTP: {selectedEvent.codigo_respuesta || 200} | IP: {selectedEvent.direccion_ip}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                Descripción del Movimiento:
              </span>
              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", fontSize: "0.86rem" }}>
                {selectedEvent.descripcion}
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                Dispositivo / Navegador (User-Agent):
              </span>
              <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)", fontSize: "0.76rem", color: "hsl(var(--text-muted))", wordBreak: "break-all" }}>
                {selectedEvent.dispositivo_user_agent || "No especificado"}
              </div>
            </div>

            {selectedEvent.detalle_json && (
              <div style={{ marginBottom: "18px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  Datos Sanitizados del Movimiento (JSON):
                </span>
                <pre
                  style={{
                    background: "#090d16",
                    color: "#38bdf8",
                    padding: "12px",
                    borderRadius: "8px",
                    fontSize: "0.76rem",
                    overflowX: "auto",
                    maxHeight: "200px",
                    border: "1px solid rgba(56, 189, 248, 0.2)"
                  }}
                >
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedEvent.detalle_json), null, 2);
                    } catch {
                      return selectedEvent.detalle_json;
                    }
                  })()}
                </pre>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn-primary" onClick={() => setSelectedEvent(null)}>
                <CheckCircle2 size={15} />
                <span>Cerrar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auditoria;
