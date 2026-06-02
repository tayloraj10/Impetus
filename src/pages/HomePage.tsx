import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTopicFeed } from '../hooks/useTopicFeed'
import { TopicActivityCard } from '../components/feed/TopicActivityCard'
import { Spinner } from '../components/ui/Spinner'
import type { FeedItem } from '../types'

type TypeFilter = FeedItem['type'] | 'all'

export function HomePage() {
  const { topics, feedItems, loading } = useTopicFeed()
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const topicEntries = topics
    .filter(topic => !selectedTopicId || topic.id === selectedTopicId)
    .map(topic => {
      const allForTopic = feedItems
        .filter(item => item.topicId === topic.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const filtered = typeFilter === 'all'
        ? allForTopic
        : allForTopic.filter(item => item.type === typeFilter)
      return { topic, items: filtered.slice(0, 3), totalCount: filtered.length }
    })
    .filter(entry => typeFilter === 'all' || entry.totalCount > 0)

  return (
    <div className="max-w-6xl mx-auto px-4 flex flex-col lg:h-[calc(100vh-3.5rem)]">

      {/* Hero — compact, pinned on desktop */}
      <div className="py-4 shrink-0">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
          Engine of{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
            information.
          </span>
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Everything happening for social good, in one place.
        </p>
      </div>

      {/* Mobile-only filter chips */}
      <div className="lg:hidden shrink-0 mb-4 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <MobileChip
            label="All"
            active={selectedTopicId === null}
            onClick={() => setSelectedTopicId(null)}
          />
          {loading ? (
            <div className="flex items-center px-2"><Spinner size="sm" /></div>
          ) : topics.map(t => (
            <MobileChip
              key={t.id}
              label={t.title}
              active={selectedTopicId === t.id}
              onClick={() => setSelectedTopicId(selectedTopicId === t.id ? null : t.id)}
            />
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {(['all', 'group', 'resource', 'event', 'challenge'] as const).map(type => (
            <MobileChip
              key={type}
              label={type === 'all' ? 'All types' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              active={typeFilter === type}
              onClick={() => setTypeFilter(type)}
              accent
            />
          ))}
        </div>
      </div>

      {/* Content row */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-8 lg:pb-6">

        {/* Desktop sidebar — hidden on mobile */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col min-h-0">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 shrink-0">Topics</p>
          <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1">
            <FilterButton
              label="All Topics"
              count={topics.length}
              active={selectedTopicId === null}
              onClick={() => setSelectedTopicId(null)}
            />
            {loading ? (
              <div className="py-2"><Spinner size="sm" /></div>
            ) : topics.map(t => (
              <FilterButton
                key={t.id}
                label={t.title}
                count={feedItems.filter(i => i.topicId === t.id).length}
                active={selectedTopicId === t.id}
                onClick={() => setSelectedTopicId(selectedTopicId === t.id ? null : t.id)}
              />
            ))}
          </div>

          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-5 mb-3 shrink-0">Activity Type</p>
          <div className="space-y-1 shrink-0">
            {(['all', 'group', 'resource', 'event', 'challenge'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer border-l-2 ${typeFilter === type
                    ? 'bg-zinc-800/80 text-zinc-100 border-l-emerald-500'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border-l-transparent'
                  }`}
              >
                {type === 'all' ? 'All activity' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              </button>
            ))}
          </div>
        </aside>

        {/* Main feed — scrolls independently on desktop, page scrolls on mobile */}
        <main className="flex-1 min-h-0 lg:overflow-y-auto lg:pr-1 pb-8 lg:pb-0">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : topicEntries.length === 0 ? (
            <EmptyFeed selectedTopicId={selectedTopicId} typeFilter={typeFilter} />
          ) : (
            <div className="space-y-3 py-0.5">
              {topicEntries.map(({ topic, items, totalCount }) => (
                <TopicActivityCard
                  key={topic.id}
                  topic={topic}
                  items={items}
                  totalCount={totalCount}
                />
              ))}
            </div>
          )}
        </main>

      </div>
    </div>
  )
}

function MobileChip({ label, active, onClick, accent }: {
  label: string; active: boolean; onClick: () => void; accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${active
          ? accent
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            : 'bg-zinc-700 border-zinc-600 text-zinc-100'
          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
        }`}
    >
      {label}
    </button>
  )
}

function FilterButton({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer border-l-2 ${active
          ? 'bg-zinc-800/80 text-zinc-100 border-l-emerald-500'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border-l-transparent'
        }`}
    >
      <span className="truncate">{label}</span>
      <span className={`text-xs ml-2 shrink-0 ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>{count}</span>
    </button>
  )
}

function EmptyFeed({ selectedTopicId, typeFilter }: { selectedTopicId: string | null; typeFilter: TypeFilter }) {
  const filtered = selectedTopicId || typeFilter !== 'all'
  return (
    <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
      <h2 className="text-zinc-300 font-semibold mb-2">
        {filtered ? 'No matching activity' : 'No topics yet'}
      </h2>
      <p className="text-zinc-500 text-sm max-w-sm mx-auto">
        {filtered
          ? 'Try clearing your filters to see all topic activity.'
          : "Topics will appear here as they're created and populated."}
      </p>
      {!filtered && (
        <Link to="/topics" className="inline-flex items-center gap-1 mt-4 text-emerald-400 text-sm hover:text-emerald-300 transition-colors">
          Browse Topics →
        </Link>
      )}
    </div>
  )
}
