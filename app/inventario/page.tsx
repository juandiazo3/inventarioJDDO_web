'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { formatCurrency, showAlert, confirmAction } from '@/lib/utils'

export default function InventarioPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<any[]>([])
  const [filteredProductos, setFilteredProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProducto, setEditingProducto] = useState<any>(null)
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    stock: 0,
    precio_compra: 0,
    precio_venta: 0,
    stock_minimo: 0
  })
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      if (!user) {
        router.push('/auth/login')
      } else {
        loadProductos(user.uid)
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    filterProductos()
  }, [searchTerm, selectedCategoria, productos])

  const loadProductos = async (userId: string) => {
    try {
      const q = query(collection(db, 'productos'), where('user_id', '==', userId))
      const snapshot = await getDocs(q)
      const productosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setProductos(productosData)
      
      // Extraer categorías
      const cats = new Set<string>()
      productosData.forEach((p: any) => {
        if (p.categoria) cats.add(p.categoria)
      })
      setCategorias(Array.from(cats))
    } catch (error) {
      console.error('Error cargando productos:', error)
      showAlert('Error al cargar productos', 'error')
    }
  }

  const filterProductos = () => {
    let filtered = productos.filter((p: any) => {
      const matchSearch = !searchTerm || 
        p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchCategoria = !selectedCategoria || p.categoria === selectedCategoria
      
      return matchSearch && matchCategoria
    })
    setFilteredProductos(filtered)
  }

  const openProductModal = (producto?: any) => {
    if (producto) {
      setEditingProducto(producto)
      setFormData({
        codigo: producto.codigo || '',
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        categoria: producto.categoria || '',
        stock: producto.stock || 0,
        precio_compra: producto.precio_compra || 0,
        precio_venta: producto.precio_venta || 0,
        stock_minimo: producto.stock_minimo || 0
      })
    } else {
      setEditingProducto(null)
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: '',
        stock: 0,
        precio_compra: 0,
        precio_venta: 0,
        stock_minimo: 0
      })
    }
    setShowModal(true)
  }

  const closeProductModal = () => {
    setShowModal(false)
    setEditingProducto(null)
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: '',
      stock: 0,
      precio_compra: 0,
      precio_venta: 0,
      stock_minimo: 0
    })
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const data = {
        ...formData,
        user_id: user.uid,
        activo: true,
        fecha_creacion: editingProducto?.fecha_creacion || new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString()
      }

      if (editingProducto) {
        await updateDoc(doc(db, 'productos', editingProducto.id), data)
        showAlert('Producto actualizado exitosamente', 'success')
      } else {
        await addDoc(collection(db, 'productos'), data)
        showAlert('Producto creado exitosamente', 'success')
      }
      
      closeProductModal()
      loadProductos(user.uid)
    } catch (error: any) {
      console.error('Error guardando producto:', error)
      showAlert(error.message || 'Error al guardar producto', 'error')
    }
  }

  const deleteProducto = (productoId: string) => {
    confirmAction('¿Está seguro de eliminar este producto?', async () => {
      try {
        await updateDoc(doc(db, 'productos', productoId), { activo: false })
        showAlert('Producto eliminado exitosamente', 'success')
        if (user) loadProductos(user.uid)
      } catch (error) {
        console.error('Error eliminando producto:', error)
        showAlert('Error al eliminar producto', 'error')
      }
    })
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
          <h2>Gestión de Inventario</h2>
          <button className="btn btn-primary" onClick={() => openProductModal()}>
            ➕ Nuevo Producto
          </button>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder="Buscar producto..."
            className="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="input"
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio Compra</th>
                <th>Precio Venta</th>
                <th>Stock</th>
                <th>Stock Mín.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.length === 0 ? (
                <tr><td colSpan={8} className="text-center">No hay productos registrados</td></tr>
              ) : (
                filteredProductos.map((p: any) => (
                  <tr key={p.id} className={p.stock <= p.stock_minimo ? 'stock-bajo' : ''}>
                    <td>{p.codigo}</td>
                    <td>{p.nombre}</td>
                    <td>{p.categoria || '-'}</td>
                    <td>{formatCurrency(p.precio_compra || 0)}</td>
                    <td>{formatCurrency(p.precio_venta || 0)}</td>
                    <td><strong>{p.stock || 0}</strong></td>
                    <td>{p.stock_minimo || 0}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openProductModal(p)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem' }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteProducto(p.id)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal show" onClick={(e) => e.target === e.currentTarget && closeProductModal()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProducto ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <span className="close" onClick={closeProductModal}>&times;</span>
            </div>
            <form onSubmit={saveProduct}>
              <div className="form-group">
                <label>Código *</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <input
                    type="text"
                    className="input"
                    list="categorias-list"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  />
                  <datalist id="categorias-list">
                    {categorias.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
                
                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Precio de Compra</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    step="0.01"
                    value={formData.precio_compra}
                    onChange={(e) => setFormData({ ...formData, precio_compra: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="form-group">
                  <label>Precio de Venta *</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    step="0.01"
                    required
                    value={formData.precio_venta}
                    onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Stock Mínimo</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeProductModal}>
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

