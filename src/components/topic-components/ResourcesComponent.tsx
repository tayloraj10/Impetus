import React, { useEffect, useState } from 'react'
import type { Resource, CreateResourceInput, Topic } from '../../types'
import { subscribeResources, createResource, likeResource, unlikeResource } from '../../services/resourcesService'
import { useAuth } from '../../hooks/useAuth'
import { useLiked } from '../../hooks/useLiked'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { LikeButton } from '../ui/LikeButton'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

const typeColors: Record<Resource['type'], 'blue' | 'amber' | 'green' | 'purple' | 'default' | 'red'> = {
  article: 'blue',
  video: 'red',
  government: 'green',
  tool: 'purple',
  guide: 'amber',
  other: 'default',
}

export function ResourcesComponent({ topic }: { topic: Topic }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const { user: _user } = useAuth()

  useEffect(() => {
    const unsub = subscribeResources(topic.id, (data) => {
      setResources(data)
      setLoading(false)
    })
    return unsub
  }, [topic.id])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">{resources.length} resource{resources.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setModalOpen(true)}>+ Add Resource</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : resources.length === 0 ? (
        <EmptyState onAdd={() => setModalOpen(true)} />
      ) : (
        <div className="space-y-2">
          {resources.map(r => <ResourceRow key={r.id} resource={r} />)}
        </div>
      )}

      <AddResourceModal open={modalOpen} onClose={() => setModalOpen(false)} topic={topic} />
    </div>
  )
}

function ResourceRow({ resource }: { resource: Resource }) {
  const { liked, toggle, canLike } = useLiked(resource.id)

  return (
    <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant={typeColors[resource.type]}>{resource.type}</Badge>
        </div>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-100 font-medium text-sm hover:text-emerald-400 transition-colors"
          onClick={e => e.stopPropagation()}
        >
          {resource.title} ↗
        </a>
        {resource.description && (
          <p className="text-zinc-400 text-sm mt-1 leading-relaxed">{resource.description}</p>
        )}
        {resource.submittedByDisplayName && (
          <p className="text-zinc-600 text-xs mt-2">Added by {resource.submittedByDisplayName}</p>
        )}
      </div>
      <LikeButton
        count={resource.likes}
        liked={liked}
        onToggle={() => toggle(() => likeResource(resource.id), () => unlikeResource(resource.id))}
        canLike={canLike}
        className="pt-1"
      />
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
      <p className="text-zinc-500 text-sm mb-3">No resources added yet.</p>
      <Button variant="secondary" size="sm" onClick={onAdd}>Add the first resource</Button>
    </div>
  )
}

function AddResourceModal({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: Topic }) {
  const { user } = useAuth()
  const [form, setForm] = useState<CreateResourceInput>({
    topicId: topic.id,
    title: '',
    url: '',
    type: 'article',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function set<K extends keyof CreateResourceInput>(field: K, value: CreateResourceInput[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await createResource(form, user.uid, user.displayName ?? 'Anonymous', topic.title, topic.slug)
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Modal open={open} onClose={() => { onClose(); setDone(false) }} title="Resource Submitted">
        <div className="text-center py-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3"><span className="text-emerald-400 text-sm font-bold">✓</span></div>
          <p className="text-zinc-300 text-sm">Submitted for review. It will appear once approved.</p>
          <Button className="mt-4" onClick={() => { onClose(); setDone(false) }}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a Resource">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Title *</span>
          <input
            required
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="How to start a cleanup group"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">URL *</span>
          <input
            required
            type="url"
            value={form.url}
            onChange={e => set('url', e.target.value)}
            placeholder="https://..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Type *</span>
          <select
            value={form.type}
            onChange={e => set('type', e.target.value as Resource['type'])}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="article">Article</option>
            <option value="video">Video</option>
            <option value="government">Government / Official</option>
            <option value="tool">Tool</option>
            <option value="guide">Guide</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Description</span>
          <textarea
            rows={2}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Brief description..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Resource'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
