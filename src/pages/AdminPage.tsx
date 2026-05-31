import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAllTopics } from '../hooks/useTopics'
import { createTopic, updateTopic } from '../services/topicsService'
import { useCategories } from '../hooks/useGroupCategories'
import { addCategory, deleteCategory, seedDefaultCategories } from '../services/categoriesService'
import {
  subscribePendingGroups, setGroupModerationStatus,
  subscribeRemovedGroups, restoreGroup, deleteGroup,
} from '../services/groupsService'
import {
  subscribePendingResources, setResourceModerationStatus,
  subscribeRemovedResources, restoreResource, deleteResource,
} from '../services/resourcesService'
import {
  subscribePendingEvents, setEventModerationStatus,
  subscribeRemovedEvents, restoreEvent, deleteEvent,
} from '../services/eventsService'
import {
  subscribeRemovedChallenges, restoreChallenge, deleteChallenge,
} from '../services/challengesService'
import { uploadImage, topicImagePath } from '../services/storageService'
import { seedAllTopics } from '../services/seedService'
import { wipeContentCollections } from '../services/devService'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { formatTimeAgo, formatDate } from '../utils/time'
import type { Topic, ComponentType, Group, Resource, ImpetusEvent, Challenge } from '../types'

const ALL_COMPONENTS: { key: ComponentType; label: string }[] = [
  { key: 'groups', label: 'Groups' },
  { key: 'resources', label: 'Resources' },
  { key: 'events', label: 'Events' },
  { key: 'challenges', label: 'Challenges' },
]

export function AdminPage() {
  const { role } = useAuth()
  const { topics } = useAllTopics()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTopic, setEditTopic] = useState<Topic | null>(null)
  const topicMap = useMemo(() => Object.fromEntries(topics.map(t => [t.id, t.title])), [topics])

  if (role !== 'admin' && role !== 'moderator') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">Access denied.</p>
      </div>
    )
  }

  const isAdmin = role === 'admin'
  const activeTopics = topics.filter(t => t.status === 'active')
  const inactiveTopics = topics.filter(t => t.status !== 'active')

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Admin</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage topics and moderate content</p>
        </div>
        {isAdmin && <Button onClick={() => setCreateOpen(true)}>+ New Topic</Button>}
      </div>

      {import.meta.env.DEV && isAdmin && <SeedPanel />}

      <ModerationSection topicMap={topicMap} />
      <RemovedSection topicMap={topicMap} />

      {isAdmin && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Topics ({topics.length})
          </h2>
          <div className="space-y-2">
            {activeTopics.map(t => (
              <TopicRow key={t.id} topic={t} onEdit={() => setEditTopic(t)} />
            ))}
            {inactiveTopics.length > 0 && (
              <>
                <p className="text-xs text-zinc-600 uppercase tracking-wider pt-2 pb-1">Inactive</p>
                {inactiveTopics.map(t => (
                  <TopicRow key={t.id} topic={t} onEdit={() => setEditTopic(t)} />
                ))}
              </>
            )}
          </div>

          <CategoriesManager />
        </section>
      )}

      {isAdmin && (
        <>
          <CreateTopicModal open={createOpen} onClose={() => setCreateOpen(false)} />
          {editTopic && (
            <EditTopicModal topic={editTopic} onClose={() => setEditTopic(null)} />
          )}
        </>
      )}
    </div>
  )
}

