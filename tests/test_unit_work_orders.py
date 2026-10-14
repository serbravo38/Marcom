import sys
import os
import uuid
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from tests.module_loader import isolate_service
isolate_service(os.path.join("services", "work-order-service"))

from app import schemas
from app.models import EstadoOTEnum

def test_orden_trabajo_crear_valida():
    """Valida la creación correcta de una orden de trabajo"""
    ub_id = uuid.uuid4()
    tec_id = uuid.uuid4()
    conv_id = uuid.uuid4()
    
    payload = {
        "numero_orden": "OT-2026-0001",
        "convenio_cliente_id": conv_id,
        "ubicacion_id": ub_id,
        "tecnico_asignado_id": tec_id,
        "estado": EstadoOTEnum.PENDIENTE,
        "fecha_programada": datetime.now(timezone.utc),
        "notas": "Instalación de tótem digital interactivo"
    }
    ot = schemas.OrdenTrabajoCrear(**payload)
    assert ot.numero_orden == "OT-2026-0001"
    assert ot.estado == EstadoOTEnum.PENDIENTE
    assert ot.ubicacion_id == ub_id

def test_orden_trabajo_estados_enum():
    """Valida que todos los estados del ciclo de vida de la OT sean reconocidos"""
    estados_esperados = ["PENDIENTE", "ASIGNADA", "EN_PROCESO", "COMPLETADA", "CANCELADA"]
    for estado_str in estados_esperados:
        estado_enum = EstadoOTEnum(estado_str)
        assert estado_enum.value == estado_str

def test_evidencia_firma_digital_validador_seguro():
    """Valida que el campo url_firma solo acepte esquemas seguros (data:image, https, etc.)"""
    # Firma en Base64 válida proveniente del canvas táctil
    firma_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    
    payload_valido = {
        "url_imagen": "https://storage.marcom.cl/fotos/ot-001.jpg",
        "url_firma": firma_base64,
        "comentarios": "Firma recepcionada por el supervisor de turno"
    }
    evidencia = schemas.EvidenciaTerrenoCrear(**payload_valido)
    assert evidencia.url_firma.startswith("data:image/")
    
    # Firma con esquema no permitido debe lanzar ValidationError
    payload_invalido = {
        "url_imagen": "javascript:alert(1)",
        "url_firma": "ftp://untrusted-server.com/malware.exe"
    }
    with pytest.raises(ValidationError):
        schemas.EvidenciaTerrenoCrear(**payload_invalido)

def test_activos_orden_trabajo():
    """Valida la vinculación de activos instalados o retirados a la OT"""
    instalado_id = uuid.uuid4()
    retirado_id = uuid.uuid4()
    
    payload = {
        "activo_instalado_id": instalado_id,
        "activo_retirado_id": retirado_id,
        "tipo_accion": "REEMPLAZO_POR_FALLA"
    }
    activo_ot = schemas.ActivoOrdenTrabajoCrear(**payload)
    assert activo_ot.activo_instalado_id == instalado_id
    assert activo_ot.tipo_accion == "REEMPLAZO_POR_FALLA"
