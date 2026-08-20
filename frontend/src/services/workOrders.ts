import { api } from "./api";

export interface ActivoOrdenTrabajo {
  activo_ot_id: string;
  orden_trabajo_id: string;
  activo_instalado_id?: string;
  activo_retirado_id?: string;
  tipo_accion: string;
}

export interface EvidenciaTerreno {
  evidencia_id: string;
  orden_trabajo_id: string;
  url_imagen: string;
  url_firma?: string;
  comentarios?: string;
  fecha_captura: string;
}

export interface OrdenTrabajo {
  orden_trabajo_id: string;
  numero_orden: string;
  convenio_cliente_id?: string;
  ubicacion_id: string;
  tecnico_asignado_id?: string;
  estado: "PENDIENTE" | "ASIGNADA" | "EN_PROCESO" | "COMPLETADA" | "CANCELADA";
  fecha_programada: string;
  fecha_termino?: string;
  notes?: string;
  creado_en: string;
  activos?: ActivoOrdenTrabajo[];
  evidencias?: EvidenciaTerreno[];
}

export const workOrdersService = {
  getWorkOrders: async (): Promise<OrdenTrabajo[]> => {
    return api.get<OrdenTrabajo[]>("/ordenes-trabajo");
  },
  getWorkOrderDetails: async (woId: string): Promise<OrdenTrabajo> => {
    return api.get<OrdenTrabajo>(`/ordenes-trabajo/${woId}`);
  },
  createWorkOrder: async (data: any): Promise<OrdenTrabajo> => {
    return api.post<OrdenTrabajo>("/ordenes-trabajo", data);
  },
  updateWorkOrder: async (woId: string, data: any): Promise<OrdenTrabajo> => {
    return api.patch<OrdenTrabajo>(`/ordenes-trabajo/${woId}`, data);
  },
  
  // Activos involucrados en Orden de Trabajo
  addWorkOrderAsset: async (woId: string, data: any): Promise<ActivoOrdenTrabajo> => {
    return api.post<ActivoOrdenTrabajo>(`/ordenes-trabajo/${woId}/activos`, data);
  },

  // Evidencias de Terreno
  uploadEvidence: async (woId: string, data: any): Promise<EvidenciaTerreno> => {
    return api.post<EvidenciaTerreno>(`/ordenes-trabajo/${woId}/evidencias`, data);
  }
};
