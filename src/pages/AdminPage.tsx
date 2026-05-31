import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTopics } from '../hooks/useTopics'
import { createTopic } from '../services/topicsService'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import type { ComponentType } from '../types'

const ALL_COMPONENTS: ComponentType[] = ['groups', 'resources', 'events', 'challenges']

export function AdminPage() {
  const { role } = useAuth()
  const { topics } = useTopics()
  const [createOpen, setCreateOpen] = useState(false)

  if (role !== 'admin' && role !== 'moderator') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">Access denied.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage topics and moderate content</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ New Topic</Button>
      </div>

      <section>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Topics ({topics.length})</h2>
        <div className="space-y-2">
          {topics.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span>{t.coverEmoji ?? '🌍'}</span>
                <div>
                  <p className="text-zinc-100 font-medium text-sm">{t.title}</p>
                  <p className="text-zinc-500 text-xs">{t.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.status === 'active' ? 'green' : 'default'} size="sm">{t.status}</Badge>
                <span className="text-zinc-600 text-xs">
                  {t.groupCount}g · {t.resourceCount}r · {t.eventCount}e · {t.challengeCount}c
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CreateTopicModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function CreateTopicModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🌍')
  const [tags, setTags] = useState('')
  const [components, setComponents] = useState<ComponentType[]>(['groups', 'resources', 'events', 'challenges'])
  const [submitting, setSubmitting] = useState(false)

  function handleTitleChange(val: string) {
    setTitle(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  }

  function toggleComponent(c: ComponentType) {
    setComponents(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await createTopic({
        title,
        slug,
        description,
        coverEmoji: emoji,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        enabledComponents: components,
        status: 'active',
        createdBy: user.uid,
      })
      onClose()
      setTitle(''); setSlug(''); setDescription(''); setTags('')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'

  return (
    <Modal open={open} onClose={onClose} title="Create Topic">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <label className="block w-16">
            <span className="block text-xs text-zinc-400 mb-1">Emoji</span>
            <input value={emoji} onChange={e => setEmoji(e.target.value)} className={`${inputClass} text-center text-xl`} maxLength={2} />
          </label>
          <label className="block flex-1">
            <span className="block text-xs text-zinc-400 mb-1">Title *</span>
            <input required value={title} onChange={e => handleTitleChange(e.target.value)} className={inputClass} placeholder="Trash Cleanups" />
          </label>
        </div>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Slug</span>
          <input value={slug} onChange={e => setSlug(e.target.value)} className={inputClass} placeholder="trash-cleanups" />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Description *</span>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} resize-none`} placeholder="What is this topic about?" />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Tags (comma-separated)</span>
          <input value={tags} onChange={e => setTags(e.target.value)} className={inputClass} placeholder="environment, volunteer, community" />
        </label>
        <div>
          <span className="block text-xs text-zinc-400 mb-2">Components</span>
          <div className="flex flex-wrap gap-2">
            {ALL_COMPONENTS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => toggleComponent(c)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
                  components.includes(c)
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Topic'}</Button>
        </div>
      </form>
    </Modal>
  )
}
