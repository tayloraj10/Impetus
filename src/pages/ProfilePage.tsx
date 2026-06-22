import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTopics } from '../hooks/useTopics'
import { useCategories } from '../hooks/useGroupCategories'
import { formatLocation } from '../services/geocodeService'
import { getUserProfile, getUserContributions, deleteAllUserData, deleteUserAccount, type UserContributions } from '../services/userService'
import { updateDisplayName, updatePhotoURL } from '../services/authService'
import { uploadImage, profilePhotoPath } from '../services/storageService'
import { updateGroup, deleteGroup } from '../services/groupsService'
import { updateResource, deleteResource } from '../services/resourcesService'
import { updateEvent, deleteEvent } from '../services/eventsService'
import { deleteChallengeSubmission, updateChallengeSubmission } from '../services/challengesService'
import { CropModal } from '../components/ui/CropModal'
import { Modal } from '../components/ui/Modal'
import { LocationInput } from '../components/ui/LocationInput'
import type { UserProfile, Group, Resource, ImpetusEvent, ChallengeSubmission, Topic, StructuredLocation } from '../types'
import { Spinner } from '../components/ui/Spinner'
import { formatTimeAgo, formatDate } from '../utils/time'

type Tab = 'all' | 'groups' | 'resources' | 'events' | 'challenges'

type ContributionEntry =
  | { kind: 'group'; item: Group; date: Date }
  | { kind: 'resource'; item: Resource; date: Date }
  | { kind: 'event'; item: ImpetusEvent; date: Date }
  | { kind: 'submission'; item: ChallengeSubmission; date: Date }

type CardActionsProps = {
  onEdit?: () => void
  onDelete?: () => Promise<void>
}

const INPUT_CLASS = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'

const RESOURCE_TYPE_LABEL: Record<Resource['type'], string> = {
  article: 'Article', video: 'Video', government: 'Gov', tool: 'Tool', guide: 'Guide', content_creator: 'Content Creator', other: 'Other',
}

const RESOURCE_TYPES: Resource['type'][] = ['article', 'video', 'government', 'tool', 'guide', 'content_creator', 'other']

