import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { subscribeDefinitions, subscribeUserRatings, rateDefinition } from '../services/definitionsService'
import type { Definition, DefinitionCategory } from '../types'

const CATEGORIES: { key: DefinitionCategory | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '' },
  { key: 'political', label: 'Political', color: 'text-blue-400 bg-blue-950 border-blue-800' },
  { key: 'economic', label: 'Economic', color: 'text-emerald-400 bg-emerald-950 border-emerald-800' },
  { key: 'legal', label: 'Legal', color: 'text-amber-400 bg-amber-950 border-amber-800' },
  { key: 'social', label: 'Social', color: 'text-purple-400 bg-purple-950 border-purple-800' },
  { key: 'other', label: 'Other', color: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
]

function categoryStyle(category: DefinitionCategory): string {
  return CATEGORIES.find(c => c.key === category)?.color ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'
}

function categoryLabel(category: DefinitionCategory): string {
  return CATEGORIES.find(c => c.key === category)?.label ?? category
}

export function DefinitionsPage() {
  const { user } = useAuth()
  const [definitions, setDefinitions] = useState<Definition[]>([])
  const [userRatings, setUserRatings] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DefinitionCategory | 'all'>('all')
  const [sort, setSort] = useState<'alpha' | 'rating'>('alpha')

  useEffect(() => subscribeDefinitions(setDefinitions), [])

  useEffect(() => {
    if (!user) { setUserRatings({}); return }
    return subscribeUserRatings(user.uid, setUserRatings)
  }, [user])

  const filtered = useMemo(() => {
    let result = definitions
    if (categoryFilter !== 'all') result = result.filter(d => d.category === categoryFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(d =>
        d.term.toLowerCase().includes(q) ||
        d.definition.toLowerCase().includes(q),
      )
    }
    if (sort === 'rating') {
      return [...result].sort((a, b) => {
        const avgA = a.ratingCount > 0 ? a.ratingSum / a.ratingCount : 0
        const avgB = b.ratingCount > 0 ? b.ratingSum / b.ratingCount : 0
        return avgB - avgA
      })
    }
    return result
  }, [definitions, categoryFilter, search, sort])

  // Group alphabetically only when not searching and sort is alpha
  const grouped = useMemo(() => {
    if (search.trim() || sort === 'rating') return null
    const groups: Record<string, Definition[]> = {}
    for (const def of filtered) {
      const letter = def.term[0]?.toUpperCase() ?? '#'
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(def)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, search, sort])

  async function handleRate(definitionId: string, rating: number) {
    if (!user) return
    try {
      await rateDefinition(definitionId, user.uid, rating)
    } catch (err) {
      console.error('Rating error:', err)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Definitions</h1>
        <p className="text-zinc-500 text-sm">
          Common political and economic terms. You can rate each definition's accuracy.
        </p>
      </div>

      {/* Search + sort */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search terms…"
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex rounded-lg border border-zinc-800 overflow-hidden text-xs font-medium">
          <button
            onClick={() => setSort('alpha')}
            className={`px-3 py-2 transition-colors cursor-pointer ${sort === 'alpha' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            A–Z
          </button>
          <button
            onClick={() => setSort('rating')}
            className={`px-3 py-2 transition-colors cursor-pointer ${sort === 'rating' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Rated Most Accurate
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              categoryFilter === key
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {definitions.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-sm">No definitions yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-sm">No definitions match your search.</p>
        </div>
      ) : grouped ? (
        <div className="space-y-8">
          {grouped.map(([letter, defs]) => (
            <div key={letter}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest w-5 shrink-0">{letter}</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <div className="space-y-3">
                {defs.map(def => (
                  <DefinitionCard
                    key={def.id}
                    definition={def}
                    userRating={userRatings[def.id] ?? null}
                    onRate={user ? (r) => handleRate(def.id, r) : null}
                    onRelatedClick={term => { setSearch(term); setSort('alpha') }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(def => (
            <DefinitionCard
              key={def.id}
              definition={def}
              userRating={userRatings[def.id] ?? null}
              onRate={user ? (r) => handleRate(def.id, r) : null}
              onRelatedClick={term => { setSearch(term); setSort('alpha') }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DefinitionCard({
  definition,
  userRating,
  onRate,
  onRelatedClick,
}: {
  definition: Definition
  userRating: number | null
  onRate: ((rating: number) => void) | null
  onRelatedClick: (term: string) => void
}) {
  const { term, category, categoryOther, definition: defText, extendedNote, example, relatedTerms, ratingSum, ratingCount } = definition
  const average = ratingCount > 0 ? ratingSum / ratingCount : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-zinc-100 leading-tight">{term}</h2>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${categoryStyle(category)}`}>
          {category === 'other' && categoryOther ? categoryOther : categoryLabel(category)}
        </span>
      </div>

      <p className="text-zinc-300 text-sm leading-relaxed mb-3">{defText}</p>

      {extendedNote && (
        <div className="border-t border-zinc-800 pt-3 mb-3">
          <p className="text-zinc-500 text-sm leading-relaxed">{extendedNote}</p>
        </div>
      )}

      {example && (
        <p className="text-zinc-500 text-sm italic mb-3">"{example}"</p>
      )}

      {relatedTerms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-xs text-zinc-600">Related:</span>
          {relatedTerms.map(rt => (
            <button
              key={rt}
              onClick={() => onRelatedClick(rt)}
              className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer underline underline-offset-2"
            >
              {rt}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <StarRating
          userRating={userRating}
          onRate={onRate}
          average={average}
          count={ratingCount}
        />
        {!onRate && (
          <span className="text-xs text-zinc-600">Sign in to rate accuracy</span>
        )}
      </div>
    </div>
  )
}

function StarRating({
  userRating,
  onRate,
  average,
  count,
}: {
  userRating: number | null
  onRate: ((rating: number) => void) | null
  average: number | null
  count: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const activeRating = hover ?? userRating

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onRate?.(star)}
            onMouseEnter={() => onRate && setHover(star)}
            onMouseLeave={() => setHover(null)}
            disabled={!onRate}
            className={`transition-transform ${onRate ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
            title={onRate ? `Rate accuracy ${star} out of 5` : undefined}
          >
            <svg
              className={`w-4 h-4 transition-colors ${
                activeRating !== null && star <= activeRating
                  ? 'text-amber-400'
                  : 'text-zinc-700'
              }`}
              fill="currentColor" viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {average !== null ? (
        <span className="text-xs text-zinc-500">
          {average.toFixed(1)} · {count} {count === 1 ? 'accuracy rating' : 'accuracy ratings'}
        </span>
      ) : (
        <span className="text-xs text-zinc-600">No accuracy ratings yet</span>
      )}
    </div>
  )
}
