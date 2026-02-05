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
  
  if (!clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials not found. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY environment variables.'
    )
  }

  // Store original length for debugging
  const originalLength = privateKey.length
  
  // Remove any surrounding quotes
  privateKey = privateKey.trim().replace(/^["']|["']$/g, '')
  
  // Replace escaped newlines with actual newlines (from JSON format)
  privateKey = privateKey.replace(/\\n/g, '\n')
  
  // Extract key content (remove markers if present)
  let keyContent = privateKey
  if (privateKey.includes('BEGIN PRIVATE KEY')) {
    // Extract content between markers
    const match = privateKey.match(/-----BEGIN PRIVATE KEY-----\s*([\s\S]*?)\s*-----END PRIVATE KEY-----/)
    if (match && match[1]) {
      keyContent = match[1]
    } else {
      // If markers are present but no content found, try to extract anyway
      keyContent = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .trim()
    }
  }
  
  // Remove all whitespace and newlines to get clean base64 content
  keyContent = keyContent.replace(/\s+/g, '').replace(/\n/g, '')
  
  // Validate key length (RSA private keys are typically 1600-1700 characters in base64)
  if (keyContent.length < 1000) {
    throw new Error(
      `Firebase private key appears to be incomplete. ` +
      `Original length: ${originalLength} characters, ` +
      `After processing: ${keyContent.length} characters. ` +
      `Expected ~1600-1700 characters. ` +
      'Please check that you copied the COMPLETE private key from the JSON file. ' +
      'The key should be approximately 1672 characters long when cleaned.'
    )
  }
  
  // Additional validation: check if it looks like valid base64
  if (!/^[A-Za-z0-9+/=]+$/.test(keyContent)) {
    throw new Error(
      'Firebase private key contains invalid characters. The key should only contain base64 characters (A-Z, a-z, 0-9, +, /, =).'
    )
  }
  
  // Format with newlines every 64 characters (PEM standard)
  const formattedKey = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent
  
  // Create properly formatted PEM key
  privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`
  
  // Final validation: ensure the formatted key looks correct
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Failed to format private key correctly. Please check the key format.')
  }

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    })
  } catch (error: any) {
    throw new Error(
      `Failed to initialize Firebase Admin: ${error.message}. ` +
      'Please verify that FIREBASE_PRIVATE_KEY contains the complete private key from your Firebase service account JSON.'
    )
  }

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

