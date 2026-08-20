from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import EstadoActivoEnum

# --- LOCATION SCHEMAS ---
class UbicacionBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    direccion: str
    region: str = Field(..., max_length=100)
    es_bodega: bool = False

class UbicacionCrear(UbicacionBase):
    pass

class UbicacionRespuesta(UbicacionBase):
    ubicacion_id: UUID
    creado_en: datetime

    class Config:
        from_attributes = True

# --- PRODUCT CATALOG SCHEMAS ---
class CatalogoProductosBase(BaseModel):
    sku: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=150)
    marca: str = Field(..., max_length=100)
    categoria: str = Field(..., max_length=100)
    pulgadas: Optional[float] = None
    descripcion: Optional[str] = None

class CatalogoProductosCrear(CatalogoProductosBase):
    pass

class CatalogoProductosRespuesta(CatalogoProductosBase):
    producto_id: UUID
    creado_en: datetime

    class Config:
        from_attributes = True

# --- ASSET SCHEMAS ---
class ActivoBase(BaseModel):
    producto_id: UUID
    numero_serie: str = Field(..., max_length=100)
    codigo_qr: Optional[str] = Field(None, max_length=255)
    estado_actual: EstadoActivoEnum = EstadoActivoEnum.NUEVO
    ubicacion_actual_id: UUID

class ActivoCrear(ActivoBase):
    pass

class ActivoActualizar(BaseModel):
    estado_actual: Optional[EstadoActivoEnum] = None
    ubicacion_actual_id: Optional[UUID] = None
    codigo_qr: Optional[str] = None

class ActivoRespuesta(ActivoBase):
    activo_id: UUID
    creado_en: datetime
    actualizado_en: datetime
    producto: Optional[CatalogoProductosRespuesta] = None
    ubicacion_actual: Optional[UbicacionRespuesta] = None

    class Config:
        from_attributes = True

# --- STOCK MOVEMENT SCHEMAS ---
class MovimientoStockBase(BaseModel):
    activo_id: UUID
    ubicacion_origen_id: Optional[UUID] = None
    ubicacion_destino_id: UUID
    usuario_movimiento_id: UUID
    motivo: str

class MovimientoStockCrear(MovimientoStockBase):
    pass

class MovimientoStockRespuesta(MovimientoStockBase):
    movimiento_id: UUID
    creado_en: datetime
    activo: Optional[ActivoRespuesta] = None

    class Config:
        from_attributes = True
