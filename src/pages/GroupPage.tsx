import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGroup, likeGroup, unlikeGroup, flagGroup, unflagGroup } from '../services/groupsService'
import { formatLocation } from '../services/geocodeService'
import { useTopics } from '../hooks/useTopics'
import { useLiked, useFlag } from '../hooks/useLiked'
import { GroupLogo } from '../components/topic-components/GroupsComponent'
import { FlagButton } from '../components/ui/FlagButton'
import { Tooltip } from '../components/ui/Tooltip'
import { Spinner } from '../components/ui/Spinner'
import type { Group } from '../types'

function ShieldCheck({ filled }: { filled: boolean }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.661 2.237a.531.531 0 0 1 .678 0A11.947 11.947 0 0 0 17.417 4.986a.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749z" />
      <path d="m7 10 2 2 4-4" />
    </svg>
  )
}

function socialUrl(platform: string, handle: string): string {
  if (handle.startsWith('http')) return handle
  const h = handle.replace(/^@/, '')
  switch (platform) {
    case 'instagram': return `https://instagram.com/${h}`
    case 'tiktok': return `https://tiktok.com/@${h}`
    case 'youtube': return `https://youtube.com/@${h}`
    case 'facebook': return `https://facebook.com/${h}`
    case 'twitter': return `https://twitter.com/${h}`
    default: return handle
  }
}

function SocialLinkButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
    >
      {icon}
      {label}
      <span className="ml-auto text-zinc-600">↗</span>
    </a>
  )
}

function GroupDetails({ group }: { group: Group }) {
  const { liked, toggle, canLike } = useLiked(group.id, 'verified')
  const { flagged, flag, unflag, canFlag } = useFlag(group.id)
  const { topics } = useTopics()
  const topic = topics.find(t => t.id === group.topicId) ?? null

  const locationStr = group.location ? formatLocation(group.location) : null

  const links = group.links ?? {}

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/groups" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← All Groups
        </Link>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <GroupLogo group={group} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold text-zinc-100 leading-tight">{group.name}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <Tooltip text={liked ? 'Remove confirmation' : canLike ? 'Confirm this group is active' : 'Sign in to confirm'}>
                  <button
                    onClick={() => toggle(() => likeGroup(group.id), () => unlikeGroup(group.id))}
                    className={`flex items-center gap-1.5 text-sm transition-colors select-none cursor-pointer ${
                      liked ? 'text-emerald-400' : canLike ? 'text-zinc-500 hover:text-emerald-400' : 'text-zinc-600 cursor-default'
                    }`}
                  >
                    <ShieldCheck filled={liked} />
                    <span>{group.likes}</span>
                  </button>
                </Tooltip>
                <FlagButton
                  flagged={flagged}
                  onFlag={() => flag(() => flagGroup(group.id))}
                  onUnflag={() => unflag(() => unflagGroup(group.id))}
                  canFlag={canFlag}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {group.category && (
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                  {group.category}
                </span>
              )}
              {topic && (
                <Link
                  to={`/topic/${topic.slug}`}
                  className="inline-flex items-center px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full hover:bg-emerald-500/20 transition-colors"
                >
                  {topic.title}
                </Link>
              )}
              {group.moderationStatus === 'pending_review' && (
                <span className="text-xs text-amber-500/80 font-medium">Under Review</span>
              )}
            </div>
          </div>
        </div>

        {locationStr && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-4">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
            </svg>
            {locationStr}
          </div>
        )}

        <p className="text-zinc-300 text-sm leading-relaxed mb-6">{group.description}</p>

        {Object.values(links).some(Boolean) && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Links</h2>
            {links.website && (
              <SocialLinkButton href={links.website} label="Website" icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              } />
            )}
            {links.instagram && (
              <SocialLinkButton href={socialUrl('instagram', links.instagram)} label="Instagram" icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              } />
            )}
            {links.tiktok && (
              <SocialLinkButton href={socialUrl('tiktok', links.tiktok)} label="TikTok" icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              } />
            )}
            {links.youtube && (
              <SocialLinkButton href={socialUrl('youtube', links.youtube)} label="YouTube" icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              } />
            )}
            {links.facebook && (
              <SocialLinkButton href={socialUrl('facebook', links.facebook)} label="Facebook" icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              } />
            )}
            {links.twitter && (
              <SocialLinkButton href={socialUrl('twitter', links.twitter)} label="Twitter / X" icon={
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              } />
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
          <span>Submitted by {group.submittedByDisplayName ?? 'Anonymous'}</span>
          <span>{group.createdAt.toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}

export function GroupPage() {
  const { id } = useParams<{ id: string }>()
  const [group, setGroup] = useState<Group | null | 'loading'>('loading')

  useEffect(() => {
    if (!id) { setGroup(null); return }
    getGroup(id).then(setGroup)
  }, [id])

  if (group === 'loading') {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  }

  if (!group) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 text-lg mb-4">Group not found.</p>
        <Link to="/groups" className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
          ← Back to Groups
        </Link>
      </div>
    )
  }

  return <GroupDetails group={group} />
}
