import nodemailer from 'nodemailer'

export interface EmailConfig {
  smtp_server: string
  smtp_port: number
  email: string
  password: string
}

export interface EnvioFacturaParams {
  to: string
  clienteNombre: string
  numeroFactura: string
  fechaVenta: string
  total: number
  pdfBuffer?: Buffer
  empresaNombre: string
}

/**
 * Crea un transporter de nodemailer con la configuración SMTP
 */
export function createEmailTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.smtp_server,
    port: config.smtp_port,
    secure: config.smtp_port === 465, // true para 465, false para otros puertos
    auth: {
      user: config.email,
      pass: config.password
    }
  })
}

/**
 * Envía la factura por correo electrónico al cliente
 */
export async function enviarFacturaPorEmail(
  config: EmailConfig,
  params: EnvioFacturaParams
): Promise<void> {
  try {
    const transporter = createEmailTransporter(config)

    const mailOptions = {
      from: `"${params.empresaNombre}" <${config.email}>`,
      to: params.to,
      subject: `Factura ${params.numeroFactura} - ${params.empresaNombre}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4F46E5;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 20px;
              border: 1px solid #e5e7eb;
            }
            .factura-info {
              background-color: white;
              padding: 15px;
              margin: 15px 0;
              border-radius: 5px;
              border-left: 4px solid #4F46E5;
            }
            .total {
              font-size: 1.2em;
              font-weight: bold;
              color: #4F46E5;
              margin-top: 15px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #6b7280;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${params.empresaNombre}</h1>
              <p>Factura Electrónica</p>
            </div>
            <div class="content">
              <p>Estimado/a <strong>${params.clienteNombre}</strong>,</p>
              <p>Le informamos que se ha generado su factura electrónica:</p>
              
              <div class="factura-info">
                <p><strong>Número de Factura:</strong> ${params.numeroFactura}</p>
                <p><strong>Fecha:</strong> ${new Date(params.fechaVenta).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                <p class="total">Total: $${params.total.toLocaleString('es-CO', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</p>
              </div>

              <p>Adjuntamos el PDF de la factura para su archivo.</p>
              <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no responda a este mensaje.</p>
              <p>&copy; ${new Date().getFullYear()} ${params.empresaNombre}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: params.pdfBuffer
        ? [
            {
              filename: `Factura_${params.numeroFactura}.pdf`,
              content: params.pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        : []
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email enviado exitosamente:', info.messageId)
  } catch (error: any) {
    console.error('Error enviando email:', error)
    throw new Error(`Error al enviar email: ${error.message}`)
  }
}

