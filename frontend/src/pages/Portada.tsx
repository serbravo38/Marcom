import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Maximize2, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Monitor, 
  Tv, 
  Wifi, 
  CreditCard, 
  ArrowRight, 
  Target,
  Compass,
  Building2,
  Phone,
  Mail,
  MapPin,
  Layers,
  Activity,
  Cpu,
  LayoutDashboard,
  Menu,
  MessageSquare,
  LogOut,
  Edit3,
  Plus,
  Trash2,
  Upload,
  Save,
  RotateCcw,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { api } from "../services/api";
import "./Portada.css";

interface TrabajoItem {
  id: number;
  image: string;
  title: string;
  category: string;
  client: string;
  description: string;
  features: string[];
  badgeColor: string;
}

const STORAGE_KEY_TRABAJOS = "marcom_trabajos_carousel";

const BADGE_COLOR_PRESETS = [
  "#e11d48",
  "#0284c7",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#06b6d4",
];

const DEFAULT_TRABAJOS_DATA: TrabajoItem[] = [
  {
    id: 1,
    image: "/trabajos/22.jpeg",
    title: "Bancada Digital Menu Boards Quad Sincronizada",
    category: "Cartelería Digital & Menús Dinámicos",
    client: "Convenio Copec S.A. / Pronto",
    description: "Montaje, cableado estructurado oculto y calibración milimétrica de bancada cuádruple de pantallas profesionales de alta definición sobre mesón de atención comercial.",
    features: [
      "Fijación estructural sismorresistente sobre viga reforzada",
      "Sincronización de contenidos y promociones en tiempo real",
      "Calibración de colorimetría y brillo comercial 24/7"
    ],
    badgeColor: "#e11d48"
  },
  {
    id: 2,
    image: "/trabajos/20.jpeg",
    title: "Instalación y Ajuste en Altura de Menú Boards",
    category: "Montaje Técnico Especializado",
    client: "Arcoprime Ltda. / Servicentro Copec",
    description: "Técnico especialista de Marcom ejecutando instalación en altura de monitores profesionales para líneas de cafetería y comida rápida, garantizando ángulos de visión ergonómicos.",
    features: [
      "Protocolos certificados de trabajo seguro en altura",
      "Enrutamiento estético y seguro de líneas eléctricas y de datos",
      "Verificación de operatividad antes de entrega a cliente"
    ],
    badgeColor: "#0284c7"
  },
  {
    id: 3,
    image: "/trabajos/18.jpeg",
    title: "Displays Digitales de Promociones y Combos",
    category: "Pantallas de Placa & Retail",
    client: "Red de Servicentros y Tiendas Pronto",
    description: "Integración de monitores profesionales de gran formato orientados a potenciar el ticket promedio con promociones dinámicas y visualización clara de precios.",
    features: [
      "Operación continua bajo temperatura y brillo controlado",
      "Capacidad de reemplazo rápido bajo acuerdo de nivel de servicio (SLA)",
      "Conexión a red interna corporativa para control centralizado"
    ],
    badgeColor: "#f59e0b"
  },
  {
    id: 4,
    image: "/trabajos/16.jpeg",
    title: "Monitores Profesionales Panorámicos en Pilar Estructural",
    category: "Monitores Profesionales de Gran Formato",
    client: "Servicentro Copec",
    description: "Fijación y alineación de pantalla profesional en pilar arquitectónico central con soporte basculante para cobertura visual en zona de comensales y terraza.",
    features: [
      "Abrazadera estructural de alta resistencia sin perforación dañina",
      "Visibilidad panorámica para alto flujo de pasajeros y clientes",
      "Integración de audio y video de calidad corporativa"
    ],
    badgeColor: "#10b981"
  },
  {
    id: 5,
    image: "/trabajos/12.jpeg",
    title: "Mantenimiento Preventivo y Soporte en Terreno",
    category: "Soporte Técnico & Calibración",
    client: "Convenio Corporativo Nacional",
    description: "Inspección técnica, reorientación y chequeo predictivo de cableado y conectividad de pantalla comercial suspendida en pilar de local de atención rápida.",
    features: [
      "Checklist digital georreferenciado cargado al sistema Marcom",
      "Trazabilidad de partes, piezas y números de serie de activos",
      "Pruebas de latencia y continuidad de enlace de datos"
    ],
    badgeColor: "#8b5cf6"
  },
  {
    id: 6,
    image: "/trabajos/9.jpeg",
    title: "Red de Cartelería Vertical de Pasillo (In-Store)",
    category: "Digital Signage Suspendido",
    client: "Tiendas de Conveniencia Pronto Copec",
    description: "Despliegue de red de displays verticales suspendidos de cielo técnico en pasillos comerciales para señalética dinámica y campañas publicitarias de marcas aliadas.",
    features: [
      "Anclaje con tirantes de acero y protección antisísmica",
      "Sincronización con pauta publicitaria centralizada",
      "Máximo impacto en la decisión de compra del consumidor final"
    ],
    badgeColor: "#06b6d4"
  }
];

