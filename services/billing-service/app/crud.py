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

# --- COTIZACIONES (QUOTATIONS) CRUD ---
import time
from datetime import datetime, timezone
from sqlalchemy import text

def _estimar_kilometros_internos(db: Session, ubicacion_id: UUID) -> float:
    """Calcula o estima internamente la distancia en kilómetros según la región/comuna del local"""
    try:
        query = text("SELECT region, comuna FROM esquema_inventario.ubicaciones WHERE ubicacion_id = :uid")
        result = db.execute(query, {"uid": ubicacion_id}).fetchone()
        if not result:
            return 25.0
        
        region = (result[0] or "").lower()
        comuna = (result[1] or "").lower()

        if "metropolitana" in region or "santiago" in region:
            if any(c in comuna for c in ["pudahuel", "maipu", "estacion central", "quilicura"]):
                return 15.0
            elif any(c in comuna for c in ["las condes", "vitacura", "lo barnechea", "la reina"]):
                return 35.0
            elif any(c in comuna for c in ["buin", "paine", "melipilla", "talagante", "colina"]):
                return 55.0
            return 25.0
        elif "valparaíso" in region or "valparaiso" in region or "viña" in region:
            return 125.0
        elif "o'higgins" in region or "rancagua" in region:
            return 95.0
        elif "maule" in region or "talca" in region:
            return 255.0
        elif "biobío" in region or "biobio" in region or "concepción" in region:
            return 500.0
        elif "coquimbo" in region or "la serena" in region:
            return 470.0
        elif "antofagasta" in region or "tarapacá" in region or "atacama" in region:
            return 1200.0
        elif "los lagos" in region or "puerto montt" in region:
            return 1020.0
        else:
            return 75.0
    except Exception:
        return 30.0

def _obtener_precio_producto_referencia(db: Session, producto_id: UUID) -> float:
    """Obtiene o estima precio de catálogo de monitor / equipo si no viene provisto"""
    try:
        query = text("SELECT pulgadas, nombre FROM esquema_inventario.catalogo_productos WHERE producto_id = :pid")
        result = db.execute(query, {"pid": producto_id}).fetchone()
        if result:
            pulgadas = float(result[0] or 55.0)
            if pulgadas >= 65.0:
                return 480000.0
            elif pulgadas >= 43.0:
                return 320000.0
            elif pulgadas >= 32.0:
                return 210000.0
        return 350000.0
    except Exception:
        return 350000.0

def crear_cotizacion(db: Session, cotizacion_in: schemas.CotizacionCrear, usuario_id: UUID = None):
    # 1. Generar número correlativo
    timestamp_suffix = int(time.time()) % 100000
    numero_cotizacion = f"COT-2026-{timestamp_suffix:05d}"
    
    # 2. Calcular distancia en KM si no fue provista (cálculo interno automático)
    distancia_km = cotizacion_in.distancia_km
    if distancia_km is None or distancia_km <= 0:
        distancia_km = _estimar_kilometros_internos(db, cotizacion_in.ubicacion_id)
    
    costo_por_km = cotizacion_in.costo_por_km if (cotizacion_in.costo_por_km is not None and cotizacion_in.costo_por_km > 0) else 450.00
    monto_kilometraje = round(distancia_km * costo_por_km, 2)
    
    # 3. Calcular equipos
    total_monitores = sum(item.cantidad for item in cotizacion_in.items)
    monto_equipos = 0.0
    items_to_save = []
    
    for item in cotizacion_in.items:
        precio_u = item.precio_unitario
        if precio_u is None or precio_u <= 0:
            precio_u = _obtener_precio_producto_referencia(db, item.producto_id)
        subt = round(item.cantidad * precio_u, 2)
        monto_equipos += subt
        items_to_save.append({
            "producto_id": item.producto_id,
            "cantidad": item.cantidad,
            "precio_unitario": precio_u,
            "subtotal": subt
        })
        
    # 4. Calcular costo de instalación interna (ej: $45.000 por monitor si no se especifica)
    costo_instalacion = cotizacion_in.costo_instalacion
    if costo_instalacion is None or costo_instalacion <= 0:
        costo_instalacion = round(total_monitores * 45000.0, 2)
        
    # 5. Calcular soporte interno (ej: $25.000 por monitor estándar convenio)
    costo_soporte = cotizacion_in.costo_soporte
    if costo_soporte is None:
        costo_soporte = round(total_monitores * 25000.0, 2)
        
    # 6. Totales financieros
    subtotal_neto = round(monto_equipos + costo_soporte + monto_kilometraje + costo_instalacion, 2)
    monto_iva = round(subtotal_neto * 0.19, 2)
    monto_total = round(subtotal_neto + monto_iva, 2)
    
    fecha_solicitud = cotizacion_in.fecha_solicitud_aprobacion or datetime.now(timezone.utc)
    
    db_cotizacion = models.Cotizacion(
        numero_cotizacion=numero_cotizacion,
        convenio_id=cotizacion_in.convenio_id,
        ubicacion_id=cotizacion_in.ubicacion_id,
        usuario_solicitante_id=usuario_id,
        tipo_soporte=cotizacion_in.tipo_soporte or "ESTANDAR_CONVENIO",
        costo_soporte=costo_soporte,
        distancia_km=distancia_km,
        costo_por_km=costo_por_km,
        monto_kilometraje=monto_kilometraje,
        costo_instalacion=costo_instalacion,
        monto_equipos=monto_equipos,
        subtotal_neto=subtotal_neto,
        monto_iva=monto_iva,
        monto_total=monto_total,
        fecha_solicitud_aprobacion=fecha_solicitud,
        estado="PENDIENTE_APROBACION",
        notas=cotizacion_in.notas
    )
    db.add(db_cotizacion)
    db.flush()
    
    for item_data in items_to_save:
        db_item = models.CotizacionItem(
            cotizacion_id=db_cotizacion.cotizacion_id,
            producto_id=item_data["producto_id"],
            cantidad=item_data["cantidad"],
            precio_unitario=item_data["precio_unitario"],
            subtotal=item_data["subtotal"]
        )
        db.add(db_item)
        
    db.commit()
    db.refresh(db_cotizacion)
    return db_cotizacion

