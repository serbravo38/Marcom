/**
 * @file salesService.ts
 * @description Servicio de gestión, registro y métricas de ventas de monitores para el Administrador.
 */

import type { CustomerData } from "./flowService";

export interface SalesOrderItem {
  model: string;
  inchesLabel: string;
  supportName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SalesOrder {
  orderId: string;
  createdAt: string; // ISO date string
  dateFormatted: string;
  customer: CustomerData;
  items: SalesOrderItem[];
  totalCLP: number;
  totalUF: number;
  paymentGateway: "Flow";
  flowToken?: string;
  authorizationCode: string;
  dteFolio: number;
  status: "APROBADO" | "PENDIENTE" | "RECHAZADO";
}

export interface SalesMetrics {
  totalRevenueCLP: number;
  totalRevenueUF: number;
  totalOrdersCount: number;
  approvedOrdersCount: number;
  pendingOrdersCount: number;
  totalUnitsSold: number;
  averageTicketCLP: number;
  approvalRatePercent: number;
  salesByInches: { inches: string; units: number; revenueCLP: number }[];
  salesByModel: { model: string; units: number; revenueCLP: number }[];
  recentDailySales: { date: string; amount: number; count: number }[];
}

const STORAGE_KEY = "marcom_sales_orders";

// Órdenes iniciales de demostración con ventas históricas
const SEED_ORDERS: SalesOrder[] = [
  {
    orderId: "MC-ORD-877132",
    createdAt: "2026-10-06T18:45:00.000Z",
    dateFormatted: "06/10/2026 18:45",
    customer: {
      nombre: "Rodrigo Morales Silva",
      rut: "15.482.910-3",
      email: "rmorales@santiago-retail.cl",
      telefono: "+56 9 8451 2290",
      direccion: "Av. Providencia 1240, Of. 602",
      comuna: "Providencia",
      region: "Región Metropolitana",
      tipoDocumento: "FACTURA",
      razonSocial: "Comercializadora Retail Santiago SpA",
      rutEmpresa: "76.892.401-K",
      giroEmpresa: "Comercio de Electrónica y Retail"
    },
    items: [
      {
        model: "Samsung QM43R",
        inchesLabel: "43''",
        supportName: "Soporte Basculante Inclinable VESA",
        quantity: 1,
        unitPrice: 234990,
        totalPrice: 234990
      }
    ],
    totalCLP: 234990,
    totalUF: 6.2,
    paymentGateway: "Flow",
    flowToken: "FLW-TOK-877132-OK",
    authorizationCode: "FLW-839201",
    dteFolio: 4501,
    status: "APROBADO"
  },
  {
    orderId: "MC-ORD-861045",
    createdAt: "2026-10-05T14:20:00.000Z",
    dateFormatted: "05/10/2026 14:20",
    customer: {
      nombre: "Camila Andrea Valenzuela",
      rut: "16.782.341-2",
      email: "cvalenzuela@disenovisual.cl",
      telefono: "+56 9 7120 4455",
      direccion: "Nueva Costanera 3900",
      comuna: "Vitacura",
      region: "Región Metropolitana",
      tipoDocumento: "FACTURA",
      razonSocial: "Estudio Diseño Visual y Señalética Ltda.",
      rutEmpresa: "77.120.304-8",
      giroEmpresa: "Diseño Publicitario y Vitrinismo"
    },
    items: [
      {
        model: "Samsung QM32R",
        inchesLabel: "32''",
        supportName: "Soporte Fijo de Pared Ultra Slim",
        quantity: 2,
        unitPrice: 195000,
        totalPrice: 390000
      }
    ],
    totalCLP: 390000,
    totalUF: 10.3,
    paymentGateway: "Flow",
    flowToken: "FLW-TOK-861045-OK",
    authorizationCode: "FLW-714092",
    dteFolio: 4502,
    status: "APROBADO"
  },
  {
    orderId: "MC-ORD-852109",
    createdAt: "2026-10-04T11:15:00.000Z",
    dateFormatted: "04/10/2026 11:15",
    customer: {
      nombre: "Felipe Ignacio Santander",
      rut: "18.334.901-5",
      email: "fsantander@cafedoc.cl",
      telefono: "+56 9 6223 8899",
      direccion: "Paseo Huérfanos 810",
      comuna: "Santiago Centro",
      region: "Región Metropolitana",
      tipoDocumento: "BOLETA"
    },
    items: [
      {
        model: "Samsung DB10D",
        inchesLabel: "10.1''",
        supportName: "Solo Monitor (Sin Soporte)",
        quantity: 2,
        unitPrice: 125000,
        totalPrice: 250000
      }
    ],
    totalCLP: 250000,
    totalUF: 6.6,
    paymentGateway: "Flow",
    flowToken: "FLW-TOK-852109-OK",
    authorizationCode: "FLW-550182",
    dteFolio: 8192,
    status: "APROBADO"
  },
  {
    orderId: "MC-ORD-843012",
    createdAt: "2026-10-03T16:50:00.000Z",
    dateFormatted: "03/10/2026 16:50",
    customer: {
      nombre: "Ignacio Soto Carvallo",
      rut: "14.205.776-9",
      email: "isoto@gastronomiaexpress.cl",
      telefono: "+56 9 9331 0022",
      direccion: "Av. Las Condes 11200",
      comuna: "Las Condes",
      region: "Región Metropolitana",
      tipoDocumento: "FACTURA",
      razonSocial: "Gastronomía Rápida Express SpA",
      rutEmpresa: "76.441.902-3",
      giroEmpresa: "Restaurantes y Menú Boards"
    },
    items: [
      {
        model: "Samsung DB49J",
        inchesLabel: "49''",
        supportName: "Soporte Articulado de Doble Brazo",
        quantity: 1,
        unitPrice: 275000,
        totalPrice: 275000
      }
    ],
    totalCLP: 275000,
    totalUF: 7.2,
    paymentGateway: "Flow",
    flowToken: "FLW-TOK-843012-OK",
    authorizationCode: "FLW-492109",
    dteFolio: 4503,
    status: "APROBADO"
  },
  {
    orderId: "MC-ORD-839001",
    createdAt: "2026-10-02T09:30:00.000Z",
    dateFormatted: "02/10/2026 09:30",
    customer: {
      nombre: "María José Henríquez",
      rut: "17.112.449-1",
      email: "mjhenriquez@corpclinicas.cl",
      telefono: "+56 9 5554 1122",
      direccion: "Av. Manquehue Norte 1410",
      comuna: "Vitacura",
      region: "Región Metropolitana",
      tipoDocumento: "BOLETA"
    },
    items: [
      {
        model: "Samsung SH37F",
        inchesLabel: "37'' Ultra-Wide",
        supportName: "Soporte Fijo de Pared Ultra Slim",
        quantity: 1,
        unitPrice: 215000,
        totalPrice: 215000
      }
    ],
    totalCLP: 215000,
    totalUF: 5.7,
    paymentGateway: "Flow",
    flowToken: "FLW-TOK-839001-OK",
    authorizationCode: "FLW-331092",
    dteFolio: 8193,
    status: "APROBADO"
  }
];

/**
 * Obtiene todas las órdenes de venta registradas.
 */
export const getSalesOrders = (): SalesOrder[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error leyendo órdenes de venta:", e);
  }
  // Inicializar con ventas de muestra
  saveSalesOrders(SEED_ORDERS);
  return [...SEED_ORDERS];
};

