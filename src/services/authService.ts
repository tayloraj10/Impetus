import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword as firebaseSignInWithEmail,
  createUserWithEmailAndPassword as firebaseCreateUser,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User, type Unsubscribe, type ConfirmationResult,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

export type { RecaptchaVerifier, ConfirmationResult }

const googleProvider = new GoogleAuthProvider()

// Popups are unreliable on mobile browsers (storage partitioning, in-app
// webviews, popup blocking) and can fail to deliver a result with no error.
// Redirect navigates away and back instead, which works consistently there.
function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent)
}

export async function signInWithGoogle(): Promise<void> {
  if (isMobileDevice()) {
    await signInWithRedirect(auth, googleProvider)
  } else {
    await signInWithPopup(auth, googleProvider)
  }
}

export async function getGoogleRedirectResult() {
  return getRedirectResult(auth)
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await firebaseSignInWithEmail(auth, email, password)
}

export async function createAccountWithEmail(email: string, password: string, displayName: string): Promise<void> {
  const result = await firebaseCreateUser(auth, email, password)
  await updateProfile(result.user, { displayName })
}

export function createPhoneVerifier(container: HTMLElement): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, container, { size: 'invisible' })
}

export async function sendPhoneOTP(phone: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phone, verifier)
}

export async function confirmPhoneOTP(confirmation: ConfirmationResult, code: string): Promise<User> {
  const result = await confirmation.confirm(code)
  return result.user
}

export async function sendEmailSignInLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, {
    url: window.location.origin,
    handleCodeInApp: true,
  })
  localStorage.setItem('emailForSignIn', email)
}

export function isEmailSignInLink(url: string): boolean {
  return isSignInWithEmailLink(auth, url)
}

export async function completeEmailSignIn(email: string, url: string): Promise<void> {
  await signInWithEmailLink(auth, email, url)
  localStorage.removeItem('emailForSignIn')
}

export async function updateDisplayName(user: User, displayName: string): Promise<void> {
  await updateProfile(user, { displayName })
  await setDoc(doc(db, 'users', user.uid), { displayName }, { merge: true })
}

export async function updatePhotoURL(user: User, photoURL: string): Promise<void> {
  await updateProfile(user, { photoURL })
  await setDoc(doc(db, 'users', user.uid), { photoURL }, { merge: true })
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback)
}

export async function ensureUserProfile(user: User): Promise<void> {
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
