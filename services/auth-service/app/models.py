import enum
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Enum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class RolUsuario(str, enum.Enum):
    ADMIN = "ADMIN"
    JEFE_BODEGA = "JEFE_BODEGA"
    TECNICO_TERRENO = "TECNICO_TERRENO"
    CLIENTE_CONVENIO = "CLIENTE_CONVENIO"
    CLIENTE_ESTANDAR = "CLIENTE_ESTANDAR"

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "esquema_auth_clientes"}

    usuario_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    rut = Column(String(12), unique=True, nullable=False)
    correo = Column(String(150), unique=True, nullable=False)
    clave_hash = Column(String(255), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    rol = Column(
        Enum(RolUsuario, name="rol_usuario", schema="esquema_auth_clientes"),
        nullable=False,
        default=RolUsuario.CLIENTE_ESTANDAR,
        server_default="CLIENTE_ESTANDAR"
    )
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relación con perfil
    perfil = relationship("PerfilCliente", back_populates="usuario", uselist=False)

class Convenio(Base):
    __tablename__ = "convenios"
    __table_args__ = {"schema": "esquema_auth_clientes"}

    convenio_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    nombre_empresa = Column(String(150), nullable=False)
    rut = Column(String(12), unique=True, nullable=False)
    limite_credito = Column(Numeric(12, 2), nullable=False, default=0.00, server_default="0.00")
    credito_usado = Column(Numeric(12, 2), nullable=False, default=0.00, server_default="0.00")
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con perfiles
    perfiles = relationship("PerfilCliente", back_populates="convenio")

class PerfilCliente(Base):
    __tablename__ = "perfiles_clientes"
    __table_args__ = {"schema": "esquema_auth_clientes"}

    perfil_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    usuario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_auth_clientes.usuarios.usuario_id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    convenio_id = Column(
        UUID(as_uuid=True),
        ForeignKey("esquema_auth_clientes.convenios.convenio_id", ondelete="SET NULL"),
        nullable=True
    )
    telefono = Column(String(20), nullable=True)
    direccion = Column(String, nullable=True)
    region = Column(String(100), nullable=True)
    comuna = Column(String(100), nullable=True)

    # Relaciones
    usuario = relationship("Usuario", back_populates="perfil")
    convenio = relationship("Convenio", back_populates="perfiles")
