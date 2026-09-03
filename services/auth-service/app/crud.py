from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.config import settings
import bcrypt
from uuid import UUID

# Hash dummy para mitigar ataques de tiempo (timing attacks / user enumeration)
DUMMY_BCRYPT_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewK.bVbV6v6jO37e"

# Configuración de hashing de contraseñas
def obtener_clave_hash(clave: str) -> str:
    pwd_bytes = clave.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verificar_clave(clave_plana: str, clave_hash: str) -> bool:
    try:
        pwd_bytes = clave_plana.encode('utf-8')
        hashed_bytes = clave_hash.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False

def verificar_clave_dummy(clave_plana: str) -> bool:
    return verificar_clave(clave_plana, DUMMY_BCRYPT_HASH)

# --- SEGURIDAD Y BLOQUEO TEMPORAL ---
def esta_cuenta_bloqueada(db_usuario: models.Usuario) -> tuple[bool, int]:
    """
    Determina si la cuenta está actualmente bloqueada.
    Retorna (bloqueado: bool, segundos_restantes: int).
    """
    if not db_usuario.bloqueado_hasta:
        return False, 0
    
    ahora = datetime.now(timezone.utc)
    bloqueado = db_usuario.bloqueado_hasta
    if bloqueado.tzinfo is None:
        bloqueado = bloqueado.replace(tzinfo=timezone.utc)
    
    if bloqueado > ahora:
        segundos_restantes = int((bloqueado - ahora).total_seconds())
        return True, max(1, segundos_restantes)
    
    return False, 0

def registrar_intento_fallido(db: Session, db_usuario: models.Usuario) -> tuple[int, bool, int]:
    """
    Registra un intento fallido de contraseña. Si supera el umbral configurado,
    establece el bloqueo temporal.
    Retorna (intentos_actuales: int, esta_bloqueado: bool, segundos_bloqueo: int).
    """
    ahora = datetime.now(timezone.utc)
    
    # Si existía un bloqueo anterior y ya expiró, reiniciamos contador antes de contar este nuevo fallo
    if db_usuario.bloqueado_hasta:
        bloqueado = db_usuario.bloqueado_hasta
        if bloqueado.tzinfo is None:
            bloqueado = bloqueado.replace(tzinfo=timezone.utc)
        if bloqueado <= ahora:
            db_usuario.intentos_fallidos = 0
            db_usuario.bloqueado_hasta = None

    db_usuario.intentos_fallidos = (db_usuario.intentos_fallidos or 0) + 1
    esta_bloqueado = False
    segundos_bloqueo = 0

    if db_usuario.intentos_fallidos >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
        delta = timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
        db_usuario.bloqueado_hasta = ahora + delta
        esta_bloqueado = True
        segundos_bloqueo = int(delta.total_seconds())

    db.commit()
    db.refresh(db_usuario)
    return db_usuario.intentos_fallidos, esta_bloqueado, segundos_bloqueo

def resetear_intentos_fallidos(db: Session, db_usuario: models.Usuario):
    """
    Restablece a 0 los intentos fallidos y anula el bloqueo temporal al autenticar exitosamente.
    """
    if (db_usuario.intentos_fallidos and db_usuario.intentos_fallidos > 0) or db_usuario.bloqueado_hasta is not None:
        db_usuario.intentos_fallidos = 0
        db_usuario.bloqueado_hasta = None
        db.commit()
        db.refresh(db_usuario)
    return db_usuario

# --- CRUD USUARIOS ---
def obtener_usuario_por_id(db: Session, usuario_id: UUID):
    return db.query(models.Usuario).filter(models.Usuario.usuario_id == usuario_id).first()

def obtener_usuario_por_correo(db: Session, correo: str):
    if not correo:
        return None
    return db.query(models.Usuario).filter(func.lower(models.Usuario.correo) == correo.strip().lower()).first()

def obtener_usuario_por_rut(db: Session, rut: str):
    return db.query(models.Usuario).filter(models.Usuario.rut == rut).first()

def obtener_usuarios(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Usuario).offset(skip).limit(limit).all()

def crear_usuario(db: Session, usuario_in: schemas.UsuarioCrear):
    clave_hash = obtener_clave_hash(usuario_in.clave)
    db_usuario = models.Usuario(
        rut=usuario_in.rut.strip(),
        correo=usuario_in.correo.strip().lower(),
        clave_hash=clave_hash,
        nombre=usuario_in.nombre.strip(),
        apellido=usuario_in.apellido.strip(),
        rol=usuario_in.rol,
        activo=usuario_in.activo,
        intentos_fallidos=0,
        bloqueado_hasta=None
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

def actualizar_usuario(db: Session, db_usuario: models.Usuario, usuario_update: schemas.UsuarioActualizar):
    update_data = usuario_update.model_dump(exclude_unset=True)
    if "clave" in update_data:
        clave_hash = obtener_clave_hash(update_data["clave"])
        db_usuario.clave_hash = clave_hash
        del update_data["clave"]
    
    for key, value in update_data.items():
        setattr(db_usuario, key, value)
        
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

def cambiar_clave_usuario(db: Session, db_usuario: models.Usuario, nueva_clave: str):
    clave_hash = obtener_clave_hash(nueva_clave)
    db_usuario.clave_hash = clave_hash
    db_usuario.intentos_fallidos = 0
    db_usuario.bloqueado_hasta = None
    db.commit()
    db.refresh(db_usuario)
    return db_usuario


# --- CRUD CONVENIOS ---
def obtener_convenio_por_id(db: Session, convenio_id: UUID):
    return db.query(models.Convenio).filter(models.Convenio.convenio_id == convenio_id).first()

def obtener_convenio_por_rut(db: Session, rut: str):
    return db.query(models.Convenio).filter(models.Convenio.rut == rut).first()

def obtener_convenios(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Convenio).offset(skip).limit(limit).all()

def crear_convenio(db: Session, convenio_in: schemas.ConvenioCrear):
    db_convenio = models.Convenio(
        nombre_empresa=convenio_in.nombre_empresa,
        rut=convenio_in.rut,
        limite_credito=convenio_in.limite_credito,
        credito_usado=convenio_in.credito_usado,
        activo=convenio_in.activo
    )
    db.add(db_convenio)
    db.commit()
    db.refresh(db_convenio)
    return db_convenio

def actualizar_convenio(db: Session, db_convenio: models.Convenio, convenio_update: schemas.ConvenioActualizar):
    update_data = convenio_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_convenio, key, value)
        
    db.commit()
    db.refresh(db_convenio)
    return db_convenio

# --- CRUD PERFILES ---
def obtener_perfil_por_usuario_id(db: Session, usuario_id: UUID):
    return db.query(models.PerfilCliente).filter(models.PerfilCliente.usuario_id == usuario_id).first()

def crear_o_actualizar_perfil(db: Session, usuario_id: UUID, perfil_in: schemas.PerfilClienteCrear):
    db_perfil = obtener_perfil_por_usuario_id(db, usuario_id)
    if db_perfil:
        # Actualizar
        update_data = perfil_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_perfil, key, value)
    else:
        # Crear
        db_perfil = models.PerfilCliente(
            usuario_id=usuario_id,
            convenio_id=perfil_in.convenio_id,
            telefono=perfil_in.telefono,
            direccion=perfil_in.direccion,
            region=perfil_in.region,
            comuna=perfil_in.comuna
        )
        db.add(db_perfil)
        
    db.commit()
    db.refresh(db_perfil)
    return db_perfil
