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

# --- COTIZACIONES (QUOTATIONS) ---
class CotizacionItemBase(BaseModel):
    producto_id: UUID
    cantidad: int = Field(..., gt=0)
    precio_unitario: Optional[float] = None # Si es None o 0, se puede tomar precio de catálogo o cálculo estándar

class CotizacionItemCrear(CotizacionItemBase):
    pass

class CotizacionItemRespuesta(BaseModel):
    item_id: UUID
    cotizacion_id: UUID
    producto_id: UUID
    cantidad: int
    precio_unitario: float
    subtotal: float

    class Config:
        from_attributes = True

class CotizacionCrear(BaseModel):
    convenio_id: UUID
    ubicacion_id: UUID
    fecha_solicitud_aprobacion: Optional[datetime] = None
    items: List[CotizacionItemCrear]
    
    # Parámetros internos opcionales (si no se envían, el sistema los calcula automáticamente)
    tipo_soporte: Optional[str] = "ESTANDAR_CONVENIO"
    costo_soporte: Optional[float] = None
    distancia_km: Optional[float] = None
    costo_por_km: Optional[float] = None
    costo_instalacion: Optional[float] = None
    notas: Optional[str] = None

class CotizacionAprobarOC(BaseModel):
    orden_compra_numero: str = Field(..., min_length=2, max_length=100)
    orden_compra_adjunto: Optional[str] = None # URL o base64
    notas: Optional[str] = None

class CotizacionActualizarEstado(BaseModel):
    estado: str # BORRADOR, PENDIENTE_APROBACION, APROBADA, RECHAZADA
    notas: Optional[str] = None

class CotizacionRespuesta(BaseModel):
    cotizacion_id: UUID
    numero_cotizacion: str
    convenio_id: UUID
    ubicacion_id: UUID
    usuario_solicitante_id: Optional[UUID] = None
    
    # Parámetros y cálculos internos
    tipo_soporte: str
    costo_soporte: float
    distancia_km: float
    costo_por_km: float
    monto_kilometraje: float
    costo_instalacion: float
    monto_equipos: float
    subtotal_neto: float
    monto_iva: float
    monto_total: float
    
    # Solicitud de Aprobación y Orden de Compra
    fecha_solicitud_aprobacion: datetime
    estado: str
    orden_compra_numero: Optional[str] = None
    orden_compra_adjunto: Optional[str] = None
    fecha_aprobacion: Optional[datetime] = None
    notas: Optional[str] = None
    
    orden_trabajo_id: Optional[UUID] = None
    pedido_id: Optional[UUID] = None
    
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    
    items: List[CotizacionItemRespuesta] = []

    class Config:
        from_attributes = True

