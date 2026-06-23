import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, getDoc, serverTimestamp, increment, deleteField,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Group, CreateGroupInput, ModerationStatus } from '../types'
import { createFeedItem, deleteFeedItemByRefId } from './feedService'
import { incrementTopicCount, decrementTopicCount } from './topicsService'
import { geocodeAddress, isGeocodeable } from './geocodeService'
import { assertEditable, nextEditStatus } from './moderationUtils'

function toGroup(id: string, data: any): Group {
  return {
    ...data,
    id,
    socialLinks: data.socialLinks ?? {},
    causeCategories: data.causeCategories ?? [],
    featured: data.featured ?? false,
    userIds: data.userIds ?? [],
    likes: data.likes ?? 0,
    flags: data.flags ?? 0,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
    removedAt: data.removedAt?.toDate(),
  }
}

export async function getGroup(id: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', id))
  if (!snap.exists()) return null
  return toGroup(snap.id, snap.data())
}

export function subscribeAllGroups(callback: (groups: Group[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'groups'),
    where('moderationStatus', 'in', ['live', 'pending_review']),
  )
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map(d => toGroup(d.id, d.data()))
    groups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    callback(groups)
  })
}

export function subscribeGroups(topicId: string, callback: (groups: Group[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'groups'),
    where('topicId', '==', topicId),
    where('moderationStatus', 'in', ['live', 'pending_review']),
  )
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map(d => toGroup(d.id, d.data()))
    groups.sort((a, b) => b.likes - a.likes)
    callback(groups)
  })
}

export async function createGroup(
  input: CreateGroupInput,
  userId: string,
  displayName: string,
  topicTitle: string,
  topicSlug: string,
): Promise<void> {
  const canGeocode = input.location && isGeocodeable(input.location)
  const geocoded = canGeocode ? await geocodeAddress(input.location!) : null
  const coordinates = geocoded ? { latitude: geocoded.lat, longitude: geocoded.lng } : null

  const cleanInput = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
  const ref = await addDoc(collection(db, 'groups'), {
    ...cleanInput,
    socialLinks: input.socialLinks ?? {},
    causeCategories: input.causeCategories ?? [],
    featured: false,
    userIds: [userId],
    imageUrl: input.imageUrl ?? null,
    ...(coordinates ? { coordinates } : {}),
    moderationStatus: 'pending_review',
    submittedBy: userId,
    submittedByDisplayName: displayName,
    likes: 0,
    flags: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await Promise.all([
    createFeedItem({
      type: 'group',
      refId: ref.id,
      topicId: input.topicId,
      topicTitle,
      topicSlug,
      title: input.name,
      description: input.description,
      likes: 0,
      submittedBy: userId,
      submittedByDisplayName: displayName,
    }),
    incrementTopicCount(input.topicId, 'groupCount'),
  ])
}

export async function likeGroup(groupId: string) {
  await updateDoc(doc(db, 'groups', groupId), { likes: increment(1) })
}

export async function unlikeGroup(groupId: string) {
  await updateDoc(doc(db, 'groups', groupId), { likes: increment(-1) })
}

export async function flagGroup(groupId: string) {
  await updateDoc(doc(db, 'groups', groupId), { flags: increment(1) })
}

export async function unflagGroup(groupId: string) {
  await updateDoc(doc(db, 'groups', groupId), { flags: increment(-1) })
}

export function subscribePendingGroups(callback: (groups: Group[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'groups'),
    where('moderationStatus', '==', 'pending_review'),
  )
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map(d => toGroup(d.id, d.data()))
    groups.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    callback(groups)
  }, (err) => {
    console.error('subscribePendingGroups error:', err)
    callback([])
  })
}

export async function setGroupModerationStatus(id: string, status: import('../types').ModerationStatus, reason?: string) {
  await updateDoc(doc(db, 'groups', id), {
    moderationStatus: status,
    ...(reason !== undefined ? { moderationReason: reason } : {}),
    updatedAt: serverTimestamp(),
  })
}

export async function softDeleteGroup(id: string, removedBy: string, removedByDisplayName: string, reason?: string): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, 'groups', id), {
      moderationStatus: 'removed',
      removedBy,
      removedByDisplayName,
      removedAt: serverTimestamp(),
      ...(reason !== undefined ? { moderationReason: reason } : {}),
      updatedAt: serverTimestamp(),
    }),
    deleteFeedItemByRefId(id),
  ])
}

export function subscribeRemovedGroups(callback: (groups: Group[]) => void): Unsubscribe {
  const q = query(collection(db, 'groups'), where('moderationStatus', '==', 'removed'))
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map(d => toGroup(d.id, d.data()))
    groups.sort((a, b) => (b.removedAt?.getTime() ?? 0) - (a.removedAt?.getTime() ?? 0))
    callback(groups)
  }, (err) => { console.error('subscribeRemovedGroups error:', err); callback([]) })
}

export async function restoreGroup(id: string): Promise<void> {
  await updateDoc(doc(db, 'groups', id), {
    moderationStatus: 'live',
    removedBy: null,
    removedByDisplayName: null,
    removedAt: null,
    moderationReason: null,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteGroup(id: string, topicId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'groups', id)),
    deleteFeedItemByRefId(id),
    decrementTopicCount(topicId, 'groupCount'),
  ])
}

export async function updateGroup(
  id: string,
  currentStatus: ModerationStatus,
  update: Partial<Pick<Group, 'name' | 'description' | 'category' | 'categoryOther' | 'location' | 'socialLinks'>> & { imageUrl?: string | null },
  actingAsModerator: boolean,
): Promise<void> {
  assertEditable(currentStatus, actingAsModerator)
  const { location, ...rest } = update
  const firestoreUpdate: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(rest)) {
    firestoreUpdate[k] = v === undefined ? deleteField() : v
  }
  if (location !== undefined) {
    const canGeocode = location && isGeocodeable(location)
    const geocoded = canGeocode ? await geocodeAddress(location) : null
    firestoreUpdate.location = location
    firestoreUpdate.coordinates = geocoded ? { latitude: geocoded.lat, longitude: geocoded.lng } : null
  }
  firestoreUpdate.moderationStatus = nextEditStatus(currentStatus, actingAsModerator)
  firestoreUpdate.updatedAt = serverTimestamp()
  await updateDoc(doc(db, 'groups', id), firestoreUpdate)
}
