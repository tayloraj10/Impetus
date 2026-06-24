import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyA4JQDW8jPCFVyJxo8z1RXMC9Ctjrt5RZk",
  authDomain: "impetus-a9558.web.app",
  projectId: "impetus-a9558",
  storageBucket: "impetus-a9558.firebasestorage.app",
  messagingSenderId: "473638522628",
  appId: "1:473638522628:web:c676ee85befaf6cf214a51",
  measurementId: "G-K53S4JL4V7"
}

const app = initializeApp(firebaseConfig)

// Only the Vite dev server can use the isolated dev database. Vite also loads
// .env.local during production builds, so guard with DEV to keep Hosting on prod.
const useDevDb = import.meta.env.DEV && import.meta.env.VITE_USE_DEV_DB === 'true'

export const db = useDevDb ? getFirestore(app, 'impetus-dev') : getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
