'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProductos: 0,
    stockBajo: 0,
    ventasHoy: 0,
    ingresosHoy: 0
  })
  const [ventasRecientes, setVentasRecientes] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      
      if (!user) {
        router.push('/auth/login')
      } else {
        loadDashboard(user.uid)
      }
    })

    return () => unsubscribe()
  }, [router])

  const loadDashboard = async (userId: string) => {
    try {
      // Productos
      const productosQuery = query(collection(db, 'productos'), where('user_id', '==', userId))
      const productosSnapshot = await getDocs(productosQuery)
      const productos = productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      const totalProductos = productos.length
      const stockBajo = productos.filter((p: any) => p.stock <= p.stock_minimo).length

      // Ventas
      const ventasQuery = query(collection(db, 'ventas'), where('user_id', '==', userId))
      const ventasSnapshot = await getDocs(ventasQuery)
      const ventas = ventasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      const hoy = new Date().toISOString().split('T')[0]
      const ventasHoy = ventas.filter((v: any) => v.fecha_venta?.startsWith(hoy))
      const ingresosHoy = ventasHoy.reduce((sum: number, v: any) => sum + (parseFloat(v.total) || 0), 0)

      // Ventas recientes (últimas 5)
      const ventasOrdenadas = ventas.sort((a: any, b: any) => 
        new Date(b.fecha_venta || b.fecha_creacion).getTime() - 
        new Date(a.fecha_venta || a.fecha_creacion).getTime()
      ).slice(0, 5)

      // Obtener nombres de clientes
      const ventasConClientes = await Promise.all(ventasOrdenadas.map(async (v: any) => {
        if (v.cliente_id) {
          const clienteDoc = await getDoc(doc(db, 'clientes', v.cliente_id))
          return { ...v, cliente_nombre: clienteDoc.exists() ? clienteDoc.data().nombre : null }
        }
        return v
      }))

      setStats({ totalProductos, stockBajo, ventasHoy: ventasHoy.length, ingresosHoy })
      setVentasRecientes(ventasConClientes)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '2px solid #2563eb', 
            borderTop: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="dashboard">
          <h2>Panel de Control</h2>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <h3>{stats.totalProductos}</h3>
                <p>Productos</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-info">
                <h3>{stats.stockBajo}</h3>
                <p>Stock Bajo</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>{stats.ventasHoy}</h3>
                <p>Ventas Hoy</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💵</div>
              <div className="stat-info">
                <h3>{formatCurrency(stats.ingresosHoy)}</h3>
                <p>Ingresos Hoy</p>
              </div>
            </div>
          </div>

          <div className="quick-actions">
            <h3>Acciones Rápidas</h3>
            <div className="actions-grid">
              <a href="/inventario" className="action-btn">
                <span className="action-icon">➕</span>
                <span>Nuevo Producto</span>
              </a>
              <a href="/ventas" className="action-btn">
                <span className="action-icon">🛒</span>
                <span>Nueva Venta</span>
              </a>
              <a href="/clientes" className="action-btn">
                <span className="action-icon">👤</span>
                <span>Nuevo Cliente</span>
              </a>
              <a href="/inventario" className="action-btn">
                <span className="action-icon">📊</span>
                <span>Ver Inventario</span>
              </a>
            </div>
          </div>

          <div className="recent-section">
            <h3>Ventas Recientes</h3>
            <div className="table-container">
              {ventasRecientes.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Factura</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasRecientes.map((v: any) => (
                      <tr key={v.id}>
                        <td>{v.numero_factura || 'N/A'}</td>
                        <td>{v.cliente_nombre || 'Cliente General'}</td>
                        <td>{formatDate(v.fecha_venta || v.fecha_creacion)}</td>
                        <td>{formatCurrency(parseFloat(v.total) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No hay ventas registradas</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .dashboard h2 {
          font-size: 2rem;
          color: var(--text-color);
          margin-bottom: 2rem;
        }
        .recent-section {
          margin-top: 2rem;
        }
        .recent-section h3 {
          font-size: 1.25rem;
          color: var(--text-color);
          margin-bottom: 1rem;
        }
      `}</style>
    </>
  )
}

