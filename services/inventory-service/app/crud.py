from sqlalchemy.orm import Session
from app import models, schemas
from uuid import UUID

# --- LOCATION CRUD ---
def obtener_ubicacion_por_id(db: Session, ubicacion_id: UUID):
    return db.query(models.Ubicacion).filter(models.Ubicacion.ubicacion_id == ubicacion_id).first()

def obtener_ubicaciones(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Ubicacion).offset(skip).limit(limit).all()

def crear_ubicacion(db: Session, location_in: schemas.UbicacionCrear):
    db_location = models.Ubicacion(
        nombre=location_in.nombre,
        direccion=location_in.direccion,
        region=location_in.region,
        es_bodega=location_in.es_bodega
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

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
