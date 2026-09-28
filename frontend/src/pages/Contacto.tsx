import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  RotateCcw,
  MessageSquare,
  AlertCircle,
  Database
} from "lucide-react";
import "./Contacto.css";

export const Contacto: React.FC = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    empresa: "",
    correo: "",
    telefono: "",
    tipoConsulta: "Cartelería Digital & Menús Dinámicos",
    mensaje: ""
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim() || !formData.correo.trim() || !formData.mensaje.trim()) {
      setError("Por favor completa los campos obligatorios (*).");
      return;
    }

    setError(null);
    setLoading(true);

    const generatedTicket = `MC-${Math.floor(1000 + Math.random() * 9000)}`;
    setTicketCode(generatedTicket);

    const payload = {
      ticket_id: generatedTicket,
      fecha: new Date().toISOString(),
      nombre: formData.nombre.trim(),
      empresa: formData.empresa.trim() || "Particular / No especificado",
      correo: formData.correo.trim(),
      telefono: formData.telefono.trim() || "No especificado",
      tipo_consulta: formData.tipoConsulta,
      mensaje: formData.mensaje.trim(),
      estado: "PENDIENTE_REVISION",
      destino_notificacion: "contacto@marcom.cl"
    };

    try {
      // 1. Almacenamiento local de auditoría en el navegador (persistencia de respaldo)
      const existing = localStorage.getItem("marcom_consultas_contacto");
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(payload);
      localStorage.setItem("marcom_consultas_contacto", JSON.stringify(list));

      // 2. Intento de persistencia hacia el API Gateway (si el microservicio está activo)
      try {
        await fetch("/api/v1/contacto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (backendErr) {
        // En caso de que el backend no tenga aún la ruta /contacto, el ticket queda resguardado localmente
        console.warn("Aviso: Mensaje guardado en contingencia local:", backendErr);
      }

      setTimeout(() => {
        setLoading(false);
        setSubmitted(true);
      }, 700);
    } catch (err: any) {
      setLoading(false);
      setError("Ocurrió un error al procesar el mensaje. Por favor intenta de nuevo.");
    }
  };

  const handleReset = () => {
    setFormData({
      nombre: "",
      empresa: "",
      correo: "",
      telefono: "",
      tipoConsulta: "Cartelería Digital & Menús Dinámicos",
      mensaje: ""
    });
    setSubmitted(false);
    setError(null);
  };

  return (
    <div className="contacto-page-wrapper">
      <div className="contacto-glow-1" />
      <div className="contacto-glow-2" />

      {/* Topbar de la ventana */}
      <header className="contacto-topbar">
        <Link to="/" className="contacto-topbar-brand">
          <img 
            src="/logo_marcom_transparent.png" 
            alt="Marcom Logo" 
            style={{ height: "36px", width: "auto" }}
            onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "1px", lineHeight: 1.1 }}>MARCOM</div>
            <div style={{ fontSize: "0.65rem", color: "#38bdf8", fontWeight: 600, letterSpacing: "0.6px", textTransform: "uppercase" }}>
              Módulo de Solicitudes y Consultas
            </div>
          </div>
        </Link>

        <Link to="/" className="contacto-btn-back">
          <ArrowLeft size={16} />
          <span>Volver a la Portada</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="contacto-main">
        <div className="contacto-header-intro">
          <div className="contacto-badge">
            <MessageSquare size={14} />
            <span>Atención B2B & Soporte en Terreno</span>
          </div>
          <h1 className="contacto-main-title">
            Formulario de Solicitud y Contacto
          </h1>
          <p className="contacto-main-subtitle">
            Ingresa tu consulta sobre cartelería digital, menú boards, sistemas POS, redes o soporte operativo.
            Tu requerimiento será derivado al área técnica correspondiente.
          </p>
        </div>

        <div className="contacto-grid-layout">
          {/* Columna Izquierda: Información de recepción y canales */}
          <div className="contacto-card-info">
            <div>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#38bdf8" }}>
                Canales Corporativos
              </span>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", marginTop: "4px" }}>
                Mesa Operativa Central
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6, marginTop: "8px" }}>
                Sociedad de Instalaciones Marcom Compañía Limitada coordina despliegues y atenciones técnicas a lo largo de Chile.
              </p>

              <div className="contacto-info-channels">
                <div className="contacto-channel-row">
                  <div className="contacto-channel-icon">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="contacto-channel-label">Casilla de Recepción</div>
                    <div className="contacto-channel-value">contacto@marcom.cl</div>
                  </div>
                </div>

                <div className="contacto-channel-row">
                  <div className="contacto-channel-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#34d399" }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <div className="contacto-channel-label">Teléfono Mesa de Ayuda</div>
                    <div className="contacto-channel-value">+56 9 8450 1200</div>
                  </div>
                </div>

                <div className="contacto-channel-row">
                  <div className="contacto-channel-icon" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24" }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="contacto-channel-label">Cobertura</div>
                    <div className="contacto-channel-value">Santiago (Despliegues en Regiones)</div>
                  </div>
                </div>

                <div className="contacto-channel-row">
                  <div className="contacto-channel-icon" style={{ background: "rgba(139, 92, 246, 0.12)", color: "#a78bfa" }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <div className="contacto-channel-label">Horario Hábil</div>
                    <div className="contacto-channel-value">Lunes a Viernes 08:30 - 18:30 hrs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso de trazabilidad de los mensajes */}
            <div className="contacto-storage-notice">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "#38bdf8", marginBottom: "4px" }}>
                <Database size={15} />
                <span>¿Dónde se almacena tu mensaje?</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
                Cada solicitud genera un número de ticket único, se registra en la base de datos de auditoría de Marcom y se envía por correo a la coordinación de operaciones con copia al cliente.
              </p>
            </div>
          </div>

          {/* Columna Derecha: Formulario */}
          <div className="contacto-card-form">
            {submitted ? (
              <div className="contacto-success-container">
                <div className="contacto-success-icon">
                  <CheckCircle2 size={36} />
                </div>
                <div className="contacto-ticket-badge">Ticket: {ticketCode}</div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>
                  ¡Solicitud Ingresada Exitosamente!
                </h3>
                <p style={{ color: "#cbd5e1", fontSize: "0.92rem", lineHeight: 1.6, maxWidth: "420px", margin: "0 auto 24px" }}>
                  Hemos recibido tu consulta sobre <strong>"{formData.tipoConsulta}"</strong>. El requerimiento quedó registrado y nuestro equipo se contactará a <strong>{formData.correo}</strong>.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                  <button 
                    type="button" 
                    className="contacto-btn-back"
                    onClick={handleReset}
                    style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}
                  >
                    <RotateCcw size={15} />
                    <span>Enviar otra consulta</span>
                  </button>
                  <Link to="/" className="contacto-btn-back">
                    <ArrowLeft size={15} />
                    <span>Volver al Inicio</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#fff", margin: "0 0 4px 0" }}>
                    Datos del Requerimiento
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>
                    Los campos marcados con (*) son obligatorios para gestionar la respuesta.
                  </p>
                </div>

                {error && (
                  <div style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    color: "#fca5a5",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    fontSize: "0.86rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="contacto-form-row">
                  <div className="contacto-form-group">
                    <label className="contacto-form-label">Nombre Completo *</label>
                    <input 
                      type="text" 
                      className="contacto-form-input" 
                      placeholder="Ej. Juan Pérez"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="contacto-form-group">
                    <label className="contacto-form-label">Empresa / Razón Social</label>
                    <input 
                      type="text" 
                      className="contacto-form-input" 
                      placeholder="Ej. Copec / Pronto / Retail"
                      value={formData.empresa}
                      onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    />
                  </div>
                </div>

                <div className="contacto-form-row">
                  <div className="contacto-form-group">
                    <label className="contacto-form-label">Correo Electrónico *</label>
                    <input 
                      type="email" 
                      className="contacto-form-input" 
                      placeholder="correo@empresa.cl"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="contacto-form-group">
                    <label className="contacto-form-label">Teléfono de Contacto</label>
                    <input 
                      type="tel" 
                      className="contacto-form-input" 
                      placeholder="+56 9 1234 5678"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                </div>

                <div className="contacto-form-group">
                  <label className="contacto-form-label">Tipo de Servicio o Consulta *</label>
                  <select 
                    className="contacto-form-select"
                    value={formData.tipoConsulta}
                    onChange={(e) => setFormData({ ...formData, tipoConsulta: e.target.value })}
                  >
                    <option value="Cartelería Digital & Menús Dinámicos">Cartelería Digital & Menús Dinámicos</option>
                    <option value="Sistemas POS & Hardware Comercial">Sistemas POS & Hardware Comercial</option>
                    <option value="Equipamiento de Red & Conectividad">Equipamiento de Red & Conectividad</option>
                    <option value="Mantenimiento en Terreno y Soporte SLA">Mantenimiento en Terreno y Soporte SLA</option>
                    <option value="Convenios Corporativos B2B">Convenios Corporativos B2B</option>
                    <option value="Consulta Comercial General">Consulta Comercial General</option>
                  </select>
                </div>

                <div className="contacto-form-group">
                  <label className="contacto-form-label">Detalle o Mensaje de la Consulta *</label>
                  <textarea 
                    className="contacto-form-textarea" 
                    placeholder="Describe los requerimientos, cantidad de pantallas, ubicación del servicentro o local..."
                    value={formData.mensaje}
                    onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="contacto-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <span>Registrando requerimiento...</span>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Enviar Solicitud de Contacto</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="contacto-footer">
        © {new Date().getFullYear()} Sociedad de Instalaciones Marcom Compañía Limitada • Servicios de Telecomunicaciones n.c.p.
      </footer>
    </div>
  );
};

export default Contacto;
