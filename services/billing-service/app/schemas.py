from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from app.models import MetodoPagoEnum, EstadoPagoEnum, TipoDTEEnum

# --- PAYMENTS ---
class PagoBase(BaseModel):
    monto: float
    transaccion_pasarela_id: Optional[str] = Field(None, max_length=100)
    estado: EstadoPagoEnum
    payload_respuesta: Optional[Any] = None

class PagoCrear(PagoBase):
    pedido_id: UUID

class PagoRespuesta(PagoBase):
    pago_id: UUID
    pedido_id: UUID
    creado_en: datetime

    class Config:
        from_attributes = True

# --- DTE DOCUMENTS ---
class DocumentoDTEBase(BaseModel):
    tipo_dte: TipoDTEEnum
    folio_sii: Optional[int] = None
    url_pdf: Optional[str] = None
    url_xml: Optional[str] = None
    estado_sii: str = "PENDIENTE"

class DocumentoDTECrear(DocumentoDTEBase):
    pedido_id: UUID

class DocumentoDTERespuesta(DocumentoDTEBase):
    dte_id: UUID
    pedido_id: UUID
    emitido_en: datetime

    class Config:
        from_attributes = True

# --- ORDERS ---
class PedidoBase(BaseModel):
    usuario_id: UUID
    monto_total: float
    metodo_pago: MetodoPagoEnum
    estado_pago: EstadoPagoEnum = EstadoPagoEnum.PENDIENTE

class PedidoCrear(PedidoBase):
    pass

class PedidoActualizar(BaseModel):
    estado_pago: Optional[EstadoPagoEnum] = None

class PedidoRespuesta(PedidoBase):
    pedido_id: UUID
    creado_en: datetime
    pagos: List[PagoRespuesta] = []
    documentos_dte: List[DocumentoDTERespuesta] = []

    class Config:
        from_attributes = True
