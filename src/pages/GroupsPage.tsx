import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTopics } from '../hooks/useTopics'
import { subscribeAllGroups, likeGroup, unlikeGroup } from '../services/groupsService'
import { useLiked } from '../hooks/useLiked'
import { LikeButton } from '../components/ui/LikeButton'
import { GroupLogo } from '../components/topic-components/GroupsComponent'
import { Spinner } from '../components/ui/Spinner'
import type { Group } from '../types'

export function GroupsPage() {
  const { topics } = useTopics()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  const topicMap = Object.fromEntries(topics.map(t => [t.id, t]))

  useEffect(() => {
    return subscribeAllGroups((data) => {
      setGroups(data)
      setLoading(false)
    })
  }, [])

  const filtered = selectedTopicId ? groups.filter(g => g.topicId === selectedTopicId) : groups

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Groups</h1>
        <p className="text-zinc-400 mt-2">Organizations and groups working on social good issues worldwide.</p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        <FilterChip label="All Topics" active={selectedTopicId === null} onClick={() => setSelectedTopicId(null)} />
        {topics.map(t => (
          <FilterChip
            key={t.id}
            label={t.title}
            active={selectedTopicId === t.id}
            onClick={() => setSelectedTopicId(selectedTopicId === t.id ? null : t.id)}
          />
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
          <p className="text-zinc-500">No groups found.</p>
        </div>
      ) : (
        <>
          <p className="text-zinc-500 text-sm mb-4">{filtered.length} group{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(g => (
              <GroupCard
                key={g.id}
                group={g}
                topicTitle={topicMap[g.topicId]?.title}
                topicSlug={topicMap[g.topicId]?.slug}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
      }`}
    >
      {label}
    </button>
  )
}

function GroupCard({ group, topicTitle, topicSlug }: { group: Group; topicTitle?: string; topicSlug?: string }) {
  const hasLinks = Object.values(group.links ?? {}).some(Boolean)
  const { liked, toggle, canLike } = useLiked(group.id)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors flex flex-col">
      <div className="flex items-start gap-3 mb-2">
        <GroupLogo group={group} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-zinc-100 font-semibold text-sm leading-snug">{group.name}</h3>
            <LikeButton
              count={group.likes}
              liked={liked}
              onToggle={() => toggle(() => likeGroup(group.id), () => unlikeGroup(group.id))}
              canLike={canLike}
            />
          </div>
          {topicTitle && topicSlug && (
            <Link
              to={`/topic/${topicSlug}`}
              className="inline-flex items-center mt-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full hover:bg-emerald-500/20 transition-colors"
            >
              {topicTitle}
            </Link>
          )}
        </div>
      </div>

      <p className="text-zinc-400 text-sm leading-relaxed mb-3 line-clamp-3 flex-1">{group.description}</p>

      {group.location && (
        <p className="text-zinc-500 text-xs mb-2">
          {[group.location.city, group.location.state, group.location.country].filter(Boolean).join(', ')}
        </p>
      )}

      {hasLinks && (
        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          {group.links.website && <SocialLink href={group.links.website} label="Website" />}
          {group.links.instagram && <SocialLink href={group.links.instagram} label="Instagram" />}
          {group.links.facebook && <SocialLink href={group.links.facebook} label="Facebook" />}
          {group.links.twitter && <SocialLink href={group.links.twitter} label="Twitter" />}
          {group.links.youtube && <SocialLink href={group.links.youtube} label="YouTube" />}
        </div>
      )}
    </div>
  )
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
    >
      {label} ↗
    </a>
  )
}
