import enum
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, Enum, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    JEFE_BODEGA = "JEFE_BODEGA"
    TECNICO_TERRENO = "TECNICO_TERRENO"
    CLIENTE_CONVENIO = "CLIENTE_CONVENIO"
    CLIENTE_STANDARD = "CLIENTE_STANDARD"

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "auth_customer_schema"}

    user_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    rut = Column(String(12), unique=True, nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(
        Enum(RoleEnum, name="role_enum", schema="auth_customer_schema"),
        nullable=False,
        default=RoleEnum.CLIENTE_STANDARD,
        server_default="CLIENTE_STANDARD"
    )
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to profile
    profile = relationship("CustomerProfile", back_populates="user", uselist=False)

class Agreement(Base):
    __tablename__ = "agreements"
    __table_args__ = {"schema": "auth_customer_schema"}

    agreement_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    company_name = Column(String(150), nullable=False)
    rut = Column(String(12), unique=True, nullable=False)
    credit_limit = Column(Numeric(12, 2), nullable=False, default=0.00, server_default="0.00")
    used_credit = Column(Numeric(12, 2), nullable=False, default=0.00, server_default="0.00")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to profiles
    profiles = relationship("CustomerProfile", back_populates="agreement")

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"
    __table_args__ = {"schema": "auth_customer_schema"}

    profile_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth_customer_schema.users.user_id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    agreement_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth_customer_schema.agreements.agreement_id", ondelete="SET NULL"),
        nullable=True
    )
    phone = Column(String(20), nullable=True)
    address = Column(String, nullable=True)
    region = Column(String(100), nullable=True)
    commune = Column(String(100), nullable=True)

    # Relationships
    user = relationship("User", back_populates="profile")
    agreement = relationship("Agreement", back_populates="profiles")
