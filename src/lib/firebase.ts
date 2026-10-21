import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase config for StitchApp project (stitchapp-31192)
// These are safe to be public — security is enforced by Firestore rules
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAAaNV0reYr4sfT5XFtmEdhxQE_bZdcAcs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'stitchapp-31192.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'stitchapp-31192',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'stitchapp-31192.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '477516192404',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:477516192404:web:68f6c16a30bed1825af281',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
