import React, { useEffect, useState } from 'react'
import type { ImpetusEvent, CreateEventInput, Topic } from '../../types'
import {
  subscribeEvents, createEvent,
  interestedEvent, uninterestedEvent,
  goingEvent, ungoingEvent,
  flagEvent, unflagEvent,
} from '../../services/eventsService'
import { useAuth } from '../../hooks/useAuth'
import { useLiked, useFlag } from '../../hooks/useLiked'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { FlagButton } from '../ui/FlagButton'
import { Tooltip } from '../ui/Tooltip'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

export function EventsComponent({ topic }: { topic: Topic }) {
  const [events, setEvents] = useState<ImpetusEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const { user: _user } = useAuth()

  useEffect(() => {
    const unsub = subscribeEvents(topic.id, (data) => {
      setEvents(data)
      setLoading(false)
    })
    return unsub
  }, [topic.id])

  const now = Date.now()
  const upcoming = events.filter(e => e.date.getTime() >= now)
  const past = events.filter(e => e.date.getTime() < now)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">{upcoming.length} upcoming · {past.length} past</p>
        <Button size="sm" onClick={() => setModalOpen(true)}>+ Add Event</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : events.length === 0 ? (
        <EmptyState onAdd={() => setModalOpen(true)} />
      ) : (
        <div className="space-y-2">
          {upcoming.map(e => <EventCard key={e.id} event={e} />)}
          {past.length > 0 && (
            <>
              <p className="text-zinc-600 text-xs pt-2 pb-1 uppercase tracking-wider">Past Events</p>
              {past.map(e => <EventCard key={e.id} event={e} past />)}
            </>
          )}
        </div>
      )}

      <AddEventModal open={modalOpen} onClose={() => setModalOpen(false)} topic={topic} />
    </div>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
    </svg>
  )
}

function CheckCircleIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8" />
      <path d="m7 10 2 2 4-4" />
    </svg>
  )
}

function EventCard({ event, past = false }: { event: ImpetusEvent; past?: boolean }) {
  const interested = useLiked(event.id, 'interested')
  const going = useLiked(event.id, 'going')
  const { flagged, flag, unflag, canFlag } = useFlag(event.id)

  return (
    <div className={`border rounded-xl p-4 transition-colors ${
      past ? 'bg-zinc-900/50 border-zinc-800/50 opacity-60' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="flex items-start gap-4">
        <div className="text-center shrink-0 w-12">
          <div className="text-emerald-400 font-bold text-lg leading-none">
            {event.date.getDate()}
          </div>
          <div className="text-zinc-500 text-xs uppercase">
            {event.date.toLocaleString('en-US', { month: 'short' })}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {event.isVirtual && <Badge variant="blue" size="sm">Virtual</Badge>}
            {event.location && <Badge variant="default" size="sm">{event.location}</Badge>}
          </div>
          <a
            href={event.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-100 font-medium text-sm hover:text-emerald-400 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            {event.title} ↗
          </a>
          {event.description && (
            <p className="text-zinc-400 text-sm mt-1 leading-relaxed line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>

      {!past && (
        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-zinc-800/70">
          <Tooltip text={interested.liked ? 'Remove interest' : interested.canLike ? 'Mark as interested' : 'Sign in'}>
            <button
              onClick={e => { e.preventDefault(); interested.toggle(() => interestedEvent(event.id), () => uninterestedEvent(event.id)) }}
              className={`flex items-center gap-1.5 text-xs transition-colors select-none cursor-pointer ${
                interested.liked
                  ? 'text-amber-400'
                  : interested.canLike
                  ? 'text-zinc-500 hover:text-amber-400'
                  : 'text-zinc-600 cursor-default'
              }`}
            >
              <StarIcon filled={interested.liked} />
              <span>{event.interested}</span>
              <span className="text-zinc-600 ml-0.5">Interested</span>
            </button>
          </Tooltip>

          <Tooltip text={going.liked ? 'Remove RSVP' : going.canLike ? 'Mark as going' : 'Sign in'}>
            <button
              onClick={e => { e.preventDefault(); going.toggle(() => goingEvent(event.id), () => ungoingEvent(event.id)) }}
              className={`flex items-center gap-1.5 text-xs transition-colors select-none cursor-pointer ${
                going.liked
                  ? 'text-emerald-400'
                  : going.canLike
                  ? 'text-zinc-500 hover:text-emerald-400'
                  : 'text-zinc-600 cursor-default'
              }`}
            >
              <CheckCircleIcon filled={going.liked} />
              <span>{event.going}</span>
              <span className="text-zinc-600 ml-0.5">Going</span>
            </button>
          </Tooltip>

          <div className="flex-1" />
          <FlagButton
            flagged={flagged}
            onFlag={() => flag(() => flagEvent(event.id))}
            onUnflag={() => unflag(() => unflagEvent(event.id))}
            canFlag={canFlag}
          />
        </div>
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
      <p className="text-zinc-500 text-sm mb-3">No events found. Know of one?</p>
      <Button variant="secondary" size="sm" onClick={onAdd}>Add an event</Button>
    </div>
  )
}

function AddEventModal({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: Topic }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [isVirtual, setIsVirtual] = useState(false)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !date) return
    setSubmitting(true)
    try {
      const input: CreateEventInput = {
        topicId: topic.id,
        title,
        date: new Date(date),
        location: location || undefined,
        isVirtual,
        externalUrl: url,
        description: description || undefined,
      }
      await createEvent(input, user.uid, user.displayName ?? 'Anonymous', topic.title, topic.slug)
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'

  if (done) {
    return (
      <Modal open={open} onClose={() => { onClose(); setDone(false) }} title="Event Submitted">
        <div className="text-center py-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3"><span className="text-emerald-400 text-sm font-bold">✓</span></div>
          <p className="text-zinc-300 text-sm">Submitted for review.</p>
          <Button className="mt-4" onClick={() => { onClose(); setDone(false) }}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Add an Event">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Event Name *</span>
          <input required value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Annual River Cleanup" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Date *</span>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Location</span>
            <input value={location} onChange={e => setLocation(e.target.value)} className={inputClass} placeholder="Boston, MA" disabled={isVirtual} />
          </label>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isVirtual} onChange={e => setIsVirtual(e.target.checked)} className="accent-emerald-500" />
          <span className="text-sm text-zinc-300">Virtual event</span>
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Event URL *</span>
          <input required type="url" value={url} onChange={e => setUrl(e.target.value)} className={inputClass} placeholder="https://..." />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Description</span>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className={`${inputClass} resize-none`} placeholder="Brief description..." />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Event'}</Button>
        </div>
      </form>
    </Modal>
  )
}
