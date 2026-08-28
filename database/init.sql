-- =============================================================================
-- PROYECTO MARCOM: MODELO DE BASE DE DATOS COMPLETO
-- Motor: PostgreSQL 14+
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ESQUEMA 1: USUARIOS Y CLIENTES (Autenticación y Convenios)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS esquema_auth_clientes;

CREATE TYPE esquema_auth_clientes.rol_usuario AS ENUM (
    'ADMIN', 'JEFE_BODEGA', 'TECNICO_TERRENO', 'CLIENTE_CONVENIO', 'CLIENTE_ESTANDAR'
);

CREATE TABLE esquema_auth_clientes.usuarios (
    usuario_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rut VARCHAR(12) UNIQUE NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    clave_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    rol esquema_auth_clientes.rol_usuario NOT NULL DEFAULT 'CLIENTE_ESTANDAR',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE esquema_auth_clientes.convenios (
    convenio_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa VARCHAR(150) NOT NULL, -- ej: Copec S.A., Arcoprime Ltda.
    rut VARCHAR(12) UNIQUE NOT NULL,
    limite_credito NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    credito_usado NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE esquema_auth_clientes.perfiles_clientes (
    perfil_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID UNIQUE NOT NULL REFERENCES esquema_auth_clientes.usuarios(usuario_id) ON DELETE CASCADE,
    convenio_id UUID REFERENCES esquema_auth_clientes.convenios(convenio_id) ON DELETE SET NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    region VARCHAR(100),
    comuna VARCHAR(100)
);

-- =============================================================================
-- ESQUEMA 2: INVENTARIO, BODEGA Y LOCALES
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS esquema_inventario;

CREATE TYPE esquema_inventario.estado_activo_enum AS ENUM (
    'NUEVO', 'USADO_BUEN_ESTADO', 'DEFECTUOSO', 'EN_TRANSITO', 'DADO_DE_BAJA'
);

CREATE TABLE esquema_inventario.ubicaciones (
    ubicacion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_local VARCHAR(50) UNIQUE, -- Código de identificación del local (ej: 'COP-042', 'PRONTO-102')
    nombre VARCHAR(150) NOT NULL,    -- ej: "Bodega M3storage - Enea", "Tienda Pronto Copec Pudahuel"
    direccion TEXT NOT NULL,
    region VARCHAR(100) NOT NULL,
    comuna VARCHAR(100),
    es_bodega BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Relación con cliente de convenio si corresponde
    convenio_id UUID REFERENCES esquema_auth_clientes.convenios(convenio_id) ON DELETE SET NULL,
    
    -- Información del Encargado del Local
    nombre_encargado VARCHAR(150),
    telefono_encargado VARCHAR(20),
    correo_encargado VARCHAR(150),
    
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE esquema_inventario.catalogo_productos (
    producto_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL, -- ej: "Monitor Profesional 65", "Monitor en Placa >100", "Impresora Comanda"
    marca VARCHAR(100) NOT NULL, -- ej: "Samsung"
    categoria VARCHAR(100) NOT NULL, -- ej: "Monitores", "POS", "Notebooks", "UPS"
    pulgadas NUMERIC(5, 2), -- 10.00 a 65.00, >100.00
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE esquema_inventario.activos (
    activo_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES esquema_inventario.catalogo_productos(producto_id),
    numero_serie VARCHAR(100) UNIQUE NOT NULL,
    codigo_qr VARCHAR(255) UNIQUE,
    estado_actual esquema_inventario.estado_activo_enum NOT NULL DEFAULT 'NUEVO',
    ubicacion_actual_id UUID NOT NULL REFERENCES esquema_inventario.ubicaciones(ubicacion_id),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE esquema_inventario.movimientos_stock (
    movimiento_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activo_id UUID NOT NULL REFERENCES esquema_inventario.activos(activo_id),
    ubicacion_origen_id UUID REFERENCES esquema_inventario.ubicaciones(ubicacion_id),
    ubicacion_destino_id UUID NOT NULL REFERENCES esquema_inventario.ubicaciones(ubicacion_id),
    usuario_movimiento_id UUID NOT NULL REFERENCES esquema_auth_clientes.usuarios(usuario_id),
    motivo TEXT NOT NULL, -- ej: "Instalación local nuevo", "Retiro por falla", "Despacho a región"
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ESQUEMA 3: PROYECTOS Y ÓRDENES DE TRABAJO EN TERRENO (OT)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS esquema_ordenes_trabajo;

CREATE TYPE esquema_ordenes_trabajo.estado_ot_enum AS ENUM (
    'PENDIENTE', 'ASIGNADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'
);

CREATE TABLE esquema_ordenes_trabajo.ordenes_trabajo (
    orden_trabajo_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_orden VARCHAR(20) UNIQUE NOT NULL,
    convenio_cliente_id UUID REFERENCES esquema_auth_clientes.convenios(convenio_id),
    ubicacion_id UUID NOT NULL REFERENCES esquema_inventario.ubicaciones(ubicacion_id),
    tecnico_asignado_id UUID REFERENCES esquema_auth_clientes.usuarios(usuario_id),
    estado esquema_ordenes_trabajo.estado_ot_enum NOT NULL DEFAULT 'PENDIENTE',
    fecha_programada TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_termino TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE esquema_ordenes_trabajo.activos_orden_trabajo (
    activo_ot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_trabajo_id UUID NOT NULL REFERENCES esquema_ordenes_trabajo.ordenes_trabajo(orden_trabajo_id) ON DELETE CASCADE,
    activo_instalado_id UUID REFERENCES esquema_inventario.activos(activo_id),
    activo_retirado_id UUID REFERENCES esquema_inventario.activos(activo_id),
    tipo_accion VARCHAR(50) NOT NULL -- ej: 'INSTALACION_NUEVA', 'REEMPLAZO_POR_FALLA', 'RETIRO'
);

CREATE TABLE esquema_ordenes_trabajo.evidencias_terreno (
    evidencia_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_trabajo_id UUID NOT NULL REFERENCES esquema_ordenes_trabajo.ordenes_trabajo(orden_trabajo_id) ON DELETE CASCADE,
    url_imagen TEXT NOT NULL,
    url_firma TEXT,
    comentarios TEXT,
    fecha_captura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ESQUEMA 4: FACTURACIÓN Y PAGOS (Flow + Convenios + SII DTE)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS esquema_facturacion;

CREATE TYPE esquema_facturacion.metodo_pago_enum AS ENUM (
    'PASARELA_FLOW', 'PASARELA_WEBPAY', 'CREDITO_CONVENIO'
);

CREATE TYPE esquema_facturacion.estado_pago_enum AS ENUM (
    'PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO'
);

CREATE TYPE esquema_facturacion.tipo_dte_enum AS ENUM (
    'FACTURA_ELECTRONICA', 'GUIA_DESPACHO', 'BOLETA_ELECTRONICA'
);

CREATE TABLE esquema_facturacion.pedidos (
    pedido_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES esquema_auth_clientes.usuarios(usuario_id),
    monto_total NUMERIC(12, 2) NOT NULL,
    metodo_pago esquema_facturacion.metodo_pago_enum NOT NULL,
    estado_pago esquema_facturacion.estado_pago_enum NOT NULL DEFAULT 'PENDIENTE',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE esquema_facturacion.pagos (
    pago_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES esquema_facturacion.pedidos(pedido_id),
    transaccion_pasarela_id VARCHAR(100), -- Token o Order Flow
    monto NUMERIC(12, 2) NOT NULL,
    estado esquema_facturacion.estado_pago_enum NOT NULL,
    payload_respuesta JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE esquema_facturacion.documentos_dte (
    dte_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES esquema_facturacion.pedidos(pedido_id),
    tipo_dte esquema_facturacion.tipo_dte_enum NOT NULL,
    folio_sii INT,
    url_pdf TEXT,
    url_xml TEXT,
    estado_sii VARCHAR(50) DEFAULT 'PENDIENTE', -- ej: 'ACEPTADO', 'RECHAZADO'
    emitido_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ÍNDICES PARA CONSULTAS, FILTROS Y RENDIMIENTO
-- =============================================================================
CREATE INDEX idx_ubicaciones_codigo ON esquema_inventario.ubicaciones(codigo_local);
CREATE INDEX idx_ubicaciones_region ON esquema_inventario.ubicaciones(region);
CREATE INDEX idx_ubicaciones_convenio ON esquema_inventario.ubicaciones(convenio_id);

CREATE INDEX idx_activos_serie ON esquema_inventario.activos(numero_serie);
CREATE INDEX idx_activos_ubicacion ON esquema_inventario.activos(ubicacion_actual_id);
CREATE INDEX idx_activos_estado ON esquema_inventario.activos(estado_actual);
CREATE INDEX idx_movimientos_activo ON esquema_inventario.movimientos_stock(activo_id);

CREATE INDEX idx_ordenes_estado ON esquema_ordenes_trabajo.ordenes_trabajo(estado);
CREATE INDEX idx_ordenes_tecnico ON esquema_ordenes_trabajo.ordenes_trabajo(tecnico_asignado_id);
CREATE INDEX idx_ordenes_ubicacion ON esquema_ordenes_trabajo.ordenes_trabajo(ubicacion_id);

CREATE INDEX idx_dte_pedido ON esquema_facturacion.documentos_dte(pedido_id);
CREATE INDEX idx_pagos_pedido ON esquema_facturacion.pagos(pedido_id);
-- =============================================================================
-- INSERCIÓN DE DATOS SEMILLA (Seed Data)
-- =============================================================================
INSERT INTO esquema_auth_clientes.usuarios (rut, correo, clave_hash, nombre, apellido, rol)
VALUES (
  '12345678-9',
  'admin@marcom.cl',
  '$2b$12$0kJpQwNGdXl.HYxg.JJAJOGGDUAPHPFf1TZiexXcHf840hB7icM/G', -- password: admin123
  'Admin',
  'Principal',
  'ADMIN'
)
ON CONFLICT (correo) DO NOTHING;
