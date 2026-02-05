// Generación de PDFs de facturas
// Nota: En Next.js necesitamos usar una librería compatible con el navegador o generar en el servidor
// Por ahora, usaremos una versión simplificada que genera el PDF en el servidor

export interface VentaData {
  numero_factura: string
  fecha_venta: string
  subtotal: number
  iva: number
  descuento: number
  total: number
}

export interface DetalleVenta {
  codigo: string
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface ClienteData {
  nombre: string
  tipo_documento: string
  numero_documento: string
  direccion?: string
  telefono?: string
  email?: string
}

export interface EmpresaData {
  empresa_nombre: string
  empresa_nit: string
  empresa_direccion: string
  empresa_telefono: string
  empresa_email: string
}

// Esta función se llamará desde la API route del servidor
export async function generarPDFFactura(
  ventaData: VentaData,
  detalles: DetalleVenta[],
  clienteData: ClienteData,
  empresaData: EmpresaData,
  cufe?: string,
  qrCode?: string
): Promise<Buffer> {
  // Esta función se ejecutará en el servidor usando la API route
  // Por ahora, retornamos un placeholder
  throw new Error('Esta función debe llamarse desde la API route del servidor')
}