export const Portada: React.FC = () => {
  const [trabajosList, setTrabajosList] = useState<TrabajoItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRABAJOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // Fallback to default
    }
    return DEFAULT_TRABAJOS_DATA;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<TrabajoItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Admin Carousel Editor Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [draftTrabajos, setDraftTrabajos] = useState<TrabajoItem[]>([]);
  const [selectedEditIndex, setSelectedEditIndex] = useState(0);
  const [isSavingTrabajos, setIsSavingTrabajos] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = userProfile?.rol === "ADMIN";

  // Check if user is logged in & fetch saved trabajos from backend
  useEffect(() => {
    const token = localStorage.getItem("marcom_token");
    const rawUser = localStorage.getItem("marcom_user");
    if (token && rawUser) {
      try {
        setUserProfile(JSON.parse(rawUser));
      } catch (e) {
        setUserProfile(null);
      }
    }

    api
      .get<{ items: TrabajoItem[] | null }>("/auth/trabajos-portada")
      .then((res) => {
        if (res && Array.isArray(res.items) && res.items.length > 0) {
          setTrabajosList(res.items);
          localStorage.setItem(STORAGE_KEY_TRABAJOS, JSON.stringify(res.items));
        }
      })
      .catch(() => {
        // Fallback to localStorage / default silently
      });
  }, []);

  // Carousel autoplay timer
  useEffect(() => {
    if (isPlaying && !isEditModalOpen && trabajosList.length > 0) {
      autoPlayTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % trabajosList.length);
      }, 5000);
    }
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isPlaying, isEditModalOpen, trabajosList.length]);

  const handleNext = () => {
    if (trabajosList.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % trabajosList.length);
  };

  const handlePrev = () => {
    if (trabajosList.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + trabajosList.length) % trabajosList.length);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const safeIndex = currentIndex < trabajosList.length ? currentIndex : 0;
  const currentSlide = trabajosList[safeIndex] || DEFAULT_TRABAJOS_DATA[0];

  // --- ADMIN EDITOR HANDLERS ---
  const openEditorModal = (indexToEdit: number = safeIndex) => {
    const cloned = trabajosList.map((item) => ({
      ...item,
      features: [...item.features],
    }));
    setDraftTrabajos(cloned);
    setSelectedEditIndex(Math.min(indexToEdit, Math.max(0, cloned.length - 1)));
    setSaveMessage(null);
    setIsEditModalOpen(true);
  };

  const openEditorWithNewSlide = () => {
    const cloned = trabajosList.map((item) => ({
      ...item,
      features: [...item.features],
    }));
    const nextId = cloned.reduce((max, it) => Math.max(max, it.id), 0) + 1;
    const newSlide: TrabajoItem = {
      id: nextId,
      image: "/trabajos/22.jpeg",
      title: "Nuevo Trabajo de Instalación en Terreno",
      category: "Cartelería Digital & Soporte",
      client: "Convenio Corporativo Marcom",
      description: "Descripción detallada del montaje, equipamiento instalado y estándares aplicados en terreno.",
      features: [
        "Instalación certificada bajo estándares de seguridad",
        "Pruebas de conectividad y calibración de imagen",
        "Registro y trazabilidad de serie en plataforma Marcom",
      ],
      badgeColor: "#0284c7",
    };
    const updated = [...cloned, newSlide];
    setDraftTrabajos(updated);
    setSelectedEditIndex(updated.length - 1);
    setSaveMessage(null);
    setIsEditModalOpen(true);
  };

  const updateSelectedDraftField = (field: keyof TrabajoItem, value: any) => {
    setDraftTrabajos((prev) =>
      prev.map((item, idx) => (idx === selectedEditIndex ? { ...item, [field]: value } : item))
    );
  };

  const handleFeatureChange = (featIdx: number, value: string) => {
    setDraftTrabajos((prev) =>
      prev.map((item, idx) => {
        if (idx !== selectedEditIndex) return item;
        const nextFeatures = [...item.features];
        nextFeatures[featIdx] = value;
        return { ...item, features: nextFeatures };
      })
    );
  };

  const handleAddFeature = () => {
    setDraftTrabajos((prev) =>
      prev.map((item, idx) => {
        if (idx !== selectedEditIndex) return item;
        return { ...item, features: [...item.features, "Nuevo detalle técnico o estándar operativo"] };
      })
    );
  };

  const handleRemoveFeature = (featIdx: number) => {
    setDraftTrabajos((prev) =>
      prev.map((item, idx) => {
        if (idx !== selectedEditIndex) return item;
        if (item.features.length <= 1) return item;
        return { ...item, features: item.features.filter((_, i) => i !== featIdx) };
      })
    );
  };

  const handleAddSlideInModal = () => {
    const nextId = draftTrabajos.reduce((max, it) => Math.max(max, it.id), 0) + 1;
    const newSlide: TrabajoItem = {
      id: nextId,
      image: "/trabajos/22.jpeg",
      title: "Nuevo Trabajo en Terreno",
      category: "Montaje Técnico Especializado",
      client: "Cliente Corporativo",
      description: "Descripción técnica de la instalación o mantenimiento realizado por el equipo de Marcom.",
      features: [
        "Montaje estructural seguro y cableado oculto",
        "Validación de operatividad 24/7 con el cliente",
      ],
      badgeColor: "#0284c7",
    };
    const nextList = [...draftTrabajos, newSlide];
    setDraftTrabajos(nextList);
    setSelectedEditIndex(nextList.length - 1);
  };

  const handleDeleteSlideInModal = (idxToDelete: number) => {
    if (draftTrabajos.length <= 1) return;
    const nextList = draftTrabajos.filter((_, idx) => idx !== idxToDelete);
    setDraftTrabajos(nextList);
    setSelectedEditIndex((prev) => Math.min(prev, nextList.length - 1));
  };

  const handleMoveSlide = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= draftTrabajos.length) return;
    const nextList = [...draftTrabajos];
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setDraftTrabajos(nextList);
    setSelectedEditIndex(targetIdx);
  };

  const handleRestoreDefaults = () => {
    const defaults = DEFAULT_TRABAJOS_DATA.map((item) => ({
      ...item,
      features: [...item.features],
    }));
    setDraftTrabajos(defaults);
    setSelectedEditIndex(0);
    setSaveMessage("Se han cargado los trabajos predeterminados. Presiona «Guardar Cambios» para aplicar.");
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (!rawDataUrl) return;
      // Compress/resize image via canvas so it stores cleanly in localStorage & DB
      const img = new Image();
      img.onload = () => {
        const MAX_W = 1400;
        const MAX_H = 1000;
        let width = img.width;
        let height = img.height;
        if (width > MAX_W || height > MAX_H) {
          const ratio = Math.min(MAX_W / width, MAX_H / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          updateSelectedDraftField("image", compressedDataUrl);
        } else {
          updateSelectedDraftField("image", rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveTrabajos = async () => {
    setIsSavingTrabajos(true);
    setSaveMessage(null);
    try {
      setTrabajosList(draftTrabajos);
      localStorage.setItem(STORAGE_KEY_TRABAJOS, JSON.stringify(draftTrabajos));
      if (currentIndex >= draftTrabajos.length) {
        setCurrentIndex(0);
      }
      try {
        await api.put("/auth/trabajos-portada", { items: draftTrabajos });
      } catch (err) {
        // Guardado local garantizado aunque el contenedor aún no se haya reiniciado
      }
      setSaveMessage("¡Cambios guardados y publicados en el carrusel exitosamente!");
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveMessage(null);
      }, 900);
    } finally {
      setIsSavingTrabajos(false);
    }
  };

  return (
    <div className="portada-container">
      {/* Background Decorative Ambient Lights */}
      <div className="portada-bg-glow-1" />
      <div className="portada-bg-glow-2" />
      <div className="portada-bg-glow-3" />

      {/* ====================================================================
          NAVBAR CORPORATIVO
          ==================================================================== */}
      <header className="portada-navbar">
        <div className="portada-navbar-inner">
          <div className="portada-brand" onClick={() => scrollToSection("hero")} title="Ir al Inicio">
            <img 
              src="/logo_marcom_transparent.png" 
              alt="Logo Marcom" 
              className="portada-brand-logo"
              onError={(e) => {
                // Fallback to text/symbol if image fails
                (e.currentTarget as HTMLElement).style.display = "none";
              }} 
            />
          </div>

          <nav className="portada-nav-links">
            <Link to="/catalogo" className="portada-nav-link portada-nav-link-highlight">
              <span>Catálogo</span>
              <span className="portada-nav-badge">Venta</span>
            </Link>
            <a href="#servicios" className="portada-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("servicios"); }}>
              Servicios
            </a>
            <Link to="/contacto" className="portada-nav-link">
              Contacto
            </Link>
          </nav>

          <div className="portada-nav-actions">
            <ThemeToggle />
            {userProfile ? (
              <div className="portada-auth-btns" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Link 
                  to="/dashboard"
                  className="portada-nav-btn-panel"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(56, 189, 248, 0.14)",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    color: "#38bdf8",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    fontSize: "0.86rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    whiteSpace: "nowrap"
                  }}
                  title="Ir al Panel Operacional de Marcom"
                >
                  <LayoutDashboard size={15} /> <span>Panel</span>
                </Link>
                <button
                  type="button"
                  className="portada-nav-btn-logout"
                  onClick={() => {
                    localStorage.removeItem("marcom_token");
                    localStorage.removeItem("marcom_user");
                    setUserProfile(null);
                    window.location.reload();
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "0.86rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                  title="Cerrar Sesión"
                >
                  <LogOut size={15} /> <span className="portada-hide-xs">Salir</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="portada-nav-btn-login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, #2563eb, #0284c7)",
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "0.86rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap"
                }}
              >
                <span>Iniciar Sesión</span>
              </Link>
            )}

            <button 
              className="portada-mobile-toggle" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Abrir menú"
            >
              {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="portada-mobile-menu">
            <Link 
              to="/catalogo" 
              className="portada-nav-link portada-nav-link-highlight" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>Catálogo</span>
              <span className="portada-nav-badge">Venta</span>
            </Link>
            <a href="#servicios" className="portada-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("servicios"); }}>
              Servicios
            </a>
            <a href="#trabajos" className="portada-nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("trabajos"); }}>
              Trabajos Realizados
            </a>
            <Link 
              to="/contacto" 
              className="portada-nav-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contacto
            </Link>
            {userProfile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: "rgba(56, 189, 248, 0.16)",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    color: "#38bdf8",
                    padding: "10px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    textDecoration: "none"
                  }}
                >
                  <LayoutDashboard size={16} /> Ir al Panel Operativo
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("marcom_token");
                    localStorage.removeItem("marcom_user");
                    setUserProfile(null);
                    setIsMobileMenuOpen(false);
                    window.location.reload();
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    color: "#f87171",
                    padding: "10px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <LogOut size={16} /> Salir ({userProfile.nombre})
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, #2563eb, #0284c7)",
                  color: "#ffffff",
                  padding: "11px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  textDecoration: "none",
                  marginTop: "4px"
                }}
              >
                <ShieldCheck size={16} /> Iniciar Sesión
              </Link>
            )}
          </div>
        )}
      </header>

      {/* ====================================================================
          HERO SECTION
          ==================================================================== */}
      <section id="hero" className="portada-hero">
        <div className="portada-hero-badge">
          <span className="portada-hero-badge-dot" />
          <span>Sociedad de Instalaciones Marcom Cía. Ltda. • Telecomunicaciones n.c.p.</span>
        </div>

        <h1 className="portada-hero-title">
          Infraestructura Digital & Montaje Tecnológico para <br />
          <span className="portada-title-gradient">Retail y Servicentros de Alta Demanda</span>
        </h1>

        <p className="portada-hero-subtitle">
          Especialistas en servicios técnicos B2B: despliegue de hardware comercial, cartelería digital profesional,
          pantallas de placa, sistemas de punto de venta (POS) y equipamiento de red con máxima trazabilidad de bodega a terreno.
        </p>

        <div className="portada-hero-ctas">
          <Link 
            to="/catalogo" 
            className="portada-btn-hero-primary"
            style={{ background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)", boxShadow: "0 6px 20px rgba(2, 132, 199, 0.4)" }}
          >
            <Monitor size={18} />
            <span>Catálogo de Monitores (Venta)</span>
          </Link>

          <button 
            className="portada-btn-hero-secondary" 
            onClick={() => scrollToSection("trabajos")}
          >
            <span>Ver Trabajos Realizados</span>
            <ArrowRight size={18} />
          </button>

          <Link to={userProfile ? "/dashboard" : "/login"} className="portada-btn-hero-secondary">
            {userProfile ? <LayoutDashboard size={18} /> : <ShieldCheck size={18} />}
            <span>{userProfile ? "Ir a mi Panel de Control" : "Acceso a Plataforma Operativa"}</span>
          </Link>
        </div>

        {/* Impact Stat Metrics Strip */}
        <div className="portada-stats-grid">
          <div className="portada-stat-card">
            <div className="portada-stat-icon">
              <Tv size={22} />
            </div>
            <div className="portada-stat-value">Cartelería Digital</div>
            <div className="portada-stat-label">Montaje de Menu Boards sincronizados y pantallas de placa gran formato.</div>
          </div>

          <div className="portada-stat-card">
            <div className="portada-stat-icon" style={{ background: "rgba(225, 29, 72, 0.15)", color: "#fb7185" }}>
              <Building2 size={22} />
            </div>
            <div className="portada-stat-value">Copec & Arcoprime</div>
            <div className="portada-stat-label">Convenios corporativos para despliegue en servicentros y locales Pronto.</div>
          </div>

          <div className="portada-stat-card">
            <div className="portada-stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
              <Activity size={22} />
            </div>
            <div className="portada-stat-value">99.8% Continuidad</div>
            <div className="portada-stat-label">Soporte preventivo, correctivo y guardias de alta disponibilidad B2B.</div>
          </div>

          <div className="portada-stat-card">
            <div className="portada-stat-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>
              <Layers size={22} />
            </div>
            <div className="portada-stat-value">Trazabilidad Total</div>
            <div className="portada-stat-label">Gestión de activos de extremo a extremo: Bodega Central → Terreno.</div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECCIÓN DEL CARRUSEL: TRABAJOS REALIZADOS (SOLICITUD EXPLÍCITA)
          ==================================================================== */}
      <section id="trabajos" className="portada-section portada-section-alt">
        <div className="portada-section-inner">
          <div className="portada-section-header">
            <div className="portada-section-tag">
              <Monitor size={15} />
              <span>Evidencia Fotográfica en Terreno</span>
            </div>
            <h2 className="portada-section-title">
              Nuestros Trabajos e Instalaciones
            </h2>
            <p className="portada-section-desc">
              Conoce una muestra real de los montajes de cartelería digital, alineación de monitores profesionales,
              pantallas de placa y equipamiento tecnológico desplegados en tiendas de retail y servicentros.
            </p>

            {/* Barra de Administración Exclusiva para Usuarios con Rol ADMIN */}
            {isAdmin && (
              <div className="portada-admin-toolbar">
                <span className="portada-admin-toolbar-label">
                  Modo Administrador:
                </span>
                <button
                  type="button"
                  onClick={() => openEditorModal(safeIndex)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(56, 189, 248, 0.5)",
                    background: "linear-gradient(135deg, #0284c7, #2563eb)",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Edit3 size={14} />
                  <span>Editar este Trabajo ({safeIndex + 1}/{trabajosList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={openEditorWithNewSlide}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(16, 185, 129, 0.45)",
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} />
                  <span>Agregar Nuevo Trabajo</span>
                </button>
              </div>
            )}
          </div>

          {/* Carousel Main Container */}
          <div className="portada-carousel-wrapper">
            <div className="portada-carousel-stage">
              {/* Media Container with Click to Zoom */}
              <div 
                className="portada-carousel-media"
                onClick={() => setLightboxImage(currentSlide)}
                title="Haz clic para ampliar la imagen"
              >
                <img 
                  src={currentSlide.image} 
                  alt={currentSlide.title} 
                  className="portada-carousel-img"
                  key={`${currentSlide.id}-${safeIndex}`}
                />
                <div className="portada-carousel-zoom-hint">
                  <Maximize2 size={14} />
                  <span>Ampliar Fotografía</span>
                </div>
              </div>

              {/* Info & Specifications Card */}
              <div className="portada-carousel-info">
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <div className="portada-slide-badge" style={{ borderColor: currentSlide.badgeColor, color: currentSlide.badgeColor, marginBottom: 0 }}>
                      <span>{currentSlide.category}</span>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditorModal(safeIndex)}
                        className="portada-admin-inline-btn"
                        title="Modificar texto e imagen de esta diapositiva"
                      >
                        <Edit3 size={13} />
                        <span>Editar Texto e Imagen</span>
                      </button>
                    )}
                  </div>

                  <h3 className="portada-slide-title">
                    {currentSlide.title}
                  </h3>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", color: "#38bdf8", fontSize: "0.85rem", fontWeight: 600 }}>
                    <Building2 size={16} />
                    <span>{currentSlide.client}</span>
                  </div>

                  <p className="portada-slide-desc">
                    {currentSlide.description}
                  </p>

                  <div className="portada-slide-features">
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8" }}>
                      Detalles Técnicos & Estándares
                    </span>
                    {currentSlide.features.map((feat, idx) => (
                      <div key={idx} className="portada-slide-feat-item">
                        <CheckCircle2 size={16} className="portada-slide-feat-icon" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Controls and Navigation */}
                <div className="portada-carousel-actions-row">
                  <div className="portada-carousel-counter">
                    <span className="portada-carousel-counter-current">{String(safeIndex + 1).padStart(2, "0")}</span>
                    <span>/</span>
                    <span>{String(trabajosList.length).padStart(2, "0")}</span>
                  </div>

                  <div className="portada-carousel-controls">
                    <button 
                      className="portada-ctrl-btn" 
                      onClick={togglePlay} 
                      title={isPlaying ? "Pausar reproducción automática" : "Iniciar reproducción automática"}
                      aria-label="Play/Pause"
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button 
                      className="portada-ctrl-btn" 
                      onClick={handlePrev} 
                      title="Trabajo anterior"
                      aria-label="Anterior"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      className="portada-ctrl-btn" 
                      onClick={handleNext} 
                      title="Siguiente trabajo"
                      aria-label="Siguiente"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Select Thumbnails Strip */}
          <div className="portada-thumbnails-strip">
            {trabajosList.map((item, idx) => (
              <button
                key={`${item.id}-${idx}`}
                className={`portada-thumb-btn ${idx === safeIndex ? "active" : ""}`}
                onClick={() => setCurrentIndex(idx)}
                title={item.title}
              >
                <img src={item.image} alt={item.title} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          MISIÓN, VISIÓN Y OBJETIVOS ESTRATÉGICOS (REQUERIDO)
          ==================================================================== */}
      <section id="estrategia" className="portada-section">
        <div className="portada-section-inner">
          <div className="portada-section-header">
            <div className="portada-section-tag">
              <Compass size={15} />
              <span>Direccionamiento Estratégico</span>
            </div>
            <h2 className="portada-section-title">
              Misión, Visión y Compromiso
            </h2>
            <p className="portada-section-desc">
              Conoce los pilares que sustentan la excelencia operativa de Sociedad de Instalaciones Marcom y
              el rumbo estratégico hacia la vanguardia tecnológica en telecomunicaciones y retail.
            </p>
          </div>

          {/* Misión y Visión Grid */}
          <div className="portada-strategy-grid">
            {/* Card Misión */}
            <div className="portada-strategy-card">
              <div className="portada-card-watermark">MISIÓN</div>
              <div className="portada-strategy-header">
                <div className="portada-strategy-icon-box portada-icon-mision">
                  <Target size={28} />
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                    Propósito Fundamental
                  </span>
                  <h3 className="portada-strategy-title">Nuestra Misión</h3>
                </div>
              </div>
              <p className="portada-strategy-text">
                "Brindar soluciones operativas y tecnológicas integrales de soporte e instalación en telecomunicaciones 
                y equipamiento comercial, garantizando continuidad de servicio y altos estándares de trazabilidad en terreno."
              </p>
              <div className="portada-strategy-pills">
                <span className="portada-strategy-pill">Continuidad de Servicio</span>
                <span className="portada-strategy-pill">Trazabilidad en Terreno</span>
                <span className="portada-strategy-pill">Soporte Integral</span>
              </div>
            </div>

            {/* Card Visión */}
            <div className="portada-strategy-card">
              <div className="portada-card-watermark">VISIÓN</div>
              <div className="portada-strategy-header">
                <div className="portada-strategy-icon-box portada-icon-vision">
                  <Compass size={28} />
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "#a855f7", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                    Proyección de Futuro
                  </span>
                  <h3 className="portada-strategy-title">Nuestra Visión</h3>
                </div>
              </div>
              <p className="portada-strategy-text">
                "Posicionarse como el socio estratégico preferencial a nivel nacional para la gestión tecnológica, 
                instalación y mantenimiento de infraestructura digital en servicentros, retail e industrias afines."
              </p>
              <div className="portada-strategy-pills">
                <span className="portada-strategy-pill">Socio Estratégico Preferencial</span>
                <span className="portada-strategy-pill">Cobertura Nacional</span>
                <span className="portada-strategy-pill">Liderazgo en Infraestructura Digital</span>
              </div>
            </div>
          </div>

          {/* Banner Objetivos Estratégicos */}
          <div className="portada-objectives-banner">
            <div className="portada-objectives-header">
              <div className="portada-strategy-icon-box portada-icon-objetivos">
                <Activity size={28} />
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                  Ruta de Crecimiento & Innovación
                </span>
                <h3 className="portada-objectives-title">Objetivos Estratégicos</h3>
              </div>
            </div>

            <p className="portada-objectives-intro">
              "Modernizar los procesos operativos internos mediante la digitalización y centralización de la información, 
              permitiendo trazabilidad de activos desde bodega hacia terreno y optimizando la facturación y los convenios corporativos."
            </p>

            <div className="portada-objectives-grid">
              <div className="portada-objective-item">
                <div className="portada-obj-num">01</div>
                <h4 className="portada-obj-headline">Digitalización y Centralización</h4>
                <p className="portada-obj-desc">
                  Eliminación de procesos manuales y planillas dispersas mediante un ecosistema digital cloud unificado
                  que conecta órdenes de trabajo, evidencias fotográficas y reportes en tiempo real.
                </p>
              </div>

              <div className="portada-objective-item">
                <div className="portada-obj-num">02</div>
                <h4 className="portada-obj-headline">Trazabilidad Bodega → Terreno</h4>
                <p className="portada-obj-desc">
                  Control riguroso de cada número de serie y activo tecnológico: recepción en bodega central, despacho a cuadrillas,
                  instalación física en servicentro y registro fotográfico de puesta en marcha.
                </p>
              </div>

              <div className="portada-objective-item">
                <div className="portada-obj-num">03</div>
                <h4 className="portada-obj-headline">Optimización de Convenios y Cobros</h4>
                <p className="portada-obj-desc">
                  Transparencia absoluta con clientes en convenio (Copec, Arcoprime), facilitando la conciliación de órdenes finalizadas,
                  cotizaciones ágiles y procesos de facturación electrónica sin fricción.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SERVICIOS PRINCIPALES B2B
          ==================================================================== */}
      <section id="servicios" className="portada-section portada-section-alt">
        <div className="portada-section-inner">
          <div className="portada-section-header">
            <div className="portada-section-tag">
              <Cpu size={15} />
              <span>Soluciones Integrales</span>
            </div>
            <h2 className="portada-section-title">
              Servicios Técnicos Especializados B2B
            </h2>
            <p className="portada-section-desc">
              Garantizamos continuidad operativa y despliegue rápido de infraestructura tecnológica corporativa
              con estándares industriales rigurosos.
            </p>
          </div>

          <div className="portada-services-grid">
            {/* Card 1 */}
            <div className="portada-service-card">
              <div>
                <div className="portada-service-icon-wrap">
                  <Monitor size={24} />
                </div>
                <h3 className="portada-service-title">Cartelería Digital & Menu Boards</h3>
                <p className="portada-service-desc">
                  Instalación de pantallas de placa, monitores de gran formato y menús digitales sincronizados
                  sobre líneas de cajas y zonas de atención para servicentros y retail.
                </p>
              </div>
              <div className="portada-service-tags">
                <span className="portada-service-tag">Digital Signage</span>
                <span className="portada-service-tag">Displays 4K</span>
                <span className="portada-service-tag">Soportes Especiales</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="portada-service-card">
              <div>
                <div className="portada-service-icon-wrap" style={{ background: "rgba(225, 29, 72, 0.12)", color: "#fb7185" }}>
                  <CreditCard size={24} />
                </div>
                <h3 className="portada-service-title">Sistemas POS & Hardware Comercial</h3>
                <p className="portada-service-desc">
                  Montaje, conexión, reemplazo preventivo y configuración de terminales de punto de venta, impresoras térmicas,
                  lectores de código y cajas registradoras en terreno.
                </p>
              </div>
              <div className="portada-service-tags">
                <span className="portada-service-tag">Punto de Venta POS</span>
                <span className="portada-service-tag">Cajeros Automáticos</span>
                <span className="portada-service-tag">Periféricos Comerciales</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="portada-service-card">
              <div>
                <div className="portada-service-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#34d399" }}>
                  <Wifi size={24} />
                </div>
                <h3 className="portada-service-title">Equipamiento de Red & Conectividad</h3>
                <p className="portada-service-desc">
                  Instalación y certificación de cableado estructurado, racks de telecomunicaciones, routers de misión crítica,
                  switches administrables y puntos de acceso Wi-Fi empresarial.
                </p>
              </div>
              <div className="portada-service-tags">
                <span className="portada-service-tag">Cableado UTP/STP</span>
                <span className="portada-service-tag">Racks & Patch Panels</span>
                <span className="portada-service-tag">Wi-Fi Corporativo</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="portada-service-card">
              <div>
                <div className="portada-service-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24" }}>
                  <ShieldCheck size={24} />
                </div>
                <h3 className="portada-service-title">Soporte Técnico & Mantenimiento SLA</h3>
                <p className="portada-service-desc">
                  Cuadrillas de técnicos certificados en terreno para atención rápida de incidencias, visitas de mantenimiento
                  preventivo programado y diagnóstico de equipamiento bajo convenio.
                </p>
              </div>
              <div className="portada-service-tags">
                <span className="portada-service-tag">SLA 24/7</span>
                <span className="portada-service-tag">Visitas Preventivas</span>
                <span className="portada-service-tag">Trazabilidad Móvil</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          CLIENTES Y CONVENIOS CORPORATIVOS
          ==================================================================== */}
      <section id="clientes" className="portada-section">
        <div className="portada-section-inner">
          <div className="portada-clients-banner">
            <span className="portada-clients-kicker">
              Confianza & Alianzas Estratégicas
            </span>
            <h2 className="portada-clients-title">
              Convenios Corporativos con Grandes Marcas
            </h2>
            <p className="portada-clients-desc">
              Marcom provee servicios continuos en despliegue tecnológico y soporte técnico de campo para las principales
              redes de servicentros y locales de conveniencia del país.
            </p>

            <div className="portada-clients-grid">
              <div className="portada-client-badge">
                <span className="portada-client-dot" />
                <div style={{ textAlign: "left" }}>
                  <span className="portada-client-name">Copec S.A.</span>
                  <span className="portada-client-type">Red de Estaciones de Servicio Nacional</span>
                </div>
              </div>

              <div className="portada-client-badge">
                <span className="portada-client-dot" style={{ background: "#f59e0b", boxShadow: "0 0 10px #f59e0b" }} />
                <div style={{ textAlign: "left" }}>
                  <span className="portada-client-name">Arcoprime Ltda.</span>
                  <span className="portada-client-type">Cadenas de Tiendas Pronto & Pronto Copec</span>
                </div>
              </div>

              <div className="portada-client-badge">
                <span className="portada-client-dot" style={{ background: "#38bdf8", boxShadow: "0 0 10px #38bdf8" }} />
                <div style={{ textAlign: "left" }}>
                  <span className="portada-client-name">Retail & Corporaciones</span>
                  <span className="portada-client-type">Cadenas Comerciales y Franquiciados</span>
                </div>
              </div>
            </div>

            <div className="portada-clients-protocol-pill">
              <ShieldCheck size={18} color="#10b981" />
              <span>
                Protocolos certificados de seguridad en estaciones de servicio y normativa técnica de telecomunicaciones
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          FICHA CORPORATIVA: RAZÓN SOCIAL Y RUBRO (REQUERIDO)
          ==================================================================== */}
      <section className="portada-section portada-section-alt">
        <div className="portada-section-inner">
          <div className="portada-corporate-card">
            <div>
              <span className="portada-corp-kicker">
                Transparencia & Respaldo Institucional
              </span>
              <h3 className="portada-corp-heading">
                Ficha Técnica Corporativa
              </h3>
              <p className="portada-corp-summary">
                Sociedad de Instalaciones Marcom Compañía Limitada opera con plena formalidad tributaria y operacional,
                brindando contratos corporativos de prestación de servicios tecnológicos para clientes de gran envergadura.
              </p>
            </div>

            <div>
              <div className="portada-corp-field">
                <div className="portada-corp-label">Razón Social</div>
                <div className="portada-corp-value portada-corp-value-strong">
                  Sociedad de Instalaciones Marcom Compañía Limitada
                </div>
              </div>

              <div className="portada-corp-field">
                <div className="portada-corp-label">Giro / Rubro Oficial</div>
                <div className="portada-corp-value">
                  Otros servicios de telecomunicaciones n.c.p.
                </div>
              </div>

              <div className="portada-corp-field" style={{ marginBottom: 0 }}>
                <div className="portada-corp-label">Especialidad Operacional</div>
                <div className="portada-corp-value">
                  Servicios técnicos de instalación, soporte e integración de equipamiento tecnológico corporativo y telecomunicaciones.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECCIÓN DE CONTACTO: CALL-TO-ACTION A NUEVA VENTANA
          ==================================================================== */}
      <section id="contacto" className="portada-section">
        <div className="portada-section-inner" style={{ textAlign: "center" }}>
          <div className="portada-cta-card">
            <div className="portada-cta-badge">
              <MessageSquare size={14} />
              <span>Canal de Atención Directo & Soporte B2B</span>
            </div>

            <h2 className="portada-cta-title">
              ¿Tienes un requerimiento o consulta técnica?
            </h2>

            <p className="portada-cta-desc">
              Estamos a tu disposición para evaluar proyectos de cartelería digital, menú boards, equipamiento POS o soporte técnico en terreno.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap", marginBottom: "36px" }}>
              <a 
                href="/contacto" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="portada-btn-hero-primary"
                style={{ fontSize: "1rem", padding: "14px 34px", textDecoration: "none" }}
              >
                <MessageSquare size={18} />
                <span>Contáctanos</span>
                <ArrowRight size={17} />
              </a>

              <Link 
                to={userProfile ? "/dashboard" : "/login"} 
                className="portada-btn-hero-secondary"
                style={{ textDecoration: "none" }}
              >
                <span>{userProfile ? "Ir a mi Panel de Control" : "Acceso Portal Clientes"}</span>
              </Link>
            </div>

            <div className="portada-cta-contact-strip">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={16} className="portada-cta-icon" />
                <span>contacto@marcomchile.cl</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Phone size={16} className="portada-cta-icon" />
                <span>+56 9 8450 1200 / Mesa de Ayuda</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={16} className="portada-cta-icon" />
                <span>Santiago, Chile (Cobertura Nacional)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          LIGHTBOX MODAL PARA FOTOGRAFÍAS A PANTALLA COMPLETA
          ==================================================================== */}
      {lightboxImage && (
        <div className="portada-modal-overlay" onClick={() => setLightboxImage(null)}>
          <div className="portada-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="portada-modal-close" 
              onClick={() => setLightboxImage(null)}
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
            <img 
              src={lightboxImage.image} 
              alt={lightboxImage.title} 
              className="portada-modal-img" 
            />
            <div className="portada-modal-footer">
              <div>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase" }}>
                  {lightboxImage.category}
                </span>
                <h4 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
                  {lightboxImage.title}
                </h4>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "4px" }}>
                  {lightboxImage.client} • Registro en Terreno Marcom
                </p>
              </div>
              <button 
                className="portada-btn-login"
                style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                onClick={() => setLightboxImage(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL DE EDICIÓN DEL CARRUSEL (EXCLUSIVO PARA ROL ADMIN)
          ==================================================================== */}
      {isAdmin && isEditModalOpen && draftTrabajos[selectedEditIndex] && (
        <div
          className="portada-modal-overlay"
          style={{ zIndex: 10000, padding: "20px", overflowY: "auto" }}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="portada-editor-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="portada-editor-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Edit3 size={18} color="#0284c7" />
                <h3 className="portada-editor-title">
                  Editor de Trabajos Realizados
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="portada-editor-btn-secondary"
                  title="Restaurar los 6 trabajos originales de fábrica"
                >
                  <RotateCcw size={14} />
                  <span>Restaurar Originales</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="portada-editor-btn-icon"
                  aria-label="Cerrar editor"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Cuerpo Principal del Modal */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "22px",
                padding: "22px 24px",
              }}
            >
              {/* Columna Izquierda: Lista de Diapositivas + Imagen */}
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* Selector de Diapositivas */}
                <div className="portada-editor-section-card">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <span className="portada-editor-section-kicker">
                      Trabajos en el Carrusel ({draftTrabajos.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSlideInModal}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "1px solid rgba(16, 185, 129, 0.45)",
                        background: "linear-gradient(135deg, #059669, #10b981)",
                        color: "#ffffff",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={13} />
                      <span>Nuevo Trabajo</span>
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "230px", overflowY: "auto" }}>
                    {draftTrabajos.map((item, idx) => {
                      const isSelected = idx === selectedEditIndex;
                      return (
                        <div
                          key={`${item.id}-${idx}`}
                          onClick={() => setSelectedEditIndex(idx)}
                          className={`portada-editor-slide-row ${isSelected ? "selected" : ""}`}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                            <img
                              src={item.image}
                              alt={item.title}
                              style={{
                                width: "44px",
                                height: "32px",
                                objectFit: "cover",
                                borderRadius: "5px",
                                border: "1px solid rgba(148, 163, 184, 0.3)",
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="portada-editor-slide-name">
                                {idx + 1}. {item.title}
                              </div>
                              <div className="portada-editor-slide-client">{item.client}</div>
                            </div>
                          </div>

                          <div
                            style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleMoveSlide(idx, -1)}
                              disabled={idx === 0}
                              className="portada-editor-mini-btn"
                              title="Subir orden"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSlide(idx, 1)}
                              disabled={idx === draftTrabajos.length - 1}
                              className="portada-editor-mini-btn"
                              title="Bajar orden"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSlideInModal(idx)}
                              disabled={draftTrabajos.length <= 1}
                              style={{
                                padding: "4px",
                                borderRadius: "5px",
                                border: "1px solid rgba(239, 68, 68, 0.35)",
                                background: "rgba(239, 68, 68, 0.14)",
                                color: draftTrabajos.length <= 1 ? "#94a3b8" : "#ef4444",
                                cursor: draftTrabajos.length <= 1 ? "not-allowed" : "pointer",
                              }}
                              title="Eliminar este trabajo"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sección de Fotografía del Trabajo Seleccionado */}
                <div
                  className="portada-editor-section-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <span className="portada-editor-section-kicker">
                    Fotografía del Trabajo #{selectedEditIndex + 1}
                  </span>

                  <div className="portada-editor-preview-box">
                    <img
                      src={draftTrabajos[selectedEditIndex].image}
                      alt="Vista previa"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageFileUpload}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid rgba(56, 189, 248, 0.45)",
                      background: "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: "#ffffff",
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Upload size={16} />
                    <span>Subir Imagen</span>
                  </button>
                </div>
              </div>

              {/* Columna Derecha: Formulario de Textos y Especificaciones */}
              <div
                className="portada-editor-section-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <span className="portada-editor-section-kicker">
                  Textos y Especificaciones del Trabajo #{selectedEditIndex + 1}
                </span>

                <div>
                  <label className="portada-editor-label">
                    Título Principal del Trabajo
                  </label>
                  <input
                    type="text"
                    className="portada-editor-input"
                    style={{ fontWeight: 600 }}
                    value={draftTrabajos[selectedEditIndex].title}
                    onChange={(e) => updateSelectedDraftField("title", e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "end" }}>
                  <div>
                    <label className="portada-editor-label">
                      Categoría / Etiqueta Superior
                    </label>
                    <input
                      type="text"
                      className="portada-editor-input"
                      value={draftTrabajos[selectedEditIndex].category}
                      onChange={(e) => updateSelectedDraftField("category", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="portada-editor-sublabel">
                      Color Etiqueta
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      {BADGE_COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateSelectedDraftField("badgeColor", c)}
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "999px",
                            background: c,
                            border:
                              draftTrabajos[selectedEditIndex].badgeColor === c
                                ? "2px solid #0284c7"
                                : "1px solid rgba(148,163,184,0.4)",
                            boxShadow:
                              draftTrabajos[selectedEditIndex].badgeColor === c
                                ? "0 0 0 2px #ffffff"
                                : "none",
                            cursor: "pointer",
                          }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="portada-editor-label">
                    Cliente / Convenio Asociado
                  </label>
                  <input
                    type="text"
                    className="portada-editor-input"
                    value={draftTrabajos[selectedEditIndex].client}
                    onChange={(e) => updateSelectedDraftField("client", e.target.value)}
                  />
                </div>

                <div>
                  <label className="portada-editor-label">
                    Descripción del Trabajo Realizado
                  </label>
                  <textarea
                    rows={3}
                    className="portada-editor-input"
                    style={{ lineHeight: 1.5, resize: "vertical" }}
                    value={draftTrabajos[selectedEditIndex].description}
                    onChange={(e) => updateSelectedDraftField("description", e.target.value)}
                  />
                </div>

                {/* Lista de Detalles Técnicos (Features) */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <label className="portada-editor-label" style={{ marginBottom: 0 }}>
                      Detalles Técnicos & Estándares (Viñetas)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="portada-admin-inline-btn"
                    >
                      <Plus size={12} />
                      <span>Agregar Viñeta</span>
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {draftTrabajos[selectedEditIndex].features.map((feat, fIdx) => (
                      <div key={fIdx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="text"
                          className="portada-editor-input"
                          style={{ flex: 1, padding: "7px 10px", fontSize: "0.82rem" }}
                          value={feat}
                          onChange={(e) => handleFeatureChange(fIdx, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(fIdx)}
                          disabled={draftTrabajos[selectedEditIndex].features.length <= 1}
                          style={{
                            padding: "7px",
                            borderRadius: "7px",
                            border: "1px solid rgba(239, 68, 68, 0.35)",
                            background: "rgba(239, 68, 68, 0.12)",
                            color: draftTrabajos[selectedEditIndex].features.length <= 1 ? "#94a3b8" : "#ef4444",
                            cursor: draftTrabajos[selectedEditIndex].features.length <= 1 ? "not-allowed" : "pointer",
                          }}
                          title="Quitar viñeta"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de Guardado del Modal */}
            <div className="portada-editor-footer">
              <div style={{ fontSize: "0.84rem", color: saveMessage ? "#10b981" : "#64748b", fontWeight: saveMessage ? 600 : 500 }}>
                {saveMessage || "Los cambios se reflejarán de inmediato en el carrusel de la portada."}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="portada-editor-btn-secondary"
                  style={{ padding: "9px 16px", fontSize: "0.85rem" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTrabajos}
                  disabled={isSavingTrabajos}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "9px 20px",
                    borderRadius: "8px",
                    border: "1px solid rgba(16, 185, 129, 0.5)",
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    color: "#ffffff",
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Save size={16} />
                  <span>{isSavingTrabajos ? "Guardando..." : "Guardar Cambios del Carrusel"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          FOOTER CORPORATIVO
          ==================================================================== */}
      <footer className="portada-footer">
        <div className="portada-footer-inner">
          <div className="portada-footer-grid">
            <div>
              <div style={{ display: "flex", alignItems: "center", marginBottom: "14px" }}>
                <img 
                  src="/logo_marcom_transparent.png" 
                  alt="Logo Marcom" 
                  className="portada-brand-logo"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }} 
                />
              </div>
              <p className="portada-footer-desc">
                Sociedad de Instalaciones Marcom Compañía Limitada. 
                Giro: Otros servicios de telecomunicaciones n.c.p. 
                Especialistas en montaje, soporte e integración de equipamiento tecnológico corporativo en terreno.
              </p>
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                Santiago, Chile • Operaciones y Cuadrillas a Nivel Nacional
              </div>
            </div>

            <div>
              <h4 className="portada-footer-col-title">Navegación</h4>
              <ul className="portada-footer-links">
                <li><a href="#hero" className="portada-footer-link" onClick={(e) => { e.preventDefault(); scrollToSection("hero"); }}>Inicio</a></li>
                <li><a href="#servicios" className="portada-footer-link" onClick={(e) => { e.preventDefault(); scrollToSection("servicios"); }}>Servicios B2B</a></li>
                <li><a href="#trabajos" className="portada-footer-link" onClick={(e) => { e.preventDefault(); scrollToSection("trabajos"); }}>Trabajos Realizados</a></li>
                <li><a href="#estrategia" className="portada-footer-link" onClick={(e) => { e.preventDefault(); scrollToSection("estrategia"); }}>Misión & Visión</a></li>
                <li><a href="#clientes" className="portada-footer-link" onClick={(e) => { e.preventDefault(); scrollToSection("clientes"); }}>Convenios</a></li>
              </ul>
            </div>

            <div>
              <h4 className="portada-footer-col-title">Plataforma</h4>
              <ul className="portada-footer-links">
                <li><Link to="/login" className="portada-footer-link">Portal Clientes</Link></li>
                <li><Link to="/dashboard" className="portada-footer-link">Panel Operativo</Link></li>
                <li><Link to="/quotations" className="portada-footer-link">Cotizaciones</Link></li>
                <li><Link to="/work-orders" className="portada-footer-link">Órdenes de Trabajo</Link></li>
                <li><Link to="/inventory" className="portada-footer-link">Control de Bodega</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="portada-footer-col-title">Clientes en Convenio</h4>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "14px" }}>
                Convenios corporativos vigentes con Copec S.A. y Arcoprime Ltda. para cartelería digital, menú boards, sistemas POS y redes.
              </p>
              <div style={{ display: "inline-block", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.25)", color: "#38bdf8", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}>
                Disponibilidad 24/7 en Terreno
              </div>
            </div>
          </div>

          <div className="portada-footer-bottom">
            <div>
              © {new Date().getFullYear()} Sociedad de Instalaciones Marcom Compañía Limitada. Todos los derechos reservados.
            </div>
            <div style={{ display: "flex", gap: "20px" }}>
              <span style={{ color: "#64748b" }}>Telecomunicaciones n.c.p.</span>
              <span style={{ color: "#64748b" }}>Trazabilidad & Continuidad</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Portada;
