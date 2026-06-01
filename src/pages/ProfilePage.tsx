import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTopics } from '../hooks/useTopics'
import { getUserProfile, getUserContributions, type UserContributions } from '../services/userService'
import type { UserProfile, Group, Resource, ImpetusEvent, ChallengeSubmission, Topic } from '../types'
import { Spinner } from '../components/ui/Spinner'
import { formatTimeAgo, formatDate } from '../utils/time'

type Tab = 'all' | 'groups' | 'resources' | 'events' | 'challenges'

type ContributionEntry =
  | { kind: 'group'; item: Group; date: Date }
  | { kind: 'resource'; item: Resource; date: Date }
  | { kind: 'event'; item: ImpetusEvent; date: Date }
  | { kind: 'submission'; item: ChallengeSubmission; date: Date }

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: authUser, role: authRole } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [contributions, setContributions] = useState<UserContributions | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('all')

  const { topics } = useTopics()
  const topicMap = useMemo(
    () => Object.fromEntries(topics.map(t => [t.id, t])),
    [topics],
  )

  const targetUid = userId ?? authUser?.uid

  useEffect(() => {
    if (!targetUid) {
      navigate('/')
      return
    }
    setLoading(true)
    setNotFound(false)
    Promise.all([
      getUserProfile(targetUid),
      getUserContributions(targetUid),
    ]).then(([p, c]) => {
      if (!p) {
        setNotFound(true)
      } else {
        setProfile(p)
        setContributions(c)
      }
      setLoading(false)
    })
  }, [targetUid])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-500">User not found.</p>
      </div>
    )
  }

  const isOwnProfile = authUser?.uid === profile.id
  const showEmail = isOwnProfile || authRole === 'admin'

  const allEntries: ContributionEntry[] = contributions
    ? [
        ...contributions.groups.map(item => ({ kind: 'group' as const, item, date: item.createdAt })),
        ...contributions.resources.map(item => ({ kind: 'resource' as const, item, date: item.createdAt })),
        ...contributions.events.map(item => ({ kind: 'event' as const, item, date: item.createdAt })),
        ...contributions.challengeSubmissions.map(item => ({ kind: 'submission' as const, item, date: item.createdAt })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime())
    : []

  const visibleEntries: ContributionEntry[] =
    tab === 'all' ? allEntries :
    tab === 'groups' ? allEntries.filter(e => e.kind === 'group') :
    tab === 'resources' ? allEntries.filter(e => e.kind === 'resource') :
    tab === 'events' ? allEntries.filter(e => e.kind === 'event') :
    allEntries.filter(e => e.kind === 'submission')

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: allEntries.length },
    { id: 'groups', label: 'Groups', count: contributions?.groups.length ?? 0 },
    { id: 'resources', label: 'Resources', count: contributions?.resources.length ?? 0 },
    { id: 'events', label: 'Events', count: contributions?.events.length ?? 0 },
    { id: 'challenges', label: 'Actions', count: contributions?.challengeSubmissions.length ?? 0 },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt=""
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-400">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-100">{profile.displayName}</h1>
              {profile.role !== 'user' && (
                <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${
                  profile.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {profile.role}
                </span>
              )}
            </div>
            {showEmail && (
              <p className="text-zinc-500 text-sm mt-0.5">{profile.email}</p>
            )}
            <p className="text-zinc-600 text-sm mt-1">
              Joined {profile.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-800">
          {[
            { label: 'Groups', count: contributions?.groups.length ?? 0 },
            { label: 'Resources', count: contributions?.resources.length ?? 0 },
            { label: 'Events', count: contributions?.events.length ?? 0 },
            { label: 'Actions', count: contributions?.challengeSubmissions.length ?? 0 },
          ].map(({ label, count }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-zinc-100">{count}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs ${tab === t.id ? 'text-emerald-500/70' : 'text-zinc-600'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Contributions */}
      <div className="space-y-2">
        {visibleEntries.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">No contributions yet.</div>
        ) : (
          visibleEntries.map(entry => {
            const topic = topicMap[entry.item.topicId] as Topic | undefined
            if (entry.kind === 'group') return <GroupCard key={entry.item.id} group={entry.item} topic={topic} />
            if (entry.kind === 'resource') return <ResourceCard key={entry.item.id} resource={entry.item} topic={topic} />
            if (entry.kind === 'event') return <EventCard key={entry.item.id} event={entry.item} topic={topic} />
            return <SubmissionCard key={entry.item.id} submission={entry.item} topic={topic} />
          })
        )}
      </div>
    </div>
  )
}

// --- Shared sub-components ---

const TYPE_STYLES = {
  group:      'text-blue-400 bg-blue-500/10',
  resource:   'text-purple-400 bg-purple-500/10',
  event:      'text-orange-400 bg-orange-500/10',
  submission: 'text-emerald-400 bg-emerald-500/10',
} as const

const TYPE_LABELS = {
  group:      'Group',
  resource:   'Resource',
  event:      'Event',
  submission: 'Action',
} as const

function TypeBadge({ type }: { type: keyof typeof TYPE_STYLES }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 self-start mt-0.5 ${TYPE_STYLES[type]}`}>
      {TYPE_LABELS[type]}
    </span>
  )
}

function TopicChip({ topic }: { topic?: Topic }) {
  if (!topic) return null
  return (
    <Link
      to={`/topic/${topic.slug}`}
      onClick={e => e.stopPropagation()}
      className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
    >
      {topic.title}
    </Link>
  )
}

function PendingBadge({ status }: { status: string }) {
  if (status !== 'pending_review' && status !== 'pending_approval') return null
  return <span className="text-xs text-amber-500/60">pending review</span>
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-start gap-3">
      {children}
    </div>
  )
}

function GroupCard({ group, topic }: { group: Group; topic?: Topic }) {
  return (
    <CardShell>
      <TypeBadge type="group" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{group.name}</span>
          <PendingBadge status={group.moderationStatus} />
        </div>
        {group.description && (
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{group.description}</p>
        )}
        <TopicChip topic={topic} />
      </div>
      <span className="text-xs text-zinc-600 shrink-0 mt-0.5">{formatTimeAgo(group.createdAt)}</span>
    </CardShell>
  )
}

const RESOURCE_TYPE_LABEL: Record<Resource['type'], string> = {
  article: 'Article', video: 'Video', government: 'Gov', tool: 'Tool', guide: 'Guide', other: 'Other',
}

function ResourceCard({ resource, topic }: { resource: Resource; topic?: Topic }) {
  return (
    <CardShell>
      <TypeBadge type="resource" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-zinc-200 hover:text-emerald-400 transition-colors"
          >
            {resource.title}
          </a>
          <span className="text-xs text-zinc-600">{RESOURCE_TYPE_LABEL[resource.type]}</span>
          <PendingBadge status={resource.moderationStatus} />
        </div>
        {resource.description && (
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{resource.description}</p>
        )}
        <TopicChip topic={topic} />
      </div>
      <span className="text-xs text-zinc-600 shrink-0 mt-0.5">{formatTimeAgo(resource.createdAt)}</span>
    </CardShell>
  )
}

function EventCard({ event, topic }: { event: ImpetusEvent; topic?: Topic }) {
  return (
    <CardShell>
      <TypeBadge type="event" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{event.title}</span>
          <PendingBadge status={event.moderationStatus} />
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}
        </p>
        <TopicChip topic={topic} />
      </div>
      <span className="text-xs text-zinc-600 shrink-0 mt-0.5">{formatTimeAgo(event.createdAt)}</span>
    </CardShell>
  )
}

function SubmissionCard({ submission, topic }: { submission: ChallengeSubmission; topic?: Topic }) {
  return (
    <CardShell>
      <TypeBadge type="submission" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-zinc-200">Challenge completed</span>
        {submission.note && (
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{submission.note}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-0.5">
          <TopicChip topic={topic} />
          {submission.proofImageUrl && (
            <a
              href={submission.proofImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              View proof
            </a>
          )}
        </div>
      </div>
      <span className="text-xs text-zinc-600 shrink-0 mt-0.5">{formatTimeAgo(submission.createdAt)}</span>
    </CardShell>
  )
}
