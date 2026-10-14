import sys
import os
import uuid
import pytest

from tests.module_loader import isolate_service
isolate_service(os.path.join("services", "inventory-service"))

from app import schemas
from app.models import EstadoActivoEnum

def test_ubicacion_crear_bodega():
    """Valida la creación de una ubicación de tipo Bodega"""
    payload = {
        "nombre": "Bodega Principal Santiago",
        "direccion": "Av. Las Américas 1200",
        "region": "Región Metropolitana",
        "comuna": "Pudahuel",
        "es_bodega": True,
        "activo": True
    }
    ubicacion = schemas.UbicacionCrear(**payload)
    assert ubicacion.es_bodega is True
    assert ubicacion.convenio_id is None
    assert ubicacion.region == "Región Metropolitana"

def test_ubicacion_crear_local_convenio():
    """Valida la creación de un local vinculado a un convenio de cliente"""
    conv_id = uuid.uuid4()
    payload = {
        "codigo_local": "EDS-COPEC-1004",
        "nombre": "Pronto Copec La Dehesa",
        "direccion": "Av. El Rodeo 13000",
        "region": "Región Metropolitana",
        "comuna": "Lo Barnechea",
        "es_bodega": False,
        "convenio_id": conv_id,
        "cantidad_pantallas": 6
    }
    local = schemas.UbicacionCrear(**payload)
    assert local.es_bodega is False
    assert local.convenio_id == conv_id
    assert local.cantidad_pantallas == 6

def test_carga_masiva_locales():
    """Valida el schema de importación masiva de sucursales/estaciones de servicio"""
    conv_id = uuid.uuid4()
    payload = {
        "locales": [
            {
                "codigo_local": "LOC-01",
                "nombre": "Pronto A",
                "direccion": "Calle 1",
                "region": "RM",
                "comuna": "Santiago",
                "convenio_id": conv_id
            },
            {
                "codigo_local": "LOC-02",
                "nombre": "Pronto B",
                "direccion": "Calle 2",
                "region": "RM",
                "comuna": "Providencia",
                "convenio_id": conv_id
            }
        ]
    }
    bulk = schemas.UbicacionCargaMasiva(**payload)
    assert len(bulk.locales) == 2
    assert bulk.locales[0].codigo_local == "LOC-01"

def test_catalogo_productos():
    """Valida el schema de productos de cartelería digital / monitores"""
    payload = {
        "sku": "SAM-QM43R",
        "nombre": "Samsung UHD Signage QM43R 43\"",
        "marca": "Samsung",
        "categoria": "Monitores Profesionales",
        "pulgadas": 43.0,
        "descripcion": "Panel antirreflejo 4K UHD"
    }
    prod = schemas.CatalogoProductosCrear(**payload)
    assert prod.sku == "SAM-QM43R"
    assert prod.pulgadas == 43.0

def test_activo_fisico_estados():
    """Valida la asignación y enum de estados para activos tecnológicos"""
    prod_id = uuid.uuid4()
    ub_id = uuid.uuid4()
    
    payload = {
        "producto_id": prod_id,
        "numero_serie": "SN-SAMS-998877",
        "codigo_qr": "QR-MC-998877",
        "estado_actual": EstadoActivoEnum.NUEVO,
        "ubicacion_actual_id": ub_id
    }
    activo = schemas.ActivoCrear(**payload)
    assert activo.estado_actual == EstadoActivoEnum.NUEVO
    assert activo.numero_serie == "SN-SAMS-998877"

def test_movimiento_stock():
    """Valida el schema de registro de traslados de stock entre ubicaciones"""
    activo_id = uuid.uuid4()
    origen_id = uuid.uuid4()
    destino_id = uuid.uuid4()
    usuario_id = uuid.uuid4()
    
    payload = {
        "activo_id": activo_id,
        "ubicacion_origen_id": origen_id,
        "ubicacion_destino_id": destino_id,
        "usuario_movimiento_id": usuario_id,
        "motivo": "Despacho a terreno para reemplazo por falla técnica"
    }
    mov = schemas.MovimientoStockCrear(**payload)
    assert mov.activo_id == activo_id
    assert mov.ubicacion_destino_id == destino_id
