from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import AssetStatusEnum

# --- LOCATION SCHEMAS ---
class LocationBase(BaseModel):
    name: str = Field(..., max_length=100)
    address: str
    region: str = Field(..., max_length=100)
    is_warehouse: bool = False

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    location_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- PRODUCT CATALOG SCHEMAS ---
class ProductCatalogBase(BaseModel):
    sku: str = Field(..., max_length=50)
    name: str = Field(..., max_length=150)
    brand: str = Field(..., max_length=100)
    category: str = Field(..., max_length=100)
    size_inches: Optional[float] = None
    description: Optional[str] = None

class ProductCatalogCreate(ProductCatalogBase):
    pass

class ProductCatalogResponse(ProductCatalogBase):
    product_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- ASSET SCHEMAS ---
class AssetBase(BaseModel):
    product_id: UUID
    serial_number: str = Field(..., max_length=100)
    qr_code: Optional[str] = Field(None, max_length=255)
    current_status: AssetStatusEnum = AssetStatusEnum.NUEVO
    current_location_id: UUID

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    current_status: Optional[AssetStatusEnum] = None
    current_location_id: Optional[UUID] = None
    qr_code: Optional[str] = None

class AssetResponse(AssetBase):
    asset_id: UUID
    created_at: datetime
    updated_at: datetime
    product: Optional[ProductCatalogResponse] = None
    current_location: Optional[LocationResponse] = None

    class Config:
        from_attributes = True

# --- STOCK MOVEMENT SCHEMAS ---
class StockMovementBase(BaseModel):
    asset_id: UUID
    origin_location_id: Optional[UUID] = None
    destination_location_id: UUID
    moved_by_user_id: UUID
    reason: str

class StockMovementCreate(StockMovementBase):
    pass

class StockMovementResponse(StockMovementBase):
    movement_id: UUID
    created_at: datetime
    asset: Optional[AssetResponse] = None

    class Config:
        from_attributes = True
