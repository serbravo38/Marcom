from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import RolUsuario

# --- PROFILE SCHEMAS ---
class PerfilClienteBase(BaseModel):
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    region: Optional[str] = None
    comuna: Optional[str] = None

class PerfilClienteCrear(PerfilClienteBase):
    convenio_id: Optional[UUID] = None

class PerfilClienteActualizar(PerfilClienteBase):
    convenio_id: Optional[UUID] = None

class PerfilClienteRespuesta(PerfilClienteBase):
    perfil_id: UUID
    usuario_id: UUID
    convenio_id: Optional[UUID] = None

    class Config:
        from_attributes = True

# --- USER SCHEMAS ---
class UsuarioBase(BaseModel):
    rut: str = Field(..., max_length=12, description="RUT chileno (ej: 12345678-9)")
    correo: EmailStr
    nombre: str = Field(..., max_length=100)
    apellido: str = Field(..., max_length=100)
    rol: RolUsuario = RolUsuario.CLIENTE_ESTANDAR
    activo: bool = True

class UsuarioCrear(UsuarioBase):
    clave: str = Field(..., min_length=6, description="Contraseña en texto plano")

class UsuarioActualizar(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    rol: Optional[RolUsuario] = None
    activo: Optional[bool] = None
    clave: Optional[str] = None
    rut: Optional[str] = None
    correo: Optional[EmailStr] = None

class UsuarioRespuesta(UsuarioBase):
    usuario_id: UUID
    creado_en: datetime
    actualizado_en: datetime
    perfil: Optional[PerfilClienteRespuesta] = None

    class Config:
        from_attributes = True

# --- AGREEMENT SCHEMAS ---
class ConvenioBase(BaseModel):
    nombre_empresa: str = Field(..., max_length=150)
    rut: str = Field(..., max_length=12)
    limite_credito: float = 0.00
    credito_usado: float = 0.00
    activo: bool = True

class ConvenioCrear(ConvenioBase):
    pass

class ConvenioActualizar(BaseModel):
    nombre_empresa: Optional[str] = None
    rut: Optional[str] = None
    limite_credito: Optional[float] = None
    credito_usado: Optional[float] = None
    activo: Optional[bool] = None

class ConvenioRespuesta(ConvenioBase):
    convenio_id: UUID
    creado_en: datetime

    class Config:
        from_attributes = True

# --- AUTH & TOKEN SCHEMAS ---
class IniciarSesionUsuario(BaseModel):
    correo: EmailStr
    clave: str

class Token(BaseModel):
    access_token: str
    token_type: str

class DatosToken(BaseModel):
    usuario_id: Optional[UUID] = None
    correo: Optional[EmailStr] = None
    rol: Optional[RolUsuario] = None

class SolicitudRecuperacionClave(BaseModel):
    correo: EmailStr

class RestablecerClave(BaseModel):
    token: str
    nueva_clave: str = Field(..., min_length=6, description="Nueva contraseña (mínimo 6 caracteres)")

class RespuestaRecuperacion(BaseModel):
    mensaje: str
    token_temporal: Optional[str] = None

