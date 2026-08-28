from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app import crud, schemas, auth

router = APIRouter()

from typing import Optional

# --- UBICACIONES ---

@router.post("/ubicaciones", response_model=schemas.UbicacionRespuesta, status_code=status.HTTP_201_CREATED)
def create_location(
    location_in: schemas.UbicacionCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA"]))
):
    if location_in.codigo_local:
        db_existing = crud.obtener_ubicacion_por_codigo(db, codigo_local=location_in.codigo_local)
        if db_existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una ubicación registrada con el código de local '{location_in.codigo_local}'."
            )
    return crud.crear_ubicacion(db, location_in)

@router.post("/ubicaciones/carga-masiva", response_model=List[schemas.UbicacionRespuesta], status_code=status.HTTP_201_CREATED)
def bulk_create_locations(
    bulk_data: schemas.UbicacionCargaMasiva,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA"]))
):
    return crud.crear_ubicaciones_masivo(db, bulk_data.locales)

@router.get("/ubicaciones", response_model=List[schemas.UbicacionRespuesta])
def get_locations(
    skip: int = 0,
    limit: int = 100,
    convenio_id: Optional[UUID] = None,
    es_bodega: Optional[bool] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.obtener_ubicaciones(db, skip=skip, limit=limit, convenio_id=convenio_id, es_bodega=es_bodega, region=region)

@router.get("/ubicaciones/{ubicacion_id}", response_model=schemas.UbicacionRespuesta)
def get_location_details(
    ubicacion_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    location = crud.obtener_ubicacion_por_id(db, ubicacion_id=ubicacion_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación no encontrada.")
    return location

@router.patch("/ubicaciones/{ubicacion_id}", response_model=schemas.UbicacionRespuesta)
def update_location(
    ubicacion_id: UUID,
    location_update: schemas.UbicacionActualizar,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA"]))
):
    location = crud.obtener_ubicacion_por_id(db, ubicacion_id=ubicacion_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación no encontrada.")
    return crud.actualizar_ubicacion(db, location, location_update)


# --- CATALOGO PRODUCTOS ---

@router.post("/productos", response_model=schemas.CatalogoProductosRespuesta, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: schemas.CatalogoProductosCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA"]))
):
    db_product = crud.obtener_producto_por_sku(db, sku=product_in.sku)
    if db_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un producto registrado con este SKU."
        )
    return crud.crear_producto(db, product_in)

@router.get("/productos", response_model=List[schemas.CatalogoProductosRespuesta])
def get_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.obtener_productos(db, skip, limit)


# --- ACTIVOS ---

@router.post("/activos", response_model=schemas.ActivoRespuesta, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: schemas.ActivoCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO"]))
):
    # Verify product exists
    product = crud.obtener_producto_por_id(db, producto_id=asset_in.producto_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado en catálogo.")
        
    # Verify location exists
    location = crud.obtener_ubicacion_por_id(db, ubicacion_id=asset_in.ubicacion_actual_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación no encontrada.")
        
    # Check if serial exists
    db_asset = crud.obtener_activo_por_serie(db, numero_serie=asset_in.numero_serie)
    if db_asset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un activo con este número de serie."
        )
        
    return crud.crear_activo(db, asset_in)

@router.get("/activos", response_model=List[schemas.ActivoRespuesta])
def get_assets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.obtener_activos(db, skip, limit)

@router.get("/activos/{activo_id}", response_model=schemas.ActivoRespuesta)
def get_asset_details(
    activo_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    asset = crud.obtener_activo_por_id(db, activo_id=activo_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activo no encontrado.")
    return asset

@router.patch("/activos/{activo_id}", response_model=schemas.ActivoRespuesta)
def update_asset(
    activo_id: UUID,
    asset_update: schemas.ActivoActualizar,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA", "TECNICO_TERRENO"]))
):
    asset = crud.obtener_activo_por_id(db, activo_id=activo_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activo no encontrado.")
        
    if asset_update.ubicacion_actual_id:
        location = crud.obtener_ubicacion_por_id(db, ubicacion_id=asset_update.ubicacion_actual_id)
        if not location:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación no encontrada.")
            
    return crud.actualizar_activo(db, asset, asset_update)


# --- MOVIMIENTOS STOCK ---

@router.post("/movimientos", response_model=schemas.MovimientoStockRespuesta, status_code=status.HTTP_201_CREATED)
def record_stock_movement(
    movement_in: schemas.MovimientoStockCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    # Verify asset exists
    asset = crud.obtener_activo_por_id(db, activo_id=movement_in.activo_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activo no encontrado.")
        
    # Verify destination location exists
    dest_location = crud.obtener_ubicacion_por_id(db, ubicacion_id=movement_in.ubicacion_destino_id)
    if not dest_location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación de destino no encontrada.")
        
    # Verify origin location matches if provided
    if movement_in.ubicacion_origen_id:
        origin_location = crud.obtener_ubicacion_por_id(db, ubicacion_id=movement_in.ubicacion_origen_id)
        if not origin_location:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación de origen no encontrada.")
            
    # Auto-fill usuario_movimiento_id from JWT payload to prevent spoofing
    movement_in.usuario_movimiento_id = UUID(user.get("usuario_id"))
    
    return crud.crear_movimiento_stock(db, movement_in)

@router.get("/movimientos", response_model=List[schemas.MovimientoStockRespuesta])
def get_movements(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    return crud.obtener_movimientos(db, skip, limit)
