from pydantic import BaseModel, Field
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
