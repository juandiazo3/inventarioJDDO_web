import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyIdToken } from '@/lib/firebase-admin'

const adminDb = getAdminDb()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const userId = await verifyIdToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const ventaId = params.id

    // Obtener venta
    const ventaDoc = await adminDb.collection('ventas').doc(ventaId).get()
    if (!ventaDoc.exists || ventaDoc.data()?.user_id !== userId) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    }

    const venta = ventaDoc.data()

    // Obtener detalles
    const detallesSnapshot = await adminDb.collection('detalle_ventas')
      .where('venta_id', '==', ventaId)
      .get()

    const detalles = await Promise.all(detallesSnapshot.docs.map(async (doc) => {
      const detalle = doc.data()
      const productoDoc = await adminDb.collection('productos').doc(detalle.producto_id).get()
      if (productoDoc.exists) {
        return {
          ...detalle,
          codigo: productoDoc.data()?.codigo,
          nombre: productoDoc.data()?.nombre
        }
      }
      return detalle
    }))

    // Obtener cliente
    let clienteData: any = { nombre: 'Cliente General', tipo_documento: 'CC', numero_documento: '0' }
    if (venta.cliente_id) {
      const clienteDoc = await adminDb.collection('clientes').doc(venta.cliente_id).get()
      if (clienteDoc.exists) {
        clienteData = clienteDoc.data()
      }
    }

    // Obtener configuración
    const configDoc = await adminDb.collection('configuracion').doc(userId).get()
    const config = configDoc.exists ? configDoc.data() : {}

    // Preparar datos para PDF
    const ventaData = {
      numero_factura: venta.numero_factura,
      fecha_venta: venta.fecha_venta,
      subtotal: venta.subtotal,
      iva: venta.iva,
      descuento: venta.descuento,
      total: venta.total
    }

    const empresaData = {
      empresa_nombre: config?.empresa_nombre || '',
      empresa_nit: config?.empresa_nit || '',
      empresa_direccion: config?.empresa_direccion || '',
      empresa_telefono: config?.empresa_telefono || '',
      empresa_email: config?.empresa_email || ''
    }

    // Generar PDF (usando API route separada o función del servidor)
    // Por ahora, retornamos un mensaje indicando que se generará
    // TODO: Implementar generación de PDF con reportlab o similar

    return NextResponse.json({
      message: 'Generación de PDF pendiente de implementar',
      venta: ventaData,
      detalles,
      cliente: clienteData,
      empresa: empresaData
    })
  } catch (error: any) {
    console.error('Error generando PDF:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

