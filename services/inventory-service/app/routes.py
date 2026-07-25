from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app import crud, schemas, auth

router = APIRouter()

# --- LOCATIONS ---

@router.post("/locations", response_model=schemas.LocationResponse, status_code=status.HTTP_201_CREATED)
def create_location(
    location_in: schemas.LocationCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA"]))
):
    return crud.create_location(db, location_in)

@router.get("/locations", response_model=List[schemas.LocationResponse])
def get_locations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.get_locations(db, skip, limit)


# --- PRODUCT CATALOG ---

@router.post("/products", response_model=schemas.ProductCatalogResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: schemas.ProductCatalogCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA"]))
):
    db_product = crud.get_product_by_sku(db, sku=product_in.sku)
    if db_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un producto registrado con este SKU."
        )
    return crud.create_product(db, product_in)

@router.get("/products", response_model=List[schemas.ProductCatalogResponse])
def get_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.get_products(db, skip, limit)


# --- ASSETS ---

@router.post("/assets", response_model=schemas.AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: schemas.AssetCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO"]))
):
    # Verify product exists
    product = crud.get_product_by_id(db, product_id=asset_in.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado en catálogo.")
        
    # Verify location exists
    location = crud.get_location_by_id(db, location_id=asset_in.current_location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación no encontrada.")
        
    # Check if serial exists
    db_asset = crud.get_asset_by_serial(db, serial_number=asset_in.serial_number)
    if db_asset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un activo con este número de serie."
        )
        
    return crud.create_asset(db, asset_in)

@router.get("/assets", response_model=List[schemas.AssetResponse])
def get_assets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.get_assets(db, skip, limit)

@router.get("/assets/{asset_id}", response_model=schemas.AssetResponse)
def get_asset_details(
    asset_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    asset = crud.get_asset_by_id(db, asset_id=asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activo no encontrado.")
    return asset

@router.patch("/assets/{asset_id}", response_model=schemas.AssetResponse)
def update_asset(
    asset_id: UUID,
    asset_update: schemas.AssetUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO"]))
):
    asset = crud.get_asset_by_id(db, asset_id=asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activo no encontrado.")
        
    if asset_update.current_location_id:
        location = crud.get_location_by_id(db, location_id=asset_update.current_location_id)
        if not location:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación no encontrada.")
            
    return crud.update_asset(db, asset, asset_update)


# --- STOCK MOVEMENTS ---

@router.post("/movements", response_model=schemas.StockMovementResponse, status_code=status.HTTP_201_CREATED)
def record_stock_movement(
    movement_in: schemas.StockMovementCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    # Verify asset exists
    asset = crud.get_asset_by_id(db, asset_id=movement_in.asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activo no encontrado.")
        
    # Verify destination location exists
    dest_location = crud.get_location_by_id(db, location_id=movement_in.destination_location_id)
    if not dest_location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación de destino no encontrada.")
        
    # Verify origin location matches if provided
    if movement_in.origin_location_id:
        origin_location = crud.get_location_by_id(db, location_id=movement_in.origin_location_id)
        if not origin_location:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación de origen no encontrada.")
            
    # Auto-fill moved_by_user_id from JWT payload to prevent spoofing
    movement_in.moved_by_user_id = UUID(user.get("user_id"))
    
    return crud.create_stock_movement(db, movement_in)

@router.get("/movements", response_model=List[schemas.StockMovementResponse])
def get_movements(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.get_movements(db, skip, limit)
