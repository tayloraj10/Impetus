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

export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
