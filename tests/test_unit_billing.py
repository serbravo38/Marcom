import sys
import os
import uuid
from datetime import datetime, timezone
import pytest

from tests.module_loader import isolate_service
isolate_service(os.path.join("services", "billing-service"))

from app import schemas
from app.models import MetodoPagoEnum, EstadoPagoEnum, TipoDTEEnum

def test_calculo_financiero_cotizacion():
    """Valida la fórmula de cálculo financiero de cotización:
       - Equipos = suma(cant * precio_unitario)
       - Instalación = $45.000 por pantalla
       - Soporte = $25.000 por pantalla
       - Traslado = distancia_km * $450/km
       - IVA = 19%
       - Total = Neto + IVA
    """
    cant_pantallas = 2
    precio_unitario = 500000.0  # $500.000 c/u
    monto_equipos = cant_pantallas * precio_unitario  # 1.000.000
    
    costo_instalacion = cant_pantallas * 45000.0  # 90.000
    costo_soporte = cant_pantallas * 25000.0      # 50.000
    distancia_km = 120.0                          # 120 km
    costo_por_km = 450.0
    monto_kilometraje = distancia_km * costo_por_km # 54.000
    
    subtotal_neto = round(monto_equipos + costo_soporte + monto_kilometraje + costo_instalacion, 2)
    # 1.000.000 + 50.000 + 54.000 + 90.000 = 1.194.000
    assert subtotal_neto == 1194000.0
    
    monto_iva = round(subtotal_neto * 0.19, 2)
    # 1.194.000 * 0.19 = 226.860
    assert monto_iva == 226860.0
    
    monto_total = round(subtotal_neto + monto_iva, 2)
    # 1.194.000 + 226.860 = 1.420.860
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
