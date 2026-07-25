from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app import crud, schemas, auth

router = APIRouter()

# --- ORDERS ---

@router.post("/orders", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: schemas.OrderCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    # Auto-fill user_id from token to prevent spoofing
    order_in.user_id = UUID(user.get("user_id"))
    return crud.create_order(db, order_in)

@router.get("/orders", response_model=List[schemas.OrderResponse])
def get_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN"]))
):
    return crud.get_orders(db, skip, limit)

@router.get("/orders/me", response_model=List[schemas.OrderResponse])
def get_my_orders(
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    user_id = UUID(user.get("user_id"))
    return crud.get_orders_by_user(db, user_id=user_id)

@router.get("/orders/{order_id}", response_model=schemas.OrderResponse)
def get_order_details(
    order_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    order = crud.get_order_by_id(db, order_id=order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada.")
        
    # Permission check: can only view own order unless admin
    if user.get("role") != "ADMIN" and order.user_id != UUID(user.get("user_id")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver esta orden."
        )
    return order


# --- PAYMENTS ---

@router.post("/payments", response_model=schemas.PaymentResponse, status_code=status.HTTP_201_CREATED)
def process_payment(
    payment_in: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    # Check if order exists
    order = crud.get_order_by_id(db, order_id=payment_in.order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada.")
        
    # Process
    return crud.create_payment(db, payment_in)


# --- DTE DOCUMENTS ---

@router.post("/dte-documents", response_model=schemas.DTEDocumentResponse, status_code=status.HTTP_201_CREATED)
def generate_dte_document(
    dte_in: schemas.DTEDocumentCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(auth.require_role(["ADMIN"]))
):
    # Verify order exists
    order = crud.get_order_by_id(db, order_id=dte_in.order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden no encontrada para emitir DTE.")
        
    return crud.create_dte_document(db, dte_in)
