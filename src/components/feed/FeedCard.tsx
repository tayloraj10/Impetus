import { Link } from 'react-router-dom'
import type { FeedItem } from '../../types'
import { Badge } from '../ui/Badge'
import { formatTimeAgo } from '../../utils/time'

const typeConfig: Record<FeedItem['type'], { label: string; variant: 'green' | 'blue' | 'amber' | 'purple' | 'default' }> = {
  group: { label: 'Group', variant: 'green' },
  resource: { label: 'Resource', variant: 'blue' },
  event: { label: 'Event', variant: 'amber' },
  challenge: { label: 'Challenge', variant: 'purple' },
  topic_created: { label: 'New Topic', variant: 'default' },
}

export function FeedCard({ item }: { item: FeedItem }) {
  const config = typeConfig[item.type]

  return (
    <Link
      to={`/topic/${item.topicSlug}`}
      className="block bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="green" size="sm">{item.topicTitle}</Badge>
            <Badge variant={config.variant} size="sm">{config.label}</Badge>
          </div>

          <h3 className="text-zinc-100 font-semibold text-sm leading-snug group-hover:text-emerald-400 transition-colors line-clamp-2">
            {item.title}
          </h3>

          {item.description && (
            <p className="text-zinc-400 text-sm mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span>♥</span>
              <span>{item.likes}</span>
            </span>
            {item.submittedByDisplayName && (
              <span>{item.submittedByDisplayName}</span>
            )}
            {item.createdAt && (
              <span>{formatTimeAgo(item.createdAt)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