function FormField({ label, children }: { label: string; children: React.ReactElement<{ className?: string }> }) {
  return (
    <label className="block">
      <span className="block text-xs text-zinc-400 mb-1">{label}</span>
      {React.cloneElement(children, { className: INPUT_CLASS })}
    </label>
  )
}

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: authUser, role: authRole } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [contributions, setContributions] = useState<UserContributions | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('all')

  // Profile editing
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhotoBlob, setEditPhotoBlob] = useState<Blob | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(false)

  useEffect(() => {
    function onScroll() {
      const scrollable = document.body.scrollHeight > window.innerHeight + 40
      setAtBottom(scrollable && window.scrollY + window.innerHeight >= document.body.scrollHeight - 40)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Contribution editing
  const [editingEntry, setEditingEntry] = useState<ContributionEntry | null>(null)

  // Danger zone
  const [moderationExpanded, setModerationExpanded] = useState(false)
  const [wipeConfirm, setWipeConfirm] = useState(false)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false)
  const [dangerText, setDangerText] = useState('')
  const [dangerPending, setDangerPending] = useState(false)
  const [dangerError, setDangerError] = useState('')

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

  function startEditing() {
    setEditName(profile!.displayName)
    setEditPhotoBlob(null)
    setEditPhotoPreview(null)
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setEditPhotoPreview(null)
    setEditPhotoBlob(null)
    setCropSrc(null)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setCropSrc(URL.createObjectURL(file))
  }

  function handleCropConfirm(blob: Blob) {
    setEditPhotoBlob(blob)
    setEditPhotoPreview(URL.createObjectURL(blob))
    setCropSrc(null)
  }

  function handleCropCancel() {
    setCropSrc(null)
  }

  async function handleSave() {
    if (!authUser || !profile) return
    const trimmed = editName.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      let newPhotoURL = profile.photoURL ?? null
      if (editPhotoBlob) {
        const path = profilePhotoPath(authUser.uid)
        newPhotoURL = await uploadImage(editPhotoBlob, path)
        await updatePhotoURL(authUser, newPhotoURL)
      }
      if (trimmed !== profile.displayName) {
        await updateDisplayName(authUser, trimmed)
      }
      setProfile(p => p ? { ...p, displayName: trimmed, photoURL: newPhotoURL ?? undefined } : p)
      setEditing(false)
      setEditPhotoPreview(null)
      setEditPhotoBlob(null)
    } finally {
      setSaving(false)
    }
  }

  // --- Contribution CRUD ---

  async function handleDeleteEntry(entry: ContributionEntry): Promise<void> {
    switch (entry.kind) {
      case 'group':
        await deleteGroup(entry.item.id, entry.item.topicId)
        break
      case 'resource':
        await deleteResource(entry.item.id, entry.item.topicId)
        break
      case 'event':
        await deleteEvent(entry.item.id, entry.item.topicId)
        break
      case 'submission':
        await deleteChallengeSubmission(entry.item.id, entry.item.challengeId)
        break
    }
    const id = entry.item.id
    setContributions(c => c ? {
      groups: c.groups.filter(g => g.id !== id),
      resources: c.resources.filter(r => r.id !== id),
      events: c.events.filter(e => e.id !== id),
      challengeSubmissions: c.challengeSubmissions.filter(s => s.id !== id),
    } : c)
  }

  function handleUpdateGroup(updated: Group) {
    setContributions(c => c ? { ...c, groups: c.groups.map(g => g.id === updated.id ? updated : g) } : c)
    setEditingEntry(null)
  }

  function handleUpdateResource(updated: Resource) {
    setContributions(c => c ? { ...c, resources: c.resources.map(r => r.id === updated.id ? updated : r) } : c)
    setEditingEntry(null)
  }

  function handleUpdateEvent(updated: ImpetusEvent) {
    setContributions(c => c ? { ...c, events: c.events.map(e => e.id === updated.id ? updated : e) } : c)
    setEditingEntry(null)
  }

  function handleUpdateSubmission(updated: ChallengeSubmission) {
    setContributions(c => c ? { ...c, challengeSubmissions: c.challengeSubmissions.map(s => s.id === updated.id ? updated : s) } : c)
    setEditingEntry(null)
  }

  // --- Danger zone ---

  async function handleWipeData() {
    if (!contributions) return
    setDangerPending(true)
    setDangerError('')
    try {
      await deleteAllUserData(contributions)
      setContributions({ groups: [], resources: [], events: [], challengeSubmissions: [] })
      setWipeConfirm(false)
    } catch {
      setDangerError('Something went wrong. Please try again.')
    } finally {
      setDangerPending(false)
    }
  }

  async function handleDeleteAccount() {
    if (!authUser || dangerText !== 'DELETE') return
    setDangerPending(true)
    setDangerError('')
    try {
      if (contributions) await deleteAllUserData(contributions)
      await deleteUserAccount(authUser.uid)
      navigate('/')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/requires-recent-login') {
        setDangerError('Your session has expired. Sign out and sign back in, then try again.')
      } else {
        setDangerError('Something went wrong. Please try again.')
      }
      setDangerPending(false)
    }
  }

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
    <>
    {cropSrc && (
      <CropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
    )}
    {editingEntry?.kind === 'group' && (
      <EditGroupModal
        group={editingEntry.item}
        onSave={handleUpdateGroup}
        onClose={() => setEditingEntry(null)}
      />
    )}
    {editingEntry?.kind === 'resource' && (
      <EditResourceModal
        resource={editingEntry.item}
        onSave={handleUpdateResource}
        onClose={() => setEditingEntry(null)}
      />
    )}
    {editingEntry?.kind === 'event' && (
      <EditEventModal
        event={editingEntry.item}
        onSave={handleUpdateEvent}
        onClose={() => setEditingEntry(null)}
      />
    )}
    {editingEntry?.kind === 'submission' && (
      <EditSubmissionModal
        submission={editingEntry.item}
        onSave={handleUpdateSubmission}
        onClose={() => setEditingEntry(null)}
      />
    )}
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 relative">
            {editing ? (
              <>
                {editPhotoPreview || profile.photoURL ? (
                  <img
                    src={editPhotoPreview ?? profile.photoURL!}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-400">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-xs text-zinc-300 hover:bg-black/70 transition-colors"
                >
                  Change
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </>
            ) : profile.photoURL ? (
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
            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  placeholder="Display name"
                  maxLength={60}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !editName.trim()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white font-medium transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                  {isOwnProfile && (
                    <button
                      onClick={startEditing}
                      className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded px-2 py-0.5 transition-colors"
                    >
                      Edit profile
                    </button>
                  )}
                </div>
                {showEmail && (
                  <p className="text-zinc-500 text-sm mt-0.5">{profile.email}</p>
                )}
                <p className="text-zinc-600 text-sm mt-1">
                  Joined {profile.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </>
            )}
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

      {/* Moderation notice */}
      {isOwnProfile && (() => {
        const moderatedEntries = allEntries.filter(e =>
          e.kind !== 'submission' &&
          (e.item.moderationStatus === 'removed' || e.item.moderationStatus === 'rejected')
        )
        if (moderatedEntries.length === 0) return null
        return (
          <div className="mb-4">
            <button
              onClick={() => setModerationExpanded(v => !v)}
              className="w-full px-3 py-2.5 bg-red-950/30 border border-red-900/40 rounded-lg text-sm text-red-400/80 text-left hover:bg-red-950/50 transition-colors flex items-center justify-between"
            >
              <span>
                {moderatedEntries.length === 1
                  ? '1 of your submissions was removed or rejected.'
                  : `${moderatedEntries.length} of your submissions were removed or rejected.`}
                {' '}<span className="text-red-400/50">{moderationExpanded ? 'Hide details ↑' : 'See details ↓'}</span>
              </span>
            </button>
            {moderationExpanded && (
              <div className="mt-1.5 space-y-1.5">
                {moderatedEntries.map(entry => {
                  const item = entry.item as Group | Resource | ImpetusEvent
                  const title = entry.kind === 'group' ? entry.item.name : (entry.item as Resource | ImpetusEvent).title
                  return (
                    <div key={item.id} className="bg-zinc-900/70 border border-red-900/20 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TypeBadge type={entry.kind as keyof typeof TYPE_STYLES} />
                        <span className="text-sm text-zinc-300 truncate">{title}</span>
                        <StatusBadge status={item.moderationStatus} />
                      </div>
                      {item.moderationReason && (
                        <p className="text-xs text-zinc-400 mt-1.5">
                          <span className="text-zinc-600">Reason:</span> {item.moderationReason}
                        </p>
                      )}
                      {item.moderationStatus === 'removed' && item.removedByDisplayName && (
                        <p className="text-xs text-zinc-600 mt-0.5">
                          By {item.removedByDisplayName}{item.removedAt ? ` · ${formatTimeAgo(item.removedAt)}` : ''}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* Contributions */}
      <div className="space-y-2">
        {visibleEntries.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">No contributions yet.</div>
        ) : (
          visibleEntries.map(entry => {
            const topic = topicMap[entry.item.topicId] as Topic | undefined
            const modStatus = entry.kind !== 'submission' ? entry.item.moderationStatus : null
            const isModerated = modStatus === 'removed' || modStatus === 'rejected'
            const cardActions: CardActionsProps = isOwnProfile ? {
              onEdit: isModerated ? undefined : () => setEditingEntry(entry),
              onDelete: () => handleDeleteEntry(entry),
            } : {}
            if (entry.kind === 'group') return <GroupCard key={entry.item.id} group={entry.item} topic={topic} {...cardActions} />
            if (entry.kind === 'resource') return <ResourceCard key={entry.item.id} resource={entry.item} topic={topic} {...cardActions} />
            if (entry.kind === 'event') return <EventCard key={entry.item.id} event={entry.item} topic={topic} {...cardActions} />
            return <SubmissionCard key={entry.item.id} submission={entry.item} topic={topic} {...cardActions} />
          })
        )}
      </div>

      {/* Danger zone — own profile only */}
      {isOwnProfile && (
        <div className="mt-10 border border-red-900/50 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide">Danger Zone</h2>

          {/* Wipe data */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">Wipe all my data</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Permanently delete all your groups, resources, events, and challenge submissions.
              </p>
            </div>
            {!wipeConfirm ? (
              <button
                onClick={() => { setWipeConfirm(true); setDangerError('') }}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-amber-700 text-amber-400 hover:bg-amber-500/10 text-xs font-medium transition-colors"
              >
                Wipe data
              </button>
            ) : (
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs text-zinc-400">Are you sure?</span>
                <button
                  onClick={handleWipeData}
                  disabled={dangerPending}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
                >
                  {dangerPending ? 'Wiping…' : 'Confirm'}
                </button>
                <button
                  onClick={() => setWipeConfirm(false)}
                  disabled={dangerPending}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs font-medium text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Delete account */}
          <div className="flex items-start justify-between gap-4 pt-4 border-t border-zinc-800">
            <div>
              <p className="text-sm font-medium text-zinc-200">Delete my account</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Permanently delete your account and all your data. This cannot be undone.
              </p>
            </div>
            {!deleteAccountConfirm ? (
              <button
                onClick={() => { setDeleteAccountConfirm(true); setDangerText(''); setDangerError('') }}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
              >
                Delete account
              </button>
            ) : (
              <div className="shrink-0 space-y-2 text-right">
                <p className="text-xs text-zinc-400">Type <span className="font-mono text-zinc-300">DELETE</span> to confirm</p>
                <input
                  type="text"
                  value={dangerText}
                  onChange={e => setDangerText(e.target.value)}
                  placeholder="DELETE"
                  className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={dangerPending || dangerText !== 'DELETE'}
                    className="px-2.5 py-1 rounded bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors"
                  >
                    {dangerPending ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    onClick={() => { setDeleteAccountConfirm(false); setDangerText('') }}
                    disabled={dangerPending}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs font-medium text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {dangerError && (
            <p className="text-xs text-red-400">{dangerError}</p>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
    <button
      onClick={() => atBottom
        ? window.scrollTo({ top: 0, behavior: 'smooth' })
        : bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
      className="fixed bottom-6 right-6 w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors shadow-lg z-40"
      title={atBottom ? 'Back to top' : 'Jump to bottom'}
    >
      <svg className="w-4 h-4 transition-transform duration-300" style={{ transform: atBottom ? 'rotate(180deg)' : 'rotate(0deg)' }} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 4v12M4 10l6 6 6-6" />
      </svg>
    </button>
    </>
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

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending_review' || status === 'pending_approval') {
    return <span className="text-xs text-amber-500/60">pending review</span>
  }
  if (status === 'rejected') {
    return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400">rejected</span>
  }
  if (status === 'removed') {
    return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400">removed</span>
  }
  return null
}

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h8M4 5h12M15 5l-1 12H6L5 5" />
    </svg>
  )
}

function CardActionButtons({ onEdit, onDelete }: CardActionsProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!onEdit && !onDelete) return null

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-zinc-500">Delete?</span>
        <button
          onClick={async (e) => {
            e.stopPropagation()
            setDeleting(true)
            try {
              await onDelete?.()
            } finally {
              setDeleting(false)
              setConfirming(false)
            }
          }}
          disabled={deleting}
          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 font-medium"
        >
          {deleting ? '…' : 'Yes'}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
          disabled={deleting}
          className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
          title="Edit"
        >
          <PencilIcon />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
          className="p-1 text-zinc-600 hover:text-red-400 transition-colors rounded"
          title="Delete"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  )
}

function GroupCard({ group, topic, onEdit, onDelete }: { group: Group; topic?: Topic } & CardActionsProps) {
  const isModerated = group.moderationStatus === 'removed' || group.moderationStatus === 'rejected'
  return (
    <div className={`bg-zinc-900 border rounded-lg px-4 py-3 flex items-start gap-3 ${isModerated ? 'border-red-900/40' : 'border-zinc-800'}`}>
      <TypeBadge type="group" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${isModerated ? 'text-zinc-400' : 'text-zinc-200'}`}>{group.name}</span>
          <StatusBadge status={group.moderationStatus} />
        </div>
        {group.description && (
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{group.description}</p>
        )}
        <TopicChip topic={topic} />
        {group.moderationStatus === 'removed' && (
          <p className="text-xs text-red-400/50 mt-1">
            Removed{group.removedByDisplayName ? ` by ${group.removedByDisplayName}` : ''}{group.removedAt ? ` · ${formatTimeAgo(group.removedAt)}` : ''}
            {group.moderationReason ? ` — ${group.moderationReason}` : ''}
          </p>
        )}
        {group.moderationStatus === 'rejected' && (
          <p className="text-xs text-red-400/50 mt-1">
            Rejected by a moderator{group.moderationReason ? ` — ${group.moderationReason}` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <span className="text-xs text-zinc-600">{formatTimeAgo(group.createdAt)}</span>
        <CardActionButtons onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}

function ResourceCard({ resource, topic, onEdit, onDelete }: { resource: Resource; topic?: Topic } & CardActionsProps) {
  const isModerated = resource.moderationStatus === 'removed' || resource.moderationStatus === 'rejected'
  return (
    <div className={`bg-zinc-900 border rounded-lg px-4 py-3 flex items-start gap-3 ${isModerated ? 'border-red-900/40' : 'border-zinc-800'}`}>
      <TypeBadge type="resource" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {resource.url && !isModerated ? (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-zinc-200 hover:text-emerald-400 transition-colors"
            >
              {resource.title}
            </a>
          ) : (
            <span className={`text-sm font-medium ${isModerated ? 'text-zinc-400' : 'text-zinc-200'}`}>{resource.title}</span>
          )}
          <span className="text-xs text-zinc-600">{resource.type === 'other' && resource.typeOther ? resource.typeOther : RESOURCE_TYPE_LABEL[resource.type]}</span>
          <StatusBadge status={resource.moderationStatus} />
        </div>
        {resource.description && (
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{resource.description}</p>
        )}
        <TopicChip topic={topic} />
        {resource.moderationStatus === 'removed' && (
          <p className="text-xs text-red-400/50 mt-1">
            Removed{resource.removedByDisplayName ? ` by ${resource.removedByDisplayName}` : ''}{resource.removedAt ? ` · ${formatTimeAgo(resource.removedAt)}` : ''}
            {resource.moderationReason ? ` — ${resource.moderationReason}` : ''}
          </p>
        )}
        {resource.moderationStatus === 'rejected' && (
          <p className="text-xs text-red-400/50 mt-1">
            Rejected by a moderator{resource.moderationReason ? ` — ${resource.moderationReason}` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <span className="text-xs text-zinc-600">{formatTimeAgo(resource.createdAt)}</span>
        <CardActionButtons onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}

function EventCard({ event, topic, onEdit, onDelete }: { event: ImpetusEvent; topic?: Topic } & CardActionsProps) {
  const isModerated = event.moderationStatus === 'removed' || event.moderationStatus === 'rejected'
  return (
    <div className={`bg-zinc-900 border rounded-lg px-4 py-3 flex items-start gap-3 ${isModerated ? 'border-red-900/40' : 'border-zinc-800'}`}>
      <TypeBadge type="event" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${isModerated ? 'text-zinc-400' : 'text-zinc-200'}`}>{event.title}</span>
          <StatusBadge status={event.moderationStatus} />
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {formatDate(event.date)}{event.location ? ` · ${formatLocation(event.location)}` : ''}
        </p>
        <TopicChip topic={topic} />
        {event.moderationStatus === 'removed' && (
          <p className="text-xs text-red-400/50 mt-1">
            Removed{event.removedByDisplayName ? ` by ${event.removedByDisplayName}` : ''}{event.removedAt ? ` · ${formatTimeAgo(event.removedAt)}` : ''}
            {event.moderationReason ? ` — ${event.moderationReason}` : ''}
          </p>
        )}
        {event.moderationStatus === 'rejected' && (
          <p className="text-xs text-red-400/50 mt-1">
            Rejected by a moderator{event.moderationReason ? ` — ${event.moderationReason}` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <span className="text-xs text-zinc-600">{formatTimeAgo(event.createdAt)}</span>
        <CardActionButtons onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}

function SubmissionCard({ submission, topic, onEdit, onDelete }: { submission: ChallengeSubmission; topic?: Topic } & CardActionsProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-start gap-3">
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
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <span className="text-xs text-zinc-600">{formatTimeAgo(submission.createdAt)}</span>
        <CardActionButtons onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}

// --- Edit modals ---

function EditGroupModal({ group, onSave, onClose }: {
  group: Group
  onSave: (updated: Group) => void
  onClose: () => void
}) {
  const { categories } = useCategories()
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description)
  const [category, setCategory] = useState(group.category ?? '')
  const [location, setLocation] = useState<StructuredLocation>(group.location ?? {})
  const [links, setLinks] = useState({ ...group.socialLinks })
  const [saving, setSaving] = useState(false)

  function setLink(field: string, value: string) {
    setLinks(l => ({ ...l, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !description.trim()) return
    setSaving(true)
    try {
      const update = { name: name.trim(), description: description.trim(), category: category || undefined, location, socialLinks: links }
      await updateGroup(group.id, update)
      onSave({ ...group, ...update })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit Group" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Group Name *">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Group name" />
        </FormField>
        <FormField label="Description *">
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this group do?" />
        </FormField>
        <FormField label="Category">
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select a category...</option>
            {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
          </select>
        </FormField>
        <LocationInput value={location} onChange={setLocation} />
        <div className="grid grid-cols-2 gap-2">
          {(['website', 'instagram', 'tiktok', 'youtube', 'facebook', 'twitter'] as const).map(field => (
            <FormField key={field} label={field.charAt(0).toUpperCase() + field.slice(1)}>
              <input
                type={field === 'website' ? 'url' : 'text'}
                value={(links as Record<string, string>)[field] ?? ''}
                onChange={e => setLink(field, e.target.value)}
                placeholder={field === 'website' ? 'https://...' : 'username'}
              />
            </FormField>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm text-white font-medium transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditResourceModal({ resource, onSave, onClose }: {
  resource: Resource
  onSave: (updated: Resource) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(resource.title)
  const [url, setUrl] = useState(resource.url ?? '')
  const [type, setType] = useState<Resource['type']>(resource.type)
  const [typeOther, setTypeOther] = useState(resource.typeOther ?? '')
  const [description, setDescription] = useState(resource.description ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const update = {
        title: title.trim(),
        url: url.trim() || undefined,
        type,
        typeOther: type === 'other' ? typeOther.trim() || undefined : undefined,
        description: description.trim() || undefined,
      }
      await updateResource(resource.id, update)
      onSave({ ...resource, ...update })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit Resource">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Title *">
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource title" />
        </FormField>
        <FormField label="URL">
          <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
        </FormField>
        <FormField label="Type">
          <select value={type} onChange={e => setType(e.target.value as Resource['type'])}>
            {RESOURCE_TYPES.map(t => (
              <option key={t} value={t}>{RESOURCE_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </FormField>
        {type === 'other' && (
          <FormField label="Type description">
            <input value={typeOther} onChange={e => setTypeOther(e.target.value)} placeholder="Describe the type" />
          </FormField>
        )}
        <FormField label="Description">
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm text-white font-medium transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function toDatetimeLocalStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EditEventModal({ event, onSave, onClose }: {
  event: ImpetusEvent
  onSave: (updated: ImpetusEvent) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(event.title)
  const [externalUrl, setExternalUrl] = useState(event.externalUrl ?? '')
  const [date, setDate] = useState(toDatetimeLocalStr(event.date))
  const [endDate, setEndDate] = useState(event.endDate ? toDatetimeLocalStr(event.endDate) : '')
  const [isVirtual, setIsVirtual] = useState(event.isVirtual)
  const [location, setLocation] = useState<StructuredLocation>(event.location ?? {})
  const [description, setDescription] = useState(event.description ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    setSaving(true)
    try {
      const parsedDate = new Date(date)
      const parsedEndDate = endDate ? new Date(endDate) : undefined
      const update = {
        title: title.trim(),
        externalUrl: externalUrl.trim() || undefined,
        date: parsedDate,
        endDate: parsedEndDate,
        isVirtual,
        location: isVirtual ? undefined : location,
        description: description.trim() || undefined,
      }
      await updateEvent(event.id, update)
      onSave({ ...event, ...update })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit Event" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Title *">
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" />
        </FormField>
        <FormField label="Event URL">
          <input type="url" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://..." />
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Start Date *">
            <input required type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          </FormField>
          <FormField label="End Date">
            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </FormField>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isVirtual}
            onChange={e => setIsVirtual(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm text-zinc-300">Virtual event</span>
        </label>
        {!isVirtual && <LocationInput value={location} onChange={setLocation} />}
        <FormField label="Description">
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm text-white font-medium transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditSubmissionModal({ submission, onSave, onClose }: {
  submission: ChallengeSubmission
  onSave: (updated: ChallengeSubmission) => void
  onClose: () => void
}) {
  const [note, setNote] = useState(submission.note ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const trimmedNote = note.trim() || null
      await updateChallengeSubmission(submission.id, trimmedNote)
      onSave({ ...submission, note: trimmedNote ?? undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit Action">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Note">
          <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Describe what you did..." />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm text-white font-medium transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
