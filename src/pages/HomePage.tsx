import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFeed } from '../hooks/useFeed'
import { useTopics } from '../hooks/useTopics'
import { FeedCard } from '../components/feed/FeedCard'
import { Spinner } from '../components/ui/Spinner'
import type { FeedItem } from '../types'

export function HomePage() {
  const { items, loading: feedLoading } = useFeed()
  const { topics, loading: topicsLoading } = useTopics()
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<FeedItem['type'] | 'all'>('all')

  const filtered = items.filter(item => {
    if (selectedTopic && item.topicId !== selectedTopic) return false
    if (typeFilter !== 'all' && item.type !== typeFilter) return false
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-zinc-100 tracking-tight leading-tight">
          Engine of{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
            change.
          </span>
        </h1>
        <p className="text-zinc-400 mt-3 text-lg leading-relaxed">
          Discover initiatives, find your people, take action.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 shrink-0">
          <div className="sticky top-20">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Topics</p>
            <div className="space-y-1">
              <TopicFilter
                label="All Topics"
                count={items.length}
                active={selectedTopic === null}
                onClick={() => setSelectedTopic(null)}
              />
              {topicsLoading ? (
                <div className="py-2"><Spinner size="sm" /></div>
              ) : topics.map(t => (
                <TopicFilter
                  key={t.id}
                  label={t.title}
                  count={items.filter(i => i.topicId === t.id).length}
                  active={selectedTopic === t.id}
                  onClick={() => setSelectedTopic(selectedTopic === t.id ? null : t.id)}
                />
              ))}
            </div>

            <p className="text-xs text-zinc-500 uppercase tracking-wider mt-6 mb-3">Type</p>
            <div className="space-y-1">
              {(['all', 'group', 'resource', 'event', 'challenge'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer border-l-2 ${
                    typeFilter === type
                      ? 'bg-zinc-800/80 text-zinc-100 border-l-emerald-500'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border-l-transparent'
                  }`}
                >
                  {type === 'all' ? 'All types' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {feedLoading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <EmptyFeed hasTopics={topics.length > 0} />
          ) : (
            <div className="space-y-3">
              {filtered.map(item => <FeedCard key={item.id} item={item} />)}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function TopicFilter({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer border-l-2 ${
        active
          ? 'bg-zinc-800/80 text-zinc-100 border-l-emerald-500'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border-l-transparent'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className={`text-xs ml-2 shrink-0 ${active ? 'text-zinc-400' : 'text-zinc-700'}`}>{count}</span>
    </button>
  )
}

function EmptyFeed({ hasTopics }: { hasTopics: boolean }) {
  return (
    <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
      <div className="text-4xl mb-4">⚡</div>
      <h2 className="text-zinc-300 font-semibold mb-2">
        {hasTopics ? 'Nothing here yet' : 'No content yet'}
      </h2>
      <p className="text-zinc-500 text-sm max-w-sm mx-auto">
        {hasTopics
          ? 'No items match your filters. Try selecting a different topic or type.'
          : 'Topics and content will appear here as they\'re added. Check back soon.'}
      </p>
      {!hasTopics && (
        <Link to="/topics" className="inline-flex items-center gap-1 mt-4 text-emerald-400 text-sm hover:text-emerald-300 transition-colors">
          Browse Topics →
        </Link>
      )}
    </div>
  )
}
