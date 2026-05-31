import { useEffect, useState } from 'react'
import type { Group, CreateGroupInput, Topic } from '../../types'
import { subscribeGroups, createGroup, likeGroup, unlikeGroup } from '../../services/groupsService'
import { useAuth } from '../../hooks/useAuth'
import { useLiked } from '../../hooks/useLiked'
import { Button } from '../ui/Button'
import { LikeButton } from '../ui/LikeButton'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

export function GroupsComponent({ topic }: { topic: Topic }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const { user } = useAuth()

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
          {groups.map(g => <GroupCard key={g.id} group={g} />)}
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

function GroupCard({ group }: { group: Group }) {
  const hasLinks = Object.values(group.links ?? {}).some(Boolean)
  const { liked, toggle, canLike } = useLiked(group.id)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-zinc-100 font-semibold text-sm">{group.name}</h3>
        <LikeButton
          count={group.likes}
          liked={liked}
          onToggle={() => toggle(() => likeGroup(group.id), () => unlikeGroup(group.id))}
          canLike={canLike}
        />
      </div>

      <p className="text-zinc-400 text-sm leading-relaxed mb-3 line-clamp-3">{group.description}</p>

      {group.location && (
        <p className="text-zinc-500 text-xs mb-2">
          {[group.location.city, group.location.state, group.location.country].filter(Boolean).join(', ')}
        </p>
      )}

      {hasLinks && (
        <div className="flex flex-wrap gap-2 mt-3">
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

function AddGroupModal({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: Topic }) {
  const { user } = useAuth()
  const [form, setForm] = useState<CreateGroupInput>({
    topicId: topic.id,
    name: '',
    description: '',
    location: { city: '', state: '', country: '' },
    links: { website: '', instagram: '', facebook: '', twitter: '' },
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }
  function setLink(field: string, value: string) {
    setForm(f => ({ ...f, links: { ...f.links, [field]: value } }))
  }
  function setLoc(field: string, value: string) {
    setForm(f => ({ ...f, location: { ...f.location, [field]: value } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await createGroup(form, user.uid, user.displayName ?? 'Anonymous', topic.title, topic.slug)
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Modal open={open} onClose={() => { onClose(); setDone(false) }} title="Group Submitted">
        <div className="text-center py-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3"><span className="text-emerald-400 text-sm font-bold">✓</span></div>
          <p className="text-zinc-300 text-sm">Your group has been submitted for review. It will appear once a moderator approves it.</p>
          <Button className="mt-4" onClick={() => { onClose(); setDone(false) }}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Group Name *">
          <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="World Cleanup Day" />
        </Field>
        <Field label="Description *">
          <textarea required rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this group do?" />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="City">
            <input value={form.location?.city ?? ''} onChange={e => setLoc('city', e.target.value)} placeholder="Boston" />
          </Field>
          <Field label="State">
            <input value={form.location?.state ?? ''} onChange={e => setLoc('state', e.target.value)} placeholder="MA" />
          </Field>
          <Field label="Country">
            <input value={form.location?.country ?? ''} onChange={e => setLoc('country', e.target.value)} placeholder="USA" />
          </Field>
        </div>
        <Field label="Website">
          <input type="url" value={form.links?.website ?? ''} onChange={e => setLink('website', e.target.value)} placeholder="https://..." />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Instagram">
            <input value={form.links?.instagram ?? ''} onChange={e => setLink('instagram', e.target.value)} placeholder="https://instagram.com/..." />
          </Field>
          <Field label="Facebook">
            <input value={form.links?.facebook ?? ''} onChange={e => setLink('facebook', e.target.value)} placeholder="https://facebook.com/..." />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Group'}
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

import React from 'react'
