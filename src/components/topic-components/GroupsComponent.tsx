import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Group, CreateGroupInput, Topic } from '../../types'
import { subscribeGroups, createGroup, likeGroup, unlikeGroup, flagGroup, unflagGroup, softDeleteGroup, deleteGroup } from '../../services/groupsService'
import { uploadImage, groupLogoPath } from '../../services/storageService'
import { useAuth } from '../../hooks/useAuth'
import { useLiked, useFlag } from '../../hooks/useLiked'
import { Button } from '../ui/Button'
import { FlagButton } from '../ui/FlagButton'
import { ModerateButtons } from '../ui/ModerateButtons'
import { Tooltip } from '../ui/Tooltip'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

export function GroupsComponent({ topic }: { topic: Topic }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const { user, role } = useAuth()

  useEffect(() => {
    const unsub = subscribeGroups(topic.id, (data) => {
      setGroups(data)
      setLoading(false)
    })
    return unsub
  }, [topic.id])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">{groups.length} group{groups.length !== 1 ? 's' : ''} found</p>
        <Button size="sm" onClick={() => user ? setModalOpen(true) : null}>
          + Add Group
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : groups.length === 0 ? (
        <EmptyState onAdd={() => setModalOpen(true)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map(g => <GroupCard key={g.id} group={g} role={role} />)}
        </div>
      )}

      <AddGroupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        topic={topic}
      />
    </div>
  )
}

export function GroupLogo({ group, size = 'md' }: { group: Group; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm'
  if (group.imageUrl) {
    return (
      <img
        src={group.imageUrl}
        alt={group.name}
        className={`${sizeClass} rounded-lg object-cover flex-shrink-0 border border-zinc-700`}
      />
    )
  }
  return (
    <div className={`${sizeClass} rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 font-bold text-zinc-400`}>
      {group.name.charAt(0).toUpperCase()}
    </div>
  )
}

function ShieldCheck({ filled }: { filled: boolean }) {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.661 2.237a.531.531 0 0 1 .678 0A11.947 11.947 0 0 0 17.417 4.986a.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749z" />
      <path d="m7 10 2 2 4-4" />
    </svg>
  )
}

