import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Monitor,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
  Info,
  Sparkles,
  RotateCcw,
  ShoppingCart,
  Wrench,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Printer,
  ChevronRight,
  Building,
  Check,
  TrendingUp,
  Tv,
  AlertTriangle
} from "lucide-react";
import { type MonitorProduct, formatCLP, UF_CURRENT_VALUE } from "../data/monitoresCatalog";
import { getMonitores } from "../services/monitoresService";
import { recordSalesOrder } from "../services/salesService";
import type { Usuario } from "../services/auth";
import {
  generateCommerceOrder,
  requestFlowOrder,
  type CustomerData,
  type FlowPaymentOrder
} from "../services/flowService";
import "./Catalog.css";

// Definición de tipos de soporte VESA comercial
export interface SupportOption {
  id: string;
  name: string;
  description: string;
  price: number;
}

export const SUPPORT_OPTIONS: SupportOption[] = [
  {
    id: "none",
    name: "Sin soporte adicional",
    description: "Solo monitor con sus anclajes VESA de fábrica",
    price: 0
  },
  {
    id: "fixed",
    name: "Soporte Muro Fijo Heavy Duty VESA",
    description: "Acero reforzado de bajo perfil (soporta hasta 50 kg)",
    price: 24990
  },
  {
    id: "articulated",
    name: "Soporte Muro Articulado Doble Brazo VESA",
    description: "Giro 180°, inclinación +/-15° y extensión hasta 45 cm",
    price: 38990
  }
];

export interface CartItem {
  cartId: string;
  product: MonitorProduct;
  support: SupportOption;
  quantity: number;
  totalUnitPrice: number;
}

