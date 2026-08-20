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
