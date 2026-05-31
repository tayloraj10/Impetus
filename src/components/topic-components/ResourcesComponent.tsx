import React, { useEffect, useState } from 'react'
import type { Resource, CreateResourceInput, Topic } from '../../types'
import {
  subscribeResources, createResource,
  likeResource, unlikeResource,
  notHelpfulResource, unNotHelpfulResource,
  flagResource, unflagResource,
} from '../../services/resourcesService'
import { useAuth } from '../../hooks/useAuth'
import { useLiked, useFlag } from '../../hooks/useLiked'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { FlagButton } from '../ui/FlagButton'
import { Tooltip } from '../ui/Tooltip'
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

function ThumbsUp({ filled }: { filled: boolean }) {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10.5a1.5 1.5 0 1 1 3 0v6a1.5 1.5 0 0 1-3 0v-6zM6 10.333v5.43a2 2 0 0 0 1.106 1.79l.05.025A4 4 0 0 0 8.943 18h5.416a2 2 0 0 0 1.962-1.608l1.2-6A2 2 0 0 0 15.56 8H12V4a2 2 0 0 0-2-2 1 1 0 0 0-1 1v.667a4 4 0 0 1-.8 2.4L6.8 7.933a4 4 0 0 0-.8 2.4z" />
    </svg>
  )
}

function ThumbsDown({ filled }: { filled: boolean }) {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 9.5a1.5 1.5 0 1 1-3 0v-6a1.5 1.5 0 0 1 3 0v6zM14 9.667v-5.43a2 2 0 0 0-1.105-1.79l-.05-.025A4 4 0 0 0 11.055 2H5.64a2 2 0 0 0-1.962 1.608l-1.2 6A2 2 0 0 0 4.44 12H8v4a2 2 0 0 0 2 2 1 1 0 0 0 1-1v-.667a4 4 0 0 1 .8-2.4l1.4-1.866a4 4 0 0 0 .8-2.4z" />
    </svg>
  )
}

function ResourceRow({ resource }: { resource: Resource }) {
  const helpful = useLiked(resource.id, 'helpful')
  const notHelpful = useLiked(resource.id, 'nothelpful')
  const { flagged, flag, unflag, canFlag } = useFlag(resource.id)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
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

      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-zinc-800/70">
        <Tooltip text={helpful.liked ? 'Remove helpful vote' : helpful.canLike ? 'Mark as helpful' : 'Sign in to vote'}>
          <button
            onClick={e => { e.preventDefault(); helpful.toggle(() => likeResource(resource.id), () => unlikeResource(resource.id)) }}
            className={`flex items-center gap-1.5 text-xs transition-colors select-none cursor-pointer ${
              helpful.liked
                ? 'text-emerald-400'
                : helpful.canLike
                ? 'text-zinc-500 hover:text-emerald-400'
                : 'text-zinc-600 cursor-default'
            }`}
          >
            <ThumbsUp filled={helpful.liked} />
            <span>{resource.likes}</span>
            <span className="text-zinc-600 ml-0.5">Helpful</span>
          </button>
        </Tooltip>

        <Tooltip text={notHelpful.liked ? 'Remove vote' : notHelpful.canLike ? 'Not helpful' : 'Sign in to vote'}>
          <button
            onClick={e => { e.preventDefault(); notHelpful.toggle(() => notHelpfulResource(resource.id), () => unNotHelpfulResource(resource.id)) }}
            className={`flex items-center gap-1.5 text-xs transition-colors select-none cursor-pointer ${
              notHelpful.liked
                ? 'text-zinc-300'
                : notHelpful.canLike
                ? 'text-zinc-600 hover:text-zinc-400'
                : 'text-zinc-700 cursor-default'
            }`}
          >
            <ThumbsDown filled={notHelpful.liked} />
            <span>{resource.notHelpful}</span>
          </button>
        </Tooltip>

        <div className="flex-1" />
        <FlagButton
          flagged={flagged}
          onFlag={() => flag(() => flagResource(resource.id))}
          onUnflag={() => unflag(() => unflagResource(resource.id))}
          canFlag={canFlag}
        />
      </div>
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
