import { api } from "./api";

export interface WorkOrderAsset {
  wo_asset_id: string;
  work_order_id: string;
  installed_asset_id?: string;
  removed_asset_id?: string;
  action_type: string;
}

export interface FieldEvidence {
  evidence_id: string;
  work_order_id: string;
  image_url: string;
  signature_url?: string;
  comments?: string;
  captured_at: string;
}

export interface WorkOrder {
  work_order_id: string;
  order_number: string;
  client_agreement_id?: string;
  location_id: string;
  assigned_technician_id?: string;
  status: "PENDIENTE" | "ASIGNADA" | "EN_PROCESO" | "COMPLETADA" | "CANCELADA";
  scheduled_date: string;
  completion_date?: string;
  notes?: string;
  created_at: string;
  assets?: WorkOrderAsset[];
  evidences?: FieldEvidence[];
}

export const workOrdersService = {
  getWorkOrders: async (): Promise<WorkOrder[]> => {
    return api.get<WorkOrder[]>("/work-orders");
  },
  getWorkOrderDetails: async (woId: string): Promise<WorkOrder> => {
    return api.get<WorkOrder>(`/work-orders/${woId}`);
  },
  createWorkOrder: async (data: any): Promise<WorkOrder> => {
    return api.post<WorkOrder>("/work-orders", data);
  },
  updateWorkOrder: async (woId: string, data: any): Promise<WorkOrder> => {
    return api.patch<WorkOrder>(`/work-orders/${woId}`, data);
  },
  
  // Work Order Assets (involved)
  addWorkOrderAsset: async (woId: string, data: any): Promise<WorkOrderAsset> => {
    return api.post<WorkOrderAsset>(`/work-orders/${woId}/assets`, data);
  },

  // Field Evidences
  uploadEvidence: async (woId: string, data: any): Promise<FieldEvidence> => {
    return api.post<FieldEvidence>(`/work-orders/${woId}/evidences`, data);
  }
};
