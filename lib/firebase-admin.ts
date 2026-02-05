// Firebase Admin SDK initialization for server-side use
import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

let adminApp: App | undefined

function getAdminApp(): App {
  if (adminApp) {
    return adminApp
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }

  // Initialize Firebase Admin
  const projectId = process.env.FIREBASE_PROJECT_ID || 'inventariojddo'
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  // Handle private key - accepts multiple formats for easier configuration
  let privateKey = process.env.FIREBASE_PRIVATE_KEY
  if (privateKey) {
    // Remove any surrounding quotes
    privateKey = privateKey.trim().replace(/^["']|["']$/g, '')
    
    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n')
    
    // If it doesn't have BEGIN/END markers, assume it's just the key content
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      // Add the PEM markers and format with newlines every 64 characters
      const keyContent = privateKey.replace(/\s+/g, '') // Remove all whitespace
      // Split into 64 character chunks and join with newlines
      const formattedKey = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent
      privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`
    } else {
      // Already has markers, just ensure proper formatting
      // Ensure newlines after BEGIN and before END
      privateKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '-----BEGIN PRIVATE KEY-----\n')
      privateKey = privateKey.replace(/-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----\n')
      // Clean up any double newlines
      privateKey = privateKey.replace(/\n{3,}/g, '\n\n')
    }
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials not found. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables.'
    )
  }

  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  })

  return adminApp
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export async function verifyIdToken(token: string) {
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

