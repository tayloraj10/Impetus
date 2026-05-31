import { Link } from 'react-router-dom'
import { useTopics } from '../hooks/useTopics'
import { Spinner } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import type { Topic } from '../types'

const GRADIENTS = [
  'from-emerald-900 to-teal-950',
  'from-blue-900 to-indigo-950',
  'from-amber-900 to-orange-950',
  'from-purple-900 to-violet-950',
  'from-rose-900 to-pink-950',
  'from-cyan-900 to-sky-950',
  'from-lime-900 to-green-950',
  'from-fuchsia-900 to-purple-950',
]

function slugGradient(slug: string): string {
  let h = 0
  for (let i = 0; i < slug.length; i++) {
    h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0
  }
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

export function TopicsPage() {
  const { topics, loading } = useTopics()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Topics</h1>
        <p className="text-zinc-400 mt-2">Browse every issue we're tracking. Each topic is a living hub of groups, resources, events, and challenges.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : topics.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
          <p className="text-zinc-500">No topics yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {topics.map(t => <TopicCard key={t.id} topic={t} />)}
        </div>
      )}
    </div>
  )
}

function TopicCard({ topic }: { topic: Topic }) {
  const total = topic.groupCount + topic.resourceCount + topic.eventCount + topic.challengeCount
  const gradient = slugGradient(topic.slug)

  return (
    <Link
      to={`/topic/${topic.slug}`}
      className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all duration-200 group hover:-translate-y-px hover:shadow-xl hover:shadow-black/30"
    >
      {/* Image or gradient header */}
      <div className="relative h-20 overflow-hidden">
        {topic.imageUrl ? (
          <img
            src={topic.imageUrl}
            alt={topic.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} transition-opacity duration-300 group-hover:opacity-80`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-zinc-900/20 to-transparent" />
      </div>

      <div className="p-4">
        <h2 className="text-zinc-100 font-semibold group-hover:text-emerald-400 transition-colors leading-snug mb-2">
          {topic.title}
        </h2>

        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 mb-3">{topic.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {topic.tags.map(tag => <Badge key={tag}>{tag}</Badge>)}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500 pt-3 border-t border-zinc-800">
          {topic.groupCount > 0 && <span>{topic.groupCount} groups</span>}
          {topic.groupCount > 0 && topic.resourceCount > 0 && <span className="text-zinc-700">·</span>}
          {topic.resourceCount > 0 && <span>{topic.resourceCount} resources</span>}
          {(topic.groupCount > 0 || topic.resourceCount > 0) && topic.eventCount > 0 && <span className="text-zinc-700">·</span>}
          {topic.eventCount > 0 && <span>{topic.eventCount} events</span>}
          {(topic.groupCount > 0 || topic.resourceCount > 0 || topic.eventCount > 0) && topic.challengeCount > 0 && <span className="text-zinc-700">·</span>}
          {topic.challengeCount > 0 && <span>{topic.challengeCount} challenges</span>}
          {total === 0 && <span>No content yet</span>}
        </div>
      </div>
    </Link>
  )
}
