from sqlalchemy.orm import Session
from app import models, schemas
from uuid import UUID

# --- ORDERS CRUD ---
def get_order_by_id(db: Session, order_id: UUID):
    return db.query(models.Order).filter(models.Order.order_id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).offset(skip).limit(limit).all()

def get_orders_by_user(db: Session, user_id: UUID):
    return db.query(models.Order).filter(models.Order.user_id == user_id).all()

def create_order(db: Session, order_in: schemas.OrderCreate):
    db_order = models.Order(
        user_id=order_in.user_id,
        total_amount=order_in.total_amount,
        payment_method=order_in.payment_method,
        payment_status=order_in.payment_status
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

def update_order_status(db: Session, db_order: models.Order, status: models.PaymentStatusEnum):
    db_order.payment_status = status
    db.commit()
    db.refresh(db_order)
    return db_order

# --- PAYMENTS CRUD ---
def create_payment(db: Session, payment_in: schemas.PaymentCreate):
    db_payment = models.Payment(
        order_id=payment_in.order_id,
        gateway_transaction_id=payment_in.gateway_transaction_id,
        amount=payment_in.amount,
        status=payment_in.status,
        response_payload=payment_in.response_payload
    )
    db.add(db_payment)
    
    # Auto update Order payment status if payment is approved
    db_order = get_order_by_id(db, payment_in.order_id)
    if db_order and payment_in.status == models.PaymentStatusEnum.APROBADO:
        db_order.payment_status = models.PaymentStatusEnum.APROBADO
        
    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_payments_by_order(db: Session, order_id: UUID):
    return db.query(models.Payment).filter(models.Payment.order_id == order_id).all()

# --- DTE DOCUMENTS CRUD ---
def create_dte_document(db: Session, dte_in: schemas.DTEDocumentCreate):
    db_dte = models.DTEDocument(
        order_id=dte_in.order_id,
        dte_type=dte_in.dte_type,
        sii_folio=dte_in.sii_folio,
        pdf_url=dte_in.pdf_url,
        xml_url=dte_in.xml_url,
        sii_status=dte_in.sii_status
    )
    db.add(db_dte)
    db.commit()
    db.refresh(db_dte)
    return db_dte
