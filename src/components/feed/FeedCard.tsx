import { Link } from 'react-router-dom'
import type { FeedItem } from '../../types'
import { Badge } from '../ui/Badge'
import { formatTimeAgo } from '../../utils/time'

const typeConfig: Record<FeedItem['type'], { label: string; variant: 'green' | 'blue' | 'amber' | 'purple' | 'default'; accent: string }> = {
  group:         { label: 'Group',     variant: 'green',   accent: 'border-l-emerald-500' },
  resource:      { label: 'Resource',  variant: 'blue',    accent: 'border-l-blue-500'    },
  event:         { label: 'Event',     variant: 'amber',   accent: 'border-l-amber-500'   },
  challenge:     { label: 'Challenge', variant: 'purple',  accent: 'border-l-purple-500'  },
  topic_created: { label: 'New Topic', variant: 'default', accent: 'border-l-zinc-600'    },
}

export function FeedCard({ item }: { item: FeedItem }) {
  const config = typeConfig[item.type]

  return (
    <Link
      to={`/topic/${item.topicSlug}`}
      className={`block bg-zinc-900 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 border-l-2 ${config.accent} rounded-xl p-4 transition-all duration-200 group hover:-translate-y-px hover:shadow-lg hover:shadow-black/30`}
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

          <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1 text-zinc-600 hover:text-rose-400 transition-colors">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              <span>{item.likes}</span>
            </span>
            {item.submittedByDisplayName && (
              <>
                <span className="text-zinc-700">·</span>
                <span>{item.submittedByDisplayName}</span>
              </>
            )}
            {item.createdAt && (
              <>
                <span className="text-zinc-700">·</span>
                <span>{formatTimeAgo(item.createdAt)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
