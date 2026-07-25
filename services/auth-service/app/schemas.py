from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import RoleEnum

# --- PROFILE SCHEMAS ---
class CustomerProfileBase(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    commune: Optional[str] = None

class CustomerProfileCreate(CustomerProfileBase):
    agreement_id: Optional[UUID] = None

class CustomerProfileUpdate(CustomerProfileBase):
    agreement_id: Optional[UUID] = None

class CustomerProfileResponse(CustomerProfileBase):
    profile_id: UUID
    user_id: UUID
    agreement_id: Optional[UUID] = None

    class Config:
        from_attributes = True

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    rut: str = Field(..., max_length=12, description="RUT chileno (ej: 12345678-9)")
    email: EmailStr
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    role: RoleEnum = RoleEnum.CLIENTE_STANDARD
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Contraseña en texto plano")

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[RoleEnum] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    profile: Optional[CustomerProfileResponse] = None

    class Config:
        from_attributes = True

# --- AGREEMENT SCHEMAS ---
class AgreementBase(BaseModel):
    company_name: str = Field(..., max_length=150)
    rut: str = Field(..., max_length=12)
    credit_limit: float = 0.00
    used_credit: float = 0.00
    is_active: bool = True

class AgreementCreate(AgreementBase):
    pass

class AgreementUpdate(BaseModel):
    company_name: Optional[str] = None
    rut: Optional[str] = None
    credit_limit: Optional[float] = None
    used_credit: Optional[float] = None
    is_active: Optional[bool] = None

class AgreementResponse(AgreementBase):
    agreement_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- AUTH & TOKEN SCHEMAS ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    email: Optional[EmailStr] = None
    role: Optional[RoleEnum] = None
