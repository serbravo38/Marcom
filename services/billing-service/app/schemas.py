from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from app.models import PaymentMethodEnum, PaymentStatusEnum, DTETypeEnum

# --- PAYMENTS ---
class PaymentBase(BaseModel):
    amount: float
    gateway_transaction_id: Optional[str] = Field(None, max_length=100)
    status: PaymentStatusEnum
    response_payload: Optional[Any] = None

class PaymentCreate(PaymentBase):
    order_id: UUID

class PaymentResponse(PaymentBase):
    payment_id: UUID
    order_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# --- DTE DOCUMENTS ---
class DTEDocumentBase(BaseModel):
    dte_type: DTETypeEnum
    sii_folio: Optional[int] = None
    pdf_url: Optional[str] = None
    xml_url: Optional[str] = None
    sii_status: str = "PENDIENTE"

class DTEDocumentCreate(DTEDocumentBase):
    order_id: UUID

class DTEDocumentResponse(DTEDocumentBase):
    dte_id: UUID
    order_id: UUID
    issued_at: datetime

    class Config:
        from_attributes = True

# --- ORDERS ---
class OrderBase(BaseModel):
    user_id: UUID
    total_amount: float
    payment_method: PaymentMethodEnum
    payment_status: PaymentStatusEnum = PaymentStatusEnum.PENDIENTE

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    payment_status: Optional[PaymentStatusEnum] = None

class OrderResponse(OrderBase):
    order_id: UUID
    created_at: datetime
    payments: List[PaymentResponse] = []
    dte_documents: List[DTEDocumentResponse] = []

    class Config:
        from_attributes = True
