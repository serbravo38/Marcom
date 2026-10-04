import enum
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Enum, Integer, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class MetodoPagoEnum(str, enum.Enum):
    PASARELA_WEBPAY = "PASARELA_WEBPAY"
    PASARELA_MERCADOPAGO = "PASARELA_MERCADOPAGO"
    CREDITO_CONVENIO = "CREDITO_CONVENIO"

class EstadoPagoEnum(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"
    REEMBOLSADO = "REEMBOLSADO"

class TipoDTEEnum(str, enum.Enum):
    FACTURA_ELECTRONICA = "FACTURA_ELECTRONICA"
    GUIA_DESPACHO = "GUIA_DESPACHO"
    BOLETA_ELECTRONICA = "BOLETA_ELECTRONICA"

class Pedido(Base):
    __tablename__ = "pedidos"
    __table_args__ = {"schema": "esquema_facturacion"}

    pedido_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    usuario_id = Column(UUID(as_uuid=True), nullable=False)
    monto_total = Column(Numeric(12, 2), nullable=False)
    metodo_pago = Column(
        Enum(MetodoPagoEnum, name="metodo_pago_enum", schema="esquema_facturacion"),
        nullable=False
    )
    estado_pago = Column(
        Enum(EstadoPagoEnum, name="estado_pago_enum", schema="esquema_facturacion"),
        nullable=False,
        default=EstadoPagoEnum.PENDIENTE,
        server_default="PENDIENTE"
    )
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    pagos = relationship("Pago", back_populates="pedido")
    documentos_dte = relationship("DocumentoDTE", back_populates="pedido")

class Pago(Base):
    __tablename__ = "pagos"
    __table_args__ = {"schema": "esquema_facturacion"}

    pago_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    pedido_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_facturacion.pedidos.pedido_id"),
        nullable=False
    )
    transaccion_pasarela_id = Column(String(100), nullable=True)
    monto = Column(Numeric(12, 2), nullable=False)
    estado = Column(
        Enum(EstadoPagoEnum, name="estado_pago_enum", schema="esquema_facturacion"),
        nullable=False
    )
    payload_respuesta = Column(JSONB, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    pedido = relationship("Pedido", back_populates="pagos")

class DocumentoDTE(Base):
    __tablename__ = "documentos_dte"
    __table_args__ = {"schema": "esquema_facturacion"}

    dte_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    pedido_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_facturacion.pedidos.pedido_id"),
        nullable=False
    )
    tipo_dte = Column(
        Enum(TipoDTEEnum, name="tipo_dte_enum", schema="esquema_facturacion"),
        nullable=False
    )
    folio_sii = Column(Integer, nullable=True)
    url_pdf = Column(String, nullable=True)
    url_xml = Column(String, nullable=True)
    estado_sii = Column(String(50), nullable=False, default="PENDIENTE", server_default="PENDIENTE")
    emitido_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    pedido = relationship("Pedido", back_populates="documentos_dte")

class Cotizacion(Base):
    __tablename__ = "cotizaciones"
    __table_args__ = {"schema": "esquema_facturacion"}

    cotizacion_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    numero_cotizacion = Column(String(50), unique=True, nullable=False)
    convenio_id = Column(UUID(as_uuid=True), nullable=False)
    ubicacion_id = Column(UUID(as_uuid=True), nullable=False)
    usuario_solicitante_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Parámetros y cálculos internos
    tipo_soporte = Column(String(100), nullable=False, default="ESTANDAR_CONVENIO")
    costo_soporte = Column(Numeric(12, 2), nullable=False, default=0.00)
    distancia_km = Column(Numeric(8, 2), nullable=False, default=0.00)
    costo_por_km = Column(Numeric(10, 2), nullable=False, default=450.00)
    monto_kilometraje = Column(Numeric(12, 2), nullable=False, default=0.00)
    costo_instalacion = Column(Numeric(12, 2), nullable=False, default=0.00)
    monto_equipos = Column(Numeric(12, 2), nullable=False, default=0.00)
    subtotal_neto = Column(Numeric(12, 2), nullable=False, default=0.00)
    monto_iva = Column(Numeric(12, 2), nullable=False, default=0.00)
    monto_total = Column(Numeric(12, 2), nullable=False, default=0.00)
    
    # Solicitud de Aprobación y Orden de Compra
    fecha_solicitud_aprobacion = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    estado = Column(String(50), nullable=False, default="PENDIENTE_APROBACION") # BORRADOR, PENDIENTE_APROBACION, APROBADA, RECHAZADA
    orden_compra_numero = Column(String(100), nullable=True)
    orden_compra_adjunto = Column(String, nullable=True)
    fecha_aprobacion = Column(DateTime(timezone=True), nullable=True)
    notas = Column(String, nullable=True)
    
    # Vínculos
    orden_trabajo_id = Column(UUID(as_uuid=True), nullable=True)
    pedido_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_facturacion.pedidos.pedido_id"),
        nullable=True
    )
    
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    items = relationship("CotizacionItem", back_populates="cotizacion", cascade="all, delete-orphan")
    pedido = relationship("Pedido", foreign_keys=[pedido_id])

class CotizacionItem(Base):
    __tablename__ = "cotizaciones_items"
    __table_args__ = {"schema": "esquema_facturacion"}

    item_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    cotizacion_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_facturacion.cotizaciones.cotizacion_id", ondelete="CASCADE"),
        nullable=False
    )
    producto_id = Column(UUID(as_uuid=True), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Numeric(12, 2), nullable=False, default=0.00)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0.00)

    # Relación
    cotizacion = relationship("Cotizacion", back_populates="items")


