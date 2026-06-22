import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { MapPin, CreateMapPinInput, ModerationStatus } from '../types'
import { createFeedItem, deleteFeedItemByRefId } from './feedService'
import { incrementTopicCount, decrementTopicCount } from './topicsService'

function toMapPin(id: string, data: any): MapPin {
  return {
    ...data,
    id,
    likes: data.likes ?? 0,
    flags: data.flags ?? 0,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    removedAt: data.removedAt?.toDate(),
  }
}

export function subscribeMapPins(topicId: string, callback: (pins: MapPin[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'map_pins'),
    where('topicId', '==', topicId),
    where('moderationStatus', 'in', ['live', 'pending_review']),
  )
  return onSnapshot(q, (snap) => {
    const pins = snap.docs.map(d => toMapPin(d.id, d.data()))
    pins.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    callback(pins)
  })
}

export async function createMapPin(
  input: CreateMapPinInput,
  userId: string,
  displayName: string,
  topicTitle: string,
  topicSlug: string,
  autoApprove = false,
): Promise<void> {
  const ref = await addDoc(collection(db, 'map_pins'), {
    ...input,
    description: input.description ?? null,
    location: input.location ?? null,
    url: input.url ?? null,
    type: input.type ?? null,
    moderationStatus: autoApprove ? 'live' : 'pending_review',
    submittedBy: userId,
    submittedByDisplayName: displayName,
    likes: 0,
    flags: 0,
    createdAt: serverTimestamp(),
  })

  await Promise.all([
    createFeedItem({
      type: 'map_pin',
      refId: ref.id,
      topicId: input.topicId,
      topicTitle,
      topicSlug,
      title: input.name,
      ...(input.description ? { description: input.description } : {}),
      likes: 0,
      submittedBy: userId,
      submittedByDisplayName: displayName,
    }),
    incrementTopicCount(input.topicId, 'mapPinCount'),
  ])
}

export async function likeMapPin(id: string) {
  await updateDoc(doc(db, 'map_pins', id), { likes: increment(1) })
}

export async function unlikeMapPin(id: string) {
  await updateDoc(doc(db, 'map_pins', id), { likes: increment(-1) })
}

export async function flagMapPin(id: string) {
  await updateDoc(doc(db, 'map_pins', id), { flags: increment(1) })
}

export async function unflagMapPin(id: string) {
  await updateDoc(doc(db, 'map_pins', id), { flags: increment(-1) })
}

export function subscribePendingMapPins(callback: (pins: MapPin[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'map_pins'),
    where('moderationStatus', '==', 'pending_review'),
  )
  return onSnapshot(q, (snap) => {
    const pins = snap.docs.map(d => toMapPin(d.id, d.data()))
    pins.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    callback(pins)
  }, (err) => {
    console.error('subscribePendingMapPins error:', err)
    callback([])
  })
}

export async function setMapPinModerationStatus(id: string, status: ModerationStatus, reason?: string) {
  await updateDoc(doc(db, 'map_pins', id), {
    moderationStatus: status,
    ...(reason !== undefined ? { moderationReason: reason } : {}),
  })
}

export async function softDeleteMapPin(id: string, removedBy: string, removedByDisplayName: string, reason?: string): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, 'map_pins', id), {
      moderationStatus: 'removed',
      removedBy,
      removedByDisplayName,
      removedAt: serverTimestamp(),
      ...(reason !== undefined ? { moderationReason: reason } : {}),
    }),
    deleteFeedItemByRefId(id),
  ])
}

export function subscribeRemovedMapPins(callback: (pins: MapPin[]) => void): Unsubscribe {
  const q = query(collection(db, 'map_pins'), where('moderationStatus', '==', 'removed'))
  return onSnapshot(q, (snap) => {
    const pins = snap.docs.map(d => toMapPin(d.id, d.data()))
    pins.sort((a, b) => (b.removedAt?.getTime() ?? 0) - (a.removedAt?.getTime() ?? 0))
    callback(pins)
  }, (err) => { console.error('subscribeRemovedMapPins error:', err); callback([]) })
}

export async function restoreMapPin(id: string): Promise<void> {
  await updateDoc(doc(db, 'map_pins', id), {
    moderationStatus: 'live',
    removedBy: null,
    removedByDisplayName: null,
    removedAt: null,
    moderationReason: null,
  })
}

export async function deleteMapPin(id: string, topicId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'map_pins', id)),
    deleteFeedItemByRefId(id),
    decrementTopicCount(topicId, 'mapPinCount'),
  ])
}
