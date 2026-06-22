import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, increment, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { ImpetusEvent, CreateEventInput } from '../types'
import { createFeedItem, deleteFeedItemByRefId } from './feedService'
import { incrementTopicCount, decrementTopicCount } from './topicsService'

function toEvent(id: string, data: any): ImpetusEvent {
  return {
    ...data,
    id,
    date: data.date?.toDate() ?? new Date(),
    endDate: data.endDate?.toDate(),
    interested: data.interested ?? 0,
    going: data.going ?? 0,
    flags: data.flags ?? 0,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    removedAt: data.removedAt?.toDate(),
  }
}

export function subscribeAllEventsGlobal(callback: (events: ImpetusEvent[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'events'),
    where('moderationStatus', 'in', ['live', 'pending_review']),
  )
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map(d => toEvent(d.id, d.data()))
    events.sort((a, b) => a.date.getTime() - b.date.getTime())
    callback(events)
  })
}

export function subscribeEvents(topicId: string, callback: (events: ImpetusEvent[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'events'),
    where('topicId', '==', topicId),
    where('moderationStatus', 'in', ['live', 'pending_review']),
    orderBy('date', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toEvent(d.id, d.data())))
  })
}

export async function createEvent(
  input: CreateEventInput,
  userId: string,
  displayName: string,
  topicTitle: string,
  topicSlug: string,
): Promise<void> {
  const cleanInput = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
  const ref = await addDoc(collection(db, 'events'), {
    ...cleanInput,
    date: Timestamp.fromDate(input.date),
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    moderationStatus: 'pending_review',
    submittedBy: userId,
    submittedByDisplayName: displayName,
    interested: 0,
    going: 0,
    flags: 0,
    createdAt: serverTimestamp(),
  })

  await Promise.all([
    createFeedItem({
      type: 'event',
      refId: ref.id,
      topicId: input.topicId,
      topicTitle,
      topicSlug,
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      ...(input.externalUrl ? { url: input.externalUrl } : {}),
      likes: 0,
      submittedBy: userId,
      submittedByDisplayName: displayName,
    }),
    incrementTopicCount(input.topicId, 'eventCount'),
  ])
}

export async function interestedEvent(eventId: string) {
  await updateDoc(doc(db, 'events', eventId), { interested: increment(1) })
}

export async function uninterestedEvent(eventId: string) {
  await updateDoc(doc(db, 'events', eventId), { interested: increment(-1) })
}

export async function goingEvent(eventId: string) {
  await updateDoc(doc(db, 'events', eventId), { going: increment(1) })
}

export async function ungoingEvent(eventId: string) {
  await updateDoc(doc(db, 'events', eventId), { going: increment(-1) })
}

export async function flagEvent(eventId: string) {
  await updateDoc(doc(db, 'events', eventId), { flags: increment(1) })
}

export async function unflagEvent(eventId: string) {
  await updateDoc(doc(db, 'events', eventId), { flags: increment(-1) })
}

export function subscribePendingEvents(callback: (events: ImpetusEvent[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'events'),
    where('moderationStatus', '==', 'pending_review'),
  )
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map(d => toEvent(d.id, d.data()))
    events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    callback(events)
  }, (err) => {
    console.error('subscribePendingEvents error:', err)
    callback([])
  })
}

export async function setEventModerationStatus(id: string, status: import('../types').ModerationStatus, reason?: string) {
  await updateDoc(doc(db, 'events', id), {
    moderationStatus: status,
    ...(reason !== undefined ? { moderationReason: reason } : {}),
  })
}

export async function softDeleteEvent(id: string, removedBy: string, removedByDisplayName: string, reason?: string): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, 'events', id), {
      moderationStatus: 'removed',
      removedBy,
      removedByDisplayName,
      removedAt: serverTimestamp(),
      ...(reason !== undefined ? { moderationReason: reason } : {}),
    }),
    deleteFeedItemByRefId(id),
  ])
}

export function subscribeRemovedEvents(callback: (events: ImpetusEvent[]) => void): Unsubscribe {
  const q = query(collection(db, 'events'), where('moderationStatus', '==', 'removed'))
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map(d => toEvent(d.id, d.data()))
    events.sort((a, b) => (b.removedAt?.getTime() ?? 0) - (a.removedAt?.getTime() ?? 0))
    callback(events)
  }, (err) => { console.error('subscribeRemovedEvents error:', err); callback([]) })
}

export async function restoreEvent(id: string): Promise<void> {
  await updateDoc(doc(db, 'events', id), {
    moderationStatus: 'live',
    removedBy: null,
    removedByDisplayName: null,
    removedAt: null,
    moderationReason: null,
  })
}

export async function deleteEvent(id: string, topicId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'events', id)),
    deleteFeedItemByRefId(id),
    decrementTopicCount(topicId, 'eventCount'),
  ])
}

export async function updateEvent(
  id: string,
  update: Partial<Pick<ImpetusEvent, 'title' | 'description' | 'externalUrl' | 'isVirtual' | 'location' | 'date' | 'endDate'>>,
): Promise<void> {
  const { date, endDate, ...rest } = update
  const firestoreUpdate: Record<string, unknown> = { ...rest }
  if (date) firestoreUpdate.date = Timestamp.fromDate(date)
  if (endDate !== undefined) firestoreUpdate.endDate = endDate ? Timestamp.fromDate(endDate) : null
  await updateDoc(doc(db, 'events', id), firestoreUpdate)
}
