import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { onAuthChange, getUserRole, ensureUserProfile, isEmailSignInLink, completeEmailSignIn } from '../services/authService'

interface AuthContextValue {
  user: User | null
  role: 'user' | 'moderator' | 'admin'
  loading: boolean
  emailLinkPending: boolean
  completeEmailLink: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null, role: 'user', loading: true,
  emailLinkPending: false, completeEmailLink: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'user' | 'moderator' | 'admin'>('user')
  const [loading, setLoading] = useState(true)
  const [emailLinkPending, setEmailLinkPending] = useState(false)
  const emailLinkUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u)
      if (!u) {
        setRole('user')
        setLoading(false)
        return
      }
      setLoading(false)
      void ensureUserProfile(u)
      void getUserRole(u.uid).then(setRole)
    })
  }, [])

  // Detect and handle incoming email sign-in links
  useEffect(() => {
    const href = window.location.href
    if (!isEmailSignInLink(href)) return

    const savedEmail = localStorage.getItem('emailForSignIn')
    if (savedEmail) {
      completeEmailSignIn(savedEmail, href)
        .then(() => window.history.replaceState(null, '', window.location.pathname))
        .catch(console.error)
    } else {
      // Different browser — save URL and ask user to re-enter email
      emailLinkUrlRef.current = href
      setEmailLinkPending(true)
    }
  }, [])

  async function completeEmailLink(email: string): Promise<void> {
    if (!emailLinkUrlRef.current) return
    await completeEmailSignIn(email, emailLinkUrlRef.current)
    window.history.replaceState(null, '', window.location.pathname)
    emailLinkUrlRef.current = null
    setEmailLinkPending(false)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, emailLinkPending, completeEmailLink }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
