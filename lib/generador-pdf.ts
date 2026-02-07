import PDFDocument from 'pdfkit'

export interface VentaData {
  numero_factura: string
  fecha_venta: string
  subtotal: number
  iva: number
  descuento: number
  total: number
}

export interface DetalleVenta {
  codigo?: string
  nombre?: string
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

/**
 * Genera un PDF de factura usando PDFKit
 */
export async function generarPDFFactura(
  ventaData: VentaData,
  detalles: DetalleVenta[],
  clienteData: ClienteData,
  empresaData: EmpresaData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
      const buffers: Buffer[] = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Encabezado de la empresa
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(empresaData.empresa_nombre, { align: 'center' })
        .moveDown(0.5)

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`NIT: ${empresaData.empresa_nit}`, { align: 'center' })
        .text(empresaData.empresa_direccion, { align: 'center' })
        .text(`Tel: ${empresaData.empresa_telefono}`, { align: 'center' })
        .text(`Email: ${empresaData.empresa_email}`, { align: 'center' })
        .moveDown(1)

      // Línea separadora
      doc
        .strokeColor('#000000')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(1)

      // Título
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('FACTURA ELECTRÓNICA', { align: 'center' })
        .moveDown(1)

      // Información de la factura
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Número de Factura: ${ventaData.numero_factura}`, 50, doc.y)
        .text(
          `Fecha: ${new Date(ventaData.fecha_venta).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`,
          300,
          doc.y - 15
        )
        .moveDown(1)

      // Información del cliente
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('DATOS DEL CLIENTE', 50, doc.y)
        .moveDown(0.5)

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Nombre: ${clienteData.nombre}`, 50, doc.y)
        .text(
          `Documento: ${clienteData.tipo_documento} ${clienteData.numero_documento}`,
          300,
          doc.y - 15
        )

      if (clienteData.direccion) {
        doc.text(`Dirección: ${clienteData.direccion}`, 50, doc.y)
      }
      if (clienteData.telefono) {
        doc.text(`Teléfono: ${clienteData.telefono}`, 300, doc.y - 15)
      }
      if (clienteData.email) {
        doc.text(`Email: ${clienteData.email}`, 50, doc.y)
      }

      doc.moveDown(1.5)

      // Tabla de productos
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('DETALLE DE PRODUCTOS', 50, doc.y)
        .moveDown(0.5)

      // Encabezados de la tabla
      const tableTop = doc.y
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Código', 50, tableTop)
        .text('Descripción', 100, tableTop)
        .text('Cant.', 350, tableTop, { width: 50, align: 'right' })
        .text('Precio Unit.', 410, tableTop, { width: 70, align: 'right' })
        .text('Subtotal', 490, tableTop, { width: 60, align: 'right' })

      // Línea debajo de encabezados
      doc
        .moveTo(50, doc.y + 5)
        .lineTo(550, doc.y + 5)
        .stroke()

      let y = doc.y + 10

      // Detalles de productos
      doc.fontSize(9).font('Helvetica')
      detalles.forEach((detalle) => {
        if (y > 700) {
          // Nueva página si es necesario
          doc.addPage()
          y = 50
        }

        const codigo = detalle.codigo || 'N/A'
        const nombre = detalle.nombre || 'Producto sin nombre'
        const cantidad = detalle.cantidad
        const precioUnit = detalle.precio_unitario
        const subtotal = detalle.subtotal

        // Ajustar nombre si es muy largo
        const nombreAjustado = nombre.length > 30 ? nombre.substring(0, 27) + '...' : nombre

        doc
          .text(codigo, 50, y)
          .text(nombreAjustado, 100, y, { width: 240 })
          .text(cantidad.toString(), 350, y, { width: 50, align: 'right' })
          .text(
            `$${precioUnit.toLocaleString('es-CO', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`,
            410,
            y,
            { width: 70, align: 'right' }
          )
          .text(
            `$${subtotal.toLocaleString('es-CO', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`,
            490,
            y,
            { width: 60, align: 'right' }
          )

        y += 20
      })

      doc.y = y + 10

      // Línea separadora antes de totales
      doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(0.5)

      // Totales
      const totalsY = doc.y
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 400, totalsY, { width: 80, align: 'right' })
        .text(
          `$${ventaData.subtotal.toLocaleString('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          490,
          totalsY,
          { width: 60, align: 'right' }
        )

      if (ventaData.descuento > 0) {
        doc
          .text('Descuento:', 400, doc.y + 15, { width: 80, align: 'right' })
          .text(
            `-$${ventaData.descuento.toLocaleString('es-CO', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`,
            490,
            doc.y + 15,
            { width: 60, align: 'right' }
          )
      }

      doc
        .text('IVA:', 400, doc.y + 15, { width: 80, align: 'right' })
        .text(
          `$${ventaData.iva.toLocaleString('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          490,
          doc.y + 15,
          { width: 60, align: 'right' }
        )

      // Total final
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TOTAL:', 400, doc.y + 25, { width: 80, align: 'right' })
        .text(
          `$${ventaData.total.toLocaleString('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`,
          490,
          doc.y + 25,
          { width: 60, align: 'right' }
        )

      doc.moveDown(2)

      // Pie de página
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(
          'Este documento es una factura electrónica generada automáticamente.',
          { align: 'center' }
        )
        .text(`Fecha de generación: ${new Date().toLocaleString('es-CO')}`, {
          align: 'center'
        })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

