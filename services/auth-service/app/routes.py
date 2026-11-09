from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text
from typing import List, Optional
from uuid import UUID
import random
import logging
import json
from app.db import get_db
from app.config import settings
from app import crud, schemas, auth, models, email_service

logger = logging.getLogger("auth_audit")
router = APIRouter()

def _ensure_auditoria_table(db: Session):
    try:
        db.execute(sql_text("""
            CREATE TABLE IF NOT EXISTS esquema_auth_clientes.auditoria_usuarios (
                auditoria_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                usuario_id UUID REFERENCES esquema_auth_clientes.usuarios(usuario_id) ON DELETE SET NULL,
                correo_usuario VARCHAR(150),
                nombre_usuario VARCHAR(150),
                rol_usuario VARCHAR(50),
                modulo VARCHAR(60) NOT NULL,
                accion VARCHAR(60) NOT NULL,
                descripcion VARCHAR(500) NOT NULL,
                metodo_http VARCHAR(15),
                ruta_endpoint VARCHAR(255),
                codigo_respuesta INTEGER,
                direccion_ip VARCHAR(60),
                dispositivo_user_agent VARCHAR(300),
                detalle_json TEXT,
                fecha_evento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning(f"No se pudo verificar tabla auditoria_usuarios: {exc}")

def _extract_request_meta(request: Optional[Request]) -> tuple[str, str]:
    if not request:
        return "127.0.0.1", "Desconocido"
    forwarded_for = request.headers.get("x-forwarded-for")
    real_ip = request.headers.get("x-real-ip")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    elif real_ip:
        ip = real_ip.strip()
    else:
        ip = request.client.host if request.client else "127.0.0.1"
    ua = (request.headers.get("user-agent") or "Navegador / Cliente API")[:300]
    return ip[:60], ua

def _registrar_evento_auditoria(
    db: Session,
    modulo: str,
    accion: str,
    descripcion: str,
    usuario: Optional[models.Usuario] = None,
    usuario_id: Optional[UUID] = None,
    correo_usuario: Optional[str] = None,
    nombre_usuario: Optional[str] = None,
    rol_usuario: Optional[str] = None,
    metodo_http: str = "POST",
    ruta_endpoint: str = "/api/v1/auth/iniciar-sesion",
    codigo_respuesta: int = 200,
    direccion_ip: str = "127.0.0.1",
    dispositivo_user_agent: str = "Navegador",
    detalle_dict: Optional[dict] = None
):
    try:
        _ensure_auditoria_table(db)
        uid = usuario.usuario_id if usuario else usuario_id
        correo = usuario.correo if usuario else correo_usuario
        nombre = f"{usuario.nombre} {usuario.apellido}".strip() if usuario else nombre_usuario
        rol = (usuario.rol.value if hasattr(usuario.rol, "value") else str(usuario.rol)) if usuario else rol_usuario
        detalle_str = json.dumps(detalle_dict, ensure_ascii=False) if detalle_dict else None

        nuevo_evento = models.AuditoriaUsuario(
            usuario_id=uid,
            correo_usuario=correo,
            nombre_usuario=nombre,
            rol_usuario=rol,
            modulo=modulo[:60],
            accion=accion[:60],
            descripcion=descripcion[:500],
            metodo_http=(metodo_http or "POST")[:15],
            ruta_endpoint=(ruta_endpoint or "")[:255],
            codigo_respuesta=codigo_respuesta,
            direccion_ip=(direccion_ip or "127.0.0.1")[:60],
            dispositivo_user_agent=(dispositivo_user_agent or "Navegador")[:300],
            detalle_json=detalle_str
        )
        db.add(nuevo_evento)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning(f"Error al guardar evento en auditoria_usuarios: {exc}")

# --- AUTH ENDPOINTS ---

@router.post("/auth/registrar", response_model=schemas.UsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def register_user(
    user_in: schemas.UsuarioCrear, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    # Check if email exists
    db_user = crud.obtener_usuario_por_correo(db, correo=user_in.correo)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )
    # Check if RUT exists
    db_user_rut = crud.obtener_usuario_por_rut(db, rut=user_in.rut)
    if db_user_rut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya está registrado."
        )
    return crud.crear_usuario(db=db, usuario_in=user_in)

@router.post("/auth/iniciar-sesion", response_model=schemas.Token)
def login_user(user_login: schemas.IniciarSesionUsuario, request: Request, db: Session = Depends(get_db)):
    ip_addr, user_agent = _extract_request_meta(request)
    user = crud.obtener_usuario_por_correo(db, correo=user_login.correo)
    if not user:
        # Prevenir enumeración y ataques de tiempo (timing attack mitigation)
        crud.verificar_clave_dummy(user_login.clave)
        _registrar_evento_auditoria(
            db,
            modulo="SESION_AUTH",
            accion="LOGIN_FALLIDO",
            descripcion=f"Intento de inicio de sesión con correo no registrado ({user_login.correo})",
            correo_usuario=user_login.correo,
            nombre_usuario="Usuario Desconocido",
            rol_usuario="NO_AUTENTICADO",
            metodo_http="POST",
            ruta_endpoint="/api/v1/auth/iniciar-sesion",
            codigo_respuesta=401,
            direccion_ip=ip_addr,
            dispositivo_user_agent=user_agent,
            detalle_dict={"motivo": "Correo no existe", "correo_intentado": user_login.correo}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 0. Verificar si el usuario está ingresando con una Contraseña Temporal de recuperación vigente
    if auth.check_temporary_password_for_user(user.correo, user_login.clave):
        if not user.activo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuario inactivo. Contacta al administrador."
            )
        crud.resetear_intentos_fallidos(db, user)
        logger.info(f"[AUDIT_SEGURIDAD] Ingreso con contraseña temporal válido para: {user.correo}. Requiere definir nueva clave.")
        _registrar_evento_auditoria(
            db,
            modulo="SESION_AUTH",
            accion="LOGIN_CLAVE_TEMPORAL",
            descripcion=f"Ingreso con contraseña temporal de recuperación ({user.correo}). Se solicitó cambio de clave.",
            usuario=user,
            metodo_http="POST",
            ruta_endpoint="/api/v1/auth/iniciar-sesion",
            codigo_respuesta=200,
            direccion_ip=ip_addr,
            dispositivo_user_agent=user_agent
        )
        return {
            "access_token": None,
            "token_type": "bearer",
            "requiere_mfa": False,
            "requiere_cambio_clave": True,
            "clave_temporal": user_login.clave.strip()
        }

    # 1. Verificar si la cuenta se encuentra actualmente bloqueada
    esta_bloqueado, segundos_restantes = crud.esta_cuenta_bloqueada(user)
    if esta_bloqueado:
        minutos_restantes = max(1, (segundos_restantes + 59) // 60)
        _registrar_evento_auditoria(
            db,
            modulo="SESION_AUTH",
            accion="CUENTA_BLOQUEADA",
            descripcion=f"Intento de acceso rechazado: cuenta {user.correo} se encuentra bloqueada temporalmente",
            usuario=user,
            metodo_http="POST",
            ruta_endpoint="/api/v1/auth/iniciar-sesion",
            codigo_respuesta=429,
            direccion_ip=ip_addr,
            dispositivo_user_agent=user_agent,
            detalle_dict={"segundos_restantes": segundos_restantes}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Cuenta bloqueada temporalmente por múltiples intentos fallidos. Inténtalo nuevamente en {minutos_restantes} minuto(s) o solicita una contraseña temporal de recuperación.",
            headers={"Retry-After": str(segundos_restantes)}
        )
    
    # 2. Verificar contraseña
    if not crud.verificar_clave(user_login.clave, user.clave_hash):
        intentos, bloqueado_ahora, segs = crud.registrar_intento_fallido(db, user)
        if bloqueado_ahora:
            logger.warning(f"[AUDIT_SEGURIDAD] Cuenta bloqueada por exceso de intentos fallidos: {user.correo}")
            minutos = max(1, (segs + 59) // 60)
            _registrar_evento_auditoria(
                db,
                modulo="SESION_AUTH",
                accion="CUENTA_BLOQUEADA",
                descripcion=f"Cuenta {user.correo} bloqueada por alcanzar {intentos} intentos fallidos de contraseña",
                usuario=user,
                metodo_http="POST",
                ruta_endpoint="/api/v1/auth/iniciar-sesion",
                codigo_respuesta=429,
                direccion_ip=ip_addr,
                dispositivo_user_agent=user_agent,
                detalle_dict={"intentos_fallidos": intentos, "bloqueo_minutos": minutos}
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos fallidos. Por motivos de seguridad, tu cuenta ha sido bloqueada temporalmente por {minutos} minutos. Puedes esperar o solicitar una contraseña temporal por correo para desbloquearla.",
                headers={"Retry-After": str(segs)}
            )
        else:
            logger.warning(f"[AUDIT_SEGURIDAD] Contraseña incorrecta para cuenta: {user.correo} (intentos: {intentos})")
            intentos_restantes = max(0, settings.MAX_FAILED_LOGIN_ATTEMPTS - intentos)
            _registrar_evento_auditoria(
                db,
                modulo="SESION_AUTH",
                accion="LOGIN_FALLIDO",
                descripcion=f"Contraseña incorrecta para {user.correo} (intento {intentos}/{settings.MAX_FAILED_LOGIN_ATTEMPTS})",
                usuario=user,
                metodo_http="POST",
                ruta_endpoint="/api/v1/auth/iniciar-sesion",
                codigo_respuesta=401,
                direccion_ip=ip_addr,
                dispositivo_user_agent=user_agent,
                detalle_dict={"intentos_acumulados": intentos, "intentos_restantes": intentos_restantes}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Credenciales incorrectas. Te quedan {intentos_restantes} intento(s) antes del bloqueo temporal de 5 minutos.",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    # 3. Comprobar si el usuario está activo
    if not user.activo:
        logger.warning(f"[AUDIT_SEGURIDAD] Intento de acceso a cuenta inactiva: {user.correo}")
        _registrar_evento_auditoria(
            db,
            modulo="SESION_AUTH",
            accion="LOGIN_FALLIDO",
            descripcion=f"Intento de inicio de sesión en cuenta inactiva ({user.correo})",
            usuario=user,
            metodo_http="POST",
            ruta_endpoint="/api/v1/auth/iniciar-sesion",
            codigo_respuesta=400,
            direccion_ip=ip_addr,
            dispositivo_user_agent=user_agent
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo. Contacta al administrador."
        )
    
    # 4. Login exitoso: Resetear contador de intentos fallidos y limpiar cualquier clave temporal sin usar
    crud.resetear_intentos_fallidos(db, user)
    auth.consume_temporary_password_for_user(user.correo)
    logger.info(f"[AUDIT_SEGURIDAD] Autenticación exitosa para: {user.correo} (rol: {user.rol})")
    
    # Extraer convenio_id si existe perfil
    convenio_id_val = None
    if user.perfil and user.perfil.convenio_id:
        convenio_id_val = str(user.perfil.convenio_id)
    
    # 5. Comprobar si el usuario tiene autenticación de dos factores (2FA / MFA) habilitada
    if user.mfa_habilitado and user.mfa_secreto:
        challenge_token = auth.create_mfa_challenge_token(str(user.usuario_id), user.correo)
        _registrar_evento_auditoria(
            db,
            modulo="SESION_AUTH",
            accion="DESAFIO_MFA",
            descripcion=f"Credenciales válidas para {user.correo}; se solicitó código de segundo factor 2FA/TOTP",
            usuario=user,
            metodo_http="POST",
            ruta_endpoint="/api/v1/auth/iniciar-sesion",
            codigo_respuesta=200,
            direccion_ip=ip_addr,
            dispositivo_user_agent=user_agent
        )
        return {
            "access_token": None,
            "token_type": "bearer",
            "requiere_mfa": True,
            "token_temporal_mfa": challenge_token
        }
    
    # Generate token
    token_data = {
        "usuario_id": str(user.usuario_id),
        "email": user.correo,
        "role": user.rol.value,
        "convenio_id": convenio_id_val
    }
    access_token = auth.create_access_token(data=token_data)
    _registrar_evento_auditoria(
        db,
        modulo="SESION_AUTH",
        accion="LOGIN_EXITOSO",
        descripcion=f"Inicio de sesión exitoso de {user.nombre} {user.apellido} ({user.correo}) con rol {user.rol.value}",
        usuario=user,
        metodo_http="POST",
        ruta_endpoint="/api/v1/auth/iniciar-sesion",
        codigo_respuesta=200,
        direccion_ip=ip_addr,
        dispositivo_user_agent=user_agent,
        detalle_dict={"autenticacion": "JWT Estándar", "rol": user.rol.value}
    )
    return {"access_token": access_token, "token_type": "bearer", "requiere_mfa": False}

@router.post("/auth/solicitar-recuperacion", response_model=schemas.RespuestaRecuperacion)
def request_password_reset(
    solicitud: schemas.SolicitudRecuperacionClave, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    user = crud.obtener_usuario_por_correo(db, correo=solicitud.correo)
    
    # Respuesta neutral y estándar para mitigar enumeración de cuentas
    mensaje_estandar = (
        f"Si el correo electrónico está registrado en el sistema, hemos enviado una contraseña temporal "
        f"desde {settings.SMTP_FROM} para que puedas recuperar tu acceso."
    )
    
    clave_para_respuesta = None
    
    if user and user.activo:
        clave_temporal = auth.generate_temporary_password()
        auth.register_temporary_password(
            usuario_id=str(user.usuario_id),
            correo=user.correo,
            clave_temporal=clave_temporal,
            expires_minutes=30
        )
        # Envío de la contraseña temporal vía correo electrónico oficial (contacto@marcomchile.cl)
        background_tasks.add_task(
            email_service.enviar_correo_recuperacion_clave,
            user.correo,
            user.nombre,
            clave_temporal
        )
        
        # En entorno de desarrollo (o flag activo) se adjunta para pruebas automatizadas
        if settings.ENVIRONMENT == "development" and settings.EXPOSE_RESET_TOKEN_IN_DEV:
            clave_para_respuesta = clave_temporal
    
    return {
        "mensaje": mensaje_estandar,
        "token_temporal": clave_para_respuesta,
        "clave_temporal": clave_para_respuesta
    }

@router.post("/auth/restablecer-clave", response_model=schemas.RespuestaRecuperacion)
def reset_password(datos: schemas.RestablecerClave, db: Session = Depends(get_db)):
    if datos.nueva_clave.strip() == datos.token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tu nueva contraseña definitiva debe ser diferente a la contraseña temporal recibida."
        )

    payload = auth.verify_temporary_password_or_token(datos.token, datos.correo)
    usuario_id = payload.get("usuario_id")
    
    user = crud.obtener_usuario_por_id(db, usuario_id=UUID(usuario_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario asociado a la solicitud no encontrado."
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta se encuentra inactiva. Contacta al administrador."
        )
        
    crud.cambiar_clave_usuario(db=db, db_usuario=user, nueva_clave=datos.nueva_clave)
    auth.consume_temporary_password_for_user(user.correo)
    logger.info(f"[AUDIT_SEGURIDAD] Contraseña restablecida exitosamente con clave temporal para usuario_id: {usuario_id} ({user.correo})")
    return {
        "mensaje": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña segura."
    }

# --- 2FA / MFA ENDPOINTS ---

@router.post("/auth/verificar-mfa", response_model=schemas.Token)
def verify_mfa_login(datos: schemas.SolicitudVerificarMFA, db: Session = Depends(get_db)):
    """
    Verifica el código TOTP o código de respaldo tras haber ingresado correo y contraseña válidos.
    Emite el token JWT definitivo para el usuario.
    """
    payload = auth.verify_mfa_challenge_token(datos.token_temporal)
    usuario_id_str = payload.get("usuario_id")
    
    user = crud.obtener_usuario_por_id(db, usuario_id=UUID(usuario_id_str))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    if not user.activo:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario inactivo.")
    if not (user.mfa_habilitado and user.mfa_secreto):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario no tiene 2FA configurado.")
    
    # 1. Verificar si la cuenta está bloqueada temporalmente
    esta_bloqueado, segundos_restantes = crud.esta_cuenta_bloqueada(user)
    if esta_bloqueado:
        minutos = max(1, (segundos_restantes + 59) // 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Cuenta bloqueada temporalmente por intentos fallidos. Inténtalo en {minutos} minuto(s).",
            headers={"Retry-After": str(segundos_restantes)}
        )
    
    # 2. Desencriptar secreto TOTP
    try:
        secreto_plano = auth.decrypt_mfa_secret(user.mfa_secreto)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de descifrado en la clave 2FA."
        )
    
    codigo = datos.codigo_totp.strip()
    es_valido = False
    
    # 3. Validar código TOTP (6 dígitos)
    if len(codigo) == 6 and codigo.isdigit():
        es_valido = auth.verify_totp_code(secreto_plano, codigo)
        
    # 4. Si falló TOTP, intentar como código de respaldo (backup code)
    if not es_valido and user.mfa_codigos_respaldo:
        valido_backup, nuevos_codigos_json = auth.verify_and_consume_backup_code(user.mfa_codigos_respaldo, codigo)
        if valido_backup and nuevos_codigos_json is not None:
            crud.actualizar_codigos_respaldo(db, user, nuevos_codigos_json)
            es_valido = True
    
    if not es_valido:
        intentos, bloqueado_ahora, segs = crud.registrar_intento_fallido(db, user)
        if bloqueado_ahora:
            minutos = max(1, (segs + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos fallidos de 2FA. Tu cuenta ha sido bloqueada temporalmente por {minutos} minutos.",
                headers={"Retry-After": str(segs)}
            )
        else:
            intentos_restantes = max(0, settings.MAX_FAILED_LOGIN_ATTEMPTS - intentos)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Código de autenticación 2FA incorrecto o expirado. Intentos restantes: {intentos_restantes}.",
                headers={"WWW-Authenticate": "Bearer"}
            )
            
    # Login 2FA exitoso: resetear intentos fallidos
    crud.resetear_intentos_fallidos(db, user)
    
    convenio_id_val = None
    if user.perfil and user.perfil.convenio_id:
        convenio_id_val = str(user.perfil.convenio_id)
        
    token_data = {
        "usuario_id": str(user.usuario_id),
        "email": user.correo,
        "role": user.rol.value,
        "convenio_id": convenio_id_val
    }
    access_token = auth.create_access_token(data=token_data)
    return {"access_token": access_token, "token_type": "bearer", "requiere_mfa": False}


@router.post("/auth/mfa/configurar", response_model=schemas.RespuestaConfigurarMFA)
def setup_mfa(
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera un nuevo secreto TOTP y el código QR para enrolamiento en Google Authenticator / Authy.
    El estado mfa_habilitado permanecerá en False hasta que el usuario confirme con un código válido.
    """
    secreto_plano = auth.generate_mfa_secret()
    secreto_cifrado = auth.encrypt_mfa_secret(secreto_plano)
    
    crud.guardar_secreto_mfa(db, current_user, secreto_cifrado)
    
    uri = auth.generate_totp_uri(secreto_plano, email=current_user.correo)
    qr_base64 = auth.generate_qr_base64(uri)
    
    return {
        "secreto_manual": secreto_plano,
        "qr_codigo_base64": qr_base64,
        "otpauth_url": uri
    }


@router.post("/auth/mfa/activar", response_model=schemas.RespuestaActivarMFA)
def activate_mfa(
    datos: schemas.SolicitudActivarMFA,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Valida el primer código TOTP para confirmar que la app del usuario está sincronizada correctamente.
    Activa permanentemente 2FA y genera 8 códigos de respaldo únicos.
    """
    if not current_user.mfa_secreto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Primero debes solicitar la configuración del 2FA (/auth/mfa/configurar)."
        )
        
    try:
        secreto_plano = auth.decrypt_mfa_secret(current_user.mfa_secreto)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al descifrar la clave 2FA."
        )
        
    codigo_valido = auth.verify_totp_code(secreto_plano, datos.codigo_totp)
    if not codigo_valido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de 6 dígitos ingresado es incorrecto o ha expirado. Verifica la hora de tu dispositivo e inténtalo nuevamente."
        )
        
    codigos_respaldo_planos, codigos_respaldo_json = auth.generate_backup_codes(count=8)
    crud.activar_mfa(db, current_user, codigos_respaldo_json)
    
    return {
        "mensaje": "¡Autenticación de doble factor (2FA) activada exitosamente!",
        "mfa_habilitado": True,
        "codigos_respaldo": codigos_respaldo_planos
    }


@router.post("/auth/mfa/desactivar")
def deactivate_mfa(
    datos: schemas.SolicitudDesactivarMFA,
    current_user: models.Usuario = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite desactivar 2FA confirmando contraseña actual y código TOTP / de respaldo vigente.
    """
    if not current_user.mfa_habilitado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La autenticación de doble factor no se encuentra habilitada."
        )
        
    # 1. Validar contraseña
    if not crud.verificar_clave(datos.clave, current_user.clave_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta."
        )
        
    # 2. Validar código 2FA
    secreto_plano = auth.decrypt_mfa_secret(current_user.mfa_secreto)
    codigo = datos.codigo_totp.strip()
    es_valido = False
    
    if len(codigo) == 6 and codigo.isdigit():
        es_valido = auth.verify_totp_code(secreto_plano, codigo)
    if not es_valido and current_user.mfa_codigos_respaldo:
        valido_backup, _ = auth.verify_and_consume_backup_code(current_user.mfa_codigos_respaldo, codigo)
        if valido_backup:
            es_valido = True
            
    if not es_valido:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código de verificación incorrecto o expirado."
        )
        
    crud.desactivar_mfa(db, current_user)
    return {"mensaje": "La autenticación de doble factor (2FA) ha sido desactivada correctamente."}


# --- USER ENDPOINTS ---

@router.get("/usuarios/me", response_model=schemas.UsuarioRespuesta)
def get_me(current_user: models.Usuario = Depends(auth.get_current_user)):
    return current_user

@router.put("/usuarios/me", response_model=schemas.UsuarioRespuesta)
def update_my_profile(
    profile_in: schemas.UsuarioActualizarMe,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    return crud.actualizar_datos_propios(db=db, db_usuario=current_user, datos=profile_in)

@router.get("/usuarios", response_model=List[schemas.UsuarioRespuesta])
def get_all_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    return crud.obtener_usuarios(db, skip=skip, limit=limit)

@router.post("/usuarios", response_model=schemas.UsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UsuarioCrear, 
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    # Check if email exists
    db_user = crud.obtener_usuario_por_correo(db, correo=user_in.correo)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )
    # Check if RUT exists
    db_user_rut = crud.obtener_usuario_por_rut(db, rut=user_in.rut)
    if db_user_rut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El RUT ya está registrado."
        )
    return crud.crear_usuario(db=db, usuario_in=user_in)

@router.get("/usuarios/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def get_user_by_id(
    usuario_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    user = crud.obtener_usuario_por_id(db, usuario_id=usuario_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return user

@router.put("/usuarios/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def update_user(
    usuario_id: UUID,
    user_update: schemas.UsuarioActualizar,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    # Check if user exists
    db_user = crud.obtener_usuario_por_id(db, usuario_id=usuario_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    
    # If updating email, check if it already exists
    if user_update.correo and user_update.correo.strip().lower() != db_user.correo.lower():
        other_user = crud.obtener_usuario_por_correo(db, correo=user_update.correo)
        if other_user and other_user.usuario_id != db_user.usuario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya está registrado por otro usuario."
            )
            
    # If updating RUT, check if it already exists
    if user_update.rut and user_update.rut != db_user.rut:
        other_user_rut = crud.obtener_usuario_por_rut(db, rut=user_update.rut)
        if other_user_rut and other_user_rut.usuario_id != db_user.usuario_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El RUT ya está registrado por otro usuario."
            )
    
    return crud.actualizar_usuario(db=db, db_usuario=db_user, usuario_update=user_update)

@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    usuario_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    # Prevent admin from deleting themselves
    if current_user.usuario_id == usuario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propia cuenta de administrador mientras tienes la sesión activa."
        )
        
    db_user = crud.obtener_usuario_por_id(db, usuario_id=usuario_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    
    from sqlalchemy.exc import IntegrityError
    try:
        crud.eliminar_usuario_seguro(db, db_usuario=db_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el usuario porque tiene registros asociados (movimientos, órdenes, etc.). Te recomendamos desactivarlo cambiando su estado a Inactivo."
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/usuarios/{usuario_id}/perfil", response_model=schemas.PerfilClienteRespuesta)
def update_user_profile(
    usuario_id: UUID,
    profile_in: schemas.PerfilClienteCrear,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # Security check: users can only edit their own profile, unless they are admin
    if current_user.rol != models.RolUsuario.ADMIN and current_user.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar el perfil de otro usuario."
        )
    
    # Check if user exists
    user = crud.obtener_usuario_por_id(db, usuario_id=usuario_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
        
    # Check if agreement exists (if provided)
    if profile_in.convenio_id:
        agreement = crud.obtener_convenio_por_id(db, convenio_id=profile_in.convenio_id)
        if not agreement:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convenio no encontrado.")
            
    return crud.crear_o_actualizar_perfil(db=db, usuario_id=usuario_id, perfil_in=profile_in)


# --- AGREEMENTS ENDPOINTS ---

@router.post("/convenios", response_model=schemas.ConvenioRespuesta, status_code=status.HTTP_201_CREATED)
def create_new_agreement(
    agreement_in: schemas.ConvenioCrear,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    db_agreement = crud.obtener_convenio_por_rut(db, rut=agreement_in.rut)
    if db_agreement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un convenio registrado con este RUT."
        )
    return crud.crear_convenio(db=db, convenio_in=agreement_in)

@router.get("/convenios", response_model=List[schemas.ConvenioRespuesta])
def list_agreements(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # CLIENTE_CONVENIO solo puede ver su propio convenio asignado
    if current_user.rol == models.RolUsuario.CLIENTE_CONVENIO:
        if current_user.perfil and current_user.perfil.convenio_id:
            conv = crud.obtener_convenio_por_id(db, convenio_id=current_user.perfil.convenio_id)
            return [conv] if conv else []
        return []
    
    # ADMIN y JEFE_BODEGA pueden consultar los convenios corporativos
    if current_user.rol in [models.RolUsuario.ADMIN, models.RolUsuario.JEFE_BODEGA]:
        return crud.obtener_convenios(db, skip=skip, limit=limit)
        
    return []

@router.get("/convenios/{convenio_id}", response_model=schemas.ConvenioRespuesta)
def get_agreement_by_id(
    convenio_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.get_current_user)
):
    # Seguridad multi-tenant: Si es CLIENTE_CONVENIO solo puede acceder al suyo
    if current_user.rol == models.RolUsuario.CLIENTE_CONVENIO:
        if not (current_user.perfil and current_user.perfil.convenio_id == convenio_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para consultar la información de este convenio corporativo."
            )
    elif current_user.rol not in [models.RolUsuario.ADMIN, models.RolUsuario.JEFE_BODEGA]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para consultar convenios corporativos."
        )

    conv = crud.obtener_convenio_por_id(db, convenio_id=convenio_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convenio no encontrado.")
    return conv

@router.patch("/convenios/{convenio_id}", response_model=schemas.ConvenioRespuesta)
@router.put("/convenios/{convenio_id}", response_model=schemas.ConvenioRespuesta)
def update_agreement(
    convenio_id: UUID,
    agreement_update: schemas.ConvenioActualizar,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    conv = crud.obtener_convenio_por_id(db, convenio_id=convenio_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convenio no encontrado.")
    
    if agreement_update.rut and agreement_update.rut != conv.rut:
        existente = crud.obtener_convenio_por_rut(db, rut=agreement_update.rut)
        if existente and existente.convenio_id != convenio_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Ya existe otro convenio registrado con este RUT."
            )

    return crud.actualizar_convenio(db, db_convenio=conv, convenio_update=agreement_update)

@router.delete("/convenios/{convenio_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agreement(
    convenio_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    conv = crud.obtener_convenio_por_id(db, convenio_id=convenio_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convenio no encontrado.")
    
    crud.eliminar_convenio(db=db, db_convenio=conv)
    return Response(status_code=status.HTTP_204_NO_CONTENT)




# --- CONTACTO Y FORMULARIO WEB ---

@router.post("/contacto", response_model=schemas.RespuestaContacto, status_code=status.HTTP_200_OK)
def handle_contact_form(
    solicitud: schemas.SolicitudContacto,
    background_tasks: BackgroundTasks
):
    """
    Recibe la solicitud del formulario de contacto web, asigna un número de ticket si no existe,
    y despacha en segundo plano las notificaciones por correo electrónico:
    1. Notificación con detalle a la casilla oficial (contacto@marcomchile.cl).
    2. Acuse de recibo y copia de respaldo al cliente.
    """
    ticket_id = solicitud.ticket_id or f"MC-{random.randint(1000, 9999)}"
    
    # Encolar envíos de correo en background para responder de inmediato al cliente (<100ms)
    background_tasks.add_task(email_service.enviar_notificacion_contacto, solicitud, ticket_id)
    background_tasks.add_task(email_service.enviar_confirmacion_cliente, solicitud, ticket_id)

    return schemas.RespuestaContacto(
        status="success",
        ticket_id=ticket_id,
        mensaje="Tu solicitud ha sido registrada y enviada a la mesa operativa exitosamente.",
        destino=settings.SMTP_FROM
    )


# --- CARRUSEL DE TRABAJOS REALIZADOS (PORTADA) ---
import json
from sqlalchemy import text as sql_text

def _ensure_portada_table(db: Session):
    db.execute(sql_text("""
        CREATE TABLE IF NOT EXISTS esquema_auth_clientes.configuracion_portada (
            clave VARCHAR(100) PRIMARY KEY,
            contenido_json TEXT NOT NULL,
            actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """))
    db.commit()

@router.get("/auth/trabajos-portada")
def get_trabajos_portada(db: Session = Depends(get_db)):
    try:
        _ensure_portada_table(db)
        row = db.execute(
            sql_text("SELECT contenido_json FROM esquema_auth_clientes.configuracion_portada WHERE clave = 'trabajos_carrusel'")
        ).fetchone()
        if row and row[0]:
            return {"items": json.loads(row[0])}
    except Exception as e:
        logger.warning(f"No se pudo leer trabajos_carrusel desde DB: {e}")
    return {"items": None}

@router.put("/auth/trabajos-portada")
def update_trabajos_portada(
    payload: schemas.ActualizarTrabajosPortada,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    _ensure_portada_table(db)
    serialized = json.dumps([item.model_dump() for item in payload.items], ensure_ascii=False)
    db.execute(
        sql_text("""
            INSERT INTO esquema_auth_clientes.configuracion_portada (clave, contenido_json, actualizado_en)
            VALUES ('trabajos_carrusel', :contenido, CURRENT_TIMESTAMP)
            ON CONFLICT (clave) DO UPDATE
            SET contenido_json = EXCLUDED.contenido_json,
                actualizado_en = CURRENT_TIMESTAMP;
        """),
        {"contenido": serialized}
    )
    db.commit()
    return {"status": "ok", "items": payload.items}


# --- AUDITORÍA Y BITÁCORA DE MOVIMIENTOS DE USUARIOS ---

@router.get("/auditoria", response_model=List[schemas.AuditoriaUsuarioRespuesta])
def get_audit_logs(
    modulo: Optional[str] = None,
    accion: Optional[str] = None,
    rol_usuario: Optional[str] = None,
    busqueda: Optional[str] = None,
    limit: int = 300,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    """
    Lista la bitácora completa de inicios de sesión y movimientos de usuarios logueados.
    Exclusivo para el rol ADMIN.
    """
    _ensure_auditoria_table(db)
    query = db.query(models.AuditoriaUsuario)

    if modulo and modulo.strip() and modulo != "TODOS":
        query = query.filter(models.AuditoriaUsuario.modulo == modulo.strip())
    if accion and accion.strip() and accion != "TODAS":
        query = query.filter(models.AuditoriaUsuario.accion == accion.strip())
    if rol_usuario and rol_usuario.strip() and rol_usuario != "TODOS":
        query = query.filter(models.AuditoriaUsuario.rol_usuario == rol_usuario.strip())
    if busqueda and busqueda.strip():
        term = f"%{busqueda.strip()}%"
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.AuditoriaUsuario.correo_usuario.ilike(term),
                models.AuditoriaUsuario.nombre_usuario.ilike(term),
                models.AuditoriaUsuario.descripcion.ilike(term),
                models.AuditoriaUsuario.ruta_endpoint.ilike(term),
                models.AuditoriaUsuario.direccion_ip.ilike(term)
            )
        )

    safe_limit = min(max(1, limit), 1000)
    return query.order_by(models.AuditoriaUsuario.fecha_evento.desc()).limit(safe_limit).all()


@router.post("/auditoria/registrar-evento", response_model=schemas.AuditoriaUsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def register_audit_event(
    evento_in: schemas.AuditoriaUsuarioCrear,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Registra un movimiento operativo de un usuario autenticado (invocado por el Interceptor del API Gateway
    o por acciones del cliente como cierre de sesión).
    """
    _ensure_auditoria_table(db)
    ip_addr, user_agent = _extract_request_meta(request)

    nombre_final = evento_in.nombre_usuario
    correo_final = evento_in.correo_usuario
    rol_final = evento_in.rol_usuario

    # Enriquecer con los datos reales del usuario en DB si solo viene usuario_id o correo
    db_user = None
    if evento_in.usuario_id:
        db_user = crud.obtener_usuario_por_id(db, evento_in.usuario_id)
    elif correo_final:
        db_user = crud.obtener_usuario_por_correo(db, correo_final)

    if db_user:
        if not nombre_final:
            nombre_final = f"{db_user.nombre} {db_user.apellido}".strip()
        if not correo_final:
            correo_final = db_user.correo
        if not rol_final:
            rol_final = db_user.rol.value if hasattr(db_user.rol, "value") else str(db_user.rol)

    nuevo_registro = models.AuditoriaUsuario(
        usuario_id=db_user.usuario_id if db_user else evento_in.usuario_id,
        correo_usuario=correo_final,
        nombre_usuario=nombre_final or "Usuario Autenticado",
        rol_usuario=rol_final or "AUTENTICADO",
        modulo=evento_in.modulo[:60],
        accion=evento_in.accion[:60],
        descripcion=evento_in.descripcion[:500],
        metodo_http=(evento_in.metodo_http or "POST")[:15],
        ruta_endpoint=(evento_in.ruta_endpoint or "")[:255],
        codigo_respuesta=evento_in.codigo_respuesta or 200,
        direccion_ip=(evento_in.direccion_ip or ip_addr)[:60],
        dispositivo_user_agent=(evento_in.dispositivo_user_agent or user_agent)[:300],
        detalle_json=evento_in.detalle_json
    )
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    return nuevo_registro



