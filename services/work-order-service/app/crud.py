from sqlalchemy.orm import Session
from app import models, schemas
from uuid import UUID

# --- WORK ORDERS CRUD ---
def get_work_order_by_id(db: Session, work_order_id: UUID):
    return db.query(models.WorkOrder).filter(models.WorkOrder.work_order_id == work_order_id).first()

def get_work_order_by_number(db: Session, order_number: str):
    return db.query(models.WorkOrder).filter(models.WorkOrder.order_number == order_number).first()

def get_work_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.WorkOrder).offset(skip).limit(limit).all()

def create_work_order(db: Session, work_order_in: schemas.WorkOrderCreate):
    db_wo = models.WorkOrder(
        order_number=work_order_in.order_number,
        client_agreement_id=work_order_in.client_agreement_id,
        location_id=work_order_in.location_id,
        assigned_technician_id=work_order_in.assigned_technician_id,
        status=work_order_in.status,
        scheduled_date=work_order_in.scheduled_date,
        completion_date=work_order_in.completion_date,
        notes=work_order_in.notes
    )
    db.add(db_wo)
    db.commit()
    db.refresh(db_wo)
    return db_wo

def update_work_order(db: Session, db_wo: models.WorkOrder, work_order_update: schemas.WorkOrderUpdate):
    update_data = work_order_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_wo, key, value)
    db.commit()
    db.refresh(db_wo)
    return db_wo

# --- WORK ORDER ASSETS CRUD ---
def create_work_order_asset(db: Session, work_order_id: UUID, asset_in: schemas.WorkOrderAssetCreate):
    db_wo_asset = models.WorkOrderAsset(
        work_order_id=work_order_id,
        installed_asset_id=asset_in.installed_asset_id,
        removed_asset_id=asset_in.removed_asset_id,
        action_type=asset_in.action_type
    )
    db.add(db_wo_asset)
    db.commit()
    db.refresh(db_wo_asset)
    return db_wo_asset

# --- FIELD EVIDENCE CRUD ---
def create_field_evidence(db: Session, work_order_id: UUID, evidence_in: schemas.FieldEvidenceCreate):
    db_evidence = models.FieldEvidence(
        work_order_id=work_order_id,
        image_url=evidence_in.image_url,
        signature_url=evidence_in.signature_url,
        comments=evidence_in.comments
    )
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    return db_evidence