/**
 * Guarda las órdenes de venta en localStorage.
 */
export const saveSalesOrders = (orders: SalesOrder[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error("Error guardando órdenes de venta:", e);
  }
};

/**
 * Registra una nueva orden de venta confirmada por Flow.
 */
export const recordSalesOrder = (order: SalesOrder): void => {
  const current = getSalesOrders();
  // Evitar duplicados por orderId
  const exists = current.some((o) => o.orderId === order.orderId);
  if (!exists) {
    const updated = [order, ...current];
    saveSalesOrders(updated);
  }
};

/**
 * Calcula métricas comerciales consolidadas para el Dashboard del Administrador.
 */
export const getSalesMetrics = (): SalesMetrics => {
  const orders = getSalesOrders();
  const approved = orders.filter((o) => o.status === "APROBADO");
  const pending = orders.filter((o) => o.status === "PENDIENTE");

  const totalRevenueCLP = approved.reduce((acc, o) => acc + o.totalCLP, 0);
  const totalRevenueUF = parseFloat((totalRevenueCLP / 38000).toFixed(1));
  const totalOrdersCount = orders.length;
  const approvedOrdersCount = approved.length;
  const pendingOrdersCount = pending.length;

  const totalUnitsSold = approved.reduce((acc, o) => {
    return acc + o.items.reduce((sum, item) => sum + item.quantity, 0);
  }, 0);

  const averageTicketCLP = approvedOrdersCount > 0 ? Math.round(totalRevenueCLP / approvedOrdersCount) : 0;
  const approvalRatePercent = totalOrdersCount > 0 ? Math.round((approvedOrdersCount / totalOrdersCount) * 100) : 100;

  // Desglose por Pulgadas
  const inchesMap: Record<string, { units: number; revenueCLP: number }> = {};
  // Desglose por Modelo
  const modelMap: Record<string, { units: number; revenueCLP: number }> = {};

  approved.forEach((order) => {
    order.items.forEach((item) => {
      // Pulgadas
      const inch = item.inchesLabel || "43''";
      if (!inchesMap[inch]) inchesMap[inch] = { units: 0, revenueCLP: 0 };
      inchesMap[inch].units += item.quantity;
      inchesMap[inch].revenueCLP += item.totalPrice;

      // Modelo
      const mod = item.model || "Samsung";
      if (!modelMap[mod]) modelMap[mod] = { units: 0, revenueCLP: 0 };
      modelMap[mod].units += item.quantity;
      modelMap[mod].revenueCLP += item.totalPrice;
    });
  });

  const salesByInches = Object.entries(inchesMap).map(([inches, data]) => ({
    inches,
    units: data.units,
    revenueCLP: data.revenueCLP
  })).sort((a, b) => b.revenueCLP - a.revenueCLP);

  const salesByModel = Object.entries(modelMap).map(([model, data]) => ({
    model,
    units: data.units,
    revenueCLP: data.revenueCLP
  })).sort((a, b) => b.revenueCLP - a.revenueCLP);

  // Evolución de ventas recientes (por fecha)
  const dateMap: Record<string, { amount: number; count: number }> = {};
  approved.forEach((o) => {
    const day = o.dateFormatted ? o.dateFormatted.split(" ")[0] : "Reciente";
    if (!dateMap[day]) dateMap[day] = { amount: 0, count: 0 };
    dateMap[day].amount += o.totalCLP;
    dateMap[day].count += 1;
  });

  const recentDailySales = Object.entries(dateMap).map(([date, data]) => ({
    date,
    amount: data.amount,
    count: data.count
  }));

  return {
    totalRevenueCLP,
    totalRevenueUF,
    totalOrdersCount,
    approvedOrdersCount,
    pendingOrdersCount,
    totalUnitsSold,
    averageTicketCLP,
    approvalRatePercent,
    salesByInches,
    salesByModel,
    recentDailySales
  };
};

