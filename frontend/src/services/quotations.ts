import { api } from "./api";

export interface CotizacionItem {
  item_id?: string;
  cotizacion_id?: string;
  producto_id: string;
  cantidad: number;
  precio_unitario?: number;
  subtotal?: number;
}

export interface Cotizacion {
  cotizacion_id: string;
  numero_cotizacion: string;
  convenio_id: string;
  ubicacion_id: string;
  usuario_solicitante_id?: string;
  
  // Parámetros y cálculos internos
  tipo_soporte: string;
  costo_soporte: number;
  distancia_km: number;
  costo_por_km: number;
  monto_kilometraje: number;
  costo_instalacion: number;
  monto_equipos: number;
  subtotal_neto: number;
  monto_iva: number;
  monto_total: number;
  
  // Solicitud de Aprobación y Orden de Compra
  fecha_solicitud_aprobacion: string;
  estado: "BORRADOR" | "PENDIENTE_APROBACION" | "APROBADA" | "RECHAZADA";
  orden_compra_numero?: string;
  orden_compra_adjunto?: string;
  fecha_aprobacion?: string;
  notas?: string;
  
  orden_trabajo_id?: string;
  pedido_id?: string;
  
  creado_en: string;
  actualizado_en?: string;
  items?: CotizacionItem[];
}

export interface CrearCotizacionPayload {
  convenio_id: string;
  ubicacion_id: string;
  fecha_solicitud_aprobacion?: string;
  items: {
    producto_id: string;
    cantidad: number;
    precio_unitario?: number;
  }[];
  tipo_soporte?: string;
  costo_soporte?: number;
  distancia_km?: number;
  costo_por_km?: number;
  costo_instalacion?: number;
  notas?: string;
}

export interface AprobarCotizacionPayload {
  orden_compra_numero: string;
  orden_compra_adjunto?: string;
  notas?: string;
}

export const quotationsService = {
  getQuotations: async (params?: { convenio_id?: string; estado?: string }): Promise<Cotizacion[]> => {
    let url = "/cotizaciones";
    if (params) {
      const search = new URLSearchParams();
      if (params.convenio_id) search.append("convenio_id", params.convenio_id);
      if (params.estado) search.append("estado", params.estado);
      const query = search.toString();
      if (query) url += `?${query}`;
    }
    return api.get<Cotizacion[]>(url);
  },

  getQuotationDetails: async (cotizacionId: string): Promise<Cotizacion> => {
    return api.get<Cotizacion>(`/cotizaciones/${cotizacionId}`);
  },

  createQuotation: async (data: CrearCotizacionPayload): Promise<Cotizacion> => {
    return api.post<Cotizacion>("/cotizaciones", data);
  },

  approveQuotationWithPO: async (cotizacionId: string, data: AprobarCotizacionPayload): Promise<Cotizacion> => {
    return api.post<Cotizacion>(`/cotizaciones/${cotizacionId}/aprobar`, data);
  },

  updateStatus: async (cotizacionId: string, estado: string, notas?: string): Promise<Cotizacion> => {
    return api.patch<Cotizacion>(`/cotizaciones/${cotizacionId}/estado`, { estado, notas });
  }
};
