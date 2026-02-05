-- ============================================
-- Sistema de Inventario - Esquema Inicial
-- Supabase (PostgreSQL) con Multi-Tenancy
-- ============================================

-- ============================================
-- 1. TABLA: productos
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  precio_compra DECIMAL(10, 2) DEFAULT 0,
  precio_venta DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_codigo_per_user UNIQUE(user_id, codigo)
);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_user_id ON productos(user_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);

-- ============================================
-- 2. TABLA: clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL CHECK (tipo_documento IN ('CC', 'NIT', 'CE')),
  numero_documento TEXT NOT NULL,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_documento_per_user UNIQUE(user_id, numero_documento)
);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);
CREATE INDEX IF NOT EXISTS idx_clientes_numero_documento ON clientes(numero_documento);

-- ============================================
-- 3. TABLA: ventas
-- ============================================
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_factura TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  fecha_venta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  subtotal DECIMAL(10, 2) NOT NULL,
  iva DECIMAL(10, 2) DEFAULT 0,
  descuento DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'COMPLETADA', 'CANCELADA')),
  cufe TEXT, -- Código único de factura electrónica (DIAN)
  qr_code TEXT, -- QR code de la factura
  pdf_path TEXT, -- Ruta del PDF en Storage
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_factura_per_user UNIQUE(user_id, numero_factura)
);

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_ventas_user_id ON ventas(user_id);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha_venta ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_numero_factura ON ventas(numero_factura);

-- ============================================
-- 4. TABLA: detalle_ventas
-- ============================================
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10, 2) NOT NULL,
  descuento DECIMAL(10, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- Índices para detalle_ventas
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta_id ON detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto_id ON detalle_ventas(producto_id);

-- ============================================
-- 5. TABLA: configuracion
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Datos de la empresa
  empresa_nombre TEXT,
  empresa_nit TEXT,
  empresa_direccion TEXT,
  empresa_telefono TEXT,
  empresa_email TEXT,
  -- Configuración de email
  email_password TEXT, -- Contraseña de aplicación (encriptada)
  email_smtp_server TEXT DEFAULT 'smtp.gmail.com',
  email_smtp_port INTEGER DEFAULT 587,
  -- Configuración de facturación
  resolucion_dian TEXT,
  prefijo_factura TEXT DEFAULT 'FAC',
  porcentaje_iva DECIMAL(5, 2) DEFAULT 19.00,
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRIGGERS: Actualizar fecha_actualizacion
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para productos
DROP TRIGGER IF EXISTS update_productos_updated_at ON productos;
CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para configuracion
DROP TRIGGER IF EXISTS update_configuracion_updated_at ON configuracion;
CREATE TRIGGER update_configuracion_updated_at
  BEFORE UPDATE ON configuracion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS: productos
-- ============================================
DROP POLICY IF EXISTS "Users can view own products" ON productos;
CREATE POLICY "Users can view own products"
  ON productos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON productos;
CREATE POLICY "Users can insert own products"
  ON productos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON productos;
CREATE POLICY "Users can update own products"
  ON productos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON productos;
CREATE POLICY "Users can delete own products"
  ON productos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS: clientes
-- ============================================
DROP POLICY IF EXISTS "Users can view own clients" ON clientes;
CREATE POLICY "Users can view own clients"
  ON clientes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own clients" ON clientes;
CREATE POLICY "Users can insert own clients"
  ON clientes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own clients" ON clientes;
CREATE POLICY "Users can update own clients"
  ON clientes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own clients" ON clientes;
CREATE POLICY "Users can delete own clients"
  ON clientes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS: ventas
-- ============================================
DROP POLICY IF EXISTS "Users can view own sales" ON ventas;
CREATE POLICY "Users can view own sales"
  ON ventas FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sales" ON ventas;
CREATE POLICY "Users can insert own sales"
  ON ventas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sales" ON ventas;
CREATE POLICY "Users can update own sales"
  ON ventas FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sales" ON ventas;
CREATE POLICY "Users can delete own sales"
  ON ventas FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS: detalle_ventas
-- ============================================
-- Los usuarios solo pueden ver/editar detalles de sus propias ventas
DROP POLICY IF EXISTS "Users can view own sale details" ON detalle_ventas;
CREATE POLICY "Users can view own sale details"
  ON detalle_ventas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventas
      WHERE ventas.id = detalle_ventas.venta_id
      AND ventas.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own sale details" ON detalle_ventas;
CREATE POLICY "Users can insert own sale details"
  ON detalle_ventas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ventas
      WHERE ventas.id = detalle_ventas.venta_id
      AND ventas.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own sale details" ON detalle_ventas;
CREATE POLICY "Users can update own sale details"
  ON detalle_ventas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ventas
      WHERE ventas.id = detalle_ventas.venta_id
      AND ventas.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own sale details" ON detalle_ventas;
CREATE POLICY "Users can delete own sale details"
  ON detalle_ventas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ventas
      WHERE ventas.id = detalle_ventas.venta_id
      AND ventas.user_id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS RLS: configuracion
-- ============================================
DROP POLICY IF EXISTS "Users can view own config" ON configuracion;
CREATE POLICY "Users can view own config"
  ON configuracion FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own config" ON configuracion;
CREATE POLICY "Users can insert own config"
  ON configuracion FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own config" ON configuracion;
CREATE POLICY "Users can update own config"
  ON configuracion FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own config" ON configuracion;
CREATE POLICY "Users can delete own config"
  ON configuracion FOR DELETE
  USING (auth.uid() = user_id);

