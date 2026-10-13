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
    tecnico_id: UUID = None,
    convenio_id: UUID = None,
    estado: str = None,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    user_role = user.get("role")
    user_id = user.get("usuario_id")
    user_convenio = user.get("convenio_id")
    
    # 1. TECNICO_TERRENO solo ve sus órdenes asignadas
    if user_role == "TECNICO_TERRENO":
        if not user_id:
            return []
        return crud.obtener_ordenes_trabajo(db, skip=skip, limit=limit, tecnico_id=UUID(user_id), estado=estado)
        
    # 2. CLIENTE_CONVENIO solo ve las órdenes de trabajo de sus locales
    if user_role == "CLIENTE_CONVENIO":
        if not user_convenio:
            return []
        return crud.obtener_ordenes_trabajo(db, skip=skip, limit=limit, convenio_id=UUID(user_convenio), estado=estado)
        
    # 3. ADMIN y JEFE_BODEGA ven todas o aplican filtros
    if user_role in ["ADMIN", "JEFE_BODEGA"]:
        return crud.obtener_ordenes_trabajo(
            db, 
            skip=skip, 
            limit=limit, 
            tecnico_id=tecnico_id, 
            convenio_id=convenio_id, 
            estado=estado
        )
        
    return []

@router.get("/ordenes-trabajo/{orden_trabajo_id}", response_model=schemas.OrdenTrabajoRespuesta)
def get_work_order(
    orden_trabajo_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    db_wo = crud.obtener_orden_trabajo_por_id(db, orden_trabajo_id=orden_trabajo_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
        
    user_role = user.get("role")
    user_id = user.get("usuario_id")
    user_convenio = user.get("convenio_id")
    
    # Verificación de permisos
    if user_role == "TECNICO_TERRENO":
        if not db_wo.tecnico_asignado_id or str(db_wo.tecnico_asignado_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para visualizar esta orden de trabajo asignada a otro técnico."
            )
    elif user_role == "CLIENTE_CONVENIO":
        if not db_wo.convenio_cliente_id or str(db_wo.convenio_cliente_id) != user_convenio:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para visualizar órdenes de trabajo de otra empresa."
            )
    elif user_role not in ["ADMIN", "JEFE_BODEGA"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a órdenes de trabajo."
        )

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
        
    user_role = user.get("role")
    user_id = user.get("usuario_id")
    
    # Si es técnico, verificar que esté asignado a esta orden
    if user_role == "TECNICO_TERRENO":
        if not db_wo.tecnico_asignado_id or str(db_wo.tecnico_asignado_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes modificar una orden de trabajo que no esté asignada a ti."
            )
        # Los técnicos no pueden reasignar el técnico asignado
        work_order_update.tecnico_asignado_id = db_wo.tecnico_asignado_id
    elif user_role not in ["ADMIN", "JEFE_BODEGA"]:
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
    user: dict = Depends(auth.verify_token)
):
    db_wo = crud.obtener_orden_trabajo_por_id(db, orden_trabajo_id=orden_trabajo_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
        
    user_role = user.get("role")
    user_id = user.get("usuario_id")
    if user_role == "TECNICO_TERRENO":
        if not db_wo.tecnico_asignado_id or str(db_wo.tecnico_asignado_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes asociar activos a una orden que no esté asignada a ti."
            )
    elif user_role not in ["ADMIN", "JEFE_BODEGA"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar activos en órdenes de trabajo."
        )
        
    return crud.crear_activo_orden_trabajo(db, orden_trabajo_id, asset_in)


# --- EVIDENCIAS ---

@router.post("/ordenes-trabajo/{orden_trabajo_id}/evidencias", response_model=schemas.EvidenciaTerrenoRespuesta, status_code=status.HTTP_201_CREATED)
def upload_field_evidence(
    orden_trabajo_id: UUID,
    evidence_in: schemas.EvidenciaTerrenoCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    db_wo = crud.obtener_orden_trabajo_por_id(db, orden_trabajo_id=orden_trabajo_id)
    if not db_wo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de trabajo no encontrada.")
        
    user_role = user.get("role")
    user_id = user.get("usuario_id")
    if user_role == "TECNICO_TERRENO":
        if not db_wo.tecnico_asignado_id or str(db_wo.tecnico_asignado_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes subir evidencias a una orden que no esté asignada a ti."
            )
    elif user_role not in ["ADMIN", "JEFE_BODEGA"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar evidencias en órdenes de trabajo."
        )
        
    return crud.crear_evidencia_terreno(db, orden_trabajo_id, evidence_in)

