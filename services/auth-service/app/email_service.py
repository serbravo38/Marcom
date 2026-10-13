import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from app.config import settings
from app.schemas import SolicitudContacto

logger = logging.getLogger(__name__)

def _get_smtp_connection():
    """Crea y autentica la conexión SMTP según la configuración."""
    context = ssl.create_default_context()
    if settings.SMTP_USE_SSL or settings.SMTP_PORT == 465:
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=15)
    else:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        server.starttls(context=context)
    
    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
    return server

def enviar_notificacion_contacto(solicitud: SolicitudContacto, ticket_id: str) -> bool:
    """
    Envía correo con los detalles del formulario de contacto a la casilla oficial (contacto@marcomchile.cl).
    """
    destinatario = settings.SMTP_FROM or "contacto@marcomchile.cl"
    asunto = f"[Nuevo Ticket {ticket_id}] {solicitud.tipo_consulta} - {solicitud.empresa or solicitud.nombre}"
    
    fecha_formateada = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    # Contenido en Texto Plano
    cuerpo_texto = f"""
============================================================
NUEVA SOLICITUD DE CONTACTO / SOPORTE B2B - MARCOM CHILE
============================================================
Código de Ticket: {ticket_id}
Fecha de Ingreso: {fecha_formateada}

DATOS DEL CONTACTO:
- Nombre Completo: {solicitud.nombre}
- Empresa / Razón Social: {solicitud.empresa}
- Correo Electrónico: {solicitud.correo}
- Teléfono: {solicitud.telefono}
- Tipo de Consulta: {solicitud.tipo_consulta}

MENSAJE O REQUERIMIENTO:
{solicitud.mensaje}

============================================================
Este correo fue generado automáticamente por la plataforma web MARCOM.
    """.strip()

    # Contenido en HTML Estilizado
    cuerpo_html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
    .container {{ max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }}
    .header {{ background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 30px; text-align: left; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; }}
    .header p {{ margin: 4px 0 0; font-size: 13px; color: #bae6fd; }}
    .content {{ padding: 28px 30px; }}
    .ticket-badge {{ display: inline-block; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 999px; margin-bottom: 20px; }}
    .section-title {{ font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 6px; }}
    .info-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
    .info-table td {{ padding: 8px 0; font-size: 14px; vertical-align: top; }}
    .info-label {{ width: 38%; color: #94a3b8; font-weight: 600; }}
    .info-value {{ color: #ffffff; font-weight: 500; }}
    .message-box {{ background: #0f172a; border-left: 4px solid #38bdf8; padding: 16px 18px; border-radius: 6px; font-size: 14px; color: #e2e8f0; line-height: 1.6; white-space: pre-wrap; }}
    .footer {{ background: #0b1120; padding: 16px 30px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Mesa Operativa MARCOM Chile</h1>
      <p>Notificación de Requerimiento de Clientes y Terreno</p>
    </div>
    <div class="content">
      <div class="ticket-badge">Ticket: {ticket_id}</div>
      <div class="section-title">Información del Solicitante</div>
      <table class="info-table">
        <tr><td class="info-label">Nombre:</td><td class="info-value">{solicitud.nombre}</td></tr>
        <tr><td class="info-label">Empresa / Razón Social:</td><td class="info-value">{solicitud.empresa or "Particular"}</td></tr>
        <tr><td class="info-label">Correo Electrónico:</td><td class="info-value"><a href="mailto:{solicitud.correo}" style="color: #38bdf8; text-decoration: none;">{solicitud.correo}</a></td></tr>
        <tr><td class="info-label">Teléfono:</td><td class="info-value">{solicitud.telefono or "No especificado"}</td></tr>
        <tr><td class="info-label">Tipo de Servicio:</td><td class="info-value"><strong>{solicitud.tipo_consulta}</strong></td></tr>
        <tr><td class="info-label">Fecha de Ingreso:</td><td class="info-value">{fecha_formateada}</td></tr>
      </table>

      <div class="section-title">Detalle de la Consulta</div>
      <div class="message-box">{solicitud.mensaje}</div>
    </div>
    <div class="footer">
      Sociedad de Instalaciones Marcom Compañía Limitada • Correo oficial: {destinatario}
    </div>
  </div>
</body>
</html>
    """.strip()

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"MARCOM Notificaciones <{settings.SMTP_FROM}>"
        msg["To"] = destinatario
        msg["Reply-To"] = solicitud.correo
        msg["Subject"] = asunto

        msg.attach(MIMEText(cuerpo_texto, "plain", "utf-8"))
        msg.attach(MIMEText(cuerpo_html, "html", "utf-8"))

        with _get_smtp_connection() as server:
            server.sendmail(settings.SMTP_FROM, [destinatario], msg.as_string())
        
        logger.info(f"Correo de notificación del ticket {ticket_id} enviado exitosamente a {destinatario}")
        return True
    except Exception as e:
        logger.error(f"Error al enviar correo de notificación para ticket {ticket_id}: {repr(e)}")
        return False

def enviar_confirmacion_cliente(solicitud: SolicitudContacto, ticket_id: str) -> bool:
    """
    Envía acuse de recibo y copia de confirmación al correo del cliente.
    """
    destinatario = solicitud.correo
    asunto = f"Hemos recibido tu requerimiento [{ticket_id}] - MARCOM Chile"

    cuerpo_texto = f"""
Estimado/a {solicitud.nombre},

Hemos recibido correctamente tu consulta sobre "{solicitud.tipo_consulta}" a través de nuestra plataforma web.

Tu requerimiento ha sido registrado con el siguiente código de seguimiento:
Ticket: {ticket_id}

Un especialista de nuestra mesa operativa revisará los antecedentes y se pondrá en contacto contigo a la brevedad.

Horario de atención: Lunes a Viernes 08:30 - 18:30 hrs.
Mesa de ayuda: +56 9 8450 1200
Correo de contacto: {settings.SMTP_FROM}

Atentamente,
Equipo de Soporte y Operaciones
Sociedad de Instalaciones Marcom Compañía Limitada
    """.strip()

    cuerpo_html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
    .container {{ max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 30px; text-align: left; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; }}
    .content {{ padding: 28px 30px; }}
    .ticket-badge {{ display: inline-block; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; font-weight: 700; font-size: 14px; padding: 6px 14px; border-radius: 999px; margin: 16px 0; }}
    .message-card {{ background: #0f172a; border-radius: 8px; padding: 18px; border: 1px solid #334155; margin: 16px 0; font-size: 13.5px; color: #cbd5e1; line-height: 1.6; }}
    .footer {{ background: #0b1120; padding: 16px 30px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MARCOM Chile</h1>
      <p style="margin: 4px 0 0; color: #bae6fd; font-size: 13px;">Confirmación de Solicitud de Contacto</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Estimado/a <strong>{solicitud.nombre}</strong>,</p>
      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
        Hemos recibido exitosamente tu consulta relacionada con <strong>{solicitud.tipo_consulta}</strong>.
      </p>
      
      <div style="text-align: center;">
        <div class="ticket-badge">Número de Ticket: {ticket_id}</div>
      </div>

      <div class="message-card">
        <strong>Resumen de tu consulta:</strong><br/>
        <em>"{solicitud.mensaje}"</em>
      </div>

      <p style="font-size: 13.5px; color: #94a3b8; line-height: 1.6;">
        Nuestro equipo de operaciones y proyectos revisará tu requerimiento y te contactará a este correo o al número proporcionado.
      </p>

      <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 20px; font-size: 13px; color: #cbd5e1;">
        <strong>Canales de Atención Directa:</strong><br/>
        📞 Mesa de Ayuda: +56 9 8450 1200<br/>
        ✉️ Correo Oficial: <a href="mailto:{settings.SMTP_FROM}" style="color: #38bdf8;">{settings.SMTP_FROM}</a><br/>
        🕒 Horario: Lunes a Viernes 08:30 - 18:30 hrs
      </div>
    </div>
    <div class="footer">
      Sociedad de Instalaciones Marcom Compañía Limitada • Servicios de Telecomunicaciones n.c.p.
    </div>
  </div>
</body>
</html>
    """.strip()

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"MARCOM Chile <{settings.SMTP_FROM}>"
        msg["To"] = destinatario
        msg["Subject"] = asunto

        msg.attach(MIMEText(cuerpo_texto, "plain", "utf-8"))
        msg.attach(MIMEText(cuerpo_html, "html", "utf-8"))

        with _get_smtp_connection() as server:
            server.sendmail(settings.SMTP_FROM, [destinatario], msg.as_string())
        
        logger.info(f"Copia de confirmación del ticket {ticket_id} enviada exitosamente a cliente {destinatario}")
        return True
    except Exception as e:
        logger.error(f"Error al enviar confirmación al cliente {destinatario} para ticket {ticket_id}: {repr(e)}")
        return False
