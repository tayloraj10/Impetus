import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { onAuthChange, getUserRole } from '../services/authService'

interface AuthContextValue {
  user: User | null
  role: 'user' | 'moderator' | 'admin'
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, role: 'user', loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'user' | 'moderator' | 'admin'>('user')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthChange(async (u) => {
      setUser(u)
      if (!u) {
        setRole('user')
        setLoading(false)
        return
      }
      // resolve role async — loading stays true until role is known so role-gated
      // UI doesn't flash the wrong state, but the popup closes immediately
      const r = await getUserRole(u.uid)
      setRole(r)
      setLoading(false)
    })
  }, [])

  return <AuthContext.Provider value={{ user, role, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
