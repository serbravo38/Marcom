import os
import sys

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Setup auth-service path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "services", "auth-service"))

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_1234567890_test_secret"

from app.schemas import SolicitudContacto, RespuestaContacto
from app import email_service
from app.routes import handle_contact_form
from fastapi import BackgroundTasks

def test_contacto_schema():
    payload = {
        "nombre": "Prueba Automatizada",
        "empresa": "Estación Central Copec",
        "correo": "contacto@marcomchile.cl",
        "telefono": "+56 9 1234 5678",
        "tipo_consulta": "Cartelería Digital & Menús Dinámicos",
        "mensaje": "Mensaje de prueba para verificar integración con correo."
    }
    solicitud = SolicitudContacto(**payload)
    assert solicitud.nombre == "Prueba Automatizada"
    assert solicitud.correo == "contacto@marcomchile.cl"
    assert solicitud.destino_notificacion == "contacto@marcomchile.cl"
    print("✓ SolicitudContacto schema validado exitosamente")

def test_endpoint_logic():
    solicitud = SolicitudContacto(
        ticket_id="MC-9999",
        nombre="Juan Pérez",
        empresa="Pronto Copec",
        correo="contacto@marcomchile.cl",
        telefono="+56 9 8450 1200",
        tipo_consulta="Mantenimiento en Terreno y Soporte SLA",
        mensaje="Prueba de flujo completo."
    )
    bg = BackgroundTasks()
    res = handle_contact_form(solicitud, bg)
    assert res.status == "success"
    assert res.ticket_id == "MC-9999"
    assert len(bg.tasks) == 2  # Notificación + Confirmación al cliente
    print("✓ Endpoint handle_contact_form y encolamiento background validado")

def test_smtp_notification():
    solicitud = SolicitudContacto(
        ticket_id="MC-TEST",
        nombre="Verificación Sistema",
        empresa="MARCOM Chile",
        correo="contacto@marcomchile.cl",
        telefono="+56 9 8450 1200",
        tipo_consulta="Consulta Comercial General",
        mensaje="Verificación de envío real a sunfire.mxrouting.net."
    )
    ok = email_service.enviar_notificacion_contacto(solicitud, "MC-TEST")
    assert ok is True
    print("✓ Envío SMTP real a contacto@marcomchile.cl completado con éxito")

if __name__ == "__main__":
    print("--- INICIANDO PRUEBAS DEL FLUJO DE CONTACTO Y CORREO ---")
    test_contacto_schema()
    test_endpoint_logic()
    test_smtp_notification()
    print("--- TODAS LAS PRUEBAS PASARON EXITOSAMENTE ---")
