from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models import OTStatusEnum

# --- WORK ORDER ASSETS ---
class WorkOrderAssetBase(BaseModel):
    installed_asset_id: Optional[UUID] = None
    removed_asset_id: Optional[UUID] = None
    action_type: str = Field(..., max_length=50, description="e.g. INSTALACION_NUEVA, REEMPLAZO_POR_FALLA, RETIRO")

class WorkOrderAssetCreate(WorkOrderAssetBase):
    pass

class WorkOrderAssetResponse(WorkOrderAssetBase):
    wo_asset_id: UUID
    work_order_id: UUID

    class Config:
        from_attributes = True

# --- FIELD EVIDENCES ---
class FieldEvidenceBase(BaseModel):
    image_url: str
    signature_url: Optional[str] = None
    comments: Optional[str] = None

class FieldEvidenceCreate(FieldEvidenceBase):
    pass

class FieldEvidenceResponse(FieldEvidenceBase):
    evidence_id: UUID
    work_order_id: UUID
    captured_at: datetime

    class Config:
        from_attributes = True

# --- WORK ORDERS ---
class WorkOrderBase(BaseModel):
    order_number: str = Field(..., max_length=20)
    client_agreement_id: Optional[UUID] = None
    location_id: UUID
    assigned_technician_id: Optional[UUID] = None
    status: OTStatusEnum = OTStatusEnum.PENDIENTE
    scheduled_date: datetime
    completion_date: Optional[datetime] = None
    notes: Optional[str] = None

class WorkOrderCreate(WorkOrderBase):
    pass

class WorkOrderUpdate(BaseModel):
    client_agreement_id: Optional[UUID] = None
    location_id: Optional[UUID] = None
    assigned_technician_id: Optional[UUID] = None
    status: Optional[OTStatusEnum] = None
    scheduled_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    notes: Optional[str] = None

class WorkOrderResponse(WorkOrderBase):
    work_order_id: UUID
    created_at: datetime
    assets: List[WorkOrderAssetResponse] = []
    evidences: List[FieldEvidenceResponse] = []

    class Config:
        from_attributes = True
