import smtplib
import ssl
import logging
import html
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from app.config import settings
from app.schemas import SolicitudContacto

logger = logging.getLogger(__name__)

def _sanitize_header(text: str) -> str:
    """Elimina saltos de línea para prevenir inyección de cabeceras SMTP (CRLF Injection)."""
    if not text:
        return ""
    return str(text).replace("\r", " ").replace("\n", " ").strip()

def _escape_html(text: str) -> str:
    """Escapa entidades HTML para neutralizar inyecciones de código HTML en clientes de correo."""
    if not text:
        return ""
    return html.escape(str(text))

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
    asunto = _sanitize_header(f"[Nuevo Ticket {ticket_id}] {solicitud.tipo_consulta} - {solicitud.empresa or solicitud.nombre}")
    
    nombre_seguro = _escape_html(solicitud.nombre)
    empresa_seguro = _escape_html(solicitud.empresa or "Particular")
    correo_seguro = _escape_html(solicitud.correo)
    telefono_seguro = _escape_html(solicitud.telefono or "No especificado")
    tipo_seguro = _escape_html(solicitud.tipo_consulta)
    mensaje_seguro = _escape_html(solicitud.mensaje)
    
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
        <tr><td class="info-label">Nombre:</td><td class="info-value">{nombre_seguro}</td></tr>
        <tr><td class="info-label">Empresa / Razón Social:</td><td class="info-value">{empresa_seguro}</td></tr>
        <tr><td class="info-label">Correo Electrónico:</td><td class="info-value"><a href="mailto:{correo_seguro}" style="color: #38bdf8; text-decoration: none;">{correo_seguro}</a></td></tr>
        <tr><td class="info-label">Teléfono:</td><td class="info-value">{telefono_seguro}</td></tr>
        <tr><td class="info-label">Tipo de Servicio:</td><td class="info-value"><strong>{tipo_seguro}</strong></td></tr>
        <tr><td class="info-label">Fecha de Ingreso:</td><td class="info-value">{fecha_formateada}</td></tr>
      </table>

      <div class="section-title">Detalle de la Consulta</div>
      <div class="message-box">{mensaje_seguro}</div>
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
    destinatario = _sanitize_header(solicitud.correo)
    asunto = _sanitize_header(f"Hemos recibido tu requerimiento [{ticket_id}] - MARCOM Chile")
    
    nombre_seguro = _escape_html(solicitud.nombre)
    tipo_seguro = _escape_html(solicitud.tipo_consulta)
    mensaje_seguro = _escape_html(solicitud.mensaje)

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
      <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Estimado/a <strong>{nombre_seguro}</strong>,</p>
      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
        Hemos recibido exitosamente tu consulta relacionada con <strong>{tipo_seguro}</strong>.
      </p>
      
      <div style="text-align: center;">
        <div class="ticket-badge">Número de Ticket: {ticket_id}</div>
      </div>

      <div class="message-card">
        <strong>Resumen de tu consulta:</strong><br/>
        <em>"{mensaje_seguro}"</em>
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

