import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyIdToken } from '@/lib/firebase-admin'

const adminDb = getAdminDb()

export async function GET(request: NextRequest) {
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

    const ventasSnapshot = await adminDb.collection('ventas')
      .where('user_id', '==', userId)
      .orderBy('fecha_creacion', 'desc')
      .limit(100)
      .get()

    const ventas = await Promise.all(ventasSnapshot.docs.map(async (doc) => {
      const venta: any = { id: doc.id, ...doc.data() }
      if (venta.cliente_id) {
        const clienteDoc = await adminDb.collection('clientes').doc(venta.cliente_id).get()
        if (clienteDoc.exists) {
          venta.cliente_nombre = clienteDoc.data()?.nombre
        }
      }
      return venta
    }))

    return NextResponse.json(ventas)
  } catch (error: any) {
    console.error('Error obteniendo ventas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const data = await request.json()

    // Obtener configuración
    const configDoc = await adminDb.collection('configuracion').doc(userId).get()
    const config = configDoc.exists ? configDoc.data() : {}
    const numFact = (parseInt(config?.numero_factura_actual || '0') || 0) + 1
    const prefijo = config?.prefijo_factura || 'FAC'
    const numero_factura = `${prefijo}${numFact.toString().padStart(6, '0')}`
    const ivaPorcentaje = parseFloat(config?.porcentaje_iva || '19')

    // Calcular totales
    const subtotal = data.subtotal
    const descuento = data.descuento || 0
    const iva = (subtotal - descuento) * (ivaPorcentaje / 100)
    const total = subtotal + iva - descuento

    // Crear venta
    const ventaData = {
      user_id: userId,
      numero_factura,
      cliente_id: data.cliente_id || null,
      fecha_venta: new Date().toISOString(),
      subtotal,
      iva,
      descuento,
      total,
      estado: 'COMPLETADA',
      fecha_creacion: new Date().toISOString()
    }

    const ventaRef = await adminDb.collection('ventas').add(ventaData)

    // Crear detalles y actualizar stock
    for (const detalle of data.detalles) {
      await adminDb.collection('detalle_ventas').add({
        venta_id: ventaRef.id,
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        descuento: detalle.descuento || 0,
        subtotal: detalle.subtotal
      })

      // Actualizar stock
      const productoRef = adminDb.collection('productos').doc(detalle.producto_id)
      const productoDoc = await productoRef.get()
      if (productoDoc.exists) {
        const currentStock = productoDoc.data()?.stock || 0
        await productoRef.update({ stock: currentStock - detalle.cantidad })
      }
    }

    // Actualizar número de factura
    await adminDb.collection('configuracion').doc(userId).set({
      numero_factura_actual: numFact.toString()
    }, { merge: true })

    // TODO: Generar PDF y enviar email (se implementará después)

    return NextResponse.json({
      id: ventaRef.id,
      numero_factura,
      message: 'Venta creada exitosamente'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creando venta:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

