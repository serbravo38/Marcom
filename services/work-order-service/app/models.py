import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class EstadoOTEnum(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    ASIGNADA = "ASIGNADA"
    EN_PROCESO = "EN_PROCESO"
    COMPLETADA = "COMPLETADA"
    CANCELADA = "CANCELADA"

class OrdenTrabajo(Base):
    __tablename__ = "ordenes_trabajo"
    __table_args__ = {"schema": "esquema_ordenes_trabajo"}

    orden_trabajo_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    numero_orden = Column(String(20), unique=True, nullable=False)
    convenio_cliente_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_auth_clientes.convenios.convenio_id"),
        nullable=True
    )
    ubicacion_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_inventario.ubicaciones.ubicacion_id"),
        nullable=False
    )
    tecnico_asignado_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_auth_clientes.usuarios.usuario_id"),
        nullable=True
    )
    estado = Column(
        Enum(EstadoOTEnum, name="estado_ot_enum", schema="esquema_ordenes_trabajo"),
        nullable=False,
        default=EstadoOTEnum.PENDIENTE,
        server_default="PENDIENTE"
    )
    fecha_programada = Column(DateTime(timezone=True), nullable=False)
    fecha_termino = Column(DateTime(timezone=True), nullable=True)
    notas = Column(String, nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    activos = relationship("ActivoOrdenTrabajo", back_populates="orden_trabajo", cascade="all, delete-orphan")
    evidencias = relationship("EvidenciaTerreno", back_populates="orden_trabajo", cascade="all, delete-orphan")

class ActivoOrdenTrabajo(Base):
    __tablename__ = "activos_orden_trabajo"
    __table_args__ = {"schema": "esquema_ordenes_trabajo"}

    activo_ot_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    orden_trabajo_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_ordenes_trabajo.ordenes_trabajo.orden_trabajo_id", ondelete="CASCADE"),
        nullable=False
    )
    activo_instalado_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_inventario.activos.activo_id"),
        nullable=True
    )
    activo_retirado_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_inventario.activos.activo_id"),
        nullable=True
    )
    tipo_accion = Column(String(50), nullable=False) # ej. 'INSTALACION_NUEVA', 'REEMPLAZO_POR_FALLA', 'RETIRO'

    # Relaciones
    orden_trabajo = relationship("OrdenTrabajo", back_populates="activos")

class EvidenciaTerreno(Base):
    __tablename__ = "evidencias_terreno"
    __table_args__ = {"schema": "esquema_ordenes_trabajo"}

    evidencia_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    orden_trabajo_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_ordenes_trabajo.ordenes_trabajo.orden_trabajo_id", ondelete="CASCADE"),
        nullable=False
    )
    url_imagen = Column(String, nullable=False)
    url_firma = Column(String, nullable=True)
    comentarios = Column(String, nullable=True)
    fecha_captura = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    orden_trabajo = relationship("OrdenTrabajo", back_populates="evidencias")