def enviar_correo_recuperacion_clave(correo: str, nombre: str, clave_temporal: str) -> bool:
    """
    Envía una contraseña temporal segura por correo electrónico desde la cuenta corporativa (contacto@marcomchile.cl).
    """
    destinatario = _sanitize_header(correo)
    asunto = _sanitize_header("Contraseña Temporal de Recuperación - MARCOM Chile")
    
    nombre_seguro = _escape_html(nombre)
    clave_segura = _escape_html(clave_temporal)
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    enlace_reset = f"{frontend_base}/login?mode=reset"

    cuerpo_texto = f"""
Estimado/a {nombre},

Hemos recibido una solicitud para recuperar el acceso a tu cuenta en MARCOM Chile.

Tu Contraseña Temporal de recuperación es:
{clave_temporal}

¿Cómo utilizar tu contraseña temporal?
1. Ingresa esta Contraseña Temporal en la pantalla de recuperación de contraseña de MARCOM (o úsala para iniciar sesión en {frontend_base}/login).
2. Define tu nueva contraseña definitiva cumpliendo con la política de seguridad:
   - Mínimo 8 caracteres
   - Alfanumérica (al menos una letra mayúscula, una minúscula y un número)
   - Al menos un carácter especial (ej: !@#$%^&*._-)

Esta contraseña temporal es de un solo uso y expira en 30 minutos. Si no realizaste esta solicitud, tu contraseña actual sigue protegida y puedes ignorar este mensaje.

Atentamente,
Equipo de Seguridad MARCOM Chile
Correo oficial: {settings.SMTP_FROM}
    """.strip()

    cuerpo_html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.45); }}
    .header {{ background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 30px; text-align: left; }}
    .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; }}
    .content {{ padding: 28px 30px; }}
    .temp-pass-box {{ background: #0f172a; border: 2px dashed #38bdf8; border-radius: 10px; padding: 18px; text-align: center; font-family: monospace; font-size: 24px; font-weight: 800; letter-spacing: 3px; color: #38bdf8; margin: 18px 0; }}
    .policy-box {{ background: rgba(15, 23, 42, 0.7); border-left: 4px solid #10b981; border-radius: 6px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #cbd5e1; line-height: 1.6; }}
    .btn-link {{ display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin-top: 10px; }}
    .footer {{ background: #0b1120; padding: 16px 30px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MARCOM Chile</h1>
      <p style="margin: 4px 0 0; color: #bae6fd; font-size: 13px;">Recuperación de Acceso • Contraseña Temporal</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; color: #ffffff; margin-top: 0;">Estimado/a <strong>{nombre_seguro}</strong>,</p>
      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
        Hemos generado una <strong>Contraseña Temporal</strong> para que puedas recuperar el acceso a tu cuenta en la plataforma operativa de MARCOM:
      </p>
      <div class="temp-pass-box">{clave_segura}</div>
      <p style="font-size: 13.5px; color: #e2e8f0; line-height: 1.6;">
        Ingresa esta contraseña temporal en la ventana de recuperación (o inicia sesión con ella) para definir tu nueva contraseña personalizada.
      </p>
      <div class="policy-box">
        <strong style="color: #34d399;">Requisitos para tu nueva contraseña definitiva:</strong><br/>
        • Mínimo <strong>8 caracteres</strong> de longitud.<br/>
        • <strong>Alfanumérica:</strong> letras mayúsculas (A-Z), minúsculas (a-z) y números (0-9).<br/>
        • Al menos un <strong>carácter especial</strong> (ej: <code>! @ # $ % ^ &amp; * . _ -</code>).
      </div>
      <div style="text-align: center; margin: 22px 0 12px;">
        <a href="{enlace_reset}" class="btn-link">Ir a Restablecer Contraseña</a>
      </div>
      <p style="font-size: 12.5px; color: #94a3b8; margin-top: 18px;">
        Esta contraseña temporal es de uso único y tiene una validez de <strong>30 minutos</strong>. Si no solicitaste este cambio, tu clave actual permanece intacta.
      </p>
    </div>
    <div class="footer">
      Sociedad de Instalaciones Marcom Compañía Limitada • Enviado desde {settings.SMTP_FROM}
    </div>
  </div>
</body>
</html>
    """.strip()

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"MARCOM Seguridad <{settings.SMTP_FROM}>"
        msg["To"] = destinatario
        msg["Subject"] = asunto

        msg.attach(MIMEText(cuerpo_texto, "plain", "utf-8"))
        msg.attach(MIMEText(cuerpo_html, "html", "utf-8"))

        with _get_smtp_connection() as server:
            server.sendmail(settings.SMTP_FROM, [destinatario], msg.as_string())
        
        logger.info(f"Correo con contraseña temporal enviado exitosamente desde {settings.SMTP_FROM} a {destinatario}")
        return True
    except Exception as e:
        logger.error(f"Error al enviar correo con contraseña temporal a {destinatario}: {repr(e)}")
        return False

