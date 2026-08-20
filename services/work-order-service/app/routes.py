from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app import crud, schemas, auth

router = APIRouter()

# --- ORDENES TRABAJO ---

@router.post("/ordenes-trabajo", response_model=schemas.OrdenTrabajoRespuesta, status_code=status.HTTP_201_CREATED)
def create_work_order(
    work_order_in: schemas.OrdenTrabajoCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA"]))
):
    db_wo = crud.obtener_orden_trabajo_por_numero(db, numero_orden=work_order_in.numero_orden)
    if db_wo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una orden de trabajo con este número de orden."
        )
    return crud.crear_orden_trabajo(db, work_order_in)

@router.get("/ordenes-trabajo", response_model=List[schemas.OrdenTrabajoRespuesta])
def get_work_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.obtener_ordenes_trabajo(db, skip, limit)

@router.get("/ordenes-trabajo/{orden_trabajo_id}", response_model=schemas.OrdenTrabajoRespuesta)
def get_work_order(
    orden_trabajo_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    db_wo = crud.obtener_orden_trabajo_por_id(db, orden_trabajo_id=orden_trabajo_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
    return db_wo

@router.patch("/ordenes-trabajo/{orden_trabajo_id}", response_model=schemas.OrdenTrabajoRespuesta)
def update_work_order(
    orden_trabajo_id: UUID,
    work_order_update: schemas.OrdenTrabajoActualizar,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    db_wo = crud.obtener_orden_trabajo_por_id(db, orden_trabajo_id=orden_trabajo_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
        
    # Permission check: Technicians can update, but maybe only status and notes. Admin/Jefe can update everything.
    # For now, let any authenticated technician or admin perform updates.
    if user.get("role") not in ["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar órdenes de trabajo."
        )
        
    return crud.actualizar_orden_trabajo(db, db_wo, work_order_update)


# --- ACTIVO ORDEN TRABAJO ---

@router.post("/ordenes-trabajo/{orden_trabajo_id}/activos", response_model=schemas.ActivoOrdenTrabajoRespuesta, status_code=status.HTTP_201_CREATED)
def add_work_order_asset(
    orden_trabajo_id: UUID,
    asset_in: schemas.ActivoOrdenTrabajoCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO"]))
):
    db_wo = crud.obtener_orden_trabajo_por_id(db, orden_trabajo_id=orden_trabajo_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
        
    return crud.crear_activo_orden_trabajo(db, orden_trabajo_id, asset_in)


# --- EVIDENCIAS ---

@router.post("/ordenes-trabajo/{orden_trabajo_id}/evidencias", response_model=schemas.EvidenciaTerrenoRespuesta, status_code=status.HTTP_201_CREATED)
def upload_field_evidence(
    orden_trabajo_id: UUID,
    evidence_in: schemas.EvidenciaTerrenoCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "TECNICO_TERRENO"]))
):
    db_wo = crud.obtener_orden_trabajo_por_id(db, orden_trabajo_id=orden_trabajo_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
        
    return crud.crear_evidencia_terreno(db, orden_trabajo_id, evidence_in)
