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
    usuario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_auth_clientes.usuarios.usuario_id"),
        nullable=False
    )
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
