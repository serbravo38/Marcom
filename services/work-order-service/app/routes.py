from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app import crud, schemas, auth

router = APIRouter()

# --- WORK ORDERS ---

@router.post("/work-orders", response_model=schemas.WorkOrderResponse, status_code=status.HTTP_201_CREATED)
def create_work_order(
    work_order_in: schemas.WorkOrderCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA"]))
):
    db_wo = crud.get_work_order_by_number(db, order_number=work_order_in.order_number)
    if db_wo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una orden de trabajo con este número de orden."
        )
    return crud.create_work_order(db, work_order_in)

@router.get("/work-orders", response_model=List[schemas.WorkOrderResponse])
def get_work_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.get_work_orders(db, skip, limit)

@router.get("/work-orders/{work_order_id}", response_model=schemas.WorkOrderResponse)
def get_work_order(
    work_order_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    db_wo = crud.get_work_order_by_id(db, work_order_id=work_order_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
    return db_wo

@router.patch("/work-orders/{work_order_id}", response_model=schemas.WorkOrderResponse)
def update_work_order(
    work_order_id: UUID,
    work_order_update: schemas.WorkOrderUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    db_wo = crud.get_work_order_by_id(db, work_order_id=work_order_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
        
    # Permission check: Technicians can update, but maybe only status and notes. Admin/Jefe can update everything.
    # For now, let any authenticated technician or admin perform updates.
    if user.get("role") not in ["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar órdenes de trabajo."
        )
        
    return crud.update_work_order(db, db_wo, work_order_update)


# --- WORK ORDER ASSETS ---

@router.post("/work-orders/{work_order_id}/assets", response_model=schemas.WorkOrderAssetResponse, status_code=status.HTTP_201_CREATED)
def add_work_order_asset(
    work_order_id: UUID,
    asset_in: schemas.WorkOrderAssetCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO"]))
):
    db_wo = crud.get_work_order_by_id(db, work_order_id=work_order_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
        
    return crud.create_work_order_asset(db, work_order_id, asset_in)


# --- FIELD EVIDENCES ---

@router.post("/work-orders/{work_order_id}/evidences", response_model=schemas.FieldEvidenceResponse, status_code=status.HTTP_201_CREATED)
def upload_field_evidence(
    work_order_id: UUID,
    evidence_in: schemas.FieldEvidenceCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "TECNICO_TERRENO"]))
):
    db_wo = crud.get_work_order_by_id(db, work_order_id=work_order_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
        
    return crud.create_field_evidence(db, work_order_id, evidence_in)
