import React, { useEffect, useRef, useState } from 'react'
import type { Challenge, ChallengeSubmission, Topic } from '../../types'
import {
  subscribeChallenges, subscribeChallengeSubmissions,
  createChallenge, submitChallengeAction,
  upvoteChallenge, unupvoteChallenge, flagChallenge, unflagChallenge, softDeleteChallenge, deleteChallenge,
} from '../../services/challengesService'
import { useAuth } from '../../hooks/useAuth'
import { useLiked, useFlag } from '../../hooks/useLiked'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { FlagButton } from '../ui/FlagButton'
import { ModerateButtons } from '../ui/ModerateButtons'
import { Tooltip } from '../ui/Tooltip'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { formatDate, formatTimeAgo } from '../../utils/time'

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
          {active.map(c => <ChallengeCard key={c.id} challenge={c} role={role} />)}
          {ended.length > 0 && (
            <>
              <p className="text-zinc-600 text-xs pt-2 pb-1 uppercase tracking-wider">Ended</p>
              {ended.map(c => <ChallengeCard key={c.id} challenge={c} ended role={role} />)}
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

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  )
}

function ChallengeCard({ challenge, ended = false, role }: { challenge: Challenge; ended?: boolean; role: string | null }) {
  const [actionOpen, setActionOpen] = useState(false)
  const [submissionsOpen, setSubmissionsOpen] = useState(false)
  const [showSignInMsg, setShowSignInMsg] = useState(false)
  const { user } = useAuth()
  const { liked, toggle, canLike } = useLiked(challenge.id, 'upvoted')
  const { flagged, flag, unflag, canFlag } = useFlag(challenge.id)
  const canModerate = role === 'admin' || role === 'moderator'
  const isAdmin = role === 'admin'

  return (
    <div className={`border rounded-xl p-5 ${ended ? 'border-zinc-800/50 opacity-60' : 'border-zinc-700 bg-zinc-900'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={ended ? 'default' : 'purple'}>{ended ? 'Ended' : 'Active'}</Badge>
            {challenge.type === 'group_competition' && <Badge variant="amber">Competition</Badge>}
            {canModerate && (
              <div className="ml-auto">
                <ModerateButtons
                  onSoftDelete={(uid, name, reason) => softDeleteChallenge(challenge.id, uid, name, reason)}
                  onHardDelete={isAdmin ? () => deleteChallenge(challenge.id, challenge.topicId) : undefined}
                />
              </div>
            )}
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
            <span>{challenge.participantCount} participant{challenge.participantCount !== 1 ? 's' : ''}</span>
            {challenge.deadline && <span>Ends {formatDate(challenge.deadline)}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-800/70">
        {!ended && (
          <div className="flex flex-col gap-0.5">
            <Button size="sm" onClick={() => { if (!user) { setShowSignInMsg(true); return } setActionOpen(true) }}>Take Action</Button>
            {showSignInMsg && !user && <p className="text-amber-400 text-xs">Sign in to take action</p>}
          </div>
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

      {challenge.participantCount > 0 && (
        <div className="mt-3 border-t border-zinc-800/70 pt-3">
          <button
            onClick={() => setSubmissionsOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronDown open={submissionsOpen} />
            <span>
              {challenge.participantCount} submission{challenge.participantCount !== 1 ? 's' : ''}
            </span>
          </button>
          {submissionsOpen && (
            <SubmissionsPanel challengeId={challenge.id} />
          )}
        </div>
      )}

      <SubmitActionModal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        challenge={challenge}
        onSubmitted={() => setSubmissionsOpen(true)}
      />
    </div>
  )
}

function SubmissionsPanel({ challengeId }: { challengeId: string }) {
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeChallengeSubmissions(challengeId, (data) => {
      setSubmissions(data)
      setLoading(false)
    })
    return unsub
  }, [challengeId])

  if (loading) {
    return <div className="flex justify-center py-6"><Spinner /></div>
  }

  if (submissions.length === 0) {
    return <p className="text-zinc-600 text-xs text-center py-4">No submissions yet</p>
  }

  return (
    <div className="mt-3 space-y-4 max-h-[28rem] overflow-y-auto pr-1">
      {submissions.map(s => <SubmissionItem key={s.id} submission={s} />)}
    </div>
  )
}

function SubmissionItem({ submission }: { submission: ChallengeSubmission }) {
  const initials = submission.userDisplayName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-200 text-sm font-medium">{submission.userDisplayName}</span>
          <span className="text-zinc-600 text-xs">{formatTimeAgo(submission.createdAt)}</span>
        </div>
        {submission.note && (
          <p className="text-zinc-400 text-sm mt-1 leading-snug">{submission.note}</p>
        )}
        {submission.proofImageUrl && (
          <a
            href={submission.proofImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block w-fit"
          >
            <img
              src={submission.proofImageUrl}
              alt="Proof"
              className="rounded-lg max-h-48 max-w-full object-cover border border-zinc-700 hover:border-emerald-500/50 transition-colors"
            />
          </a>
        )}
      </div>
    </div>
  )
}

function SubmitActionModal({
  open, onClose, challenge, onSubmitted,
}: {
  open: boolean
  onClose: () => void
  challenge: Challenge
  onSubmitted: () => void
}) {
  const { user } = useAuth()
  const [note, setNote] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image must be under 10 MB')
      return
    }
    setImageError(null)
    setImageFile(file)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    setImageError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await submitChallengeAction(
        challenge.id,
        {
          challengeId: challenge.id,
          topicId: challenge.topicId,
          userId: user.uid,
          userDisplayName: user.displayName ?? 'Anonymous',
          note,
        },
        imageFile ?? undefined,
      )
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    onClose()
    setDone(false)
    setNote('')
    clearImage()
  }

  if (done) {
    return (
      <Modal open={open} onClose={() => { handleClose(); onSubmitted() }} title="Action Logged!">
        <div className="text-center py-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-zinc-200 font-medium text-sm mb-1">Thanks for taking action!</p>
          <p className="text-zinc-400 text-sm">Your submission is now visible to others.</p>
          <Button className="mt-4" onClick={() => { handleClose(); onSubmitted() }}>See submissions</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Log Your Action">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-emerald-400 text-xs font-medium uppercase tracking-wide mb-1">The challenge</p>
          <p className="text-zinc-300 text-sm">{challenge.actionPrompt}</p>
        </div>

        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">What did you do? (optional)</span>
          <textarea
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Share your experience..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </label>

        <div>
          <span className="block text-xs text-zinc-400 mb-1">Proof photo (optional)</span>
          {imagePreview ? (
            <div className="relative w-fit">
              <img
                src={imagePreview}
                alt="Preview"
                className="rounded-lg max-h-48 max-w-full object-cover border border-zinc-700"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-zinc-900/90 text-zinc-300 hover:text-white flex items-center justify-center text-xs border border-zinc-700"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors">
              <svg className="w-5 h-5 text-zinc-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-xs text-zinc-500">Click to upload image</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          )}
          {imageError && <p className="text-red-400 text-xs mt-1">{imageError}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (imageFile ? 'Uploading...' : 'Logging...') : 'Log Action'}
          </Button>
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
