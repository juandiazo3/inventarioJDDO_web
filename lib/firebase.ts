import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyBQFWUXT0ND8r9sJ3tSyTF7uh1OBd7KT0A",
  authDomain: "inventariojddo.firebaseapp.com",
  projectId: "inventariojddo",
  storageBucket: "inventariojddo.firebasestorage.app",
  messagingSenderId: "891585513704",
  appId: "1:891585513704:web:7ccb7cd1231406304b615d",
  measurementId: "G-ZTT9KHB10P"
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Initialize Analytics (solo en cliente)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

export default app

