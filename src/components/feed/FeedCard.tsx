import { Link } from 'react-router-dom'
import type { FeedItem } from '../../types'
import { Badge } from '../ui/Badge'
import { LikeButton } from '../ui/LikeButton'
import { formatTimeAgo } from '../../utils/time'
import { useLiked } from '../../hooks/useLiked'
import { likeFeedItem, unlikeFeedItem } from '../../services/feedService'

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

// --- Shared types ---

interface CardProps {
  item: FeedItem
  liked: boolean
  canLike: boolean
  onToggle: () => void
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

// --- GROUP — directory card with left emerald stripe ---

function GroupCard({ item, liked, canLike, onToggle }: CardProps) {
  return (
    <div className="group flex bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-black/30">
      <div className="w-1 bg-emerald-500 flex-shrink-0" />
      <div className="flex-1 min-w-0 p-4">
        <div className="flex items-start gap-3 mb-2">
          <Link to={`/topic/${item.topicSlug}`} className="flex-1 min-w-0 block">
            <div className="flex items-center gap-1.5 mb-1">
              <GroupIcon className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span className="text-emerald-500 text-xs font-semibold uppercase tracking-wider">Group</span>
            </div>
            <h3 className="text-zinc-100 font-semibold text-sm leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-zinc-400 text-sm mt-1 leading-relaxed line-clamp-2">{item.description}</p>
            )}
          </Link>
          <LikeButton count={item.likes} liked={liked} onToggle={onToggle} canLike={canLike} className="flex-shrink-0" />
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <Badge variant="green" size="sm">{item.topicTitle}</Badge>
          <div className="flex items-center gap-1.5">
            {item.submittedByDisplayName && <span className="truncate max-w-[6rem]">{item.submittedByDisplayName}</span>}
            {item.createdAt && (
              <><span className="text-zinc-700">·</span><span className="whitespace-nowrap">{formatTimeAgo(item.createdAt)}</span></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- RESOURCE — article link preview with blue-tinted header row ---

function ResourceCard({ item, liked, canLike, onToggle }: CardProps) {
  const domain = item.url ? extractDomain(item.url) : ''
  return (
    <div className="group bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-black/30">
      <div className="bg-blue-950/50 px-3 py-2 flex items-center gap-2 border-b border-blue-500/15">
        <LinkIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span className="text-blue-300 text-xs font-medium">Resource</span>
        {domain && <span className="text-blue-400/50 text-xs truncate">· {domain}</span>}
        <div className="flex-1" />
        <Badge variant="green" size="sm">{item.topicTitle}</Badge>
      </div>
      <Link to={`/topic/${item.topicSlug}`} className="block px-4 pt-3 pb-2">
        <h3 className="text-zinc-100 font-semibold text-sm leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors">
          {item.title}{item.url ? ' ↗' : ''}
        </h3>
        {item.description && (
          <p className="text-zinc-400 text-sm mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
      </Link>
      <div className="flex items-center gap-2 px-4 pb-3 pt-1 text-xs text-zinc-500">
        <LikeButton count={item.likes} liked={liked} onToggle={onToggle} canLike={canLike} />
        <div className="flex-1" />
        {item.submittedByDisplayName && <span className="truncate max-w-[6rem]">{item.submittedByDisplayName}</span>}
        {item.createdAt && (
          <><span className="text-zinc-700">·</span><span className="whitespace-nowrap">{formatTimeAgo(item.createdAt)}</span></>
        )}
      </div>
    </div>
  )
}

// --- EVENT — ticket stub with amber stripe + amber header ---

function EventCard({ item, liked, canLike, onToggle }: CardProps) {
  return (
    <div className="group bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-black/30">
      <div className="h-0.5 bg-amber-500" />
      <div className="bg-amber-950/40 px-3 py-2 flex items-center gap-2 border-b border-amber-500/15">
        <CalendarIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">Upcoming Event</span>
        <div className="flex-1" />
        <Badge variant="green" size="sm">{item.topicTitle}</Badge>
      </div>
      <Link to={`/topic/${item.topicSlug}`} className="block px-4 pt-3 pb-2">
        <h3 className="text-zinc-100 font-semibold text-sm leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-zinc-400 text-sm mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
      </Link>
      <div className="flex items-center gap-2 px-4 pb-3 pt-1 text-xs text-zinc-500">
        <LikeButton count={item.likes} liked={liked} onToggle={onToggle} canLike={canLike} />
        {item.url && (
          <>
            <span className="text-zinc-700">·</span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
              onClick={e => e.stopPropagation()}
            >
              Register ↗
            </a>
          </>
        )}
        <div className="flex-1" />
        {item.submittedByDisplayName && <span className="truncate max-w-[6rem]">{item.submittedByDisplayName}</span>}
        {item.createdAt && (
          <><span className="text-zinc-700">·</span><span className="whitespace-nowrap">{formatTimeAgo(item.createdAt)}</span></>
        )}
      </div>
    </div>
  )
}

// --- CHALLENGE — purple gradient card with tinted action footer ---

function ChallengeCard({ item, liked, canLike, onToggle }: CardProps) {
  return (
    <div className="group bg-gradient-to-br from-purple-950/60 via-zinc-900 to-zinc-900 border border-purple-500/25 hover:border-purple-500/50 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-purple-900/20">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-purple-500/15">
        <div className="w-5 h-5 rounded bg-purple-500/25 flex items-center justify-center flex-shrink-0">
          <BoltIcon className="w-3 h-3 text-purple-400" />
        </div>
        <span className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Challenge</span>
        <div className="flex-1" />
        <Badge variant="green" size="sm">{item.topicTitle}</Badge>
      </div>
      <Link to={`/topic/${item.topicSlug}`} className="block px-4 pt-3 pb-3">
        <h3 className="text-zinc-100 font-semibold text-sm leading-snug line-clamp-2 group-hover:text-purple-300 transition-colors">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-zinc-400 text-sm mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
      </Link>
      <div className="bg-purple-500/10 border-t border-purple-500/20 px-4 py-2.5 flex items-center gap-3">
        <Link
          to={`/topic/${item.topicSlug}`}
          className="text-purple-300 text-xs font-semibold hover:text-purple-200 transition-colors flex-1"
          onClick={e => e.stopPropagation()}
        >
          → Take Action
        </Link>
        <LikeButton count={item.likes} liked={liked} onToggle={onToggle} canLike={canLike} />
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          {item.createdAt && <span className="whitespace-nowrap">{formatTimeAgo(item.createdAt)}</span>}
        </div>
      </div>
    </div>
  )
}

// --- TOPIC CREATED — centered announcement with flanking sparkles ---

function TopicCreatedCard({ item, liked, canLike, onToggle }: CardProps) {
  return (
    <div className="group bg-zinc-900 border border-zinc-700/60 hover:border-zinc-600 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-black/30">
      <div className="bg-zinc-800/70 px-4 py-2 flex items-center justify-center gap-2 border-b border-zinc-700/50">
        <SparkleIcon className="w-3 h-3 text-zinc-400" />
        <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">New Topic</span>
        <SparkleIcon className="w-3 h-3 text-zinc-400" />
      </div>
      <Link to={`/topic/${item.topicSlug}`} className="block px-5 pt-4 pb-3 text-center">
        <div className="flex justify-center mb-2">
          <Badge variant="green" size="sm">{item.topicTitle}</Badge>
        </div>
        <h3 className="text-zinc-100 font-semibold text-sm leading-snug line-clamp-2 group-hover:text-zinc-300 transition-colors">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-zinc-400 text-sm mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
      </Link>
      <div className="flex items-center justify-center gap-2 px-4 pb-3 pt-1 text-xs text-zinc-500">
        <LikeButton count={item.likes} liked={liked} onToggle={onToggle} canLike={canLike} />
        {item.submittedByDisplayName && (
          <><span className="text-zinc-700">·</span><span className="truncate max-w-[6rem]">{item.submittedByDisplayName}</span></>
        )}
        {item.createdAt && (
          <><span className="text-zinc-700">·</span><span className="whitespace-nowrap">{formatTimeAgo(item.createdAt)}</span></>
        )}
      </div>
    </div>
  )
}

// --- Main export ---

export function FeedCard({ item }: { item: FeedItem }) {
  const { liked, toggle, canLike } = useLiked(item.id)
  const props: CardProps = {
    item,
    liked,
    canLike,
    onToggle: () => toggle(() => likeFeedItem(item.id), () => unlikeFeedItem(item.id)),
  }

  if (item.type === 'group')         return <GroupCard {...props} />
  if (item.type === 'resource')      return <ResourceCard {...props} />
  if (item.type === 'event')         return <EventCard {...props} />
  if (item.type === 'challenge')     return <ChallengeCard {...props} />
  return <TopicCreatedCard {...props} />
}