export const Catalog: React.FC = () => {
  const navigate = useNavigate();

  // Filtros de estado
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInches, setSelectedInches] = useState<string>("all");
  const [selectedResolution, setSelectedResolution] = useState<string>("all");
  const [selectedBrightness, setSelectedBrightness] = useState<string>("all");
  const [selectedOperation, setSelectedOperation] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("price-asc");

  // Modal de Detalle Técnico
  const [activeModalProduct, setActiveModalProduct] = useState<MonitorProduct | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // Estados de imagen activa en tarjetas (para switcher rápido)
  const [cardActiveImages, setCardActiveImages] = useState<Record<string, number>>({});

  // Carrito de Compras (persistencia en localStorage)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("marcom_cart_items");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modal selector de soporte antes de añadir al carrito
  const [supportModalProduct, setSupportModalProduct] = useState<MonitorProduct | null>(null);
  const [selectedSupportId, setSelectedSupportId] = useState<string>("none");
  const [supportQuantity, setSupportQuantity] = useState<number>(1);

  // Flujo de Checkout con Pasarela Flow
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<FlowPaymentOrder | null>(null);

  // Datos del comprador para Flow
  const [customerData, setCustomerData] = useState<CustomerData>({
    nombre: "",
    rut: "",
    email: "",
    telefono: "",
    direccion: "",
    comuna: "",
    region: "Región Metropolitana",
    tipoDocumento: "BOLETA",
    razonSocial: "",
    rutEmpresa: "",
    giroEmpresa: ""
  });
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Catálogo dinámico administrable
  const [monitoresList, setMonitoresList] = useState<MonitorProduct[]>(() => getMonitores());

  // Sesión y control de permisos de compra
  const currentUser: Usuario | null = useMemo(() => {
    try {
      const raw = localStorage.getItem("marcom_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Regla comercial de Marcom:
  // - Usuarios no registrados (!currentUser): PUEDEN COMPRAR
  // - Usuarios de convenio standard (rol CLIENTE_ESTANDAR): PUEDEN COMPRAR
  // - Administradores (rol ADMIN): PUEDEN COMPRAR
  // - Clientes con convenio corporativo (CLIENTE_CONVENIO): Deben cotizar vía OC o ejecutivo
  const canPurchaseDirectly = useMemo(() => {
    if (!currentUser) return true;
    if (currentUser.rol === "CLIENTE_ESTANDAR") return true;
    if (currentUser.rol === "ADMIN") return true;
    return false;
  }, [currentUser]);

  const [isCorporateRestrictionModalOpen, setIsCorporateRestrictionModalOpen] = useState(false);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    try {
      localStorage.setItem("marcom_cart_items", JSON.stringify(cartItems));
    } catch (e) {
      console.warn("Error guardando carrito:", e);
    }
  }, [cartItems]);

  // Sincronizar catálogo dinámico si el admin hizo cambios
  useEffect(() => {
    setMonitoresList(getMonitores());
  }, []);

  // Detectar y confirmar pago exitoso retornado desde Flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status");
    const orderParam = params.get("order") || localStorage.getItem("marcom_last_order");
    const tokenParam = params.get("token");

    if (statusParam === "exito") {
      // Limpiar el carrito de compras
      setCartItems([]);
      localStorage.removeItem("marcom_cart_items");

      let cust = customerData;
      const savedCust = localStorage.getItem("marcom_last_customer");
      if (savedCust) {
        try {
          cust = JSON.parse(savedCust);
        } catch (_) {}
      }

      const savedAmount = Number(localStorage.getItem("marcom_last_amount")) || 234990;
      const orderCode = orderParam || "MC-ORD-FLOW";
      const authCode = `FLW-${Math.floor(100000 + Math.random() * 900000)}`;
      const dteNumber = Math.floor(1000 + Math.random() * 9000);

      const completedOrderData: FlowPaymentOrder = {
        orderId: orderCode,
        token: tokenParam || "FLOW-TOKEN-AUTH",
        amount: savedAmount,
        items: [],
        customer: cust,
        createdAt: new Date().toLocaleDateString("es-CL"),
        paymentMethod: "FLOW",
        status: "APROBADO",
        authorizationCode: authCode,
        dteFolio: dteNumber
      };

      setCompletedOrder(completedOrderData);
      setIsCheckoutOpen(true);

      // Registrar venta en Control de Ventas para métricas del Administrador
      recordSalesOrder({
        orderId: orderCode,
        createdAt: new Date().toISOString(),
        dateFormatted: new Date().toLocaleString("es-CL"),
        customer: cust,
        items: [
          {
            model: "Samsung Monitor Reacondicionado",
            inchesLabel: "43''",
            supportName: "Soporte VESA",
            quantity: 1,
            unitPrice: savedAmount,
            totalPrice: savedAmount
          }
        ],
        totalCLP: savedAmount,
        totalUF: parseFloat((savedAmount / UF_CURRENT_VALUE).toFixed(1)),
        paymentGateway: "Flow",
        flowToken: tokenParam || "FLOW-TOKEN-AUTH",
        authorizationCode: authCode,
        dteFolio: dteNumber,
        status: "APROBADO"
      });

      // Limpiar los parámetros de la URL sin recargar la página
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCardImageSelect = (id: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCardActiveImages((prev) => ({ ...prev, [id]: index }));
  };

  // Apertura y cierre de modales
  const openModal = (product: MonitorProduct) => {
    setActiveModalProduct(product);
    setModalImageIndex(0);
  };

  const closeModal = () => {
    setActiveModalProduct(null);
  };

  // Redirección directa a Cotización con Instalación
  const handleCotizarConInstalacion = (product: MonitorProduct) => {
    const params = new URLSearchParams({
      modelo: product.model,
      pulgadas: product.inchesLabel,
      instalacion: "true"
    });
    navigate(`/contacto?${params.toString()}`);
  };

  // Apertura del modal selector de soporte
  const handleOpenSupportModal = (product: MonitorProduct, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSupportModalProduct(product);
    setSelectedSupportId("none");
    setSupportQuantity(1);
  };

  const handleConfirmAddToCart = () => {
    if (!supportModalProduct) return;

    const support = SUPPORT_OPTIONS.find((s) => s.id === selectedSupportId) || SUPPORT_OPTIONS[0];
    const cartId = `${supportModalProduct.id}-${support.id}`;
    const totalUnitPrice = supportModalProduct.marketPriceCLP + support.price;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.cartId === cartId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += supportQuantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            cartId,
            product: supportModalProduct,
            support,
            quantity: supportQuantity,
            totalUnitPrice
          }
        ];
      }
    });

    setSupportModalProduct(null);
    setIsCartOpen(true);
  };

  // Modificar cantidades en el carrito
  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (cartId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  // Totales financieros del carrito
  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const totalBrutoCLP = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.totalUnitPrice * item.quantity, 0);
  }, [cartItems]);

  const totalNetoCLP = useMemo(() => {
    return Math.round(totalBrutoCLP / 1.19);
  }, [totalBrutoCLP]);

  const totalIvaCLP = useMemo(() => {
    return totalBrutoCLP - totalNetoCLP;
  }, [totalBrutoCLP, totalNetoCLP]);

  const totalUF = useMemo(() => {
    return (totalBrutoCLP / UF_CURRENT_VALUE).toFixed(1);
  }, [totalBrutoCLP]);

  // Reset de filtros
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedInches("all");
    setSelectedResolution("all");
    setSelectedBrightness("all");
    setSelectedOperation("all");
    setSortBy("price-asc");
  };

  // Filtrado y ordenamiento
  const filteredMonitors = useMemo(() => {
    return monitoresList.filter((item) => {
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const matchesModel = item.model.toLowerCase().includes(query);
        const matchesBrand = item.brand.toLowerCase().includes(query);
        const matchesRes = item.resolution.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesFeatures = item.specialFeatures.some((f) => f.toLowerCase().includes(query));
        if (!matchesModel && !matchesBrand && !matchesRes && !matchesDesc && !matchesFeatures) {
          return false;
        }
      }

      if (selectedInches !== "all") {
        if (selectedInches === "10" && item.inches > 15) return false;
        if (selectedInches === "32" && item.inches !== 32) return false;
        if (selectedInches === "37" && item.inches !== 37) return false;
        if (selectedInches === "43" && item.inches !== 43) return false;
        if (selectedInches === "49" && item.inches !== 49) return false;
      }

      if (selectedResolution !== "all" && item.resolutionType !== selectedResolution) {
        return false;
      }

      if (selectedBrightness !== "all") {
        const b = parseInt(selectedBrightness, 10);
        if (item.brightnessNits !== b) return false;
      }

      if (selectedOperation !== "all" && item.operationHours !== selectedOperation) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "price-asc") return a.marketPriceCLP - b.marketPriceCLP;
      if (sortBy === "price-desc") return b.marketPriceCLP - a.marketPriceCLP;
      if (sortBy === "size-asc") return a.inches - b.inches;
      if (sortBy === "size-desc") return b.inches - a.inches;
      if (sortBy === "brightness-desc") return b.brightnessNits - a.brightnessNits;
      return 0;
    });
  }, [monitoresList, searchTerm, selectedInches, selectedResolution, selectedBrightness, selectedOperation, sortBy]);

  // Procesar Pago con Flow oficial
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerData.nombre.trim() || !customerData.rut.trim() || !customerData.email.trim() || !customerData.direccion.trim()) {
      setCheckoutError("Por favor completa los campos obligatorios del comprador.");
      return;
    }

    if (customerData.tipoDocumento === "FACTURA" && (!customerData.rutEmpresa || !customerData.razonSocial)) {
      setCheckoutError("Para emitir Factura Electrónica debes ingresar el RUT de la empresa y Razón Social.");
      return;
    }

    setCheckoutError(null);
    setIsProcessingPayment(true);

    try {
      const commerceOrder = generateCommerceOrder();
      const orderItems = cartItems.map((item) => ({
        model: `Samsung ${item.product.model}`,
        inchesLabel: item.product.inchesLabel,
        supportName: item.support.name,
        quantity: item.quantity,
        unitPrice: item.totalUnitPrice,
        totalPrice: item.totalUnitPrice * item.quantity
      }));

      // Llamada a la pasarela Flow a través de nuestro Gateway/Billing service
      const flowRes = await requestFlowOrder({
        commerceOrder,
        amount: totalBrutoCLP,
        subject: `Compra Monitores Marcom (${cartItems.map(i => i.product.model).join(", ")})`,
        email: customerData.email,
        items: orderItems,
        customer: customerData
      });

      if (flowRes && flowRes.success && flowRes.redirectUrl) {
        // Guardar datos temporales para restaurar en comprobante
        localStorage.setItem("marcom_last_customer", JSON.stringify(customerData));
        localStorage.setItem("marcom_last_amount", String(totalBrutoCLP));
        localStorage.setItem("marcom_last_order", commerceOrder);

        // REDIRECCIÓN DIRECTA A LA PÁGINA OFICIAL DE PAGO DE FLOW
        setIsProcessingPayment(false);
        window.location.href = flowRes.redirectUrl;
        return;
      }

      // Si Flow responde con error
      setIsProcessingPayment(false);
      setCheckoutError(flowRes?.error || flowRes?.message || "Error al conectar con la pasarela Flow. Intenta nuevamente.");
    } catch (err: any) {
      console.error("Error al procesar pago Flow:", err);
      setIsProcessingPayment(false);
      setCheckoutError(err.message || "Error al procesar la solicitud con el servidor de pagos. Revisa tu conexión.");
    }
  };

  return (
    <div className="catalog-page">
      {/* HEADER DE NAVEGACIÓN */}
      <header className="catalog-header">
        <div className="catalog-header-container">
          <Link to="/" className="catalog-logo-wrap">
            <img src="/logo_marcom.png" alt="Marcom Logo" className="catalog-logo-img" />
            <div className="catalog-logo-text">
              <span className="catalog-logo-title">MARCOM SpA</span>
              <span className="catalog-logo-sub">Catálogo de Equipamiento</span>
            </div>
          </Link>

          <div className="catalog-nav-actions">
            {currentUser?.rol === "ADMIN" && (
              <>
                <Link
                  to="/admin/monitores"
                  className="catalog-btn-secondary"
                  style={{ borderColor: "rgba(168, 85, 247, 0.4)", color: "#c084fc" }}
                  title="Panel de Administración y CRUD de Monitores"
                >
                  <Tv size={16} /> Gestión Monitores
                </Link>
                <Link
                  to="/ventas"
                  className="catalog-btn-secondary"
                  style={{ borderColor: "rgba(34, 197, 94, 0.4)", color: "#4ade80" }}
                  title="Panel de Control y Métricas de Ventas"
                >
                  <TrendingUp size={16} /> Control Ventas
                </Link>
              </>
            )}

            <Link to="/" className="catalog-btn-secondary">
              <ArrowLeft size={16} /> Volver a Inicio
            </Link>

            {/* Botón Carrito de Compras */}
            <button
              className="catalog-cart-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="Abrir carrito de compras"
            >
              <ShoppingCart size={18} />
              <span>Carrito</span>
              {totalItemsCount > 0 && <span className="catalog-cart-badge">{totalItemsCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="catalog-hero">
        <div className="catalog-badge-pill">
          <Sparkles size={14} /> Equipamiento Profesional Reacondicionado Grado A
        </div>
        <h1 className="catalog-hero-title">
          Monitores <span>Profesionales</span>
        </h1>
        <p className="catalog-hero-subtitle">
          Pantallas profesionales Samsung para retail, vitrinas y salas corporativas. 
          100% testeadas con garantía directa Marcom. Compra tu pantalla con soporte o solicita cotización formal con servicio de instalación técnica en terreno.
        </p>

        {/* HIGHLIGHTS */}
        <div className="catalog-highlights">
          <div className="catalog-highlight-item">
            <div className="catalog-highlight-icon">
              <Clock size={20} />
            </div>
            <div className="catalog-highlight-text">
              <h4>Operación 24/7</h4>
              <p>Paneles profesionales de uso intensivo industrial</p>
            </div>
          </div>
          <div className="catalog-highlight-item">
            <div className="catalog-highlight-icon">
              <ShieldCheck size={20} />
            </div>
            <div className="catalog-highlight-text">
              <h4>Garantía Directa Marcom</h4>
              <p>3 meses de cobertura y soporte técnico</p>
            </div>
          </div>
          <div className="catalog-highlight-item">
            <div className="catalog-highlight-icon">
              <CreditCard size={20} />
            </div>
            <div className="catalog-highlight-text">
              <h4>Pago Online Seguro</h4>
              <p>Pasarela oficial Flow</p>
            </div>
          </div>
          <div className="catalog-highlight-item">
            <div className="catalog-highlight-icon">
              <Wrench size={20} />
            </div>
            <div className="catalog-highlight-text">
              <h4>Instalación en Terreno</h4>
              <p>Montaje profesional y bancadas en todo Chile</p>
            </div>
          </div>
        </div>
      </section>

      {/* FILTROS Y BÚSQUEDA */}
      <section className="catalog-filters-wrap">
        <div className="catalog-filters-card">
          <div className="catalog-filters-top">
            <div className="catalog-search-box">
              <Search className="catalog-search-icon" size={18} />
              <input
                type="text"
                placeholder="Buscar por modelo (ej. QM43R, SH37F, 4K, 700 nits)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="catalog-sort-box">
              <label htmlFor="sort-select">Ordenar por:</label>
              <select
                id="sort-select"
                className="catalog-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="size-asc">Tamaño: Menor a Mayor</option>
                <option value="size-desc">Tamaño: Mayor a Menor</option>
                <option value="brightness-desc">Mayor Luminosidad (Nits)</option>
              </select>
            </div>
          </div>

          {/* Filtros rápidos */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Tamaño */}
            <div className="catalog-filter-group">
              <span className="catalog-filter-group-title">Tamaño de Pantalla</span>
              <div className="catalog-filter-pills">
                <button
                  className={`catalog-pill ${selectedInches === "all" ? "active" : ""}`}
                  onClick={() => setSelectedInches("all")}
                >
                  Todos los tamaños
                </button>
                <button
                  className={`catalog-pill ${selectedInches === "10" ? "active" : ""}`}
                  onClick={() => setSelectedInches("10")}
                >
                  10.1'' Compacto
                </button>
                <button
                  className={`catalog-pill ${selectedInches === "32" ? "active" : ""}`}
                  onClick={() => setSelectedInches("32")}
                >
                  32'' Estándar
                </button>
                <button
                  className={`catalog-pill ${selectedInches === "37" ? "active" : ""}`}
                  onClick={() => setSelectedInches("37")}
                >
                  37'' Barra Panorámica (16:4.5)
                </button>
                <button
                  className={`catalog-pill ${selectedInches === "43" ? "active" : ""}`}
                  onClick={() => setSelectedInches("43")}
                >
                  43'' Comercial
                </button>
                <button
                  className={`catalog-pill ${selectedInches === "49" ? "active" : ""}`}
                  onClick={() => setSelectedInches("49")}
                >
                  49'' Gran Formato
                </button>
              </div>
            </div>

            {/* Resolución */}
            <div className="catalog-filter-group">
              <span className="catalog-filter-group-title">Resolución</span>
              <div className="catalog-filter-pills">
                <button
                  className={`catalog-pill ${selectedResolution === "all" ? "active" : ""}`}
                  onClick={() => setSelectedResolution("all")}
                >
                  Todas
                </button>
                <button
                  className={`catalog-pill ${selectedResolution === "4K UHD" ? "active" : ""}`}
                  onClick={() => setSelectedResolution("4K UHD")}
                >
                  4K UHD (3840x2160)
                </button>
                <button
                  className={`catalog-pill ${selectedResolution === "Full HD" ? "active" : ""}`}
                  onClick={() => setSelectedResolution("Full HD")}
                >
                  Full HD (1920x1080)
                </button>
                <button
                  className={`catalog-pill ${selectedResolution === "Ultra-Wide" ? "active" : ""}`}
                  onClick={() => setSelectedResolution("Ultra-Wide")}
                >
                  Ultra-Wide Bar (1920x540)
                </button>
                <button
                  className={`catalog-pill ${selectedResolution === "WXGA" ? "active" : ""}`}
                  onClick={() => setSelectedResolution("WXGA")}
                >
                  WXGA (1280x800)
                </button>
              </div>
            </div>

            {/* Luminosidad & Operación */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              <div className="catalog-filter-group" style={{ flex: 1, minWidth: "220px" }}>
                <span className="catalog-filter-group-title">Brillo / Luminosidad</span>
                <div className="catalog-filter-pills">
                  <button
                    className={`catalog-pill ${selectedBrightness === "all" ? "active" : ""}`}
                    onClick={() => setSelectedBrightness("all")}
                  >
                    Todos
                  </button>
                  <button
                    className={`catalog-pill ${selectedBrightness === "700" ? "active" : ""}`}
                    onClick={() => setSelectedBrightness("700")}
                  >
                    700 Nits (Alta Luminosidad)
                  </button>
                  <button
                    className={`catalog-pill ${selectedBrightness === "500" ? "active" : ""}`}
                    onClick={() => setSelectedBrightness("500")}
                  >
                    500 Nits
                  </button>
                  <button
                    className={`catalog-pill ${selectedBrightness === "400" ? "active" : ""}`}
                    onClick={() => setSelectedBrightness("400")}
                  >
                    400 Nits
                  </button>
                </div>
              </div>

              <div className="catalog-filter-group" style={{ flex: 1, minWidth: "220px" }}>
                <span className="catalog-filter-group-title">Ciclo de Operación</span>
                <div className="catalog-filter-pills">
                  <button
                    className={`catalog-pill ${selectedOperation === "all" ? "active" : ""}`}
                    onClick={() => setSelectedOperation("all")}
                  >
                    Todos
                  </button>
                  <button
                    className={`catalog-pill ${selectedOperation === "24/7" ? "active" : ""}`}
                    onClick={() => setSelectedOperation("24/7")}
                  >
                    Continuo 24/7
                  </button>
                  <button
                    className={`catalog-pill ${selectedOperation === "16/7" ? "active" : ""}`}
                    onClick={() => setSelectedOperation("16/7")}
                  >
                    Comercial 16/7
                  </button>
                </div>
              </div>
            </div>

            {(searchTerm || selectedInches !== "all" || selectedResolution !== "all" || selectedBrightness !== "all" || selectedOperation !== "all") && (
              <button className="catalog-reset-btn" onClick={handleResetFilters}>
                <RotateCcw size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                Limpiar todos los filtros
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CONTADOR DE RESULTADOS */}
      <div className="catalog-results-info">
        <span>Mostrando <strong>{filteredMonitors.length}</strong> de <strong>{monitoresList.length}</strong> modelos disponibles</span>
        <span>Precios en pesos chilenos (CLP) y referencia UF</span>
      </div>

      {/* GRID DE MONITORES */}
      <section className="catalog-grid">
        {filteredMonitors.length === 0 ? (
          <div className="catalog-empty">
            <Monitor size={48} className="catalog-empty-icon" />
            <h3>No encontramos monitores con esos criterios</h3>
            <p>Intenta restablecer los filtros para ver todos los equipos disponibles.</p>
            <button className="catalog-btn-secondary" onClick={handleResetFilters} style={{ margin: "16px auto" }}>
              Restablecer filtros
            </button>
          </div>
        ) : (
          filteredMonitors.map((item) => {
            const currentImgIdx = cardActiveImages[item.id] || 0;
            const currentImg = item.images[currentImgIdx] || item.images[0];
            const discountPct = Math.round(
              ((item.originalPriceReferenceCLP - item.marketPriceCLP) / item.originalPriceReferenceCLP) * 100
            );

            return (
              <div key={item.id} className="catalog-card">
                {/* Imagen y badges */}
                <div className="catalog-card-image-wrap" onClick={() => openModal(item)} style={{ cursor: "pointer" }}>
                  <div className="catalog-card-badge-top">
                    <span className="catalog-pill-badge green">Grado A Reacondicionado</span>
                    {item.badge && <span className="catalog-pill-badge blue">{item.badge}</span>}
                  </div>
                  <div className="catalog-card-inches-tag">{item.inchesLabel}</div>

                  <img
                    src={currentImg}
                    alt={`Samsung ${item.model}`}
                    className="catalog-card-img"
                    loading="lazy"
                  />

                  {/* Selector rápido de fotos en miniatura */}
                  {item.images.length > 1 && (
                    <div className="catalog-card-img-dots">
                      {item.images.slice(0, 6).map((_, idx) => (
                        <button
                          key={idx}
                          className={`catalog-img-dot ${idx === currentImgIdx ? "active" : ""}`}
                          onClick={(e) => handleCardImageSelect(item.id, idx, e)}
                          title={`Ver foto ${idx + 1}`}
                          aria-label={`Foto ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Cuerpo de la Tarjeta */}
                <div className="catalog-card-body">
                  <div className="catalog-card-brand-model">
                    <h3 className="catalog-card-model">{item.brand} {item.model}</h3>
                  </div>

                  <p className="catalog-card-desc">{item.description}</p>

                  {/* Ficha rápida */}
                  <div className="catalog-card-specs">
                    <div className="catalog-card-spec-item">
                      <span className="catalog-card-spec-label">Resolución</span>
                      <span className="catalog-card-spec-val">{item.resolution}</span>
                    </div>
                    <div className="catalog-card-spec-item">
                      <span className="catalog-card-spec-label">Luminosidad</span>
                      <span className="catalog-card-spec-val">{item.brightnessNits} Nits</span>
                    </div>
                    <div className="catalog-card-spec-item">
                      <span className="catalog-card-spec-label">Operación</span>
                      <span className="catalog-card-spec-val">{item.operationHours} Continuo</span>
                    </div>
                    <div className="catalog-card-spec-item">
                      <span className="catalog-card-spec-label">Plataforma</span>
                      <span className="catalog-card-spec-val">{item.smartPlatform.split("(")[0]}</span>
                    </div>
                  </div>

                  {/* Precios */}
                  <div className="catalog-card-pricing">
                    <div className="catalog-price-main">
                      <span className="catalog-price-label">Precio Oportunidad</span>
                      <span className="catalog-price-amount">{formatCLP(item.marketPriceCLP)}</span>
                      <span className="catalog-price-uf">~ {item.marketPriceUF} UF + IVA</span>
                    </div>
                    <div className="catalog-price-ref">
                      <span className="catalog-ref-label">Precio Nuevo Ref.</span>
                      <span className="catalog-ref-amount">{formatCLP(item.originalPriceReferenceCLP)}</span>
                      <span className="catalog-save-badge">Ahorras {discountPct}%</span>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN:
                      1. COMPRAR MONITOR (+ SOPORTE) -> Solo usuarios no registrados o convenio standard / admin
                      2. COTIZAR CON CONVENIO CORPORATIVO -> Cuentas corporativas B2B
                      3. COTIZAR CON INSTALACIÓN -> COTIZACIÓN FORMAL */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {canPurchaseDirectly ? (
                      <button
                        className="catalog-btn-quote"
                        onClick={() => handleOpenSupportModal(item)}
                        style={{
                          background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                          padding: "11px",
                          fontSize: "0.86rem"
                        }}
                      >
                        <ShoppingCart size={16} /> Comprar Monitor (+ Soporte)
                      </button>
                    ) : (
                      <button
                        className="catalog-btn-quote"
                        onClick={() => setIsCorporateRestrictionModalOpen(true)}
                        style={{
                          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                          padding: "11px",
                          fontSize: "0.86rem",
                          color: "#ffffff"
                        }}
                        title="Las cuentas corporativas compran mediante orden de compra o cotización formal"
                      >
                        <Building size={16} /> Cotizar con Convenio Corporativo
                      </button>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button
                        className="catalog-btn-detail"
                        onClick={() => handleCotizarConInstalacion(item)}
                        title="Solicitar cotización formal incluyendo montaje e instalación en terreno"
                        style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}
                      >
                        <Wrench size={14} /> Con Instalación
                      </button>

                      <button
                        className="catalog-btn-detail"
                        onClick={() => openModal(item)}
                      >
                        <Info size={14} /> Ficha Técnica
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* BANNER CORPORATIVO */}
      <section className="catalog-corporate-banner">
        <div className="catalog-corp-inner">
          <div className="catalog-corp-info">
            <h3>¿Requieres equipar sucursales completas o instalación en red?</h3>
            <p>
              Ofrecemos convenios de mantenimiento, precios mayoristas y despliegue de bancadas digitales con técnicos especializados en todo Chile.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link
              to="/contacto?asunto=Convenio+Corporativo&tipoConsulta=Convenios+Corporativos+B2B"
              className="catalog-btn-primary"
            >
              <Building size={16} /> Solicitar Cotización Corporativa
            </Link>
          </div>
        </div>
      </section>

      {/* ====================================================================
          MODAL: SELECTOR DE SOPORTE VESA ANTES DE AÑADIR AL CARRITO
          ==================================================================== */}
      {supportModalProduct && (
        <div className="catalog-modal-overlay" onClick={() => setSupportModalProduct(null)}>
          <div className="catalog-modal-content" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>
                <ShoppingCart size={22} color="#38bdf8" />
                Configurar Compra de Monitor
              </h2>
              <button className="catalog-modal-close" onClick={() => setSupportModalProduct(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="catalog-modal-body" style={{ gap: "18px" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "center", background: "rgba(2, 6, 23, 0.6)", padding: "12px", borderRadius: "10px" }}>
                <img
                  src={supportModalProduct.images[0]}
                  alt={supportModalProduct.model}
                  style={{ width: "60px", height: "60px", objectFit: "contain" }}
                />
                <div>
                  <h4 style={{ margin: "0 0 2px", color: "#f8fafc", fontSize: "1rem" }}>
                    Samsung {supportModalProduct.model} ({supportModalProduct.inchesLabel})
                  </h4>
                  <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "0.95rem" }}>
                    {formatCLP(supportModalProduct.marketPriceCLP)} CLP
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: "8px", textTransform: "uppercase" }}>
                  ¿Deseas agregar soporte de muro certificado VESA?
                </label>

                {SUPPORT_OPTIONS.map((sup) => (
                  <div
                    key={sup.id}
                    className={`catalog-support-option ${selectedSupportId === sup.id ? "selected" : ""}`}
                    onClick={() => setSelectedSupportId(sup.id)}
                  >
                    <div className="catalog-support-radio">
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          border: `2px solid ${selectedSupportId === sup.id ? "#38bdf8" : "#64748b"}`,
                          background: selectedSupportId === sup.id ? "#38bdf8" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {selectedSupportId === sup.id && <Check size={12} color="#020617" strokeWidth={3} />}
                      </div>
                      <div>
                        <div className="catalog-support-title">{sup.name}</div>
                        <div className="catalog-support-desc">{sup.description}</div>
                      </div>
                    </div>
                    <div className="catalog-support-price">
                      {sup.price === 0 ? "Incluido ($0)" : `+ ${formatCLP(sup.price)}`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selector de Cantidad */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "0.9rem", color: "#cbd5e1", fontWeight: 600 }}>Cantidad de Monitores:</span>
                <div className="catalog-qty-controls">
                  <button
                    type="button"
                    className="catalog-qty-btn"
                    onClick={() => setSupportQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="catalog-qty-val" style={{ padding: "0 8px" }}>{supportQuantity}</span>
                  <button
                    type="button"
                    className="catalog-qty-btn"
                    onClick={() => setSupportQuantity((q) => q + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Resumen de este ítem */}
              <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "12px 16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Total a añadir al carrito:</span>
                <span style={{ color: "#38bdf8", fontWeight: 800, fontSize: "1.2rem" }}>
                  {formatCLP((supportModalProduct.marketPriceCLP + (SUPPORT_OPTIONS.find((s) => s.id === selectedSupportId)?.price || 0)) * supportQuantity)} CLP
                </span>
              </div>
            </div>

            <div className="catalog-modal-footer">
              <button className="catalog-btn-secondary" onClick={() => setSupportModalProduct(null)}>
                Cancelar
              </button>
              <button className="catalog-btn-primary" onClick={handleConfirmAddToCart}>
                <ShoppingCart size={16} /> Añadir al Carrito de Compras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DRAWER / PANEL LATERAL DEL CARRITO DE COMPRAS
          ==================================================================== */}
      {isCartOpen && (
        <div className="catalog-cart-drawer" onClick={() => setIsCartOpen(false)}>
          <div className="catalog-cart-panel" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-cart-header">
              <h3>
                <ShoppingCart size={22} color="#38bdf8" />
                Carrito de Compras ({totalItemsCount})
              </h3>
              <button className="catalog-modal-close" onClick={() => setIsCartOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="catalog-cart-items-list">
              {cartItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                  <ShoppingCart size={48} style={{ opacity: 0.3, marginBottom: "14px" }} />
                  <p style={{ margin: "0 0 16px", fontSize: "1rem" }}>Tu carrito de compras está vacío.</p>
                  <button
                    className="catalog-btn-secondary"
                    onClick={() => setIsCartOpen(false)}
                    style={{ margin: "0 auto" }}
                  >
                    Explorar Monitores
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.cartId} className="catalog-cart-item">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.model}
                      className="catalog-cart-item-img"
                    />

                    <div className="catalog-cart-item-info">
                      <div>
                        <h4 className="catalog-cart-item-title">
                          Samsung {item.product.model} ({item.product.inchesLabel})
                        </h4>
                        <div className="catalog-cart-item-support">
                          ✓ {item.support.name} {item.support.price > 0 ? `(+${formatCLP(item.support.price)})` : ""}
                        </div>
                      </div>

                      <div className="catalog-cart-item-bottom">
                        <div className="catalog-qty-controls">
                          <button
                            type="button"
                            className="catalog-qty-btn"
                            onClick={() => handleUpdateQuantity(item.cartId, -1)}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="catalog-qty-val">{item.quantity}</span>
                          <button
                            type="button"
                            className="catalog-qty-btn"
                            onClick={() => handleUpdateQuantity(item.cartId, 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="catalog-cart-item-price">
                          {formatCLP(item.totalUnitPrice * item.quantity)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="catalog-cart-item-remove"
                      onClick={() => handleRemoveFromCart(item.cartId)}
                      title="Eliminar del carrito"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="catalog-cart-footer">
                <div className="catalog-cart-summary-row">
                  <span>Subtotal Neto:</span>
                  <span>{formatCLP(totalNetoCLP)} CLP</span>
                </div>
                <div className="catalog-cart-summary-row">
                  <span>IVA (19%):</span>
                  <span>{formatCLP(totalIvaCLP)} CLP</span>
                </div>
                <div className="catalog-cart-total-row">
                  <div>
                    <div className="catalog-cart-total-label">Total a Pagar:</div>
                    <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>~ {totalUF} UF</span>
                  </div>
                  <div className="catalog-cart-total-amount">{formatCLP(totalBrutoCLP)} CLP</div>
                </div>

                <button
                  type="button"
                  className="catalog-cart-checkout-btn"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                >
                  <CreditCard size={18} />
                  <span>Pagar con Pasarela Flow</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL DE CHECKOUT Y PASARELA FLOW (CHILE)
          ==================================================================== */}
      {isCheckoutOpen && (
        <div className="catalog-modal-overlay" onClick={() => !isProcessingPayment && setIsCheckoutOpen(false)}>
          <div className="flow-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="flow-header-badge">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={22} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>Pasarela de Pago Segura Flow</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.85 }}>
                    Transacción cifrada y protegida por Flow
                  </div>
                </div>
              </div>
              <button
                className="catalog-modal-close"
                onClick={() => !isProcessingPayment && setIsCheckoutOpen(false)}
                style={{ color: "#ffffff" }}
              >
                <X size={18} />
              </button>
            </div>

            {completedOrder ? (
              /* PANTALLA DE COMPROBANTE DE PAGO EXITOSO */
              <div style={{ padding: "30px 24px", textAlign: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <CheckCircle2 size={40} />
                </div>
                <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#ffffff", margin: "0 0 6px" }}>
                  ¡Pago Aprobado Exitosamente!
                </h3>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "0 0 20px" }}>
                  Tu transacción fue procesada correctamente a través de la pasarela Flow.
                </p>

                {/* Voucher de Comprobante */}
                <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "18px", textAlign: "left", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>N° Orden Comercio:</span>
                    <strong style={{ color: "#38bdf8" }}>{completedOrder.orderId}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Código Autorización Bancaria:</span>
                    <strong style={{ color: "#ffffff" }}>{completedOrder.authorizationCode}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Documento Tributario:</span>
                    <span style={{ color: "#ffffff" }}>
                      {completedOrder.customer.tipoDocumento === "FACTURA" ? "Factura Electrónica" : "Boleta Electrónica"} (Folio #{completedOrder.dteFolio})
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Cliente / Receptor:</span>
                    <span style={{ color: "#ffffff" }}>{completedOrder.customer.nombre} ({completedOrder.customer.rut})</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "4px" }}>
                    <span style={{ color: "#cbd5e1", fontWeight: 700 }}>Total Pagado:</span>
                    <span style={{ color: "#34d399", fontWeight: 800, fontSize: "1.1rem" }}>
                      {formatCLP(completedOrder.amount)} CLP
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="catalog-btn-secondary"
                    onClick={() => window.print()}
                  >
                    <Printer size={16} /> Imprimir Comprobante
                  </button>
                  <button
                    type="button"
                    className="catalog-btn-primary"
                    onClick={() => {
                      setCompletedOrder(null);
                      setIsCheckoutOpen(false);
                    }}
                  >
                    Finalizar y Continuar
                  </button>
                </div>
              </div>
            ) : (
              /* FORMULARIO DE CHECKOUT Y PAGO */
              <form onSubmit={handleProceedToPayment} style={{ padding: "20px 24px" }}>
                {checkoutError && (
                  <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "0.85rem" }}>
                    <div style={{ lineHeight: 1.5 }}>{checkoutError}</div>
                  </div>
                )}

                <h4 style={{ margin: "0 0 12px", color: "#f8fafc", fontSize: "1rem" }}>1. Datos de Despacho y Facturación</h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Nombre Completo *</label>
                    <input
                      type="text"
                      className="contacto-form-input"
                      placeholder="Juan Pérez"
                      value={customerData.nombre}
                      onChange={(e) => setCustomerData({ ...customerData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>RUT Comprador *</label>
                    <input
                      type="text"
                      className="contacto-form-input"
                      placeholder="12.345.678-9"
                      value={customerData.rut}
                      onChange={(e) => setCustomerData({ ...customerData, rut: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Correo Electrónico (Boleta/Flow) *</label>
                    <input
                      type="email"
                      className="contacto-form-input"
                      placeholder="correo@ejemplo.cl"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Teléfono de Contacto</label>
                    <input
                      type="tel"
                      className="contacto-form-input"
                      placeholder="+56 9 8765 4321"
                      value={customerData.telefono}
                      onChange={(e) => setCustomerData({ ...customerData, telefono: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Dirección y Comuna de Despacho *</label>
                  <input
                    type="text"
                    className="contacto-form-input"
                    placeholder="Av. Providencia 1234, Providencia, Santiago"
                    value={customerData.direccion}
                    onChange={(e) => setCustomerData({ ...customerData, direccion: e.target.value })}
                    required
                  />
                </div>

                {/* Tipo de Documento */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>Documento Tributario Requerido:</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e2e8f0", fontSize: "0.85rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="tipoDoc"
                        checked={customerData.tipoDocumento === "BOLETA"}
                        onChange={() => setCustomerData({ ...customerData, tipoDocumento: "BOLETA" })}
                      />
                      Boleta Electrónica
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e2e8f0", fontSize: "0.85rem", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="tipoDoc"
                        checked={customerData.tipoDocumento === "FACTURA"}
                        onChange={() => setCustomerData({ ...customerData, tipoDocumento: "FACTURA" })}
                      />
                      Factura Electrónica (Empresas)
                    </label>
                  </div>
                </div>

                {customerData.tipoDocumento === "FACTURA" && (
                  <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                      <input
                        type="text"
                        className="contacto-form-input"
                        placeholder="Razón Social Empresa *"
                        value={customerData.razonSocial || ""}
                        onChange={(e) => setCustomerData({ ...customerData, razonSocial: e.target.value })}
                      />
                      <input
                        type="text"
                        className="contacto-form-input"
                        placeholder="RUT Empresa *"
                        value={customerData.rutEmpresa || ""}
                        onChange={(e) => setCustomerData({ ...customerData, rutEmpresa: e.target.value })}
                      />
                    </div>
                    <input
                      type="text"
                      className="contacto-form-input"
                      placeholder="Giro Comercial *"
                      value={customerData.giroEmpresa || ""}
                      onChange={(e) => setCustomerData({ ...customerData, giroEmpresa: e.target.value })}
                    />
                  </div>
                )}

                <h4 style={{ margin: "16px 0 8px", color: "#f8fafc", fontSize: "1rem" }}>2. Medio de Pago (Flow)</h4>
                
                <div style={{
                  background: "rgba(14, 165, 233, 0.08)",
                  border: "1px solid rgba(14, 165, 233, 0.25)",
                  borderRadius: "10px",
                  padding: "16px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px"
                }}>
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "rgba(14, 165, 233, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <CreditCard size={22} color="#38bdf8" />
                  </div>
                  <div>
                    <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "0.95rem" }}>
                      Pasarela de Pagos Flow
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginTop: "2px" }}>
                      El pago se procesa directamente a través de la pasarela oficial de Flow de forma segura e inmediata.
                    </div>
                  </div>
                </div>

                {/* SEGURIDAD DE PAGO FLOW */}
                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontWeight: 700, fontSize: "0.85rem" }}>
                    <ShieldCheck size={16} />
                    <span>Pago Seguro y Cifrado</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "6px" }}>
                    Al confirmar, serás transferido a la pasarela Flow para completar tu transacción con los más altos estándares de seguridad.
                  </div>
                </div>

                <div style={{ background: "rgba(15, 23, 42, 0.9)", padding: "14px", borderRadius: "10px", marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Monto Total a Pagar:</span>
                    <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#ffffff" }}>
                      {formatCLP(totalBrutoCLP)} CLP
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="catalog-btn-primary"
                    disabled={isProcessingPayment}
                    style={{ padding: "12px 24px", fontSize: "0.95rem" }}
                  >
                    {isProcessingPayment ? (
                      <span>Generando sesión en Flow...</span>
                    ) : (
                      <>
                        <span>Pagar con Pasarela Flow</span>
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL DE FICHA TÉCNICA DETALLADA
          ==================================================================== */}
      {activeModalProduct && (
        <div className="catalog-modal-overlay" onClick={closeModal}>
          <div className="catalog-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <h2>
                <Monitor size={22} color="#38bdf8" />
                Samsung {activeModalProduct.model} - {activeModalProduct.inchesLabel}
              </h2>
              <button className="catalog-modal-close" onClick={closeModal} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <div className="catalog-modal-body">
              {/* Galería de Fotos Reales */}
              <div className="catalog-modal-gallery">
                <div className="catalog-modal-main-img-wrap">
                  <img
                    src={activeModalProduct.images[modalImageIndex]}
                    alt={`Samsung ${activeModalProduct.model} detalle`}
                    className="catalog-modal-main-img"
                  />
                </div>
                {activeModalProduct.images.length > 1 && (
                  <div className="catalog-modal-gallery-thumbs">
                    {activeModalProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        className={`catalog-thumb-btn ${idx === modalImageIndex ? "active" : ""}`}
                        onClick={() => setModalImageIndex(idx)}
                      >
                        <img src={img} alt={`Miniatura ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div>
                <h4 style={{ margin: "0 0 8px", color: "#f8fafc", fontSize: "1.05rem" }}>Descripción del Equipo</h4>
                <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.6, fontSize: "0.92rem" }}>
                  {activeModalProduct.description}
                </p>
              </div>

              {/* Especificaciones Técnicas */}
              <div>
                <h4 style={{ margin: "0 0 12px", color: "#f8fafc", fontSize: "1.05rem" }}>Especificaciones Técnicas</h4>
                <table className="catalog-modal-table">
                  <tbody>
                    <tr>
                      <td>Modelo & Marca</td>
                      <td>{activeModalProduct.brand} {activeModalProduct.model}</td>
                    </tr>
                    <tr>
                      <td>Diagonal / Tamaño</td>
                      <td>{activeModalProduct.inchesLabel} ({activeModalProduct.inches} pulgadas)</td>
                    </tr>
                    <tr>
                      <td>Resolución Nativa</td>
                      <td>{activeModalProduct.resolution}</td>
                    </tr>
                    <tr>
                      <td>Brillo / Luminosidad</td>
                      <td>{activeModalProduct.brightnessNits} cd/m² (Nits)</td>
                    </tr>
                    <tr>
                      <td>Ciclo de Operación</td>
                      <td>{activeModalProduct.operationHours} (Comercial continuo)</td>
                    </tr>
                    <tr>
                      <td>Relación de Aspecto</td>
                      <td>{activeModalProduct.aspectRatio}</td>
                    </tr>
                    <tr>
                      <td>Relación de Contraste</td>
                      <td>{activeModalProduct.contrastRatio}</td>
                    </tr>
                    <tr>
                      <td>Ángulo de Visión</td>
                      <td>{activeModalProduct.viewingAngle}</td>
                    </tr>
                    <tr>
                      <td>Plataforma Smart</td>
                      <td>{activeModalProduct.smartPlatform}</td>
                    </tr>
                    <tr>
                      <td>Puertos & Conectividad</td>
                      <td>{activeModalProduct.connectivity.join(" • ")}</td>
                    </tr>
                    <tr>
                      <td>Condición Cosmética/Operativa</td>
                      <td>{activeModalProduct.condition}</td>
                    </tr>
                    <tr>
                      <td>Garantía</td>
                      <td>{activeModalProduct.warranty}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Características Sobresalientes */}
              <div>
                <h4 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: "1.05rem" }}>Características Sobresalientes</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {activeModalProduct.specialFeatures.map((feat, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#cbd5e1", fontSize: "0.88rem" }}>
                      <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usos Recomendados */}
              <div>
                <h4 style={{ margin: "0 0 10px", color: "#f8fafc", fontSize: "1.05rem" }}>Aplicaciones y Usos Recomendados</h4>
                <div className="catalog-modal-chips">
                  {activeModalProduct.recommendedUses.map((use, idx) => (
                    <span key={idx} className="catalog-chip">
                      ✓ {use}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer del Modal (SIN WHATSAPP):
                - Cotizar con Instalación
                - Comprar Monitor (+ Soporte) */}
            <div className="catalog-modal-footer">
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>
                  Precio Oportunidad
                </span>
                <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }}>
                  {formatCLP(activeModalProduct.marketPriceCLP)}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  ~ {activeModalProduct.marketPriceUF} UF + IVA • Ref. Nuevo: {formatCLP(activeModalProduct.originalPriceReferenceCLP)}
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="catalog-btn-secondary"
                  onClick={() => {
                    const prod = activeModalProduct;
                    closeModal();
                    handleCotizarConInstalacion(prod);
                  }}
                  style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)" }}
                >
                  <Wrench size={15} /> Cotizar con Instalación
                </button>

                {canPurchaseDirectly ? (
                  <button
                    type="button"
                    className="catalog-btn-primary"
                    onClick={() => {
                      const prod = activeModalProduct;
                      closeModal();
                      handleOpenSupportModal(prod);
                    }}
                  >
                    <ShoppingCart size={15} /> Comprar Monitor (+ Soporte)
                  </button>
                ) : (
                  <button
                    type="button"
                    className="catalog-btn-primary"
                    onClick={() => {
                      closeModal();
                      setIsCorporateRestrictionModalOpen(true);
                    }}
                    style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
                  >
                    <Building size={15} /> Cotizar con Convenio Corporativo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESTRICCIÓN USUARIOS CONVENIO CORPORATIVO */}
      {isCorporateRestrictionModalOpen && (
        <div className="catalog-modal-overlay" onClick={() => setIsCorporateRestrictionModalOpen(false)}>
          <div className="catalog-modal-content" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header" style={{ borderBottomColor: "rgba(245, 158, 11, 0.3)" }}>
              <h2 style={{ color: "#fbbf24" }}>
                <AlertTriangle size={22} color="#fbbf24" />
                Venta Directa Exclusiva Estándar
              </h2>
              <button className="catalog-modal-close" onClick={() => setIsCorporateRestrictionModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="catalog-modal-body" style={{ gap: "16px", padding: "24px" }}>
              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "10px", padding: "16px" }}>
                <h4 style={{ margin: "0 0 8px", color: "#fef3c7", fontSize: "1rem" }}>
                  Acceso Restringido para Convenios Corporativos
                </h4>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  Tu cuenta ({currentUser?.nombre || "Usuario"} - {currentUser?.rol}) cuenta con condiciones de <strong>Convenio Corporativo B2B</strong>.
                  La compra directa online con Flow está reservada para clientes particulares o de convenio estándar.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.88rem", color: "#94a3b8" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <CheckCircle2 size={16} color="#38bdf8" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>Tus compras deben tramitarse mediante <strong>Orden de Compra (OC)</strong> con facturación a 30 días.</span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <CheckCircle2 size={16} color="#38bdf8" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>Cuentas con precios preferenciales por volumen y condiciones técnicas asignadas a tu contrato.</span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <CheckCircle2 size={16} color="#38bdf8" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>Si requieres adquirir este equipamiento, solicita una cotización con tu ejecutivo asignado.</span>
                </div>
              </div>
            </div>

            <div className="catalog-modal-footer" style={{ justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="catalog-btn-secondary"
                onClick={() => setIsCorporateRestrictionModalOpen(false)}
              >
                Entendido
              </button>
              <Link
                to="/contacto?asunto=Cotizacion+Corporativa+Monitores&tipoConsulta=Convenios+Corporativos+B2B"
                className="catalog-btn-primary"
                onClick={() => setIsCorporateRestrictionModalOpen(false)}
                style={{ textDecoration: "none" }}
              >
                <Building size={16} /> Contactar Ejecutivo Comercial
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;
