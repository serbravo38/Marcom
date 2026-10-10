from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import EstadoOTEnum

# --- WORK ORDER ASSETS ---
class ActivoOrdenTrabajoBase(BaseModel):
    activo_instalado_id: Optional[UUID] = None
    activo_retirado_id: Optional[UUID] = None
    tipo_accion: str = Field(..., max_length=50, description="ej. INSTALACION_NUEVA, REEMPLAZO_POR_FALLA, RETIRO")

class ActivoOrdenTrabajoCrear(ActivoOrdenTrabajoBase):
    pass

class ActivoOrdenTrabajoRespuesta(ActivoOrdenTrabajoBase):
    activo_ot_id: UUID
    orden_trabajo_id: UUID

    class Config:
        from_attributes = True

# --- FIELD EVIDENCES ---
class EvidenciaTerrenoBase(BaseModel):
    url_imagen: str
    url_firma: Optional[str] = None
    comentarios: Optional[str] = None

    @field_validator("url_imagen")
    @classmethod
    def validar_url_imagen(cls, v: str) -> str:
        if not v or not (v.startswith("http://") or v.startswith("https://") or v.startswith("data:image/") or v.startswith("/")):
            raise ValueError("La URL de la imagen debe ser un recurso seguro (http, https, data:image o ruta local).")
        return v

    @field_validator("url_firma")
    @classmethod
    def validar_url_firma(cls, v: Optional[str]) -> Optional[str]:
        if v and not (v.startswith("http://") or v.startswith("https://") or v.startswith("data:image/") or v.startswith("/")):
            raise ValueError("El trazo de la firma digital debe ser un recurso seguro (data:image, http, https o ruta local).")
        return v

class EvidenciaTerrenoCrear(EvidenciaTerrenoBase):
    pass

class EvidenciaTerrenoRespuesta(EvidenciaTerrenoBase):
    evidencia_id: UUID
    orden_trabajo_id: UUID
    fecha_captura: datetime

    class Config:
        from_attributes = True

# --- WORK ORDERS ---
class OrdenTrabajoBase(BaseModel):
    numero_orden: str = Field(..., max_length=20)
    convenio_cliente_id: Optional[UUID] = None
    ubicacion_id: UUID
    tecnico_asignado_id: Optional[UUID] = None
    estado: EstadoOTEnum = EstadoOTEnum.PENDIENTE
    fecha_programada: datetime
    fecha_termino: Optional[datetime] = None
    notas: Optional[str] = None

class OrdenTrabajoCrear(OrdenTrabajoBase):
    pass

class OrdenTrabajoActualizar(BaseModel):
    convenio_cliente_id: Optional[UUID] = None
    ubicacion_id: Optional[UUID] = None
    tecnico_asignado_id: Optional[UUID] = None
    estado: Optional[EstadoOTEnum] = None
    fecha_programada: Optional[datetime] = None
    fecha_termino: Optional[datetime] = None
    notas: Optional[str] = None

class OrdenTrabajoRespuesta(OrdenTrabajoBase):
    orden_trabajo_id: UUID
    creado_en: datetime
    activos: List[ActivoOrdenTrabajoRespuesta] = []
    evidencias: List[EvidenciaTerrenoRespuesta] = []

    class Config:
        from_attributes = True
