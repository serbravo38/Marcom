from sqlalchemy.orm import Session
from app import models, schemas
from uuid import UUID

from typing import Optional, List

# --- LOCATION CRUD ---
def obtener_ubicacion_por_id(db: Session, ubicacion_id: UUID):
    return db.query(models.Ubicacion).filter(models.Ubicacion.ubicacion_id == ubicacion_id).first()

def obtener_ubicacion_por_codigo(db: Session, codigo_local: str):
    return db.query(models.Ubicacion).filter(models.Ubicacion.codigo_local == codigo_local).first()

def obtener_ubicaciones(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    convenio_id: Optional[UUID] = None,
    es_bodega: Optional[bool] = None,
    region: Optional[str] = None
):
    query = db.query(models.Ubicacion)
    if convenio_id is not None:
        query = query.filter(models.Ubicacion.convenio_id == convenio_id)
    if es_bodega is not None:
        query = query.filter(models.Ubicacion.es_bodega == es_bodega)
    if region is not None:
        query = query.filter(models.Ubicacion.region == region)
    return query.offset(skip).limit(limit).all()

def crear_ubicacion(db: Session, location_in: schemas.UbicacionCrear):
    db_location = models.Ubicacion(
        codigo_local=location_in.codigo_local,
        nombre=location_in.nombre,
        direccion=location_in.direccion,
        region=location_in.region,
        comuna=location_in.comuna,
        es_bodega=location_in.es_bodega,
        convenio_id=location_in.convenio_id,
        nombre_encargado=location_in.nombre_encargado,
        telefono_encargado=location_in.telefono_encargado,
        correo_encargado=location_in.correo_encargado,
        activo=location_in.activo
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

def actualizar_ubicacion(db: Session, db_location: models.Ubicacion, location_update: schemas.UbicacionActualizar):
    update_data = location_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_location, key, value)
    db.commit()
    db.refresh(db_location)
    return db_location

def crear_ubicaciones_masivo(db: Session, locales: List[schemas.UbicacionCrear]):
    nuevos = []
    for loc in locales:
        # Check if local code already exists, if so update it, otherwise insert
        if loc.codigo_local:
            existente = obtener_ubicacion_por_codigo(db, loc.codigo_local)
            if existente:
                existente.nombre = loc.nombre
                existente.direccion = loc.direccion
                existente.region = loc.region
                existente.comuna = loc.comuna
                existente.es_bodega = loc.es_bodega
                existente.convenio_id = loc.convenio_id
                existente.nombre_encargado = loc.nombre_encargado
                existente.telefono_encargado = loc.telefono_encargado
                existente.correo_encargado = loc.correo_encargado
                existente.activo = loc.activo
                nuevos.append(existente)
                continue

        db_loc = models.Ubicacion(
            codigo_local=loc.codigo_local,
            nombre=loc.nombre,
            direccion=loc.direccion,
            region=loc.region,
            comuna=loc.comuna,
            es_bodega=loc.es_bodega,
            convenio_id=loc.convenio_id,
            nombre_encargado=loc.nombre_encargado,
            telefono_encargado=loc.telefono_encargado,
            correo_encargado=loc.correo_encargado,
            activo=loc.activo
        )
        db.add(db_loc)
        nuevos.append(db_loc)
    
    db.commit()
    for db_loc in nuevos:
        db.refresh(db_loc)
    return nuevos

# --- PRODUCT CATALOG CRUD ---
def obtener_producto_por_id(db: Session, producto_id: UUID):
    return db.query(models.CatalogoProductos).filter(models.CatalogoProductos.producto_id == producto_id).first()

def obtener_producto_por_sku(db: Session, sku: str):
    return db.query(models.CatalogoProductos).filter(models.CatalogoProductos.sku == sku).first()

def obtener_productos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.CatalogoProductos).offset(skip).limit(limit).all()

def crear_producto(db: Session, product_in: schemas.CatalogoProductosCrear):
    db_product = models.CatalogoProductos(
        sku=product_in.sku,
        nombre=product_in.nombre,
        marca=product_in.marca,
        categoria=product_in.categoria,
        pulgadas=product_in.pulgadas,
        descripcion=product_in.descripcion
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

# --- ASSET CRUD ---
def obtener_activo_por_id(db: Session, activo_id: UUID):
    return db.query(models.Activo).filter(models.Activo.activo_id == activo_id).first()

def obtener_activo_por_serie(db: Session, numero_serie: str):
    return db.query(models.Activo).filter(models.Activo.numero_serie == numero_serie).first()

def obtener_activos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Activo).offset(skip).limit(limit).all()

def crear_activo(db: Session, asset_in: schemas.ActivoCrear):
    db_asset = models.Activo(
        producto_id=asset_in.producto_id,
        numero_serie=asset_in.numero_serie,
        codigo_qr=asset_in.codigo_qr,
        estado_actual=asset_in.estado_actual,
        ubicacion_actual_id=asset_in.ubicacion_actual_id
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

def actualizar_activo(db: Session, db_asset: models.Activo, asset_update: schemas.ActivoActualizar):
    update_data = asset_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_asset, key, value)
    db.commit()
    db.refresh(db_asset)
    return db_asset

# --- STOCK MOVEMENT CRUD ---
def obtener_movimientos_por_activo(db: Session, activo_id: UUID):
    return db.query(models.MovimientoStock).filter(models.MovimientoStock.activo_id == activo_id).all()

def obtener_movimientos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.MovimientoStock).offset(skip).limit(limit).all()

def crear_movimiento_stock(db: Session, movement_in: schemas.MovimientoStockCrear):
    # 1. Create the stock movement record
    db_movement = models.MovimientoStock(
        activo_id=movement_in.activo_id,
        ubicacion_origen_id=movement_in.ubicacion_origen_id,
        ubicacion_destino_id=movement_in.ubicacion_destino_id,
        usuario_movimiento_id=movement_in.usuario_movimiento_id,
        motivo=movement_in.motivo
    )
    db.add(db_movement)
    
    # 2. Update the asset's current location automatically
    db_asset = obtener_activo_por_id(db, movement_in.activo_id)
    if db_asset:
        db_asset.ubicacion_actual_id = movement_in.ubicacion_destino_id
        
    db.commit()
    db.refresh(db_movement)
    return db_movement
