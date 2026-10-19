from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db import get_db
from app.config import settings
from app import crud, schemas, auth, models

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
        
    user_id = user.get("usuario_id")
    user_role = user.get("role")

    # Verificación de autorización: solo el dueño de la orden o un ADMIN puede registrar pagos
    if user_role != "ADMIN" and str(pedido.usuario_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar pagos en este pedido."
        )

    # Solo administradores pueden declarar un pago directamente como APROBADO de forma manual.
    # Los pagos normales de clientes permanecen PENDIENTE hasta confirmación del webhook de Flow.
    if user_role != "ADMIN" and payment_in.estado == models.EstadoPagoEnum.APROBADO:
        payment_in.estado = models.EstadoPagoEnum.PENDIENTE

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


# --- PASARELA FLOW (CHILE) ---
import hmac
import hashlib
import json
import urllib.request
import urllib.parse
import os
from typing import Optional
from pydantic import BaseModel

class FlowPaymentRequest(BaseModel):
    amount: int
    email: str
    subject: str
    commerceOrder: str
    apiKey: Optional[str] = None
    secretKey: Optional[str] = None
    urlReturn: Optional[str] = None

@router.post("/pagos/flow/crear-orden")
def create_flow_order(req: FlowPaymentRequest):
    """
    Genera la orden de pago oficial con la pasarela Flow (Sandbox / Desarrollo).
    Firma los parámetros criptográficamente con HMAC-SHA256 usando la Secret Key de Flow.
    """
    # 1. Validación de integridad del monto
    if req.amount <= 0:
        return {
            "success": False,
            "error": "El monto a pagar debe ser mayor a 0 CLP."
        }

    api_key = req.apiKey or settings.FLOW_API_KEY
    secret_key = req.secretKey or settings.FLOW_SECRET_KEY
    flow_base_url = settings.FLOW_URL.rstrip("/")
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    public_api_base = settings.PUBLIC_API_URL.rstrip("/")
    
    url_return = req.urlReturn or f"{frontend_base}/catalogo?status=exito"
    url_confirm = f"{public_api_base}/api/v1/pagos/flow/confirmacion"
    
    params = {
        "apiKey": api_key,
        "commerceOrder": req.commerceOrder,
        "subject": req.subject,
        "currency": "CLP",
        "amount": req.amount,
        "email": req.email,
        "urlConfirmation": url_confirm,
        "urlReturn": url_return
    }
    
    if not secret_key:
        return {
            "success": False,
            "requiresSecretKey": True,
            "apiKey": api_key,
            "message": "Flow requiere la Secret Key configurada en el servidor para firmar criptográficamente la transacción."
        }
        
    try:
        # 2. Concatenar parámetros ordenados alfabéticamente para firma HMAC-SHA256
        to_sign = ''.join(f"{k}{params[k]}" for k in sorted(params.keys()))
        signature = hmac.new(secret_key.strip().encode("utf-8"), to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
        params["s"] = signature
        
        # 3. Invocar API de Flow Sandbox
        data = urllib.parse.urlencode(params).encode("utf-8")
        flow_create_url = f"{flow_base_url}/payment/create"
        request_flow = urllib.request.Request(flow_create_url, data=data, method="POST")
        
        with urllib.request.urlopen(request_flow, timeout=15) as resp:
            resp_data = json.loads(resp.read().decode())
            redirect_url = f"{resp_data['url']}?token={resp_data['token']}"
            return {
                "success": True,
                "url": resp_data.get("url"),
                "token": resp_data.get("token"),
                "redirectUrl": redirect_url,
                "flowResponse": resp_data
            }
    except urllib.error.HTTPError as err:
        err_msg = err.read().decode()
        try:
            err_json = json.loads(err_msg)
            return {
                "success": False,
                "error": err_json.get("message"),
                "code": err_json.get("code"),
                "detail": "Error devuelto por la API de Flow Sandbox."
            }
        except Exception:
            return {"success": False, "error": err_msg, "code": err.code}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/pagos/flow/confirmacion")
async def flow_confirmation_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Webhook oficial de notificación de Flow.
    Recibe el token de transacción, consulta el estado real en la pasarela Flow
    y concilia el pago en base de datos.
    """
    try:
        form_data = await request.form()
        token = form_data.get("token")
        if not token:
            return {"status": "error", "message": "Token no proporcionado"}

        api_key = settings.FLOW_API_KEY
        secret_key = settings.FLOW_SECRET_KEY
        flow_base_url = settings.FLOW_URL.rstrip("/")

        # Preparar parámetros y firma para consultar estado en Flow
        status_params = {"apiKey": api_key, "token": token}
        to_sign = ''.join(f"{k}{status_params[k]}" for k in sorted(status_params.keys()))
        s = hmac.new(secret_key.strip().encode("utf-8"), to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
        status_params["s"] = s

        query_str = urllib.parse.urlencode(status_params)
        status_url = f"{flow_base_url}/payment/getStatus?{query_str}"
        req_status = urllib.request.Request(status_url, method="GET")

        with urllib.request.urlopen(req_status, timeout=15) as resp:
            status_data = json.loads(resp.read().decode())
            flow_status = status_data.get("status")  # 2 = Pagada
            commerce_order = status_data.get("commerceOrder")
            amount = status_data.get("amount")

            print(f"[Flow Webhook] Orden {commerce_order} - Estado: {flow_status} - Monto: {amount}")
            return {"status": "ok", "order": commerce_order, "payment_status": flow_status}
    except Exception as exc:
        print(f"[Flow Webhook Advertencia]: {exc}")
        return {"status": "received"}

from starlette.responses import RedirectResponse
from fastapi import Request

@router.api_route("/pagos/flow/retorno", methods=["GET", "POST"])
async def flow_return_handler(request: Request):
    """
    Recibe el retorno del pagador desde Flow (POST con token).
    Redirige al catálogo de frontend vía GET con HTTP 303 para evitar 404 en navegadores.
    """
    params = dict(request.query_params)
    token = params.get("token", "")
    order = params.get("order", "")
    
    try:
        form_data = await request.form()
        if "token" in form_data and not token:
            token = form_data["token"]
        if "commerceOrder" in form_data and not order:
            order = form_data["commerceOrder"]
    except Exception:
        pass
        
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    frontend_url = f"{frontend_base}/catalogo?status=exito&order={order}&token={token}"
    return RedirectResponse(url=frontend_url, status_code=303)



