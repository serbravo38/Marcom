from sqlalchemy.orm import Session
from app import models, schemas
from uuid import UUID

# --- ORDERS CRUD ---
def obtener_pedido_por_id(db: Session, pedido_id: UUID):
    return db.query(models.Pedido).filter(models.Pedido.pedido_id == pedido_id).first()

def obtener_pedidos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Pedido).offset(skip).limit(limit).all()

def obtener_pedidos_por_usuario(db: Session, usuario_id: UUID):
    return db.query(models.Pedido).filter(models.Pedido.usuario_id == usuario_id).all()

def crear_pedido(db: Session, pedido_in: schemas.PedidoCrear):
    db_pedido = models.Pedido(
        usuario_id=pedido_in.usuario_id,
        monto_total=pedido_in.monto_total,
        metodo_pago=pedido_in.metodo_pago,
        estado_pago=pedido_in.estado_pago
    )
    db.add(db_pedido)
    db.commit()
    db.refresh(db_pedido)
    return db_pedido

def actualizar_estado_pedido(db: Session, db_pedido: models.Pedido, estado: models.EstadoPagoEnum):
    db_pedido.estado_pago = estado
    db.commit()
    db.refresh(db_pedido)
    return db_pedido

# --- PAYMENTS CRUD ---
def crear_pago(db: Session, pago_in: schemas.PagoCrear):
    db_pago = models.Pago(
        pedido_id=pago_in.pedido_id,
        transaccion_pasarela_id=pago_in.transaccion_pasarela_id,
        monto=pago_in.monto,
        estado=pago_in.estado,
        payload_respuesta=pago_in.payload_respuesta
    )
    db.add(db_pago)
    
    # Auto update Order payment status if payment is approved
    db_pedido = obtener_pedido_por_id(db, pago_in.pedido_id)
    if db_pedido and pago_in.estado == models.EstadoPagoEnum.APROBADO:
        db_pedido.estado_pago = models.EstadoPagoEnum.APROBADO
        
    db.commit()
    db.refresh(db_pago)
    return db_pago

def obtener_pagos_por_pedido(db: Session, pedido_id: UUID):
    return db.query(models.Pago).filter(models.Pago.pedido_id == pedido_id).all()

# --- DTE DOCUMENTS CRUD ---
def crear_documento_dte(db: Session, dte_in: schemas.DocumentoDTECrear):
    db_dte = models.DocumentoDTE(
        pedido_id=dte_in.pedido_id,
        tipo_dte=dte_in.tipo_dte,
        folio_sii=dte_in.folio_sii,
        url_pdf=dte_in.url_pdf,
        url_xml=dte_in.url_xml,
        estado_sii=dte_in.estado_sii
    )
    db.add(db_dte)
    db.commit()
    db.refresh(db_dte)
    return db_dte
