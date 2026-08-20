import { api } from "./api";

export interface Ubicacion {
  ubicacion_id: string;
  nombre: string;
  direccion: string;
  region: string;
  es_bodega: boolean;
  creado_en: string;
}

export interface CatalogoProductos {
  producto_id: string;
  sku: string;
  nombre: string;
  marca: string;
  categoria: string;
  pulgadas?: number;
  descripcion?: string;
  creado_en: string;
}

export interface Activo {
  activo_id: string;
  producto_id: string;
  numero_serie: string;
  codigo_qr?: string;
  estado_actual: "NUEVO" | "USADO_BUEN_ESTADO" | "DEFECTUOSO" | "EN_TRANSITO" | "DADO_DE_BAJA";
  ubicacion_actual_id: string;
  creado_en: string;
  actualizado_en: string;
  producto?: CatalogoProductos;
  ubicacion_actual?: Ubicacion;
}

export interface MovimientoStock {
  movimiento_id: string;
  activo_id: string;
  ubicacion_origen_id?: string;
  ubicacion_destino_id: string;
  usuario_movimiento_id: string;
  motivo: string;
  creado_en: string;
  activo?: Activo;
}

export const inventoryService = {
  // Ubicaciones
  getLocations: async (): Promise<Ubicacion[]> => {
    return api.get<Ubicacion[]>("/ubicaciones");
  },
  createLocation: async (data: any): Promise<Ubicacion> => {
    return api.post<Ubicacion>("/ubicaciones", data);
  },

  // Catálogo de Productos
  getProducts: async (): Promise<CatalogoProductos[]> => {
    return api.get<CatalogoProductos[]>("/productos");
  },
  createProduct: async (data: any): Promise<CatalogoProductos> => {
    return api.post<CatalogoProductos>("/productos", data);
  },

  // Activos
  getAssets: async (): Promise<Activo[]> => {
    return api.get<Activo[]>("/activos");
  },
  getAssetDetails: async (activoId: string): Promise<Activo> => {
    return api.get<Activo>(`/activos/${activoId}`);
  },
  createAsset: async (data: any): Promise<Activo> => {
    return api.post<Activo>("/activos", data);
  },
  updateAsset: async (activoId: string, data: any): Promise<Activo> => {
    return api.patch<Activo>(`/activos/${activoId}`, data);
  },

  // Movimientos de Stock
  getMovements: async (): Promise<MovimientoStock[]> => {
    return api.get<MovimientoStock[]>("/movimientos");
  },
  createMovement: async (data: any): Promise<MovimientoStock> => {
    return api.post<MovimientoStock>("/movimientos", data);
  }
};
