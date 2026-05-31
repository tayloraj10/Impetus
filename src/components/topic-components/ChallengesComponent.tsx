import React, { useEffect, useState } from 'react'
import type { Challenge, Topic } from '../../types'
import {
  subscribeChallenges, createChallenge, submitChallengeAction,
  upvoteChallenge, unupvoteChallenge, flagChallenge, unflagChallenge,
} from '../../services/challengesService'
import { useAuth } from '../../hooks/useAuth'
import { useLiked, useFlag } from '../../hooks/useLiked'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { FlagButton } from '../ui/FlagButton'
import { Tooltip } from '../ui/Tooltip'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { formatDate } from '../../utils/time'

export function ChallengesComponent({ topic }: { topic: Topic }) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const { user, role } = useAuth()

  useEffect(() => {
    const unsub = subscribeChallenges(topic.id, (data) => {
      setChallenges(data)
      setLoading(false)
    })
    return unsub
  }, [topic.id])

  const active = challenges.filter(c => c.moderationStatus === 'active')
  const ended = challenges.filter(c => c.moderationStatus === 'ended')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">{active.length} active challenge{active.length !== 1 ? 's' : ''}</p>
        {(role === 'admin' || role === 'moderator') && (
          <CreateChallengeButton topic={topic} user={user} />
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : challenges.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {active.map(c => <ChallengeCard key={c.id} challenge={c} />)}
          {ended.length > 0 && (
            <>
              <p className="text-zinc-600 text-xs pt-2 pb-1 uppercase tracking-wider">Ended</p>
              {ended.map(c => <ChallengeCard key={c.id} challenge={c} ended />)}
            </>
          )}
        </div>
      )}
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

function ChallengeCard({ challenge, ended = false }: { challenge: Challenge; ended?: boolean }) {
  const [actionOpen, setActionOpen] = useState(false)
  const { user } = useAuth()
  const { liked, toggle, canLike } = useLiked(challenge.id, 'upvoted')
  const { flagged, flag, unflag, canFlag } = useFlag(challenge.id)

  return (
    <div className={`border rounded-xl p-5 ${ended ? 'border-zinc-800/50 opacity-60' : 'border-zinc-700 bg-zinc-900'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={ended ? 'default' : 'purple'}>{ended ? 'Ended' : 'Active'}</Badge>
            {challenge.type === 'group_competition' && <Badge variant="amber">Competition</Badge>}
          </div>
          <h3 className="text-zinc-100 font-semibold">{challenge.title}</h3>
          <p className="text-zinc-400 text-sm mt-1 leading-relaxed">{challenge.description}</p>

          {challenge.actionPrompt && (
            <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-emerald-400 text-sm font-medium">Your action:</p>
              <p className="text-zinc-300 text-sm mt-1">{challenge.actionPrompt}</p>
            </div>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
            <span>{challenge.participantCount} participants</span>
            {challenge.deadline && <span>Ends {formatDate(challenge.deadline)}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-800/70">
        {!ended && user && (
          <Button size="sm" onClick={() => setActionOpen(true)}>Take Action</Button>
        )}
        <Tooltip text={liked ? 'Remove upvote' : canLike ? 'Good challenge' : 'Sign in to vote'}>
          <button
            onClick={e => { e.preventDefault(); toggle(() => upvoteChallenge(challenge.id), () => unupvoteChallenge(challenge.id)) }}
            className={`flex items-center gap-1.5 text-xs transition-colors select-none cursor-pointer ${
              liked ? 'text-emerald-400' : canLike ? 'text-zinc-500 hover:text-emerald-400' : 'text-zinc-600 cursor-default'
            }`}
          >
            <ThumbsUp filled={liked} />
            <span>{challenge.upvotes}</span>
            <span className="text-zinc-600 ml-0.5">Good challenge</span>
          </button>
        </Tooltip>
        <div className="flex-1" />
        <FlagButton
          flagged={flagged}
          onFlag={() => flag(() => flagChallenge(challenge.id))}
          onUnflag={() => unflag(() => unflagChallenge(challenge.id))}
          canFlag={canFlag}
        />
      </div>

      <SubmitActionModal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        challenge={challenge}
      />
    </div>
  )
}

function SubmitActionModal({ open, onClose, challenge }: { open: boolean; onClose: () => void; challenge: Challenge }) {
  const { user } = useAuth()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await submitChallengeAction(challenge.id, {
        challengeId: challenge.id,
        topicId: challenge.topicId,
        userId: user.uid,
        userDisplayName: user.displayName ?? 'Anonymous',
        note,
      })
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Modal open={open} onClose={() => { onClose(); setDone(false) }} title="Action Logged!">
        <div className="text-center py-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3"><span className="text-emerald-400 text-sm font-bold">✓</span></div>
          <p className="text-zinc-300 text-sm">Your action has been logged. Thanks for making a difference!</p>
          <Button className="mt-4" onClick={() => { onClose(); setDone(false) }}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Your Action">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-emerald-400 text-sm font-medium">Challenge:</p>
          <p className="text-zinc-300 text-sm mt-1">{challenge.actionPrompt}</p>
        </div>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Tell us what you did (optional)</span>
          <textarea
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Share your experience..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Logging...' : 'Log Action'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
      <p className="text-zinc-500 text-sm">No challenges yet. Check back soon.</p>
    </div>
  )
}

function CreateChallengeButton({ topic, user }: { topic: Topic; user: any }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', actionPrompt: '', type: 'individual' as Challenge['type'] })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await createChallenge(
        { ...form, topicId: topic.id, createdBy: user.uid, moderationStatus: 'active' },
        topic.title,
        topic.slug,
      )
      setOpen(false)
      setForm({ title: '', description: '', actionPrompt: '', type: 'individual' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ Create Challenge</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create Challenge">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Title *</span>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="30-day no plastic challenge" />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Description *</span>
            <textarea required rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inputClass} resize-none`} placeholder="What is this challenge about?" />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Action Prompt *</span>
            <input required value={form.actionPrompt} onChange={e => setForm(f => ({ ...f, actionPrompt: e.target.value }))} className={inputClass} placeholder="Pick up 10 pieces of litter and submit a photo" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
