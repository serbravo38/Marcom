import { api } from "./api";

export interface Location {
  location_id: string;
  name: string;
  address: string;
  region: string;
  is_warehouse: boolean;
  created_at: string;
}

export interface ProductCatalog {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  size_inches?: number;
  description?: string;
  created_at: string;
}

export interface Asset {
  asset_id: string;
  product_id: string;
  serial_number: string;
  qr_code?: string;
  current_status: "NUEVO" | "USADO_BUEN_ESTADO" | "DEFECTUOSO" | "EN_TRANSITO" | "DADO_DE_BAJA";
  current_location_id: string;
  created_at: string;
  updated_at: string;
  product?: ProductCatalog;
  current_location?: Location;
}

export interface StockMovement {
  movement_id: string;
  asset_id: string;
  origin_location_id?: string;
  destination_location_id: string;
  moved_by_user_id: string;
  reason: string;
  created_at: string;
  asset?: Asset;
}

export const inventoryService = {
  // Locations
  getLocations: async (): Promise<Location[]> => {
    return api.get<Location[]>("/locations");
  },
  createLocation: async (data: any): Promise<Location> => {
    return api.post<Location>("/locations", data);
  },

  // Products Catalog
  getProducts: async (): Promise<ProductCatalog[]> => {
    return api.get<ProductCatalog[]>("/products");
  },
  createProduct: async (data: any): Promise<ProductCatalog> => {
    return api.post<ProductCatalog>("/products", data);
  },

  // Assets
  getAssets: async (): Promise<Asset[]> => {
    return api.get<Asset[]>("/assets");
  },
  getAssetDetails: async (assetId: string): Promise<Asset> => {
    return api.get<Asset>(`/assets/${assetId}`);
  },
  createAsset: async (data: any): Promise<Asset> => {
    return api.post<Asset>("/assets", data);
  },
  updateAsset: async (assetId: string, data: any): Promise<Asset> => {
    return api.patch<Asset>(`/assets/${assetId}`, data);
  },

  // Stock Movements
  getMovements: async (): Promise<StockMovement[]> => {
    return api.get<StockMovement[]>("/movements");
  },
  createMovement: async (data: any): Promise<StockMovement> => {
    return api.post<StockMovement>("/movements", data);
  }
};
