'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { showAlert } from '@/lib/utils'

export default function ConfiguracionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    empresa_nombre: '',
    empresa_nit: '',
    empresa_direccion: '',
    empresa_telefono: '',
    empresa_email: '',
    email_password: '',
    smtp_server: 'smtp.gmail.com',
    smtp_port: 587,
    resolucion_dian: '',
    prefijo_factura: 'FAC',
    porcentaje_iva: 19,
    numero_factura_actual: '0'
  })
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      if (!user) {
        router.push('/auth/login')
      } else {
        loadConfiguracion(user.uid)
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadConfiguracion = async (userId: string) => {
    try {
      const configDoc = await getDoc(doc(db, 'configuracion', userId))
      if (configDoc.exists()) {
        const config = configDoc.data()
        setFormData({
          empresa_nombre: config.empresa_nombre || '',
          empresa_nit: config.empresa_nit || '',
          empresa_direccion: config.empresa_direccion || '',
          empresa_telefono: config.empresa_telefono || '',
          empresa_email: config.empresa_email || '',
          email_password: config.email_password || '',
          smtp_server: config.email_smtp_server || 'smtp.gmail.com',
          smtp_port: config.email_smtp_port || 587,
          resolucion_dian: config.resolucion_dian || '',
          prefijo_factura: config.prefijo_factura || 'FAC',
          porcentaje_iva: parseFloat(config.porcentaje_iva || '19'),
          numero_factura_actual: config.numero_factura_actual || '0'
        })
      }
    } catch (error) {
      console.error('Error cargando configuración:', error)
      showAlert('Error al cargar configuración', 'error')
    }
  }

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await setDoc(doc(db, 'configuracion', user.uid), {
        user_id: user.uid,
        empresa_nombre: formData.empresa_nombre,
        empresa_nit: formData.empresa_nit,
        empresa_direccion: formData.empresa_direccion,
        empresa_telefono: formData.empresa_telefono,
        empresa_email: formData.empresa_email,
        email_password: formData.email_password,
        email_smtp_server: formData.smtp_server,
        email_smtp_port: formData.smtp_port,
        resolucion_dian: formData.resolucion_dian,
        prefijo_factura: formData.prefijo_factura,
        porcentaje_iva: formData.porcentaje_iva.toString(),
        numero_factura_actual: formData.numero_factura_actual,
        fecha_actualizacion: new Date().toISOString()
      }, { merge: true })

      showAlert('Configuración guardada exitosamente', 'success')
    } catch (error: any) {
      console.error('Error guardando configuración:', error)
      showAlert('Error al guardar configuración', 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h2>Configuración del Sistema</h2>
        </div>

        <div className="card">
          <h3>Datos de la Empresa</h3>
          <form onSubmit={saveConfig}>
            <div className="form-group">
              <label>Nombre de la Empresa</label>
              <input
                type="text"
                className="input"
                value={formData.empresa_nombre}
                onChange={(e) => setFormData({ ...formData, empresa_nombre: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label>NIT</label>
              <input
                type="text"
                className="input"
                value={formData.empresa_nit}
                onChange={(e) => setFormData({ ...formData, empresa_nit: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                className="input"
                value={formData.empresa_direccion}
                onChange={(e) => setFormData({ ...formData, empresa_direccion: e.target.value })}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="text"
                  className="input"
                  value={formData.empresa_telefono}
                  onChange={(e) => setFormData({ ...formData, empresa_telefono: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="input"
                  value={formData.empresa_email}
                  onChange={(e) => setFormData({ ...formData, empresa_email: e.target.value })}
                />
              </div>
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Configuración de Email para Facturas</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Configure estos datos para enviar facturas automáticamente por email a los clientes.
            </p>
            
            <div className="form-group">
              <label>Contraseña del Email</label>
              <input
                type="password"
                className="input"
                placeholder="Contraseña del email de la empresa"
                value={formData.email_password}
                onChange={(e) => setFormData({ ...formData, email_password: e.target.value })}
              />
              <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                Para Gmail, use una "Contraseña de aplicación" en lugar de la contraseña normal.
              </small>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Servidor SMTP</label>
                <input
                  type="text"
                  className="input"
                  placeholder="smtp.gmail.com"
                  value={formData.smtp_server}
                  onChange={(e) => setFormData({ ...formData, smtp_server: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Puerto SMTP</label>
                <input
                  type="number"
                  className="input"
                  placeholder="587"
                  value={formData.smtp_port}
                  onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                  min="1"
                  max="65535"
                />
              </div>
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Configuración de Facturación</h3>
            
            <div className="form-group">
              <label>Resolución DIAN</label>
              <input
                type="text"
                className="input"
                placeholder="Ej: 18764000000001"
                value={formData.resolucion_dian}
                onChange={(e) => setFormData({ ...formData, resolucion_dian: e.target.value })}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Prefijo Factura</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: FAC"
                  value={formData.prefijo_factura}
                  onChange={(e) => setFormData({ ...formData, prefijo_factura: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Porcentaje IVA (%)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.porcentaje_iva}
                  onChange={(e) => setFormData({ ...formData, porcentaje_iva: parseFloat(e.target.value) || 19 })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Guardar Configuración</button>
            </div>
          </form>
        </div>

        <div className="card" style={{ marginTop: '2rem' }}>
          <h3>Información del Sistema</h3>
          <div className="info-item">
            <strong>Base de Datos:</strong> Firebase Firestore
          </div>
          <div className="info-item">
            <strong>Versión:</strong> 2.0.0
          </div>
          <div className="info-item">
            <strong>Nota:</strong> Para completar la integración con la DIAN, necesitarás configurar 
            las credenciales del servicio web de facturación electrónica.
          </div>
        </div>
      </div>
    </>
  )
}

