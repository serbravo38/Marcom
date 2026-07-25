import enum
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Enum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class AssetStatusEnum(str, enum.Enum):
    NUEVO = "NUEVO"
    USADO_BUEN_ESTADO = "USADO_BUEN_ESTADO"
    DEFECTUOSO = "DEFECTUOSO"
    EN_TRANSITO = "EN_TRANSITO"
    DADO_DE_BAJA = "DADO_DE_BAJA"

class Location(Base):
    __tablename__ = "locations"
    __table_args__ = {"schema": "inventory_schema"}

    location_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    name = Column(String(100), nullable=False)
    address = Column(String, nullable=False)
    region = Column(String(100), nullable=False)
    is_warehouse = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assets = relationship("Asset", back_populates="current_location")

class ProductCatalog(Base):
    __tablename__ = "product_catalog"
    __table_args__ = {"schema": "inventory_schema"}

    product_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    sku = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    brand = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    size_inches = Column(Numeric(5, 2), nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assets = relationship("Asset", back_populates="product")

class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = {"schema": "inventory_schema"}

    asset_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_schema.product_catalog.product_id"),
        nullable=False
    )
    serial_number = Column(String(100), unique=True, nullable=False)
    qr_code = Column(String(255), unique=True, nullable=True)
    current_status = Column(
        Enum(AssetStatusEnum, name="asset_status", schema="inventory_schema"),
        nullable=False,
        default=AssetStatusEnum.NUEVO,
        server_default="NUEVO"
    )
    current_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_schema.locations.location_id"),
        nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    product = relationship("ProductCatalog", back_populates="assets")
    current_location = relationship("Location", back_populates="assets")
    movements = relationship("StockMovement", back_populates="asset")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = {"schema": "inventory_schema"}

    movement_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    asset_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_schema.assets.asset_id"),
        nullable=False
    )
    origin_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_schema.locations.location_id"),
        nullable=True
    )
    destination_location_id = Column(
        UUID(as_uuid=True),
        ForeignKey("inventory_schema.locations.location_id"),
        nullable=False
    )
    moved_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth_customer_schema.users.user_id"),
        nullable=False
    )
    reason = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    asset = relationship("Asset", back_populates="movements")
    origin_location = relationship("Location", foreign_keys=[origin_location_id])
    destination_location = relationship("Location", foreign_keys=[destination_location_id])
