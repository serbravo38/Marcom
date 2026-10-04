from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import random
from app.db import get_db
from app.config import settings
from app import crud, schemas, auth, models, email_service

router = APIRouter()

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
def login_user(user_login: schemas.IniciarSesionUsuario, db: Session = Depends(get_db)):
    user = crud.obtener_usuario_por_correo(db, correo=user_login.correo)
    if not user:
        # Prevenir enumeración y ataques de tiempo (timing attack mitigation)
        crud.verificar_clave_dummy(user_login.clave)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 1. Verificar si la cuenta se encuentra actualmente bloqueada
    esta_bloqueado, segundos_restantes = crud.esta_cuenta_bloqueada(user)
    if esta_bloqueado:
        minutos_restantes = max(1, (segundos_restantes + 59) // 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Cuenta bloqueada temporalmente por múltiples intentos fallidos. Inténtalo nuevamente en {minutos_restantes} minuto(s) o restablece tu contraseña.",
            headers={"Retry-After": str(segundos_restantes)}
        )
    
    # 2. Verificar contraseña
    if not crud.verificar_clave(user_login.clave, user.clave_hash):
        intentos, bloqueado_ahora, segs = crud.registrar_intento_fallido(db, user)
        if bloqueado_ahora:
            minutos = max(1, (segs + 59) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos fallidos. Por motivos de seguridad, tu cuenta ha sido bloqueada temporalmente por {minutos} minutos. Puedes esperar o restablecer tu contraseña para desbloquearla.",
                headers={"Retry-After": str(segs)}
            )
        else:
            intentos_restantes = max(0, settings.MAX_FAILED_LOGIN_ATTEMPTS - intentos)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Credenciales incorrectas. Te quedan {intentos_restantes} intento(s) antes del bloqueo temporal de 5 minutos.",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    # 3. Comprobar si el usuario está activo
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo. Contacta al administrador."
        )
    
    # 4. Login exitoso: Resetear contador de intentos fallidos
    crud.resetear_intentos_fallidos(db, user)
    
    # Extraer convenio_id si existe perfil
    convenio_id_val = None
    if user.perfil and user.perfil.convenio_id:
        convenio_id_val = str(user.perfil.convenio_id)
    
    # 5. Comprobar si el usuario tiene autenticación de dos factores (2FA / MFA) habilitada
    if user.mfa_habilitado and user.mfa_secreto:
        challenge_token = auth.create_mfa_challenge_token(str(user.usuario_id), user.correo)
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
    return {"access_token": access_token, "token_type": "bearer", "requiere_mfa": False}

@router.post("/auth/solicitar-recuperacion", response_model=schemas.RespuestaRecuperacion)
def request_password_reset(solicitud: schemas.SolicitudRecuperacionClave, db: Session = Depends(get_db)):
    user = crud.obtener_usuario_por_correo(db, correo=solicitud.correo)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ningún usuario con el correo electrónico proporcionado."
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta se encuentra inactiva. Por favor contacta al administrador."
        )
    
    reset_token = auth.create_password_reset_token(usuario_id=str(user.usuario_id), correo=user.correo)
    return {
        "mensaje": "Se ha generado el token para restablecer tu contraseña. Completa el formulario para actualizarla.",
        "token_temporal": reset_token
    }

@router.post("/auth/restablecer-clave", response_model=schemas.RespuestaRecuperacion)
def reset_password(datos: schemas.RestablecerClave, db: Session = Depends(get_db)):
    payload = auth.verify_password_reset_token(datos.token)
    usuario_id = payload.get("usuario_id")
    
    user = crud.obtener_usuario_por_id(db, usuario_id=UUID(usuario_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario asociado al token no encontrado."
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cuenta se encuentra inactiva. Contacta al administrador."
        )
        
    crud.cambiar_clave_usuario(db=db, db_usuario=user, nueva_clave=datos.nueva_clave)
    return {
        "mensaje": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
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
def update_agreement(
    convenio_id: UUID,
    agreement_update: schemas.ConvenioActualizar,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(auth.require_role([models.RolUsuario.ADMIN]))
):
    conv = crud.obtener_convenio_por_id(db, convenio_id=convenio_id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Convenio no encontrado.")
    return crud.actualizar_convenio(db, db_convenio=conv, convenio_update=agreement_update)


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


