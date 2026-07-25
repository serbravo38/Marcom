from sqlalchemy.orm import Session
from app import models, schemas
from uuid import UUID

# --- LOCATION CRUD ---
def get_location_by_id(db: Session, location_id: UUID):
    return db.query(models.Location).filter(models.Location.location_id == location_id).first()

def get_locations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Location).offset(skip).limit(limit).all()

def create_location(db: Session, location_in: schemas.LocationCreate):
    db_location = models.Location(
        name=location_in.name,
        address=location_in.address,
        region=location_in.region,
        is_warehouse=location_in.is_warehouse
    )
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

# --- PRODUCT CATALOG CRUD ---
def get_product_by_id(db: Session, product_id: UUID):
    return db.query(models.ProductCatalog).filter(models.ProductCatalog.product_id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.ProductCatalog).filter(models.ProductCatalog.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.ProductCatalog).offset(skip).limit(limit).all()

def create_product(db: Session, product_in: schemas.ProductCatalogCreate):
    db_product = models.ProductCatalog(
        sku=product_in.sku,
        name=product_in.name,
        brand=product_in.brand,
        category=product_in.category,
        size_inches=product_in.size_inches,
        description=product_in.description
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

# --- ASSET CRUD ---
def get_asset_by_id(db: Session, asset_id: UUID):
    return db.query(models.Asset).filter(models.Asset.asset_id == asset_id).first()

def get_asset_by_serial(db: Session, serial_number: str):
    return db.query(models.Asset).filter(models.Asset.serial_number == serial_number).first()

def get_assets(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Asset).offset(skip).limit(limit).all()

def create_asset(db: Session, asset_in: schemas.AssetCreate):
    db_asset = models.Asset(
        product_id=asset_in.product_id,
        serial_number=asset_in.serial_number,
        qr_code=asset_in.qr_code,
        current_status=asset_in.current_status,
        current_location_id=asset_in.current_location_id
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

def update_asset(db: Session, db_asset: models.Asset, asset_update: schemas.AssetUpdate):
    update_data = asset_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_asset, key, value)
    db.commit()
    db.refresh(db_asset)
    return db_asset

# --- STOCK MOVEMENT CRUD ---
def get_movements_by_asset(db: Session, asset_id: UUID):
    return db.query(models.StockMovement).filter(models.StockMovement.asset_id == asset_id).all()

def get_movements(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.StockMovement).offset(skip).limit(limit).all()

def create_stock_movement(db: Session, movement_in: schemas.StockMovementCreate):
    # 1. Create the stock movement record
    db_movement = models.StockMovement(
        asset_id=movement_in.asset_id,
        origin_location_id=movement_in.origin_location_id,
        destination_location_id=movement_in.destination_location_id,
        moved_by_user_id=movement_in.moved_by_user_id,
        reason=movement_in.reason
    )
    db.add(db_movement)
    
    # 2. Update the asset's current location automatically
    db_asset = get_asset_by_id(db, movement_in.asset_id)
    if db_asset:
        db_asset.current_location_id = movement_in.destination_location_id
        
    db.commit()
    db.refresh(db_movement)
    return db_movement
