from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app import crud, schemas, auth

router = APIRouter()

# --- PEDIDOS ---

@router.post("/pedidos", response_model=schemas.PedidoRespuesta, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: schemas.PedidoCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    # Auto-fill usuario_id from token to prevent spoofing
    order_in.usuario_id = UUID(user.get("usuario_id"))
    return crud.crear_pedido(db, order_in)

@router.get("/pedidos", response_model=List[schemas.PedidoRespuesta])
def get_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN"]))
):
    return crud.obtener_pedidos(db, skip, limit)

@router.get("/pedidos/me", response_model=List[schemas.PedidoRespuesta])
def get_my_orders(
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    usuario_id = UUID(user.get("usuario_id"))
    return crud.obtener_pedidos_por_usuario(db, usuario_id=usuario_id)

@router.get("/pedidos/{pedido_id}", response_model=schemas.PedidoRespuesta)
def get_order_details(
    pedido_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    pedido = crud.obtener_pedido_por_id(db, pedido_id=pedido_id)
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado.")
        
    # Permission check: can only view own order unless admin
    if user.get("role") != "ADMIN" and pedido.usuario_id != UUID(user.get("usuario_id")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver este pedido."
        )
    return pedido


# --- PAGOS ---

@router.post("/pagos", response_model=schemas.PagoRespuesta, status_code=status.HTTP_201_CREATED)
def process_payment(
    payment_in: schemas.PagoCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    # Check if order exists
    pedido = crud.obtener_pedido_por_id(db, pedido_id=payment_in.pedido_id)
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado.")
        
    # Process
    return crud.crear_pago(db, payment_in)


# --- DOCUMENTOS DTE ---

@router.post("/documentos-dte", response_model=schemas.DocumentoDTERespuesta, status_code=status.HTTP_201_CREATED)
def generate_dte_document(
    dte_in: schemas.DocumentoDTECrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN"]))
):
    # Verify order exists
    pedido = crud.obtener_pedido_por_id(db, pedido_id=dte_in.pedido_id)
    if not pedido:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado para emitir DTE.")
        
    return crud.crear_documento_dte(db, dte_in)


# --- COTIZACIONES (QUOTATIONS) ---

@router.post("/cotizaciones", response_model=schemas.CotizacionRespuesta, status_code=status.HTTP_201_CREATED)
def create_quotation(
    quotation_in: schemas.CotizacionCrear,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    user_role = user.get("role")
    user_convenio = user.get("convenio_id")
    
    # Si es CLIENTE_CONVENIO, validar que sólo pueda crear cotizaciones para su propio convenio
    if user_role == "CLIENTE_CONVENIO":
        if not user_convenio or str(quotation_in.convenio_id) != user_convenio:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes autorización para generar cotizaciones a nombre de otra empresa o convenio."
            )
    elif user_role not in ["ADMIN", "JEFE_BODEGA"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear cotizaciones corporativas."
        )

    usuario_id = UUID(user.get("usuario_id")) if user.get("usuario_id") else None
    return crud.crear_cotizacion(db, quotation_in, usuario_id=usuario_id)

@router.get("/cotizaciones", response_model=List[schemas.CotizacionRespuesta])
def get_quotations(
    convenio_id: UUID = None,
    estado: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    user_role = user.get("role")
    user_convenio = user.get("convenio_id")
    
    # Aislamiento multi-tenant: CLIENTE_CONVENIO sólo puede ver sus propias cotizaciones
    if user_role == "CLIENTE_CONVENIO":
        if not user_convenio:
            return []
        # Sobrescribir cualquier convenio_id solicitado con el del usuario autenticado
        return crud.obtener_cotizaciones(db, convenio_id=UUID(user_convenio), estado=estado, skip=skip, limit=limit)
    
    if user_role in ["ADMIN", "JEFE_BODEGA"]:
        return crud.obtener_cotizaciones(db, convenio_id=convenio_id, estado=estado, skip=skip, limit=limit)
        
    return []

@router.get("/cotizaciones/{cotizacion_id}", response_model=schemas.CotizacionRespuesta)
def get_quotation_details(
    cotizacion_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    cotizacion = crud.obtener_cotizacion_por_id(db, cotizacion_id=cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada.")
        
    user_role = user.get("role")
    user_convenio = user.get("convenio_id")
    
    # Validación IDOR: Verificar pertenencia
    if user_role == "CLIENTE_CONVENIO":
        if not user_convenio or str(cotizacion.convenio_id) != user_convenio:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para visualizar esta cotización."
            )
    elif user_role not in ["ADMIN", "JEFE_BODEGA"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para visualizar esta cotización."
        )

    return cotizacion

@router.post("/cotizaciones/{cotizacion_id}/aprobar", response_model=schemas.CotizacionRespuesta)
def approve_quotation_with_purchase_order(
    cotizacion_id: UUID,
    aprobar_in: schemas.CotizacionAprobarOC,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    cotizacion = crud.obtener_cotizacion_por_id(db, cotizacion_id=cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada.")
        
    user_role = user.get("role")
    user_convenio = user.get("convenio_id")
    
    # Validar que el cliente sólo pueda aprobar cotizaciones de su empresa
    if user_role == "CLIENTE_CONVENIO":
        if not user_convenio or str(cotizacion.convenio_id) != user_convenio:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para aprobar esta cotización."
            )
    elif user_role not in ["ADMIN", "JEFE_BODEGA"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para aprobar cotizaciones."
        )

    usuario_id = UUID(user.get("usuario_id")) if user.get("usuario_id") else None
    return crud.aprobar_cotizacion_con_orden_compra(db, cotizacion_id=cotizacion_id, aprobar_in=aprobar_in, usuario_id=usuario_id)

@router.patch("/cotizaciones/{cotizacion_id}/estado", response_model=schemas.CotizacionRespuesta)
def update_quotation_status(
    cotizacion_id: UUID,
    estado_in: schemas.CotizacionActualizarEstado,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN", "JEFE_BODEGA"]))
):
    cotizacion = crud.actualizar_estado_cotizacion(db, cotizacion_id=cotizacion_id, estado_in=estado_in)
    if not cotizacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada.")
    return cotizacion


