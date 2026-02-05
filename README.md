# 🏍️ Sistema de Inventario y Facturación - Next.js

Sistema completo de gestión de inventario, ventas y facturación electrónica desarrollado con Next.js y Firebase.

## 🚀 Características

- ✅ Gestión de inventario (productos, categorías, stock)
- ✅ Gestión de clientes
- ✅ Procesamiento de ventas con cálculo automático de IVA
- ✅ Generación de facturas (PDF pendiente de implementar)
- ✅ Configuración personalizable
- ✅ Autenticación con Firebase Auth
- ✅ Multi-tenancy (cada usuario tiene sus propios datos)

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn
- Cuenta de Firebase
- Proyecto Firebase configurado

## 🛠️ Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <tu-repositorio>
   cd inventario-nextjs
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Firebase:**
   - El archivo `lib/firebase.ts` ya tiene la configuración del cliente
   - Para las API routes del servidor, necesitas configurar las variables de entorno (ver `.env.example`)

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador:**
   ```
   http://localhost:3000
   ```

## 📁 Estructura del Proyecto

```
inventario-nextjs/
├── app/
│   ├── api/              # API routes (backend)
│   │   └── ventas/
│   ├── auth/             # Páginas de autenticación
│   ├── inventario/       # Página de inventario
│   ├── ventas/           # Página de ventas
│   ├── clientes/         # Página de clientes
│   ├── configuracion/    # Página de configuración
│   ├── layout.tsx        # Layout principal
│   ├── page.tsx          # Dashboard
│   └── globals.css       # Estilos globales
├── components/
│   └── Navbar.tsx        # Componente de navegación
├── lib/
│   ├── firebase.ts       # Configuración de Firebase
│   ├── utils.ts          # Utilidades (formatCurrency, etc.)
│   └── generador-factura.ts  # Generación de PDFs
└── public/               # Archivos estáticos
```

## 🔐 Autenticación

El sistema usa Firebase Authentication. Los usuarios pueden:
- Registrarse con email y contraseña
- Iniciar sesión
- Cada usuario tiene acceso solo a sus propios datos (multi-tenancy)

## 🗄️ Base de Datos

Firestore se estructura con las siguientes colecciones:
- `productos` - Productos del inventario
- `clientes` - Clientes
- `ventas` - Ventas realizadas
- `detalle_ventas` - Detalles de cada venta
- `configuracion` - Configuración por usuario

## 📝 Funcionalidades Pendientes

- [ ] Generación de PDFs de facturas (requiere librería del servidor)
- [ ] Envío de emails automático (requiere servicio SMTP)
- [ ] Integración completa con DIAN (Colombia)
- [ ] Reportes y estadísticas

## 🚀 Despliegue

Ver `DEPLOY.md` para instrucciones detalladas de despliegue en Vercel o Firebase Hosting.

## 💰 Costos

**✅ $0 MENSUAL** - El sistema está configurado para funcionar completamente gratis usando:
- Vercel Hobby Plan (gratis)
- Firebase Spark Plan (gratis)

Ver `COSTOS_GRATIS.md` para detalles sobre límites y optimizaciones.

## 📄 Licencia

Este proyecto es privado y de uso exclusivo.

## 👨‍💻 Soporte

Para problemas o preguntas, contacta al equipo de desarrollo.
