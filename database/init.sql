-- =============================================================================
-- PROYECTO APT / MARCOM: MODELO DE BASE DE DATOS
-- Motor: PostgreSQL 14+
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ESQUEMA 1: USUARIOS Y CLIENTES (Auth & Customers)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS auth_customer_schema;

CREATE TYPE auth_customer_schema.role_enum AS ENUM (
  'ADMIN', 'JEFE_BODEGA', 'TECNICO_TERRENO', 'CLIENTE_CONVENIO', 'CLIENTE_STANDARD'
);

CREATE TABLE auth_customer_schema.users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rut VARCHAR(12) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role auth_customer_schema.role_enum NOT NULL DEFAULT 'CLIENTE_STANDARD',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_customer_schema.agreements (
  agreement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(150) NOT NULL, -- ej: Copec S.A., Arcoprime Ltda.
  rut VARCHAR(12) UNIQUE NOT NULL,
  credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  used_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_customer_schema.customer_profiles (
  profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth_customer_schema.users(user_id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES auth_customer_schema.agreements(agreement_id) ON DELETE SET NULL,
  phone VARCHAR(20),
  address TEXT,
  region VARCHAR(100),
  commune VARCHAR(100)
);

-- =============================================================================
-- ESQUEMA 2: INVENTARIO Y BODEGA (Inventory Service)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS inventory_schema;

CREATE TYPE inventory_schema.asset_status AS ENUM (
  'NUEVO', 'USADO_BUEN_ESTADO', 'DEFECTUOSO', 'EN_TRANSITO', 'DADO_DE_BAJA'
);

CREATE TABLE inventory_schema.locations (
  location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL, -- ej: "Bodega M3storage - Enea", "Tienda Pronto Copec Pudahuel"
  address TEXT NOT NULL,
  region VARCHAR(100) NOT NULL,
  is_warehouse BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_schema.product_catalog (
  product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL, -- ej: "Monitor Profesional 65", "Monitor en Placa >100", "Impresora Comanda"
  brand VARCHAR(100) NOT NULL, -- ej: "Samsung"
  category VARCHAR(100) NOT NULL, -- ej: "Monitores", "POS", "Notebooks", "UPS"
  size_inches NUMERIC(5, 2), -- 10.00 a 65.00, >100.00
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_schema.assets (
  asset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES inventory_schema.product_catalog(product_id),
  serial_number VARCHAR(100) UNIQUE NOT NULL,
  qr_code VARCHAR(255) UNIQUE,
  current_status inventory_schema.asset_status NOT NULL DEFAULT 'NUEVO',
  current_location_id UUID NOT NULL REFERENCES inventory_schema.locations(location_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_schema.stock_movements (
  movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES inventory_schema.assets(asset_id),
  origin_location_id UUID REFERENCES inventory_schema.locations(location_id),
  destination_location_id UUID NOT NULL REFERENCES inventory_schema.locations(location_id),
  moved_by_user_id UUID NOT NULL REFERENCES auth_customer_schema.users(user_id),
  reason TEXT NOT NULL, -- ej: "Instalación local nuevo", "Retiro por falla", "Despacho a región"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ESQUEMA 3: PROYECTOS Y ÓRDENES DE TRABAJO EN TERRENO (Work Orders Service)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS work_order_schema;

CREATE TYPE work_order_schema.ot_status AS ENUM (
  'PENDIENTE', 'ASIGNADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'
);

CREATE TABLE work_order_schema.work_orders (
  work_order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  client_agreement_id UUID REFERENCES auth_customer_schema.agreements(agreement_id),
  location_id UUID NOT NULL REFERENCES inventory_schema.locations(location_id),
  assigned_technician_id UUID REFERENCES auth_customer_schema.users(user_id),
  status work_order_schema.ot_status NOT NULL DEFAULT 'PENDIENTE',
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_order_schema.work_order_assets (
  wo_asset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_order_schema.work_orders(work_order_id) ON DELETE CASCADE,
  installed_asset_id UUID REFERENCES inventory_schema.assets(asset_id),
  removed_asset_id UUID REFERENCES inventory_schema.assets(asset_id),
  action_type VARCHAR(50) NOT NULL -- ej: 'INSTALACION_NUEVA', 'REEMPLAZO_POR_FALLA', 'RETIRO'
);

CREATE TABLE work_order_schema.field_evidences (
  evidence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_order_schema.work_orders(work_order_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  signature_url TEXT,
  comments TEXT,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ESQUEMA 4: FACTURACIÓN, CONVENIOS Y PAGOS (Billing & Payment Service)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS billing_schema;

CREATE TYPE billing_schema.payment_method_enum AS ENUM (
  'PASARELA_WEBPAY', 'PASARELA_MERCADOPAGO', 'CREDITO_CONVENIO'
);

CREATE TYPE billing_schema.payment_status_enum AS ENUM (
  'PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO'
);

CREATE TYPE billing_schema.dte_type_enum AS ENUM (
  'FACTURA_ELECTRONICA', 'GUIA_DESPACHO', 'BOLETA_ELECTRONICA'
);

CREATE TABLE billing_schema.orders (
  order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth_customer_schema.users(user_id),
  total_amount NUMERIC(12, 2) NOT NULL,
  payment_method billing_schema.payment_method_enum NOT NULL,
  payment_status billing_schema.payment_status_enum NOT NULL DEFAULT 'PENDIENTE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE billing_schema.payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES billing_schema.orders(order_id),
  gateway_transaction_id VARCHAR(100),
  amount NUMERIC(12, 2) NOT NULL,
  status billing_schema.payment_status_enum NOT NULL,
  response_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE billing_schema.dte_documents (
  dte_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES billing_schema.orders(order_id),
  dte_type billing_schema.dte_type_enum NOT NULL,
  sii_folio INT,
  pdf_url TEXT,
  xml_url TEXT,
  sii_status VARCHAR(50) DEFAULT 'PENDIENTE', -- ej: 'ACEPTADO', 'RECHAZADO'
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS Y KPIs
-- =============================================================================
CREATE INDEX idx_assets_serial ON inventory_schema.assets(serial_number);
CREATE INDEX idx_assets_location ON inventory_schema.assets(current_location_id);
CREATE INDEX idx_assets_status ON inventory_schema.assets(current_status);
CREATE INDEX idx_stock_movements_asset ON inventory_schema.stock_movements(asset_id);
CREATE INDEX idx_work_orders_status ON work_order_schema.work_orders(status);
CREATE INDEX idx_work_orders_tech ON work_order_schema.work_orders(assigned_technician_id);
CREATE INDEX idx_dte_order ON billing_schema.dte_documents(order_id);
