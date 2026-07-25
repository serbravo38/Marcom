import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class OTStatusEnum(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    ASIGNADA = "ASIGNADA"
    EN_PROCESO = "EN_PROCESO"
    COMPLETADA = "COMPLETADA"
    CANCELADA = "CANCELADA"

class WorkOrder(Base):
    __tablename__ = "work_orders"
    __table_args__ = {"schema": "work_order_schema"}

    work_order_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    order_number = Column(String(20), unique=True, nullable=False)
    client_agreement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth_customer_schema.agreements.agreement_id"),
        nullable=True
    )
    location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_schema.locations.location_id"),
        nullable=False
    )
    assigned_technician_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth_customer_schema.users.user_id"),
        nullable=True
    )
    status = Column(
        Enum(OTStatusEnum, name="ot_status", schema="work_order_schema"),
        nullable=False,
        default=OTStatusEnum.PENDIENTE,
        server_default="PENDIENTE"
    )
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    completion_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assets = relationship("WorkOrderAsset", back_populates="work_order", cascade="all, delete-orphan")
    evidences = relationship("FieldEvidence", back_populates="work_order", cascade="all, delete-orphan")

class WorkOrderAsset(Base):
    __tablename__ = "work_order_assets"
    __table_args__ = {"schema": "work_order_schema"}

    wo_asset_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    work_order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("work_order_schema.work_orders.work_order_id", ondelete="CASCADE"),
        nullable=False
    )
    installed_asset_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_schema.assets.asset_id"),
        nullable=True
    )
    removed_asset_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_schema.assets.asset_id"),
        nullable=True
    )
    action_type = Column(String(50), nullable=False) # e.g. 'INSTALACION_NUEVA', 'REEMPLAZO_POR_FALLA', 'RETIRO'

    # Relationships
    work_order = relationship("WorkOrder", back_populates="assets")

class FieldEvidence(Base):
    __tablename__ = "field_evidences"
    __table_args__ = {"schema": "work_order_schema"}

    evidence_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    work_order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("work_order_schema.work_orders.work_order_id", ondelete="CASCADE"),
        nullable=False
    )
    image_url = Column(String, nullable=False)
    signature_url = Column(String, nullable=True)
    comments = Column(String, nullable=True)
    captured_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    work_order = relationship("WorkOrder", back_populates="evidences")