/**
 * Resumen contable consolidado para facturación
 */
export interface BillingSummary {
  totalNetoCLP: number;
  totalIvaCLP: number;
  totalBrutoCLP: number;
  facturasCount: number;
  boletasCount: number;
}

export const getBillingSummary = (ordersList: SalesOrder[]): BillingSummary => {
  const approved = ordersList.filter((o) => o.status === "APROBADO");
  const totalBrutoCLP = approved.reduce((acc, o) => acc + o.totalCLP, 0);
  const totalNetoCLP = Math.round(totalBrutoCLP / 1.19);
  const totalIvaCLP = totalBrutoCLP - totalNetoCLP;

  const facturasCount = approved.filter((o) => o.customer.tipoDocumento === "FACTURA").length;
  const boletasCount = approved.filter((o) => o.customer.tipoDocumento === "BOLETA").length;

  return {
    totalNetoCLP,
    totalIvaCLP,
    totalBrutoCLP,
    facturasCount,
    boletasCount
  };
};

/**
 * Genera el archivo CSV estructurado para control de facturación y cruce contable.
 * Incluye cabecera estándar chilena con codificación UTF-8 BOM para apertura directa en Excel.
 */
export const generateBillingCSV = (ordersList: SalesOrder[]): string => {
  const headers = [
    "Folio DTE",
    "Tipo Documento",
    "Codigo DTE SII",
    "Fecha Emision",
    "Nro Orden Marcom",
    "RUT Receptor / Facturado",
    "Razon Social / Nombre",
    "Giro Comercial",
    "Direccion",
    "Comuna",
    "Region",
    "Email",
    "Telefono",
    "Detalle Equipamiento Adquirido",
    "Monto Exento CLP",
    "Monto Neto CLP",
    "IVA 19% CLP",
    "Monto Total CLP",
    "Total UF Referencial",
    "Medio de Pago",
    "Cod Autorizacion Flow",
    "Estado Venta",
    "Estado Registro Contable"
  ];

  const escapeField = (val: any) => {
    const text = String(val ?? "").replace(/"/g, '""');
    return `"${text}"`;
  };

  const rows = ordersList.map((ord) => {
    const isFactura = ord.customer.tipoDocumento === "FACTURA";
    const tipoDocLabel = isFactura ? "Factura Electrónica" : "Boleta Electrónica";
    const codigoSii = isFactura ? "33" : "39";
    const rutFacturado = isFactura && ord.customer.rutEmpresa ? ord.customer.rutEmpresa : ord.customer.rut;
    const razonSocial = isFactura && ord.customer.razonSocial ? ord.customer.razonSocial : ord.customer.nombre;
    const giro = isFactura && ord.customer.giroEmpresa ? ord.customer.giroEmpresa : "Particular / Consumo Final";

    const itemsSummary = ord.items
      .map((it) => `${it.quantity}x ${it.model} (${it.inchesLabel}) + ${it.supportName}`)
      .join(" | ");

    const total = ord.totalCLP;
    const neto = Math.round(total / 1.19);
    const iva = total - neto;
    const exento = 0;
    const fecha = ord.dateFormatted ? ord.dateFormatted.split(" ")[0] : new Date().toLocaleDateString("es-CL");
    const estadoContable = ord.status === "APROBADO" ? "REGISTRADO_FACTURABLE" : "PENDIENTE";

    return [
      escapeField(ord.dteFolio),
      escapeField(tipoDocLabel),
      escapeField(codigoSii),
      escapeField(fecha),
      escapeField(ord.orderId),
      escapeField(rutFacturado),
      escapeField(razonSocial),
      escapeField(giro),
      escapeField(ord.customer.direccion),
      escapeField(ord.customer.comuna),
      escapeField(ord.customer.region),
      escapeField(ord.customer.email),
      escapeField(ord.customer.telefono || ""),
      escapeField(itemsSummary),
      escapeField(exento),
      escapeField(neto),
      escapeField(iva),
      escapeField(total),
      escapeField(ord.totalUF),
      escapeField(ord.paymentGateway || "Flow"),
      escapeField(ord.authorizationCode || ""),
      escapeField(ord.status),
      escapeField(estadoContable)
    ].join(";");
  });

  // Prefijo BOM \uFEFF para que Microsoft Excel en Windows abra correctamente acentos y caracteres especiales
  return "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
};

/**
 * Descarga directamente el archivo CSV de facturación al navegador.
 */
export const downloadBillingCSV = (ordersList: SalesOrder[], filename?: string): void => {
  const csvContent = generateBillingCSV(ordersList);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", filename || `facturacion_marcom_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

