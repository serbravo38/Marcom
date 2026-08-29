from sqlalchemy.orm import Session
from app import models, schemas
from uuid import UUID

# --- WORK ORDERS CRUD ---
def obtener_orden_trabajo_por_id(db: Session, orden_trabajo_id: UUID):
    return db.query(models.OrdenTrabajo).filter(models.OrdenTrabajo.orden_trabajo_id == orden_trabajo_id).first()

def obtener_orden_trabajo_por_numero(db: Session, numero_orden: str):
    return db.query(models.OrdenTrabajo).filter(models.OrdenTrabajo.numero_orden == numero_orden).first()

def obtener_ordenes_trabajo(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.OrdenTrabajo).offset(skip).limit(limit).all()

def crear_orden_trabajo(db: Session, work_order_in: schemas.OrdenTrabajoCrear):
    db_wo = models.OrdenTrabajo(
        numero_orden=work_order_in.numero_orden,
        convenio_cliente_id=work_order_in.convenio_cliente_id,
        ubicacion_id=work_order_in.ubicacion_id,
        tecnico_asignado_id=work_order_in.tecnico_asignado_id,
        estado=work_order_in.estado,
        fecha_programada=work_order_in.fecha_programada,
        fecha_termino=work_order_in.fecha_termino,
        notas=work_order_in.notas
    )
    db.add(db_wo)
    db.commit()
    db.refresh(db_wo)
    return db_wo

def actualizar_orden_trabajo(db: Session, db_wo: models.OrdenTrabajo, work_order_update: schemas.OrdenTrabajoActualizar):
    update_data = work_order_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_wo, key, value)
    db.commit()
    db.refresh(db_wo)
    return db_wo

# --- WORK ORDER ASSETS CRUD ---
def crear_activo_orden_trabajo(db: Session, orden_trabajo_id: UUID, asset_in: schemas.ActivoOrdenTrabajoCrear):
    db_wo_asset = models.ActivoOrdenTrabajo(
        orden_trabajo_id=orden_trabajo_id,
        activo_instalado_id=asset_in.activo_instalado_id,
        activo_retirado_id=asset_in.activo_retirado_id,
        tipo_accion=asset_in.tipo_accion
    )
    db.add(db_wo_asset)
    db.commit()
    db.refresh(db_wo_asset)
    return db_wo_asset

# --- FIELD EVIDENCE CRUD ---
def crear_evidencia_terreno(db: Session, orden_trabajo_id: UUID, evidence_in: schemas.EvidenciaTerrenoCrear):
    db_evidence = models.EvidenciaTerreno(
        orden_trabajo_id=orden_trabajo_id,
        url_imagen=evidence_in.url_imagen,
        url_firma=evidence_in.url_firma,
        comentarios=evidence_in.comentarios
    )
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    return db_evidence
