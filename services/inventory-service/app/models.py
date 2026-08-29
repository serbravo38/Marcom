import enum
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Enum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class EstadoActivoEnum(str, enum.Enum):
    NUEVO = "NUEVO"
    USADO_BUEN_ESTADO = "USADO_BUEN_ESTADO"
    DEFECTUOSO = "DEFECTUOSO"
    EN_TRANSITO = "EN_TRANSITO"
    DADO_DE_BAJA = "DADO_DE_BAJA"

class Ubicacion(Base):
    __tablename__ = "ubicaciones"
    __table_args__ = {"schema": "esquema_inventario"}

    ubicacion_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    codigo_local = Column(String(50), unique=True, nullable=True)
    nombre = Column(String(150), nullable=False)
    direccion = Column(String, nullable=False)
    region = Column(String(100), nullable=False)
    comuna = Column(String(100), nullable=True)
    es_bodega = Column(Boolean, nullable=False, default=False, server_default="false")
    convenio_id = Column(UUID(as_uuid=True), nullable=True)
    nombre_encargado = Column(String(150), nullable=True)
    telefono_encargado = Column(String(20), nullable=True)
    correo_encargado = Column(String(150), nullable=True)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    activos = relationship("Activo", back_populates="ubicacion_actual")

class CatalogoProductos(Base):
    __tablename__ = "catalogo_productos"
    __table_args__ = {"schema": "esquema_inventario"}

    producto_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    sku = Column(String(50), unique=True, nullable=False)
    nombre = Column(String(150), nullable=False)
    marca = Column(String(100), nullable=False)
    categoria = Column(String(100), nullable=False)
    pulgadas = Column(Numeric(5, 2), nullable=True)
    descripcion = Column(String, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    activos = relationship("Activo", back_populates="producto")

class Activo(Base):
    __tablename__ = "activos"
    __table_args__ = {"schema": "esquema_inventario"}

    activo_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    producto_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_inventario.catalogo_productos.producto_id"),
        nullable=False
    )
    numero_serie = Column(String(100), unique=True, nullable=False)
    codigo_qr = Column(String(255), unique=True, nullable=True)
    estado_actual = Column(
        Enum(EstadoActivoEnum, name="estado_activo_enum", schema="esquema_inventario"),
        nullable=False,
        default=EstadoActivoEnum.NUEVO,
        server_default="NUEVO"
    )
    ubicacion_actual_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_inventario.ubicaciones.ubicacion_id"),
        nullable=False
    )
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relaciones
    producto = relationship("CatalogoProductos", back_populates="activos")
    ubicacion_actual = relationship("Ubicacion", back_populates="activos")
    movimientos = relationship("MovimientoStock", back_populates="activo")

class MovimientoStock(Base):
    __tablename__ = "movimientos_stock"
    __table_args__ = {"schema": "esquema_inventario"}

    movimiento_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    activo_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_inventario.activos.activo_id"),
        nullable=False
    )
    ubicacion_origen_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_inventario.ubicaciones.ubicacion_id"),
        nullable=True
    )
    ubicacion_destino_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_inventario.ubicaciones.ubicacion_id"),
        nullable=False
    )
    usuario_movimiento_id = Column(UUID(as_uuid=True), nullable=False)
    motivo = Column(String, nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    activo = relationship("Activo", back_populates="movimientos")
    ubicacion_origen = relationship("Ubicacion", foreign_keys=[ubicacion_origen_id])
    ubicacion_destino = relationship("Ubicacion", foreign_keys=[ubicacion_destino_id])
