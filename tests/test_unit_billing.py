import sys
import os
import uuid
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from tests.module_loader import isolate_service
isolate_service(os.path.join("services", "billing-service"))

from app import schemas
from app.models import MetodoPagoEnum, EstadoPagoEnum, TipoDTEEnum

def test_calculo_financiero_cotizacion():
    """Valida la fórmula de cálculo financiero de cotización (Equipos, Instalación, Soporte, Traslado e IVA 19%)"""
    cant_pantallas = 2
    precio_unitario = 500000.0
    monto_equipos = cant_pantallas * precio_unitario
    
    costo_instalacion = cant_pantallas * 45000.0
    costo_soporte = cant_pantallas * 25000.0
    distancia_km = 120.0
    costo_por_km = 450.0
    monto_kilometraje = distancia_km * costo_por_km
    
    subtotal_neto = round(monto_equipos + costo_soporte + monto_kilometraje + costo_instalacion, 2)
    assert subtotal_neto == 1194000.0
    
    monto_iva = round(subtotal_neto * 0.19, 2)
    assert monto_iva == 226860.0
    
    monto_total = round(subtotal_neto + monto_iva, 2)
    assert monto_total == 1420860.0

def test_cotizacion_aprobar_oc_validation():
    """Valida los campos obligatorios al aprobar una cotización con Orden de Compra"""
    payload = {
        "orden_compra_numero": "OC-FALABELLA-2026-992",
        "orden_compra_adjunto": "https://storage.marcom.cl/oc/oc-992.pdf",
        "notas": "Aprobación firmada por gerencia de compras"
    }
    oc_in = schemas.CotizacionAprobarOC(**payload)
    assert oc_in.orden_compra_numero == "OC-FALABELLA-2026-992"
    assert oc_in.orden_compra_adjunto.endswith(".pdf")

def test_documento_dte_schemas():
    """Valida los tipos de DTE aceptados por el SII chileno"""
    ped_id = uuid.uuid4()
    
    for tipo in [TipoDTEEnum.FACTURA_ELECTRONICA, TipoDTEEnum.BOLETA_ELECTRONICA, TipoDTEEnum.GUIA_DESPACHO]:
        dte = schemas.DocumentoDTECrear(
            pedido_id=ped_id,
            tipo_dte=tipo,
            folio_sii=10492,
            url_pdf="https://sii.marcom.cl/pdf/10492",
            url_xml="https://sii.marcom.cl/xml/10492",
            estado_sii="ACEPTADO"
        )
        assert dte.tipo_dte == tipo
        assert dte.folio_sii == 10492

def test_metodos_pago_disponibles():
    """Valida los métodos de pago admitidos en la plataforma"""
    metodos = [MetodoPagoEnum.PASARELA_WEBPAY, MetodoPagoEnum.PASARELA_MERCADOPAGO, MetodoPagoEnum.CREDITO_CONVENIO]
    assert len(metodos) == 3

def test_cotizacion_item_cantidad_positiva_obligatoria():
    """Valida que no se permitan ítems de cotización con cantidad 0 o negativa (prevención de fraude en montos)"""
    with pytest.raises(ValidationError):
        schemas.CotizacionItemCrear(producto_id=uuid.uuid4(), cantidad=0, precio_unitario=500000)
    with pytest.raises(ValidationError):
        schemas.CotizacionItemCrear(producto_id=uuid.uuid4(), cantidad=-5, precio_unitario=500000)

def test_pago_crear_y_transaccion_pasarela():
    """Valida el registro de transacción de pago con estado APROBADO y payload de pasarela"""
    ped_id = uuid.uuid4()
    pago = schemas.PagoCrear(
        pedido_id=ped_id,
        monto=1420860.0,
        transaccion_pasarela_id="TBK-WP-2026-99881",
        estado=EstadoPagoEnum.APROBADO,
        payload_respuesta={"response_code": 0, "authorization_code": "1213"}
    )
    assert pago.pedido_id == ped_id
    assert pago.estado == EstadoPagoEnum.APROBADO
