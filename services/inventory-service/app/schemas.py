from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import EstadoActivoEnum

# --- LOCATION SCHEMAS ---
class UbicacionBase(BaseModel):
    codigo_local: Optional[str] = Field(None, max_length=50, description="Código del local / EDS (ej: 10097, COP-042)")
    nombre: str = Field(..., max_length=150)
    direccion: str
    zona: Optional[str] = Field(None, max_length=50, description="Zona geográfica / operativa (ej: OZN, OZC, OS, OZS)")
    region: str = Field(..., max_length=100)
    provincia: Optional[str] = Field(None, max_length=100)
    comuna: Optional[str] = Field(None, max_length=100)
    cantidad_pantallas: Optional[int] = Field(0, description="Cantidad de pantallas")
    precio_instalacion_uf: Optional[float] = Field(0.0, description="Precio instalación en UF")
    precio_transporte_uf: Optional[float] = Field(0.0, description="Precio transporte en UF")
    es_bodega: bool = False
    convenio_id: Optional[UUID] = None
    nombre_encargado: Optional[str] = Field(None, max_length=150)
    telefono_encargado: Optional[str] = Field(None, max_length=20)
    correo_encargado: Optional[str] = Field(None, max_length=150)
    activo: bool = True

class UbicacionCrear(UbicacionBase):
    pass

class UbicacionActualizar(BaseModel):
    codigo_local: Optional[str] = None
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    zona: Optional[str] = None
    region: Optional[str] = None
    provincia: Optional[str] = None
    comuna: Optional[str] = None
    cantidad_pantallas: Optional[int] = None
    precio_instalacion_uf: Optional[float] = None
    precio_transporte_uf: Optional[float] = None
    es_bodega: Optional[bool] = None
    convenio_id: Optional[UUID] = None
    nombre_encargado: Optional[str] = None
    telefono_encargado: Optional[str] = None
    correo_encargado: Optional[str] = None
    activo: Optional[bool] = None

class UbicacionRespuesta(UbicacionBase):
    ubicacion_id: UUID
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    class Config:
        from_attributes = True

class UbicacionCargaMasiva(BaseModel):
    locales: List[UbicacionCrear]

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
