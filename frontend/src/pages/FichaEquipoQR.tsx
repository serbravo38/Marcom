import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  Tv,
  MapPin,
  UserCheck,
  Phone,
  Mail,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Building2,
  Hash,
  Tag,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";
import { inventoryService, type Activo } from "../services/inventory";

export const FichaEquipoQR: React.FC = () => {
  const { activoId } = useParams<{ activoId: string }>();
  const [searchParams] = useSearchParams();
  const [asset, setAsset] = useState<Activo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!activoId) {
      setLoading(false);
      return;
    }
    inventoryService
      .getPublicAssetDetails(activoId)
      .then((data) => {
        setAsset(data);
      })
      .catch(() => {
        // Fallback automático a los parámetros embebidos en el QR si se escanea fuera de la red local
        setAsset(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activoId]);

  // Datos consolidados (API en tiempo real + fallback embebido en parámetros del QR)
  const modelo =
    asset?.producto?.nombre ||
    searchParams.get("m") ||
    "Monitor Profesional Cartelería Digital";
  const marca = asset?.producto?.marca || searchParams.get("br") || "MARCOM";
  const pulgadas =
    asset?.producto?.pulgadas ||
    (searchParams.get("in") ? Number(searchParams.get("in")) : null);
  const sku = asset?.producto?.sku || searchParams.get("sku") || "SIN-SKU";
  const numeroSerie =
    asset?.numero_serie || searchParams.get("sn") || "SIN-SERIE";
  const codigoQr =
    asset?.codigo_qr || searchParams.get("qr") || `QR-${numeroSerie}`;
  const estadoActual =
    asset?.estado_actual || searchParams.get("est") || "NUEVO";

  const sucursalNombre =
    asset?.ubicacion_actual?.nombre ||
    searchParams.get("loc") ||
    "Sucursal / Punto de Atención Asignado";
  const codigoLocal =
    asset?.ubicacion_actual?.codigo_local || searchParams.get("cod") || "";
  const direccion =
    asset?.ubicacion_actual?.direccion ||
    searchParams.get("dir") ||
    "Dirección registrada en sistema";
  const comuna = asset?.ubicacion_actual?.comuna || searchParams.get("com") || "";
  const region = asset?.ubicacion_actual?.region || searchParams.get("reg") || "";
  const zona = asset?.ubicacion_actual?.zona || searchParams.get("zn") || "";
  const esBodega =
    asset?.ubicacion_actual?.es_bodega ?? searchParams.get("bod") === "1";

  const responsableNombre =
    asset?.ubicacion_actual?.nombre_encargado ||
    searchParams.get("resp") ||
    "Soporte & Operaciones MARCOM";
  const responsableTelefono =
    asset?.ubicacion_actual?.telefono_encargado ||
    searchParams.get("tel") ||
    "";
  const responsableCorreo =
    asset?.ubicacion_actual?.correo_encargado ||
    searchParams.get("mail") ||
    "contacto@marcomchile.cl";

  const isOperativo =
    estadoActual === "NUEVO" || estadoActual === "USADO_BUEN_ESTADO";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(145deg, #060b16 0%, #0f172a 60%, #0b1324 100%)",
        color: "#f8fafc",
        padding: "20px 14px 40px 14px",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        {/* Barra Superior de Identidad MARCOM */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "14px",
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.35)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.4px", color: "#fff" }}>
                MARCOM CHILE
              </div>
              <div style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 600 }}>
                Ficha Oficial de Equipo en Terreno
              </div>
            </div>
          </div>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 11px",
              borderRadius: "999px",
              fontSize: "0.74rem",
              fontWeight: 700,
              background: isOperativo
                ? "rgba(16, 185, 129, 0.18)"
                : "rgba(245, 158, 11, 0.2)",
              color: isOperativo ? "#34d399" : "#fbbf24",
              border: `1px solid ${
                isOperativo ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.45)"
              }`
            }}
          >
            {isOperativo ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{estadoActual.replace(/_/g, " ")}</span>
          </span>
        </div>

        {loading ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              background: "rgba(30, 41, 59, 0.6)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)"
            }}
          >
            Cargando datos del televisor/monitor...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* TARJETA 1: IDENTIFICACIÓN DEL TELEVISOR / MONITOR */}
            <div
              style={{
                background: "rgba(30, 41, 59, 0.85)",
                borderRadius: "16px",
                padding: "18px",
                border: "1px solid rgba(56, 189, 248, 0.28)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.76rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: "#38bdf8",
                  fontWeight: 700,
                  marginBottom: "10px"
                }}
              >
                <Tv size={15} />
                <span>1. Identificación del Televisor / Monitor</span>
              </div>

              <h2
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.3
                }}
              >
                {modelo}
              </h2>

              <div
                style={{
                  fontSize: "0.83rem",
                  color: "#94a3b8",
                  marginBottom: "14px",
                  fontWeight: 500
                }}
              >
                Marca: <strong style={{ color: "#e2e8f0" }}>{marca}</strong>
                {pulgadas ? (
                  <>
                    {" "}
                    · Tamaño: <strong style={{ color: "#e2e8f0" }}>{pulgadas}" Pulgadas</strong>
                  </>
                ) : null}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px"
                }}
              >
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.75)",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)"
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: "3px"
                    }}
                  >
                    <Tag size={12} style={{ color: "#38bdf8" }} />
                    <span>CÓDIGO SKU</span>
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "#38bdf8"
                    }}
                  >
                    {sku}
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.75)",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)"
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: "3px"
                    }}
                  >
                    <Hash size={12} style={{ color: "#34d399" }} />
                    <span>NÚMERO DE SERIE</span>
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "#34d399"
                    }}
                  >
                    {numeroSerie}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "10px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(15, 23, 42, 0.5)",
                  fontSize: "0.76rem",
                  color: "#cbd5e1",
                  display: "flex",
                  justifyContent: "space-between"
                }}
              >
                <span>ID Etiqueta QR:</span>
                <strong style={{ fontFamily: "monospace", color: "#fff" }}>{codigoQr}</strong>
              </div>
            </div>

            {/* TARJETA 2: UBICACIÓN EXACTA */}
            <div
              style={{
                background: "rgba(30, 41, 59, 0.85)",
                borderRadius: "16px",
                padding: "18px",
                border: "1px solid rgba(16, 185, 129, 0.28)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.76rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: "#34d399",
                  fontWeight: 700,
                  marginBottom: "10px"
                }}
              >
                <MapPin size={15} />
                <span>2. Ubicación Exacta Asignada</span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d399"
                  }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff" }}>
                    {codigoLocal ? `[${codigoLocal}] ` : ""}
                    {sucursalNombre}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#34d399", fontWeight: 600 }}>
                    {esBodega ? "Bodega Logística / Centro de Distribución" : "Sucursal / Sala de Atención en Terreno"}
                    {zona ? ` · Zona ${zona}` : ""}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(15, 23, 42, 0.75)",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  fontSize: "0.86rem",
                  lineHeight: 1.5,
                  color: "#e2e8f0"
                }}
              >
                <div>
                  <strong>Dirección / Sector:</strong> {direccion}
                </div>
                {(comuna || region) && (
                  <div style={{ color: "#94a3b8", marginTop: "4px" }}>
                    <strong>Comuna / Región:</strong> {[comuna, region].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            </div>

            {/* TARJETA 3: PERSONA O ÁREA RESPONSABLE */}
            <div
              style={{
                background: "rgba(30, 41, 59, 0.85)",
                borderRadius: "16px",
                padding: "18px",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.76rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: "#c084fc",
                  fontWeight: 700,
                  marginBottom: "10px"
                }}
              >
                <UserCheck size={15} />
                <span>3. Persona o Área Responsable</span>
              </div>

              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: "#fff", marginBottom: "4px" }}>
                {responsableNombre}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "12px" }}>
                Encargado(a) de Sucursal / Recepción de Equipos en Terreno
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {responsableTelefono && (
                  <a
                    href={`tel:${responsableTelefono}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(16, 185, 129, 0.14)",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      color: "#34d399",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: "0.88rem"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Phone size={15} />
                      <span>{responsableTelefono}</span>
                    </span>
                    <span style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>Llamar →</span>
                  </a>
                )}

                {responsableCorreo && (
                  <a
                    href={`mailto:${responsableCorreo}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "rgba(56, 189, 248, 0.12)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      color: "#38bdf8",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "0.85rem"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Mail size={15} />
                      <span>{responsableCorreo}</span>
                    </span>
                    <span style={{ fontSize: "0.75rem" }}>Correo →</span>
                  </a>
                )}
              </div>
            </div>

            {/* ACCIONES RÁPIDAS PARA EL TÉCNICO EN CELULAR */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "6px"
              }}
            >
              <Link
                to="/work-orders"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.92rem",
                  textDecoration: "none",
                  boxShadow: "0 6px 20px rgba(2, 132, 199, 0.4)"
                }}
              >
                <Wrench size={18} />
                <span>Abrir Órdenes de Trabajo (Subir Foto / Cerrar OT)</span>
              </Link>

              <Link
                to="/inventory"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "11px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#cbd5e1",
                  fontWeight: 600,
                  fontSize: "0.84rem",
                  textDecoration: "none"
                }}
              >
                <ArrowLeft size={15} />
                <span>Ir al Panel de Inventario MARCOM</span>
              </Link>
            </div>

            <div
              style={{
                textAlign: "center",
                fontSize: "0.74rem",
                color: "#64748b",
                marginTop: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px"
              }}
            >
              <ShieldCheck size={14} style={{ color: "#38bdf8" }} />
              <span>Sistema de Trazabilidad QR de Activos — MARCOM Chile</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FichaEquipoQR;
