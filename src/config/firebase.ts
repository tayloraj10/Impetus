import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyA4JQDW8jPCFVyJxo8z1RXMC9Ctjrt5RZk",
  authDomain: "impetus-a9558.firebaseapp.com",
  projectId: "impetus-a9558",
  storageBucket: "impetus-a9558.firebasestorage.app",
  messagingSenderId: "473638522628",
  appId: "1:473638522628:web:c676ee85befaf6cf214a51",
  measurementId: "G-K53S4JL4V7"
}

const app = initializeApp(firebaseConfig)

// VITE_USE_DEV_DB=true (in a gitignored .env.local) points local dev at the
// isolated 'impetus-dev' Firestore database instead of production, so seeding
// and testing never touches real data. Unset/false in any deployed build.
const useDevDb = import.meta.env.VITE_USE_DEV_DB === 'true'

export const db = useDevDb ? getFirestore(app, 'impetus-dev') : getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
