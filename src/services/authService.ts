import {
  GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut,
  onAuthStateChanged, type User, type Unsubscribe,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<void> {
  const result = await signInWithPopup(auth, provider)
  // fire-and-forget — don't block the popup closing on the Firestore write
  ensureUserProfile(result.user)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback)
}

async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      id: user.uid,
      displayName: user.displayName ?? 'Anonymous',
      email: user.email ?? '',
      photoURL: user.photoURL ?? null,
      role: 'user',
      createdAt: serverTimestamp(),
    })
  }
}

export async function getUserRole(uid: string): Promise<'user' | 'moderator' | 'admin'> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return 'user'
  return (snap.data()?.role as 'user' | 'moderator' | 'admin') ?? 'user'
}
