'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/auth/login')
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="nav-logo">🏍️ Inventario Moto</h1>
        <ul className="nav-menu">
          <li>
            <Link href="/" className={pathname === '/' ? 'active' : ''}>
              Inicio
            </Link>
          </li>
          <li>
            <Link href="/inventario" className={pathname === '/inventario' ? 'active' : ''}>
              Inventario
            </Link>
          </li>
          <li>
            <Link href="/ventas" className={pathname === '/ventas' ? 'active' : ''}>
              Ventas
            </Link>
          </li>
          <li>
            <Link href="/clientes" className={pathname === '/clientes' ? 'active' : ''}>
              Clientes
            </Link>
          </li>
          <li>
            <Link href="/configuracion" className={pathname === '/configuracion' ? 'active' : ''}>
              Configuración
            </Link>
          </li>
          <li>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ margin: 0 }}>
              Cerrar Sesión
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}

