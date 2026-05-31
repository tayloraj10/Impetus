import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTopics } from '../hooks/useTopics'
import { createTopic } from '../services/topicsService'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'

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
              <div>
                <p className="text-zinc-100 font-medium text-sm">{t.title}</p>
                <p className="text-zinc-500 text-xs">{t.slug}</p>
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
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleTitleChange(val: string) {
    setTitle(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
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
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        enabledComponents: [],
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
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Title *</span>
          <input required value={title} onChange={e => handleTitleChange(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Path</span>
          <input value={slug} onChange={e => setSlug(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Description *</span>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} resize-none`} placeholder="What is this topic about?" />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Tags (comma-separated)</span>
          <input value={tags} onChange={e => setTags(e.target.value)} className={inputClass} placeholder="environment, volunteer, community" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Topic'}</Button>
        </div>
      </form>
    </Modal>
  )
}
