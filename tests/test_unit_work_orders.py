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

def test_orden_trabajo_reapertura_y_edicion():
    """Valida el schema de edición y reapertura de una orden de trabajo completada o cancelada"""
    nuevo_tecnico_id = uuid.uuid4()
    reapertura = schemas.OrdenTrabajoActualizar(
        estado=EstadoOTEnum.EN_PROCESO,
        tecnico_asignado_id=nuevo_tecnico_id,
        fecha_termino=None,
        notas="Orden reabierta para revisión de cableado HDMI y calibración de brillo."
    )
    assert reapertura.estado == EstadoOTEnum.EN_PROCESO
    assert reapertura.fecha_termino is None
    assert reapertura.tecnico_asignado_id == nuevo_tecnico_id
    assert "reabierta" in reapertura.notas

def test_evidencia_firma_digital_validador_seguro():
    """Valida que el campo url_firma solo acepte esquemas seguros (data:image, https, etc.)"""
    firma_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    
    payload_valido = {
        "url_imagen": "https://storage.marcom.cl/fotos/ot-001.jpg",
        "url_firma": firma_base64,
        "comentarios": "Firma recepcionada por el supervisor de turno"
    }
    evidencia = schemas.EvidenciaTerrenoCrear(**payload_valido)
    assert evidencia.url_firma.startswith("data:image/")
    
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

def test_evidencia_ruta_local_permitida():
    """Valida que rutas locales relativas (/uploads/...) e imágenes data:image sean aceptadas"""
    evidencia = schemas.EvidenciaTerrenoCrear(
        url_imagen="/Monitores/Menu Board.jpg",
        url_firma="/firmas/recepcion_ot_102.png",
        comentarios="Instalación validada en local"
    )
    assert evidencia.url_imagen.startswith("/")
    assert evidencia.url_firma.startswith("/")

def test_cierre_movil_evidencia_foto_y_firma_tactil_recepcion():
    """Valida el cierre de orden desde el celular con foto de cámara, firma táctil en pantalla y acta de quién recepciona"""
    foto_camara_movil = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/"
    firma_tactil_pantalla = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    comentario_recepcion = "[Recepcionado por: Juan Pérez - Encargado Pronto Copec] Monitor Samsung 55 instalado y operativo en sala."

    evidencia_movil = schemas.EvidenciaTerrenoCrear(
        url_imagen=foto_camara_movil,
        url_firma=firma_tactil_pantalla,
        comentarios=comentario_recepcion
    )
    assert evidencia_movil.url_imagen.startswith("data:image/jpeg;base64,")
    assert evidencia_movil.url_firma.startswith("data:image/png;base64,")
    assert "[Recepcionado por: Juan Pérez" in evidencia_movil.comentarios

    cierre_ot = schemas.OrdenTrabajoActualizar(
        estado=EstadoOTEnum.COMPLETADA,
        fecha_termino=datetime.now(timezone.utc)
    )
    assert cierre_ot.estado == EstadoOTEnum.COMPLETADA
    assert cierre_ot.fecha_termino is not None

def test_evidencia_respuesta_incluye_firma_y_timestamp():
    """Valida el schema EvidenciaTerrenoRespuesta al consultar una OT cerrada con firma de recepción móvil"""
    ev_id = uuid.uuid4()
    ot_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    firma_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

    respuesta = schemas.EvidenciaTerrenoRespuesta(
        evidencia_id=ev_id,
        orden_trabajo_id=ot_id,
        url_imagen="data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        url_firma=firma_png,
        comentarios="[Recepcionado por: María Soto - Administradora] Trabajo recepcionado conforme en terreno",
        fecha_captura=now
    )
    assert respuesta.evidencia_id == ev_id
    assert respuesta.url_firma == firma_png
    assert "Recepcionado por: María Soto" in respuesta.comentarios
    assert respuesta.fecha_captura == now