def obtener_cotizaciones(db: Session, convenio_id: UUID = None, estado: str = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Cotizacion)
    if convenio_id:
        query = query.filter(models.Cotizacion.convenio_id == convenio_id)
    if estado:
        query = query.filter(models.Cotizacion.estado == estado)
    return query.order_by(models.Cotizacion.creado_en.desc()).offset(skip).limit(limit).all()

def obtener_cotizacion_por_id(db: Session, cotizacion_id: UUID):
    return db.query(models.Cotizacion).filter(models.Cotizacion.cotizacion_id == cotizacion_id).first()

def actualizar_estado_cotizacion(db: Session, cotizacion_id: UUID, estado_in: schemas.CotizacionActualizarEstado):
    db_cotizacion = obtener_cotizacion_por_id(db, cotizacion_id)
    if not db_cotizacion:
        return None
    db_cotizacion.estado = estado_in.estado
    if estado_in.notas:
        db_cotizacion.notas = (db_cotizacion.notas or "") + "\n" + estado_in.notas
    db.commit()
    db.refresh(db_cotizacion)
    return db_cotizacion

def aprobar_cotizacion_con_orden_compra(db: Session, cotizacion_id: UUID, aprobar_in: schemas.CotizacionAprobarOC, usuario_id: UUID = None):
    db_cotizacion = obtener_cotizacion_por_id(db, cotizacion_id)
    if not db_cotizacion:
        return None
        
    # 1. Registrar datos de Orden de Compra y Aprobación
    db_cotizacion.orden_compra_numero = aprobar_in.orden_compra_numero
    db_cotizacion.orden_compra_adjunto = aprobar_in.orden_compra_adjunto
    db_cotizacion.fecha_aprobacion = datetime.now(timezone.utc)
    db_cotizacion.estado = "APROBADA"
    if aprobar_in.notas:
        db_cotizacion.notas = (db_cotizacion.notas or "") + "\n" + f"[Aprobación OC]: {aprobar_in.notas}"
    
    # 2. Crear Pedido en esquema_facturacion con cargo a Crédito de Convenio
    usr_id = usuario_id or db_cotizacion.usuario_solicitante_id
    if not usr_id:
        # Fallback a un admin si no hay usuario
        admin_res = db.execute(text("SELECT usuario_id FROM esquema_auth_clientes.usuarios LIMIT 1")).fetchone()
        usr_id = admin_res[0] if admin_res else None

    db_pedido = models.Pedido(
        usuario_id=usr_id,
        monto_total=db_cotizacion.monto_total,
        metodo_pago=models.MetodoPagoEnum.CREDITO_CONVENIO,
        estado_pago=models.EstadoPagoEnum.APROBADO
    )
    db.add(db_pedido)
    db.flush()
    db_cotizacion.pedido_id = db_pedido.pedido_id
    
    # 3. Descontar crédito usado en el convenio correspondiente
    try:
        db.execute(
            text("""
                UPDATE esquema_auth_clientes.convenios 
                SET credito_usado = credito_usado + :monto 
                WHERE convenio_id = :cid
            """),
            {"monto": float(db_cotizacion.monto_total), "cid": db_cotizacion.convenio_id}
        )
    except Exception as e:
        print(f"Advertencia al actualizar crédito convenio: {e}")
        
    # 4. Generar Orden de Trabajo (OT) automáticamente en esquema_ordenes_trabajo
    try:
        numero_ot = f"OT-{int(time.time()) % 100000:05d}"
        notas_ot = f"Instalación de {len(db_cotizacion.items)} equipos generada desde Cotización {db_cotizacion.numero_cotizacion} (OC: {aprobar_in.orden_compra_numero})."
        ot_res = db.execute(
            text("""
                INSERT INTO esquema_ordenes_trabajo.ordenes_trabajo (
                    numero_orden, convenio_cliente_id, ubicacion_id, estado, fecha_programada, notas
                ) VALUES (
                    :num, :cid, :uid, 'PENDIENTE', CURRENT_TIMESTAMP + INTERVAL '3 days', :notas
                ) RETURNING orden_trabajo_id
            """),
            {
                "num": numero_ot,
                "cid": db_cotizacion.convenio_id,
                "uid": db_cotizacion.ubicacion_id,
                "notas": notas_ot
            }
        ).fetchone()
        
        if ot_res:
            db_cotizacion.orden_trabajo_id = ot_res[0]
    except Exception as e:
        print(f"Advertencia al generar Orden de Trabajo automática: {e}")
        
    db.commit()
    db.refresh(db_cotizacion)
    return db_cotizacion

