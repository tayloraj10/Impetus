import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { signInWithGoogle, signOut } from '../../services/authService'
import { Button } from '../ui/Button'

export function Header() {
  const { user, role, loading } = useAuth()
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 text-base group-hover:bg-emerald-500/20 transition-colors">⚡</span>
          <span className="text-zinc-100 font-bold tracking-widest uppercase text-sm group-hover:text-emerald-400 transition-colors">Impetus</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/" active={pathname === '/'}>Feed</NavLink>
          <NavLink to="/topics" active={pathname === '/topics'}>Topics</NavLink>
          {(role === 'admin' || role === 'moderator') && (
            <NavLink to="/admin" active={pathname.startsWith('/admin')}>Admin</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {!loading && (
            user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
                  )}
                  <span className="text-zinc-400 text-sm hidden sm:block">{user.displayName}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
              </div>
            ) : (
              <Button size="sm" onClick={signInWithGoogle}>Sign in</Button>
            )
          )}
        </div>
      </div>
    </header>
  )
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'text-zinc-100 bg-zinc-800 shadow-sm'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
    >
      {children}
    </Link>
  )
}
