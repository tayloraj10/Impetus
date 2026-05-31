import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useSearch } from '../hooks/useSearch'
import type { Topic, Group, Resource, ImpetusEvent, Challenge } from '../types'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryStr = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(queryStr)
  const { results, topicById, loading, error } = useSearch(queryStr)

  useEffect(() => {
    setInputValue(queryStr)
  }, [queryStr])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (trimmed) setSearchParams({ q: trimmed })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          autoFocus
          type="search"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Search topics, groups, resources, events…"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          Search
        </button>
      </form>

      {!queryStr && (
        <p className="text-zinc-500 text-sm text-center mt-16">Enter a search term above.</p>
      )}

      {queryStr && loading && (
        <div className="flex justify-center mt-16">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm text-center mt-8">{error}</p>
      )}

      {results && !loading && (
        <>
          <p className="text-zinc-500 text-xs mb-6">
            {results.total === 0
              ? `No results for "${queryStr}"`
              : `${results.total} result${results.total !== 1 ? 's' : ''} for "${queryStr}"`}
          </p>

          {results.topics.length > 0 && (
            <Section label="Topics" count={results.topics.length} color="emerald">
              {results.topics.map(t => <TopicResult key={t.id} topic={t} />)}
            </Section>
          )}

          {results.groups.length > 0 && (
            <Section label="Groups" count={results.groups.length} color="blue">
              {results.groups.map(g => (
                <GroupResult key={g.id} group={g} topicSlug={topicById.get(g.topicId)?.slug} topicTitle={topicById.get(g.topicId)?.title} />
              ))}
            </Section>
          )}

          {results.resources.length > 0 && (
            <Section label="Resources" count={results.resources.length} color="violet">
              {results.resources.map(r => (
                <ResourceResult key={r.id} resource={r} topicSlug={topicById.get(r.topicId)?.slug} topicTitle={topicById.get(r.topicId)?.title} />
              ))}
            </Section>
          )}

          {results.events.length > 0 && (
            <Section label="Events" count={results.events.length} color="amber">
              {results.events.map(e => (
                <EventResult key={e.id} event={e} topicSlug={topicById.get(e.topicId)?.slug} topicTitle={topicById.get(e.topicId)?.title} />
              ))}
            </Section>
          )}

          {results.challenges.length > 0 && (
            <Section label="Challenges" count={results.challenges.length} color="rose">
              {results.challenges.map(c => (
                <ChallengeResult key={c.id} challenge={c} topicSlug={topicById.get(c.topicId)?.slug} topicTitle={topicById.get(c.topicId)?.title} />
              ))}
            </Section>
          )}

          {results.total === 0 && (
            <div className="text-center mt-12">
              <p className="text-zinc-400 text-sm mb-2">Try a different keyword or browse all topics.</p>
              <Link to="/topics" className="text-emerald-500 hover:text-emerald-400 text-sm">Browse Topics →</Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const colorMap = {
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  blue:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
  violet:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rose:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
} as const

function Section({
  label, count, color, children,
}: {
  label: string
  count: number
  color: keyof typeof colorMap
  children: React.ReactNode
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${colorMap[color]}`}>
          {label}
        </span>
        <span className="text-zinc-600 text-xs">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ResultCard({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg px-4 py-3 transition-colors group"
    >
      {children}
    </Link>
  )
}

function TopicMeta({ topicTitle, topicSlug }: { topicTitle?: string; topicSlug?: string }) {
  if (!topicTitle || !topicSlug) return null
  return (
    <span className="text-zinc-600 text-xs">
      in{' '}
      <span className="text-zinc-500">{topicTitle}</span>
    </span>
  )
}

function TopicResult({ topic }: { topic: Topic }) {
  return (
    <ResultCard to={`/topic/${topic.slug}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-zinc-100 text-sm font-medium group-hover:text-emerald-400 transition-colors truncate">
            {topic.title}
          </p>
          {topic.description && (
            <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{topic.description}</p>
          )}
        </div>
        {topic.tags.length > 0 && (
          <div className="flex gap-1 shrink-0">
            {topic.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </ResultCard>
  )
}

function GroupResult({ group, topicSlug, topicTitle }: { group: Group; topicSlug?: string; topicTitle?: string }) {
  const locationParts = [group.location?.city, group.location?.state, group.location?.country].filter(Boolean)
  return (
    <ResultCard to={topicSlug ? `/topic/${topicSlug}` : '/'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-zinc-100 text-sm font-medium group-hover:text-emerald-400 transition-colors truncate">
            {group.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {locationParts.length > 0 && (
              <span className="text-zinc-500 text-xs">{locationParts.join(', ')}</span>
            )}
            <TopicMeta topicTitle={topicTitle} topicSlug={topicSlug} />
          </div>
          {group.description && (
            <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{group.description}</p>
          )}
        </div>
      </div>
    </ResultCard>
  )
}

const resourceTypeLabel: Record<Resource['type'], string> = {
  article: 'Article',
  video: 'Video',
  government: 'Gov',
  tool: 'Tool',
  guide: 'Guide',
  other: 'Other',
}

function ResourceResult({ resource, topicSlug, topicTitle }: { resource: Resource; topicSlug?: string; topicTitle?: string }) {
  return (
    <ResultCard to={topicSlug ? `/topic/${topicSlug}` : '/'}>
      <div className="flex items-start gap-3">
        <span className="text-xs bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
          {resourceTypeLabel[resource.type]}
        </span>
        <div className="min-w-0">
          <p className="text-zinc-100 text-sm font-medium group-hover:text-emerald-400 transition-colors truncate">
            {resource.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <TopicMeta topicTitle={topicTitle} topicSlug={topicSlug} />
          </div>
          {resource.description && (
            <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{resource.description}</p>
          )}
        </div>
      </div>
    </ResultCard>
  )
}

function EventResult({ event, topicSlug, topicTitle }: { event: ImpetusEvent; topicSlug?: string; topicTitle?: string }) {
  const dateStr = event.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <ResultCard to={topicSlug ? `/topic/${topicSlug}` : '/'}>
      <div className="min-w-0">
        <p className="text-zinc-100 text-sm font-medium group-hover:text-emerald-400 transition-colors truncate">
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-zinc-500 text-xs">{dateStr}</span>
          {event.location && <span className="text-zinc-600 text-xs">· {event.location}</span>}
          {event.isVirtual && <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Virtual</span>}
          <TopicMeta topicTitle={topicTitle} topicSlug={topicSlug} />
        </div>
        {event.description && (
          <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{event.description}</p>
        )}
      </div>
    </ResultCard>
  )
}

function ChallengeResult({ challenge, topicSlug, topicTitle }: { challenge: Challenge; topicSlug?: string; topicTitle?: string }) {
  return (
    <ResultCard to={topicSlug ? `/topic/${topicSlug}` : '/'}>
      <div className="min-w-0">
        <p className="text-zinc-100 text-sm font-medium group-hover:text-emerald-400 transition-colors truncate">
          {challenge.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-zinc-500 text-xs">{challenge.participantCount} participants</span>
          <TopicMeta topicTitle={topicTitle} topicSlug={topicSlug} />
        </div>
        {challenge.description && (
          <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{challenge.description}</p>
        )}
      </div>
    </ResultCard>
  )
}