function CategoriesManager() {
  const { categories, loading } = useCategories()
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState('')

  const normalized = input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const duplicate = categories.some(c => c.id === normalized)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || duplicate) return
    setAdding(true)
    setError('')
    try {
      await addCategory(input)
      setInput('')
    } catch (err: any) {
      setError(err.message ?? 'Failed to add')
    } finally {
      setAdding(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try { await seedDefaultCategories() } finally { setSeeding(false) }
  }

  return (
    <div className="mt-6 pt-6 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Categories ({categories.length})
        </p>
        {categories.length === 0 && !loading && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="text-xs px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:border-emerald-700 hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            {seeding ? 'Seeding…' : 'Seed defaults'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-zinc-600 text-xs">Loading…</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded-full">
              {c.label}
              <button
                onClick={() => deleteCategory(c.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors leading-none cursor-pointer"
                title="Delete category"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <div className="flex-1">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setError('') }}
            placeholder="Add a category…"
            className={`w-full bg-zinc-800 border rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors ${
              duplicate ? 'border-amber-600 focus:border-amber-500' : 'border-zinc-700 focus:border-emerald-500'
            }`}
          />
          {duplicate && <p className="text-amber-400 text-xs mt-1">"{input.trim()}" already exists</p>}
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={adding || !input.trim() || duplicate}
          className="shrink-0 text-sm px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {adding ? '…' : 'Add'}
        </button>
      </form>
    </div>
  )
}

function TopicRow({ topic: t, onEdit }: { topic: Topic; onEdit: () => void }) {
  const [toggling, setToggling] = useState(false)

  async function toggleStatus() {
    setToggling(true)
    try {
      await updateTopic(t.id, {
        status: t.status === 'active' ? 'archived' : 'active',
      })
    } finally {
      setToggling(false)
    }
  }

  const isActive = t.status === 'active'

  const countParts = [
    t.groupCount > 0 ? `${t.groupCount} group${t.groupCount !== 1 ? 's' : ''}` : null,
    t.resourceCount > 0 ? `${t.resourceCount} resource${t.resourceCount !== 1 ? 's' : ''}` : null,
    t.eventCount > 0 ? `${t.eventCount} event${t.eventCount !== 1 ? 's' : ''}` : null,
    t.challengeCount > 0 ? `${t.challengeCount} challenge${t.challengeCount !== 1 ? 's' : ''}` : null,
  ].filter(Boolean)

  return (
    <div className={`flex items-center gap-3 bg-zinc-900 border rounded-xl px-4 py-3 transition-colors ${isActive ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-zinc-100 font-medium text-sm truncate">{t.title}</p>
          <span className="text-zinc-600 text-xs shrink-0">/topic/{t.slug}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {t.enabledComponents.length > 0 ? (
            <div className="flex items-center gap-1">
              {t.enabledComponents.map(c => (
                <span key={c} className="text-xs text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-zinc-600">no components</span>
          )}
          {countParts.length > 0 && (
            <span className="text-zinc-600 text-xs">{countParts.join(' · ')}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleStatus}
          disabled={toggling}
          title={isActive ? 'Disable topic' : 'Enable topic'}
          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors cursor-pointer ${
            isActive
              ? 'border-emerald-700 text-emerald-400 hover:bg-emerald-500/10'
              : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {toggling ? '...' : isActive ? 'Active' : 'Inactive'}
        </button>
        <button
          onClick={onEdit}
          className="text-xs px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors cursor-pointer"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

function SeedPanel() {
  const { user } = useAuth()
  const [seedStatus, setSeedStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [wipeStatus, setWipeStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSeed() {
    if (!user) return
    if (!confirm('Seed all topics with demo data? This will wipe and re-populate existing seed content.')) return
    setSeedStatus('running')
    try {
      await seedAllTopics(user.uid, user.displayName ?? 'Admin')
      setSeedStatus('done')
    } catch (e: any) {
      setError(e.message ?? 'Unknown error')
      setSeedStatus('error')
    }
  }

  async function handleWipe() {
    if (!confirm('Wipe all content? This permanently deletes all groups, resources, events, challenges, submissions, feed items, and topic suggestions. Topics and users are preserved.')) return
    setWipeStatus('running')
    try {
      await wipeContentCollections()
      setWipeStatus('done')
    } catch (e: any) {
      setError(e.message ?? 'Unknown error')
      setWipeStatus('error')
    }
  }

  return (
    <section className="mb-8 p-4 border border-dashed border-zinc-700 rounded-xl bg-zinc-900/40">
      <p className="text-zinc-300 text-sm font-medium mb-3">Dev Tools</p>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-zinc-400 text-xs font-medium">Seed Data</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Populates all topics with realistic data and staggered timestamps for feed testing.
          </p>
          {seedStatus === 'done' && <p className="text-emerald-400 text-xs mt-1">All topics seeded successfully.</p>}
          {seedStatus === 'error' && <p className="text-red-400 text-xs mt-1">Error: {error}</p>}
        </div>
        <Button
          variant="secondary"
          onClick={handleSeed}
          disabled={seedStatus === 'running' || seedStatus === 'done'}
        >
          {seedStatus === 'running' ? 'Seeding…' : seedStatus === 'done' ? 'Done' : 'Seed All Topics'}
        </Button>
      </div>
      <div className="flex items-start justify-between gap-4 mt-4 pt-4 border-t border-zinc-800">
        <div className="flex-1">
          <p className="text-zinc-400 text-xs font-medium">Wipe Content</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Deletes all content (feed, groups, resources, events, challenges, submissions, suggestions). Topics and users are preserved.
          </p>
          {wipeStatus === 'done' && <p className="text-emerald-400 text-xs mt-1">Content wiped.</p>}
          {wipeStatus === 'error' && <p className="text-red-400 text-xs mt-1">Error: {error}</p>}
        </div>
        <button
          onClick={handleWipe}
          disabled={wipeStatus === 'running' || wipeStatus === 'done'}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {wipeStatus === 'running' ? 'Wiping…' : wipeStatus === 'done' ? 'Done' : 'Wipe DB'}
        </button>
      </div>
    </section>
  )
}

const inputClass = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'

function ComponentToggles({
  value,
  onChange,
}: {
  value: ComponentType[]
  onChange: (v: ComponentType[]) => void
}) {
  function toggle(key: ComponentType) {
    onChange(
      value.includes(key) ? value.filter(c => c !== key) : [...value, key],
    )
  }

  return (
    <div>
      <span className="block text-xs text-zinc-400 mb-2">Enabled Components</span>
      <div className="flex gap-2 flex-wrap">
        {ALL_COMPONENTS.map(({ key, label }) => {
          const on = value.includes(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                on
                  ? 'bg-emerald-500/15 border-emerald-600 text-emerald-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CreateTopicModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [components, setComponents] = useState<ComponentType[]>(['groups', 'resources', 'events', 'challenges'])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleTitleChange(val: string) {
    setTitle(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
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
        imageUrl = await uploadImage(imageFile, topicImagePath(slug, imageFile))
      }
      await createTopic({
        title,
        slug,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        ...(imageUrl ? { imageUrl } : {}),
        enabledComponents: components,
        status: 'active',
        createdBy: user.uid,
      })
      onClose()
      setTitle(''); setSlug(''); setDescription(''); setTags(''); setComponents(['groups', 'resources', 'events', 'challenges']); clearImage()
    } finally {
      setSubmitting(false)
    }
  }

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
        <ComponentToggles value={components} onChange={setComponents} />
        <div>
          <span className="block text-xs text-zinc-400 mb-1">Cover Image</span>
          {imagePreview ? (
            <div className="relative w-full h-36 rounded-lg overflow-hidden border border-zinc-700">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-full w-6 h-6 flex items-center justify-center text-xs leading-none"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-1 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors text-sm"
            >
              <span className="text-lg">+</span>
              <span>Upload image</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Topic'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function EditTopicModal({ topic, onClose }: { topic: Topic; onClose: () => void }) {
  const [title, setTitle] = useState(topic.title)
  const [slug, setSlug] = useState(topic.slug)
  const [description, setDescription] = useState(topic.description)
  const [tags, setTags] = useState(topic.tags.join(', '))
  const [components, setComponents] = useState<ComponentType[]>(topic.enabledComponents)
  const [status, setStatus] = useState<Topic['status']>(topic.status)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(topic.imageUrl ?? null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setSubmitting(true)
    try {
      let imageUrl = topic.imageUrl
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, topicImagePath(slug, imageFile))
      } else if (!imagePreview) {
        imageUrl = undefined
      }

      await updateTopic(topic.id, {
        title,
        slug,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        enabledComponents: components,
        status,
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Edit: ${topic.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Title *</span>
          <input required value={title} onChange={e => setTitle(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">
            Path
            {slug !== topic.slug && (
              <span className="ml-2 text-amber-400">warning: changing slug breaks existing links</span>
            )}
          </span>
          <input value={slug} onChange={e => setSlug(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Description *</span>
          <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} resize-none`} />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Tags (comma-separated)</span>
          <input value={tags} onChange={e => setTags(e.target.value)} className={inputClass} />
        </label>
        <ComponentToggles value={components} onChange={setComponents} />
        <div>
          <span className="block text-xs text-zinc-400 mb-2">Status</span>
          <div className="flex gap-2">
            {(['active', 'archived'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer capitalize ${
                  status === s
                    ? s === 'active'
                      ? 'bg-emerald-500/15 border-emerald-600 text-emerald-400'
                      : 'bg-zinc-700/40 border-zinc-500 text-zinc-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="block text-xs text-zinc-400 mb-1">Cover Image</span>
          {imagePreview ? (
            <div className="relative w-full h-36 rounded-lg overflow-hidden border border-zinc-700">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-full w-6 h-6 flex items-center justify-center text-xs leading-none"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded-lg px-2 py-1 text-xs"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-1 text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors text-sm"
            >
              <span className="text-lg">+</span>
              <span>Upload image</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Moderation Queue ──────────────────────────────────────────────────────────

type ModTab = 'groups' | 'resources' | 'events'

function ModerationSection({ topicMap }: { topicMap: Record<string, string> }) {
  const [tab, setTab] = useState<ModTab>('groups')
  const [groups, setGroups] = useState<Group[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [events, setEvents] = useState<ImpetusEvent[]>([])

  useEffect(() => subscribePendingGroups(setGroups), [])
  useEffect(() => subscribePendingResources(setResources), [])
  useEffect(() => subscribePendingEvents(setEvents), [])

  const counts: Record<ModTab, number> = { groups: groups.length, resources: resources.length, events: events.length }
  const total = groups.length + resources.length + events.length

  const tabs: { key: ModTab; label: string }[] = [
    { key: 'groups', label: 'Groups' },
    { key: 'resources', label: 'Resources' },
    { key: 'events', label: 'Events' },
  ]

  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
        Moderation Queue{total > 0 && <span className="ml-2 text-amber-400">({total})</span>}
      </h2>

      {total === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-8 text-center">
          <p className="text-zinc-500 text-sm">Queue is clear</p>
        </div>
      ) : (
        <>
          <div className="flex gap-0.5 border-b border-zinc-800 mb-4">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium transition-all cursor-pointer -mb-px border-b-2 rounded-t-md flex items-center gap-1.5 ${
                  tab === key
                    ? 'text-amber-400 border-amber-400 bg-amber-500/5'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {label}
                {counts[key] > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === key ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>{counts[key]}</span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {tab === 'groups' && (
              groups.length === 0
                ? <p className="text-zinc-600 text-sm py-4 text-center">No pending groups</p>
                : groups.map(g => <GroupModerationCard key={g.id} group={g} topicName={topicMap[g.topicId]} />)
            )}
            {tab === 'resources' && (
              resources.length === 0
                ? <p className="text-zinc-600 text-sm py-4 text-center">No pending resources</p>
                : resources.map(r => <ResourceModerationCard key={r.id} resource={r} topicName={topicMap[r.topicId]} />)
            )}
            {tab === 'events' && (
              events.length === 0
                ? <p className="text-zinc-600 text-sm py-4 text-center">No pending events</p>
                : events.map(e => <EventModerationCard key={e.id} event={e} topicName={topicMap[e.topicId]} />)
            )}
          </div>
        </>
      )}
    </section>
  )
}

function ReviewActions({ acting, onApprove, onReject }: {
  acting: 'approve' | 'reject' | null
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        onClick={onReject}
        disabled={acting !== null}
        className="text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:border-red-700 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {acting === 'reject' ? '…' : 'Reject'}
      </button>
      <button
        onClick={onApprove}
        disabled={acting !== null}
        className="text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {acting === 'approve' ? '…' : 'Approve'}
      </button>
    </div>
  )
}

function GroupModerationCard({ group: g, topicName }: { group: Group; topicName?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-zinc-700 transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">Group</span>
            {topicName && <span className="text-xs text-zinc-500">{topicName}</span>}
          </div>
          <p className="text-zinc-100 text-sm font-medium truncate">{g.name}</p>
          <p className="text-zinc-600 text-xs mt-0.5">by {g.submittedByDisplayName ?? 'Unknown'} · {formatTimeAgo(g.createdAt)}</p>
        </div>
        <span className="text-zinc-500 text-xs shrink-0">Review →</span>
      </div>
      <GroupDetailModal group={g} topicName={topicName} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function GroupDetailModal({ group: g, topicName, open, onClose }: { group: Group; topicName?: string; open: boolean; onClose: () => void }) {
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null)

  async function act(action: 'approve' | 'reject') {
    setActing(action)
    try {
      await setGroupModerationStatus(g.id, action === 'approve' ? 'live' : 'rejected')
      onClose()
    } finally {
      setActing(null)
    }
  }

  const locationStr = [g.location?.city, g.location?.state, g.location?.country].filter(Boolean).join(', ')
  const socialLinks = Object.entries(g.links ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]))

  return (
    <Modal open={open} onClose={onClose} title="Review Group" size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {g.imageUrl && (
          <div className="w-full h-44 rounded-lg overflow-hidden">
            <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Name</p>
            <p className="text-zinc-100 font-semibold">{g.name}</p>
          </div>
          {topicName && (
            <div>
              <p className="text-zinc-500 text-xs mb-1">Topic</p>
              <p className="text-zinc-300 text-sm">{topicName}</p>
            </div>
          )}
        </div>
        {g.description && (
          <div>
            <p className="text-zinc-500 text-xs mb-1">Description</p>
            <p className="text-zinc-300 text-sm leading-relaxed">{g.description}</p>
          </div>
        )}
        {locationStr && (
          <div>
            <p className="text-zinc-500 text-xs mb-1">Location</p>
            <p className="text-zinc-300 text-sm">{locationStr}</p>
          </div>
        )}
        {socialLinks.length > 0 && (
          <div>
            <p className="text-zinc-500 text-xs mb-2">Links</p>
            <div className="space-y-2">
              {socialLinks.map(([key, url]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-zinc-500 text-xs capitalize w-20 shrink-0">{key}</span>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 text-xs underline break-all">
                    {url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-zinc-600 text-xs pt-3 border-t border-zinc-800">
          Submitted by {g.submittedByDisplayName ?? 'Unknown'} · {formatTimeAgo(g.createdAt)}
        </p>
        <ReviewActions acting={acting} onApprove={() => act('approve')} onReject={() => act('reject')} />
      </div>
    </Modal>
  )
}

const resourceTypeLabel: Record<Resource['type'], string> = {
  article: 'Article', video: 'Video', government: 'Gov', tool: 'Tool', guide: 'Guide', other: 'Other',
}

function ResourceModerationCard({ resource: r, topicName }: { resource: Resource; topicName?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-zinc-700 transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">Resource</span>
            <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{resourceTypeLabel[r.type]}</span>
            {topicName && <span className="text-xs text-zinc-500">{topicName}</span>}
          </div>
          <p className="text-zinc-100 text-sm font-medium truncate">{r.title}</p>
          <p className="text-zinc-600 text-xs mt-0.5">by {r.submittedByDisplayName ?? 'Unknown'} · {formatTimeAgo(r.createdAt)}</p>
        </div>
        <span className="text-zinc-500 text-xs shrink-0">Review →</span>
      </div>
      <ResourceDetailModal resource={r} topicName={topicName} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function ResourceDetailModal({ resource: r, topicName, open, onClose }: { resource: Resource; topicName?: string; open: boolean; onClose: () => void }) {
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null)

  async function act(action: 'approve' | 'reject') {
    setActing(action)
    try {
      await setResourceModerationStatus(r.id, action === 'approve' ? 'live' : 'rejected')
      onClose()
    } finally {
      setActing(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Review Resource" size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Title</p>
            <p className="text-zinc-100 font-semibold">{r.title}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-1">Type</p>
            <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{resourceTypeLabel[r.type]}</span>
          </div>
        </div>
        {topicName && (
          <div>
            <p className="text-zinc-500 text-xs mb-1">Topic</p>
            <p className="text-zinc-300 text-sm">{topicName}</p>
          </div>
        )}
        <div>
          <p className="text-zinc-500 text-xs mb-1">URL</p>
          <a href={r.url} target="_blank" rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 text-sm underline break-all">
            {r.url}
          </a>
        </div>
        {r.description && (
          <div>
            <p className="text-zinc-500 text-xs mb-1">Description</p>
            <p className="text-zinc-300 text-sm leading-relaxed">{r.description}</p>
          </div>
        )}
        <p className="text-zinc-600 text-xs pt-3 border-t border-zinc-800">
          Submitted by {r.submittedByDisplayName ?? 'Unknown'} · {formatTimeAgo(r.createdAt)}
        </p>
        <ReviewActions acting={acting} onApprove={() => act('approve')} onReject={() => act('reject')} />
      </div>
    </Modal>
  )
}

function EventModerationCard({ event: e, topicName }: { event: ImpetusEvent; topicName?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-zinc-700 transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">Event</span>
            {e.isVirtual && <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Virtual</span>}
            {topicName && <span className="text-xs text-zinc-500">{topicName}</span>}
          </div>
          <p className="text-zinc-100 text-sm font-medium truncate">{e.title}</p>
          <p className="text-zinc-600 text-xs mt-0.5">by {e.submittedByDisplayName ?? 'Unknown'} · {formatTimeAgo(e.createdAt)}</p>
        </div>
        <span className="text-zinc-500 text-xs shrink-0">Review →</span>
      </div>
      <EventDetailModal event={e} topicName={topicName} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function EventDetailModal({ event: e, topicName, open, onClose }: { event: ImpetusEvent; topicName?: string; open: boolean; onClose: () => void }) {
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null)

  async function act(action: 'approve' | 'reject') {
    setActing(action)
    try {
      await setEventModerationStatus(e.id, action === 'approve' ? 'live' : 'rejected')
      onClose()
    } finally {
      setActing(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Review Event" size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <p className="text-zinc-500 text-xs mb-1">Title</p>
          <p className="text-zinc-100 font-semibold">{e.title}</p>
        </div>
        {topicName && (
          <div>
            <p className="text-zinc-500 text-xs mb-1">Topic</p>
            <p className="text-zinc-300 text-sm">{topicName}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Date</p>
            <p className="text-zinc-300 text-sm">{formatDate(e.date)}</p>
          </div>
          {e.endDate && (
            <div>
              <p className="text-zinc-500 text-xs mb-1">End Date</p>
              <p className="text-zinc-300 text-sm">{formatDate(e.endDate)}</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Format</p>
            <p className="text-zinc-300 text-sm">{e.isVirtual ? 'Virtual' : 'In-person'}</p>
          </div>
          {e.location && (
            <div>
              <p className="text-zinc-500 text-xs mb-1">Location</p>
              <p className="text-zinc-300 text-sm">{e.location}</p>
            </div>
          )}
        </div>
        <div>
          <p className="text-zinc-500 text-xs mb-1">Link</p>
          <a href={e.externalUrl} target="_blank" rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 text-sm underline break-all">
            {e.externalUrl}
          </a>
        </div>
        {e.description && (
          <div>
            <p className="text-zinc-500 text-xs mb-1">Description</p>
            <p className="text-zinc-300 text-sm leading-relaxed">{e.description}</p>
          </div>
        )}
        <p className="text-zinc-600 text-xs pt-3 border-t border-zinc-800">
          Submitted by {e.submittedByDisplayName ?? 'Unknown'} · {formatTimeAgo(e.createdAt)}
        </p>
        <ReviewActions acting={acting} onApprove={() => act('approve')} onReject={() => act('reject')} />
      </div>
    </Modal>
  )
}

// ── Removed Content ───────────────────────────────────────────────────────────

type RemovedTab = 'groups' | 'resources' | 'events' | 'challenges'

function RemovedSection({ topicMap }: { topicMap: Record<string, string> }) {
  const [tab, setTab] = useState<RemovedTab>('groups')
  const [groups, setGroups] = useState<Group[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [events, setEvents] = useState<ImpetusEvent[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])

  useEffect(() => subscribeRemovedGroups(setGroups), [])
  useEffect(() => subscribeRemovedResources(setResources), [])
  useEffect(() => subscribeRemovedEvents(setEvents), [])
  useEffect(() => subscribeRemovedChallenges(setChallenges), [])

  const counts: Record<RemovedTab, number> = {
    groups: groups.length,
    resources: resources.length,
    events: events.length,
    challenges: challenges.length,
  }
  const total = groups.length + resources.length + events.length + challenges.length

  const tabs: { key: RemovedTab; label: string }[] = [
    { key: 'groups', label: 'Groups' },
    { key: 'resources', label: 'Resources' },
    { key: 'events', label: 'Events' },
    { key: 'challenges', label: 'Challenges' },
  ]

  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
        Removed Content{total > 0 && <span className="ml-2 text-zinc-500">({total})</span>}
      </h2>

      {total === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-8 text-center">
          <p className="text-zinc-500 text-sm">No removed content</p>
        </div>
      ) : (
        <>
          <div className="flex gap-0.5 border-b border-zinc-800 mb-4">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-medium transition-all cursor-pointer -mb-px border-b-2 rounded-t-md flex items-center gap-1.5 ${
                  tab === key
                    ? 'text-zinc-300 border-zinc-400 bg-zinc-800/50'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {label}
                {counts[key] > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === key ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-800 text-zinc-500'
                  }`}>{counts[key]}</span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {tab === 'groups' && (
              groups.length === 0
                ? <p className="text-zinc-600 text-sm py-4 text-center">None</p>
                : groups.map(g => (
                  <RemovedCard
                    key={g.id}
                    type="Group"
                    title={g.name}
                    topicName={topicMap[g.topicId]}
                    removedByDisplayName={g.removedByDisplayName}
                    removedAt={g.removedAt}
                    onRestore={() => restoreGroup(g.id)}
                    onDelete={() => deleteGroup(g.id, g.topicId)}
                  />
                ))
            )}
            {tab === 'resources' && (
              resources.length === 0
                ? <p className="text-zinc-600 text-sm py-4 text-center">None</p>
                : resources.map(r => (
                  <RemovedCard
                    key={r.id}
                    type="Resource"
                    title={r.title}
                    topicName={topicMap[r.topicId]}
                    removedByDisplayName={r.removedByDisplayName}
                    removedAt={r.removedAt}
                    onRestore={() => restoreResource(r.id)}
                    onDelete={() => deleteResource(r.id, r.topicId)}
                  />
                ))
            )}
            {tab === 'events' && (
              events.length === 0
                ? <p className="text-zinc-600 text-sm py-4 text-center">None</p>
                : events.map(e => (
                  <RemovedCard
                    key={e.id}
                    type="Event"
                    title={e.title}
                    topicName={topicMap[e.topicId]}
                    removedByDisplayName={e.removedByDisplayName}
                    removedAt={e.removedAt}
                    onRestore={() => restoreEvent(e.id)}
                    onDelete={() => deleteEvent(e.id, e.topicId)}
                  />
                ))
            )}
            {tab === 'challenges' && (
              challenges.length === 0
                ? <p className="text-zinc-600 text-sm py-4 text-center">None</p>
                : challenges.map(c => (
                  <RemovedCard
                    key={c.id}
                    type="Challenge"
                    title={c.title}
                    topicName={topicMap[c.topicId]}
                    removedByDisplayName={c.removedByDisplayName}
                    removedAt={c.removedAt}
                    onRestore={() => restoreChallenge(c.id)}
                    onDelete={() => deleteChallenge(c.id, c.topicId)}
                  />
                ))
            )}
          </div>
        </>
      )}
    </section>
  )
}

function RemovedCard({
  type, title, topicName, removedByDisplayName, removedAt, onRestore, onDelete,
}: {
  type: string
  title: string
  topicName?: string
  removedByDisplayName?: string
  removedAt?: Date
  onRestore: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [restoring, setRestoring] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleRestore() {
    setRestoring(true)
    try { await onRestore() } finally { setRestoring(false) }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try { await onDelete() } finally { setDeleting(false); setConfirmDelete(false) }
  }

  const busy = restoring || deleting

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">{type}</span>
          {topicName && <span className="text-xs text-zinc-500">{topicName}</span>}
        </div>
        <p className="text-zinc-100 text-sm font-medium truncate">{title}</p>
        <p className="text-zinc-500 text-xs mt-0.5">
          Removed by <span className="text-zinc-400">{removedByDisplayName ?? 'Admin'}</span>
          {removedAt && <span> · {formatTimeAgo(removedAt)}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleRestore}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-emerald-700 hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {restoring ? '…' : 'Restore'}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          onBlur={() => setConfirmDelete(false)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            confirmDelete
              ? 'border-red-700 text-red-400 bg-red-500/10'
              : 'border-zinc-700 text-zinc-500 hover:border-red-700 hover:text-red-400'
          }`}
        >
          {deleting ? '…' : confirmDelete ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
