import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { signInWithGoogle, signOut } from '../../services/authService'
import { Button } from '../ui/Button'

export function Header() {
  const { user, role, loading } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = searchValue.trim()
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`)
      setSearchValue('')
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors mt-px shrink-0"></span>
          <span className="text-zinc-100 font-bold tracking-widest uppercase text-sm group-hover:text-emerald-400 transition-colors">Impetus</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/" active={pathname === '/'}>Feed</NavLink>
          <NavLink to="/topics" active={pathname === '/topics'}>Topics</NavLink>
          <NavLink to="/groups" active={pathname === '/groups'}>Groups</NavLink>
          {(role === 'admin' || role === 'moderator') && (
            <NavLink to="/admin" active={pathname.startsWith('/admin')}>Admin</NavLink>
          )}
        </nav>

        <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-xs">
          <div className="relative w-full">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Search…"
              className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 rounded-lg pl-8 pr-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Link
            to="/search"
            className="sm:hidden p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Search"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </Link>

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
