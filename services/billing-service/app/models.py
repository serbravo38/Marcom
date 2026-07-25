import enum
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Enum, Integer, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class PaymentMethodEnum(str, enum.Enum):
    PASARELA_WEBPAY = "PASARELA_WEBPAY"
    PASARELA_MERCADOPAGO = "PASARELA_MERCADOPAGO"
    CREDITO_CONVENIO = "CREDITO_CONVENIO"

class PaymentStatusEnum(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"
    REEMBOLSADO = "REEMBOLSADO"

class DTETypeEnum(str, enum.Enum):
    FACTURA_ELECTRONICA = "FACTURA_ELECTRONICA"
    GUIA_DESPACHO = "GUIA_DESPACHO"
    BOLETA_ELECTRONICA = "BOLETA_ELECTRONICA"

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = {"schema": "billing_schema"}

    order_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth_customer_schema.users.user_id"),
        nullable=False
    )
    total_amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(
        Enum(PaymentMethodEnum, name="payment_method_enum", schema="billing_schema"),
        nullable=False
    )
    payment_status = Column(
        Enum(PaymentStatusEnum, name="payment_status_enum", schema="billing_schema"),
        nullable=False,
        default=PaymentStatusEnum.PENDIENTE,
        server_default="PENDIENTE"
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    payments = relationship("Payment", back_populates="order")
    dte_documents = relationship("DTEDocument", back_populates="order")

class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": "billing_schema"}

    payment_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("billing_schema.orders.order_id"),
        nullable=False
    )
    gateway_transaction_id = Column(String(100), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(
        Enum(PaymentStatusEnum, name="payment_status_enum", schema="billing_schema"),
        nullable=False
    )
    response_payload = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("Order", back_populates="payments")

class DTEDocument(Base):
    __tablename__ = "dte_documents"
    __table_args__ = {"schema": "billing_schema"}

    dte_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("billing_schema.orders.order_id"),
        nullable=False
    )
    dte_type = Column(
        Enum(DTETypeEnum, name="dte_type_enum", schema="billing_schema"),
        nullable=False
    )
    sii_folio = Column(Integer, nullable=True)
    pdf_url = Column(String, nullable=True)
    xml_url = Column(String, nullable=True)
    sii_status = Column(String(50), nullable=False, default="PENDIENTE", server_default="PENDIENTE")
    issued_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("Order", back_populates="dte_documents")
