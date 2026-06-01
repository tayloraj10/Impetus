import { Link } from 'react-router-dom'
import type { Topic, FeedItem } from '../../types'
import { formatTimeAgo } from '../../utils/time'

// --- Icons ---

function GroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM17 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 0 0-1.5-4.33A5 5 0 0 1 19 16v1h-6.07zM6 11a5 5 0 0 1 5 5v1H1v-1a5 5 0 0 1 5-5z" />
    </svg>
  )
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 1 1 2.828 2.828l-3 3a2 2 0 0 1-2.828 0 1 1 0 0 0-1.414 1.414 4 4 0 0 0 5.656 0l3-3a4 4 0 0 0-5.656-5.656l-1.5 1.5a1 1 0 1 0 1.414 1.414l1.5-1.5zm-5 5a2 2 0 0 1 2.828 0 1 1 0 1 0 1.414-1.414 4 4 0 0 0-5.656 0l-3 3a4 4 0 1 0 5.656 5.656l1.5-1.5a1 1 0 1 0-1.414-1.414l-1.5 1.5a2 2 0 1 1-2.828-2.828l3-3z" clipRule="evenodd" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
    </svg>
  )
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093z" />
    </svg>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
    </svg>
  )
}

// --- Helpers ---

function dominantStripeColor(topic: Topic): string {
  const candidates = [
    { count: topic.groupCount,     cls: 'bg-emerald-500' },
    { count: topic.resourceCount,  cls: 'bg-blue-500' },
    { count: topic.eventCount,     cls: 'bg-amber-500' },
    { count: topic.challengeCount, cls: 'bg-purple-500' },
  ]
  const top = candidates.reduce((a, b) => b.count > a.count ? b : a)
  return top.count > 0 ? top.cls : 'bg-zinc-700'
}

// Deterministic gradient per slug — classes must be full strings for Tailwind to pick them up
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

function isActiveNow(date: Date): boolean {
  return Date.now() - date.getTime() < 2 * 60 * 60 * 1000
}

// --- Activity row config ---

const typeStyle: Record<FeedItem['type'], { color: string; bg: string; label: string }> = {
  group:         { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Group' },
  resource:      { color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Resource' },
  event:         { color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Event' },
  challenge:     { color: 'text-purple-400',  bg: 'bg-purple-500/15',  label: 'Challenge' },
  map_pin:       { color: 'text-teal-400',    bg: 'bg-teal-500/15',    label: 'Pin' },
  topic_created: { color: 'text-zinc-400',    bg: 'bg-zinc-700/30',    label: 'Topic' },
}

function TypeIcon({ type, className }: { type: FeedItem['type']; className?: string }) {
  if (type === 'group')     return <GroupIcon className={className} />
  if (type === 'resource')  return <LinkIcon className={className} />
  if (type === 'event')     return <CalendarIcon className={className} />
  if (type === 'challenge') return <BoltIcon className={className} />
  return <SparkleIcon className={className} />
}

function ActivityRow({ item, isLast }: { item: FeedItem; isLast: boolean }) {
  const style = typeStyle[item.type]
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${isLast ? '' : 'border-b border-zinc-800/60'}`}>
      <div className={`w-5 h-5 rounded ${style.bg} flex items-center justify-center flex-shrink-0`}>
        <TypeIcon type={item.type} className={`w-3 h-3 ${style.color}`} />
      </div>
      <span className={`text-xs font-semibold w-[4.5rem] flex-shrink-0 ${style.color}`}>{style.label}</span>
      <span className="text-zinc-300 text-sm truncate flex-1">{item.title}</span>
      <span className="text-zinc-600 text-xs whitespace-nowrap ml-2">{formatTimeAgo(item.createdAt)}</span>
    </div>
  )
}

// --- Main component ---

interface TopicActivityCardProps {
  topic: Topic
  items: FeedItem[]
  totalCount: number
}

export function TopicActivityCard({ topic, items, totalCount }: TopicActivityCardProps) {
  const hasActivity = items.length > 0
  const active = isActiveNow(topic.lastActivityAt)
  const gradient = slugGradient(topic.slug)

  return (
    <div className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-black/30">

      {/* Dominant-component accent stripe */}
      <div className={`h-0.5 ${dominantStripeColor(topic)}`} />

      <Link to={`/topic/${topic.slug}`} className="block">

        {/* Image or gradient placeholder — always shown */}
        <div className={`relative overflow-hidden ${topic.imageUrl ? 'h-28' : 'h-14'}`}>
          {topic.imageUrl ? (
            <img
              src={topic.imageUrl}
              alt={topic.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} transition-opacity duration-300 group-hover:opacity-80`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/30 to-transparent" />
        </div>

        <div className="p-4 pb-3">
          {/* Title + recency pulse */}
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h2 className="text-zinc-100 font-bold text-base leading-snug group-hover:text-emerald-400 transition-colors">
              {topic.title}
            </h2>
            <span className="flex items-center gap-1.5 text-zinc-600 text-xs whitespace-nowrap flex-shrink-0 mt-0.5">
              {active && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              )}
              {formatTimeAgo(topic.lastActivityAt)}
            </span>
          </div>

          <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed">{topic.description}</p>

          {/* Component stat chips */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {topic.groupCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <GroupIcon className="w-3 h-3 text-emerald-500/70" />
                {topic.groupCount} group{topic.groupCount !== 1 ? 's' : ''}
              </span>
            )}
            {topic.resourceCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <LinkIcon className="w-3 h-3 text-blue-400/70" />
                {topic.resourceCount} resource{topic.resourceCount !== 1 ? 's' : ''}
              </span>
            )}
            {topic.eventCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <CalendarIcon className="w-3 h-3 text-amber-400/70" />
                {topic.eventCount} event{topic.eventCount !== 1 ? 's' : ''}
              </span>
            )}
            {topic.challengeCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <BoltIcon className="w-3 h-3 text-purple-400/70" />
                {topic.challengeCount} challenge{topic.challengeCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Tag pills */}
          {topic.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {topic.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-zinc-800 border border-zinc-700/50 text-zinc-500 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Activity section */}
      {hasActivity && (
        <div className="border-t border-zinc-800 bg-zinc-950/50">
          <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-800/60">
            <span className="text-zinc-600 text-xs">
              {totalCount > items.length
                ? `${totalCount} recent updates · showing ${items.length}`
                : `${totalCount} recent update${totalCount !== 1 ? 's' : ''}`}
            </span>
            <Link
              to={`/topic/${topic.slug}`}
              className="text-emerald-500 text-xs hover:text-emerald-400 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              Explore →
            </Link>
          </div>
          {items.map((item, i) => (
            <ActivityRow key={item.id} item={item} isLast={i === items.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