function GroupCard({ group, role }: { group: Group; role: string | null }) {
  const hasLinks = Object.values(group.links ?? {}).some(Boolean)
  const { liked, toggle, canLike } = useLiked(group.id, 'verified')
  const { flagged, flag, unflag, canFlag } = useFlag(group.id)
  const canModerate = role === 'admin' || role === 'moderator'
  const isAdmin = role === 'admin'

  return (
    <Link to={`/groups/${group.id}`} className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 hover:bg-zinc-800/60 transition-colors">
      <div className="flex items-start gap-3 mb-2">
        <GroupLogo group={group} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-zinc-100 font-semibold text-sm leading-snug truncate block">{group.name}</span>
              {group.category && (
                <span className="text-xs text-zinc-500">{group.category}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {group.moderationStatus === 'pending_review' && (
                <Tooltip text="This group is visible but awaiting moderator review">
                  <span className="text-xs text-amber-500/80 font-medium">Under Review</span>
                </Tooltip>
              )}
              {canModerate && (
                <span onClick={e => e.preventDefault()}>
                  <ModerateButtons
                    onSoftDelete={(uid, name) => softDeleteGroup(group.id, uid, name)}
                    onHardDelete={isAdmin ? () => deleteGroup(group.id, group.topicId) : undefined}
                  />
                </span>
              )}
              <Tooltip text={liked ? 'Remove confirmation' : canLike ? 'Confirm this group is active' : 'Sign in to confirm'}>
                <button
                  onClick={e => { e.preventDefault(); toggle(() => likeGroup(group.id), () => unlikeGroup(group.id)) }}
                  className={`flex items-center gap-1 text-xs transition-colors select-none cursor-pointer ${
                    liked ? 'text-emerald-400' : canLike ? 'text-zinc-500 hover:text-emerald-400' : 'text-zinc-600 cursor-default'
                  }`}
                >
                  <ShieldCheck filled={liked} />
                  <span>{group.likes}</span>
                </button>
              </Tooltip>
              <span onClick={e => e.preventDefault()}>
                <FlagButton
                  flagged={flagged}
                  onFlag={() => flag(() => flagGroup(group.id))}
                  onUnflag={() => unflag(() => unflagGroup(group.id))}
                  canFlag={canFlag}
                />
              </span>
            </div>
          </div>
          {group.location && (
            <p className="text-zinc-500 text-xs mt-0.5">
              {[group.location.city, group.location.state, group.location.zipCode, group.location.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <p className="text-zinc-400 text-sm leading-relaxed mb-3 line-clamp-3">{group.description}</p>

      {hasLinks && (
        <div className="flex flex-wrap gap-2" onClick={e => e.preventDefault()}>
          {group.links.website && <SocialLink href={group.links.website} label="Website" />}
          {group.links.instagram && <SocialLink href={socialUrl('instagram', group.links.instagram)} label="Instagram" />}
          {group.links.tiktok && <SocialLink href={socialUrl('tiktok', group.links.tiktok)} label="TikTok" />}
          {group.links.youtube && <SocialLink href={socialUrl('youtube', group.links.youtube)} label="YouTube" />}
          {group.links.facebook && <SocialLink href={socialUrl('facebook', group.links.facebook)} label="Facebook" />}
          {group.links.twitter && <SocialLink href={socialUrl('twitter', group.links.twitter)} label="Twitter" />}
        </div>
      )}
    </Link>
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

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
      onClick={e => e.stopPropagation()}
    >
      {label} ↗
    </a>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
      <p className="text-zinc-500 text-sm mb-3">No groups added yet.</p>
      <Button variant="secondary" size="sm" onClick={onAdd}>Be the first to add one</Button>
    </div>
  )
}

const GROUP_CATEGORIES = [
  'Nonprofit',
  'Grassroots / Community',
  'Government Agency',
  'Corporate / Business',
  'Faith-based',
  'Online Community',
  'University / Research',
  'Other',
]

function AddGroupModal({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: Topic }) {
  const { user } = useAuth()
  const [form, setForm] = useState<CreateGroupInput>({
    topicId: topic.id,
    name: '',
    description: '',
    category: '',
    location: { city: '', state: '', zipCode: '', country: '' },
    links: { website: '', instagram: '', tiktok: '', youtube: '', facebook: '', twitter: '' },
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }
  function setLink(field: string, value: string) {
    setForm(f => ({ ...f, links: { ...f.links, [field]: value } }))
  }
  function setLoc(field: string, value: string) {
    setForm(f => ({ ...f, location: { ...f.location, [field]: value } }))
  }
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }
  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      let imageUrl: string | undefined
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, groupLogoPath(imageFile))
      }
      await createGroup({ ...form, imageUrl }, user.uid, user.displayName ?? 'Anonymous', topic.title, topic.slug)
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Modal open={open} onClose={() => { onClose(); setDone(false) }} title="Group Added">
        <div className="text-center py-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <span className="text-emerald-400 text-sm font-bold">✓</span>
          </div>
          <p className="text-zinc-300 text-sm">Your group is now live and visible. A moderator will review it shortly — it may be removed if it doesn't meet our guidelines.</p>
          <Button className="mt-4" onClick={() => { onClose(); setDone(false) }}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Group Name *">
          <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="What's the group called?" />
        </Field>
        <Field label="Description *">
          <textarea required rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this group do?" />
        </Field>
        <Field label="Category">
          <select value={form.category ?? ''} onChange={e => set('category', e.target.value)}>
            <option value="">Select a category...</option>
            {GROUP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <div>
          <span className="block text-xs text-zinc-400 mb-1">Logo / Image</span>
          {imagePreview ? (
            <div className="flex items-center gap-3">
              <img src={imagePreview} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-zinc-700" />
              <button
                type="button"
                onClick={clearImage}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-16 border border-dashed border-zinc-700 rounded-lg flex items-center justify-center gap-2 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors text-sm"
            >
              <span className="text-base">+</span>
              <span>Upload logo</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="City">
            <input value={form.location?.city ?? ''} onChange={e => setLoc('city', e.target.value)} />
          </Field>
          <Field label="State / Province">
            <input value={form.location?.state ?? ''} onChange={e => setLoc('state', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Zip / Postal Code">
            <input value={form.location?.zipCode ?? ''} onChange={e => setLoc('zipCode', e.target.value)} />
          </Field>
          <Field label="Country">
            <input value={form.location?.country ?? ''} onChange={e => setLoc('country', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Website">
            <input type="url" value={form.links?.website ?? ''} onChange={e => setLink('website', e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Instagram">
            <input value={form.links?.instagram ?? ''} onChange={e => setLink('instagram', e.target.value.replace(/^@/, ''))} placeholder="username" />
          </Field>
          <Field label="TikTok">
            <input value={form.links?.tiktok ?? ''} onChange={e => setLink('tiktok', e.target.value.replace(/^@/, ''))} placeholder="username" />
          </Field>
          <Field label="YouTube">
            <input value={form.links?.youtube ?? ''} onChange={e => setLink('youtube', e.target.value.replace(/^@/, ''))} placeholder="username" />
          </Field>
          <Field label="Facebook">
            <input value={form.links?.facebook ?? ''} onChange={e => setLink('facebook', e.target.value.replace(/^@/, ''))} placeholder="username" />
          </Field>
          <Field label="Twitter">
            <input value={form.links?.twitter ?? ''} onChange={e => setLink('twitter', e.target.value.replace(/^@/, ''))} placeholder="username" />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Add Group'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const INPUT_CLASS = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactElement<{ className?: string }> }) {
  return (
    <label className="block">
      <span className="block text-xs text-zinc-400 mb-1">{label}</span>
      {React.cloneElement(children, { className: INPUT_CLASS })}
    </label>
  )
}
