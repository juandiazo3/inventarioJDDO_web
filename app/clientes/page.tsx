'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { showAlert, confirmAction } from '@/lib/utils'

export default function ClientesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState<any[]>([])
  const [filteredClientes, setFilteredClientes] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<any>(null)
  const [formData, setFormData] = useState({
    tipo_documento: 'CC',
    numero_documento: '',
    nombre: '',
    direccion: '',
    telefono: '',
    email: ''
  })
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      if (!user) {
        router.push('/auth/login')
      } else {
        loadClientes(user.uid)
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    filterClientes()
  }, [searchTerm, clientes])

  const loadClientes = async (userId: string) => {
    try {
      const q = query(collection(db, 'clientes'), where('user_id', '==', userId))
      const snapshot = await getDocs(q)
      const clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setClientes(clientesData)
    } catch (error) {
      console.error('Error cargando clientes:', error)
      showAlert('Error al cargar clientes', 'error')
    }
  }

  const filterClientes = () => {
    const filtered = clientes.filter((c: any) => 
      c.numero_documento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefono?.includes(searchTerm)
    )
    setFilteredClientes(filtered)
  }

  const openClienteModal = (cliente?: any) => {
    if (cliente) {
      setEditingCliente(cliente)
      setFormData({
        tipo_documento: cliente.tipo_documento || 'CC',
        numero_documento: cliente.numero_documento || '',
        nombre: cliente.nombre || '',
        direccion: cliente.direccion || '',
        telefono: cliente.telefono || '',
        email: cliente.email || ''
      })
    } else {
      setEditingCliente(null)
      setFormData({
        tipo_documento: 'CC',
        numero_documento: '',
        nombre: '',
        direccion: '',
        telefono: '',
        email: ''
      })
    }
    setShowModal(true)
  }

  const closeClienteModal = () => {
    setShowModal(false)
    setEditingCliente(null)
  }

  const saveCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const data = {
        ...formData,
        user_id: user.uid,
        activo: true,
        fecha_creacion: editingCliente?.fecha_creacion || new Date().toISOString()
      }

      if (editingCliente) {
        await updateDoc(doc(db, 'clientes', editingCliente.id), data)
        showAlert('Cliente actualizado exitosamente', 'success')
      } else {
        await addDoc(collection(db, 'clientes'), data)
        showAlert('Cliente creado exitosamente', 'success')
      }
      
      closeClienteModal()
      loadClientes(user.uid)
    } catch (error: any) {
      console.error('Error guardando cliente:', error)
      showAlert(error.message || 'Error al guardar cliente', 'error')
    }
  }

  const deleteCliente = (clienteId: string) => {
    confirmAction('¿Está seguro de eliminar este cliente?', async () => {
      try {
        await updateDoc(doc(db, 'clientes', clienteId), { activo: false })
        showAlert('Cliente eliminado exitosamente', 'success')
        if (user) loadClientes(user.uid)
      } catch (error) {
        console.error('Error eliminando cliente:', error)
        showAlert('Error al eliminar cliente', 'error')
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
          <h2>Gestión de Clientes</h2>
          <button className="btn btn-primary" onClick={() => openClienteModal()}>
            ➕ Nuevo Cliente
          </button>
        </div>

        <div className="filters">
          <input
            type="text"
            placeholder="Buscar cliente..."
            className="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo Doc.</th>
                <th>Número Doc.</th>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.length === 0 ? (
                <tr><td colSpan={7} className="text-center">No hay clientes registrados</td></tr>
              ) : (
                filteredClientes.map((c: any) => (
                  <tr key={c.id}>
                    <td>{c.tipo_documento}</td>
                    <td>{c.numero_documento}</td>
                    <td>{c.nombre}</td>
                    <td>{c.direccion || '-'}</td>
                    <td>{c.telefono || '-'}</td>
                    <td>{c.email || '-'}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openClienteModal(c)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem' }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteCliente(c.id)}
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
        <div className="modal show" onClick={(e) => e.target === e.currentTarget && closeClienteModal()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <span className="close" onClick={closeClienteModal}>&times;</span>
            </div>
            <form onSubmit={saveCliente}>
              <div className="form-group">
                <label>Tipo Documento *</label>
                <select
                  className="input"
                  required
                  value={formData.tipo_documento}
                  onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
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
                  value={formData.numero_documento}
                  onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Nombre / Razón Social *</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Dirección</label>
                <input
                  type="text"
                  className="input"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeClienteModal}>
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

