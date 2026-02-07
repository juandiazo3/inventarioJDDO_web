'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, query, where, getDocs, addDoc, getDoc, doc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { formatCurrency, formatDate, showAlert } from '@/lib/utils'

interface VentaItem {
  producto_id: string
  codigo: string
  nombre: string
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
}

export default function VentasPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [ventaItems, setVentaItems] = useState<VentaItem[]>([])
  const [selectedCliente, setSelectedCliente] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [ivaPorcentaje, setIvaPorcentaje] = useState(19)
  const [searchProducto, setSearchProducto] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [ventas, setVentas] = useState<any[]>([])
  const [newCliente, setNewCliente] = useState({
    tipo_documento: 'CC',
    numero_documento: '',
    nombre: ''
  })
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      if (!user) {
        router.push('/auth/login')
      } else {
        loadData(user.uid)
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadData = async (userId: string) => {
    await Promise.all([
      loadProductos(userId),
      loadClientes(userId),
      loadConfiguracion(userId),
      loadHistorialVentas(userId)
    ])
  }

  const loadProductos = async (userId: string) => {
    try {
      const q = query(collection(db, 'productos'), where('user_id', '==', userId), where('activo', '==', true))
      const snapshot = await getDocs(q)
      const productosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setProductos(productosData)
    } catch (error) {
      console.error('Error cargando productos:', error)
    }
  }

  const loadClientes = async (userId: string) => {
    try {
      const q = query(collection(db, 'clientes'), where('user_id', '==', userId), where('activo', '==', true))
      const snapshot = await getDocs(q)
      const clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setClientes(clientesData)
    } catch (error) {
      console.error('Error cargando clientes:', error)
    }
  }

  const loadConfiguracion = async (userId: string) => {
    try {
      const configDoc = await getDoc(doc(db, 'configuracion', userId))
      if (configDoc.exists()) {
        const config = configDoc.data()
        setIvaPorcentaje(parseFloat(config.porcentaje_iva || '19'))
      }
    } catch (error) {
      console.error('Error cargando configuración:', error)
    }
  }

  const loadHistorialVentas = async (userId: string) => {
    try {
      const q = query(collection(db, 'ventas'), where('user_id', '==', userId))
      const snapshot = await getDocs(q)
      const ventasData = await Promise.all(snapshot.docs.map(async (ventaDoc) => {
        const venta: any = { id: ventaDoc.id, ...ventaDoc.data() }
        if (venta.cliente_id) {
          const clienteDoc = await getDoc(doc(db, 'clientes', venta.cliente_id))
          if (clienteDoc.exists()) {
            venta.cliente_nombre = clienteDoc.data().nombre
          }
        }
        return venta
      }))
      ventasData.sort((a: any, b: any) => 
        new Date(b.fecha_venta || b.fecha_creacion).getTime() - 
        new Date(a.fecha_venta || a.fecha_creacion).getTime()
      )
      setVentas(ventasData)
    } catch (error) {
      console.error('Error cargando ventas:', error)
    }
  }

  const searchProductoHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value.toLowerCase()
    setSearchProducto(search)
    setShowSearchResults(search.length >= 2)
  }

  const getFilteredProductos = () => {
    if (searchProducto.length < 2) return []
    return productos.filter(p => 
      p.codigo?.toLowerCase().includes(searchProducto.toLowerCase()) ||
      p.nombre?.toLowerCase().includes(searchProducto.toLowerCase())
    ).slice(0, 5)
  }

  const addProductoToVenta = (productoId: string) => {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) return

    if ((producto.stock || 0) <= 0) {
      showAlert('Producto sin stock disponible', 'error')
      return
    }

    const existingIndex = ventaItems.findIndex(item => item.producto_id === productoId)

    if (existingIndex >= 0) {
      const item = ventaItems[existingIndex]
      if (item.cantidad < producto.stock) {
        const updatedItems = [...ventaItems]
        updatedItems[existingIndex] = {
          ...item,
          cantidad: item.cantidad + 1,
          subtotal: (item.cantidad + 1) * item.precio_unitario
        }
        setVentaItems(updatedItems)
      } else {
        showAlert('No hay suficiente stock disponible', 'error')
      }
    } else {
      setVentaItems([...ventaItems, {
        producto_id: productoId,
        codigo: producto.codigo,
        nombre: producto.nombre,
        cantidad: 1,
        precio_unitario: producto.precio_venta,
        descuento: 0,
        subtotal: producto.precio_venta
      }])
    }

    setSearchProducto('')
    setShowSearchResults(false)
  }

  const removeProductoFromVenta = (index: number) => {
    setVentaItems(ventaItems.filter((_, i) => i !== index))
  }

  const updateCantidad = (index: number, cantidad: number) => {
    const item = ventaItems[index]
    const producto = productos.find(p => p.id === item.producto_id)

    if (cantidad > (producto?.stock || 0)) {
      showAlert('No hay suficiente stock disponible', 'error')
      return
    }

    if (cantidad <= 0) {
      removeProductoFromVenta(index)
      return
    }

    const updatedItems = [...ventaItems]
    updatedItems[index] = {
      ...item,
      cantidad,
      subtotal: cantidad * item.precio_unitario - item.descuento
    }
    setVentaItems(updatedItems)
  }

  const calculateTotal = () => {
    const subtotal = ventaItems.reduce((sum, item) => sum + item.subtotal, 0)
    const iva = (subtotal - descuento) * (ivaPorcentaje / 100)
    const total = subtotal + iva - descuento
    return { subtotal, iva, total }
  }

  const processVenta = async () => {
    if (ventaItems.length === 0) {
      showAlert('Debe agregar al menos un producto a la venta', 'error')
      return
    }
    if (!user) return

    try {
      const { subtotal, iva, total } = calculateTotal()

      // Obtener siguiente número de factura
      const configDoc = await getDoc(doc(db, 'configuracion', user.uid))
      const config = configDoc.exists() ? configDoc.data() : {}
      const numFact = (parseInt(config.numero_factura_actual || '0') || 0) + 1
      const prefijo = config.prefijo_factura || 'FAC'
      const numero_factura = `${prefijo}${numFact.toString().padStart(6, '0')}`

      // Crear venta
      const ventaData = {
        user_id: user.uid,
        numero_factura,
        cliente_id: selectedCliente || null,
        fecha_venta: new Date().toISOString(),
        subtotal,
        iva,
        descuento,
        total,
        estado: 'COMPLETADA',
        fecha_creacion: new Date().toISOString()
      }

      const ventaRef = await addDoc(collection(db, 'ventas'), ventaData)

      // Crear detalles y actualizar stock
      for (const item of ventaItems) {
        await addDoc(collection(db, 'detalle_ventas'), {
          venta_id: ventaRef.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          descuento: item.descuento,
          subtotal: item.subtotal
        })

        // Actualizar stock
        const productoRef = doc(db, 'productos', item.producto_id)
        const productoDoc = await getDoc(productoRef)
        if (productoDoc.exists()) {
          const currentStock = productoDoc.data().stock || 0
          await updateDoc(productoRef, { stock: currentStock - item.cantidad })
        }
      }

      // Actualizar número de factura
      await updateDoc(doc(db, 'configuracion', user.uid), {
        numero_factura_actual: numFact.toString()
      })

      showAlert(`Venta procesada exitosamente. Factura: ${numero_factura}`, 'success')

      // Limpiar venta
      setVentaItems([])
      setSelectedCliente('')
      setDescuento(0)
      setSearchProducto('')
      loadHistorialVentas(user.uid)
      loadProductos(user.uid)
    } catch (error: any) {
      console.error('Error procesando venta:', error)
      showAlert('Error al procesar la venta', 'error')
    }
  }

  const saveClienteRapido = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const clienteData = {
        ...newCliente,
        user_id: user.uid,
        activo: true,
        fecha_creacion: new Date().toISOString()
      }

      const clienteRef = await addDoc(collection(db, 'clientes'), clienteData)
      showAlert('Cliente creado exitosamente', 'success')
      setShowClienteModal(false)
      setNewCliente({ tipo_documento: 'CC', numero_documento: '', nombre: '' })
      await loadClientes(user.uid)
      setSelectedCliente(clienteRef.id)
    } catch (error: any) {
      console.error('Error creando cliente:', error)
      showAlert('Error al crear cliente', 'error')
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

  const { subtotal, iva, total } = calculateTotal()

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h2>Nueva Venta</h2>
        </div>

        <div className="venta-container">
          <div className="venta-left">
            <div className="card">
              <h3>Cliente</h3>
              <div className="form-group">
                <label>Buscar Cliente</label>
                <select
                  className="input"
                  value={selectedCliente}
                  onChange={(e) => setSelectedCliente(e.target.value)}
                >
                  <option value="">Cliente General</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} - {c.numero_documento}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowClienteModal(true)}>
                ➕ Nuevo Cliente
              </button>
            </div>

            <div className="card">
              <h3>Productos</h3>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Buscar Producto</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Código o nombre..."
                  value={searchProducto}
                  onChange={searchProductoHandler}
                />
                {showSearchResults && getFilteredProductos().length > 0 && (
                  <div className="search-results show">
                    {getFilteredProductos().map(p => (
                      <div
                        key={p.id}
                        className="search-result-item"
                        onClick={() => addProductoToVenta(p.id)}
                      >
                        <strong>{p.codigo}</strong> - {p.nombre}
                        <span style={{ float: 'right', color: '#10b981' }}>
                          {formatCurrency(p.precio_venta || 0)}
                        </span>
                        <br />
                        <small>Stock: {p.stock || 0}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3>Productos en la Venta</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Subtotal</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventaItems.length === 0 ? (
                      <tr><td colSpan={5} className="text-center">No hay productos agregados</td></tr>
                    ) : (
                      ventaItems.map((item, index) => (
                        <tr key={index}>
                          <td>{item.codigo} - {item.nombre}</td>
                          <td>
                            <input
                              type="number"
                              value={item.cantidad}
                              min="1"
                              onChange={(e) => updateCantidad(index, parseInt(e.target.value) || 1)}
                              style={{ width: '60px', padding: '0.25rem' }}
                            />
                          </td>
                          <td>{formatCurrency(item.precio_unitario)}</td>
                          <td>{formatCurrency(item.subtotal)}</td>
                          <td>
                            <button
                              className="btn btn-danger"
                              onClick={() => removeProductoFromVenta(index)}
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="venta-right">
            <div className="card resumen-venta">
              <h3>Resumen de Venta</h3>
              <div className="resumen-item">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="resumen-item">
                <span>IVA ({ivaPorcentaje}%):</span>
                <span>{formatCurrency(iva)}</span>
              </div>
              <div className="resumen-item">
                <span>Descuento:</span>
                <input
                  type="number"
                  className="input-small"
                  min="0"
                  step="0.01"
                  value={descuento}
                  onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="resumen-item total">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <button
                className="btn btn-primary btn-large"
                onClick={processVenta}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                Procesar Venta
              </button>
            </div>
          </div>
        </div>

        <div className="historial-section" style={{ marginTop: '2rem' }}>
          <h3>Historial de Ventas</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventas.length === 0 ? (
                  <tr><td colSpan={5} className="text-center">No hay ventas registradas</td></tr>
                ) : (
                  ventas.map((v: any) => (
                    <tr key={v.id}>
                      <td>{v.numero_factura || 'N/A'}</td>
                      <td>{v.cliente_nombre || 'Cliente General'}</td>
                      <td>{formatDate(v.fecha_venta || v.fecha_creacion)}</td>
                      <td>{formatCurrency(parseFloat(v.total) || 0)}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          onClick={() => window.open(`/api/ventas/${v.id}/pdf`, '_blank')}
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Ver PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Cliente Rápido */}
      {showClienteModal && (
        <div className="modal show" onClick={(e) => e.target === e.currentTarget && setShowClienteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nuevo Cliente</h3>
              <span className="close" onClick={() => setShowClienteModal(false)}>&times;</span>
            </div>
            <form onSubmit={saveClienteRapido}>
              <div className="form-group">
                <label>Tipo Documento *</label>
                <select
                  className="input"
                  required
                  value={newCliente.tipo_documento}
                  onChange={(e) => setNewCliente({ ...newCliente, tipo_documento: e.target.value })}
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="NIT">NIT</option>
                  <option value="CE">Cédula de Extranjería</option>
                </select>
              </div>
              <div className="form-group">
                <label>Número Documento *</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={newCliente.numero_documento}
                  onChange={(e) => setNewCliente({ ...newCliente, numero_documento: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={newCliente.nombre}
                  onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowClienteModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

