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
  // Handle private key with proper line breaks
  // Replace escaped newlines and also handle actual newlines
  let privateKey = process.env.FIREBASE_PRIVATE_KEY
  if (privateKey) {
    // Replace escaped newlines first
    privateKey = privateKey.replace(/\\n/g, '\n')
    // Ensure proper PEM format (in case newlines are missing)
    if (!privateKey.includes('\n')) {
      // If no newlines, try to add them at key boundaries
      privateKey = privateKey.replace(/(-----BEGIN PRIVATE KEY-----)(.+?)(-----END PRIVATE KEY-----)/s, '$1\n$2\n$3')
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

