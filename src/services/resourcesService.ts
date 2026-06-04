import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Resource, CreateResourceInput } from '../types'
import { createFeedItem, deleteFeedItemByRefId } from './feedService'
import { incrementTopicCount, decrementTopicCount } from './topicsService'
import { geocodeAddress, buildLocationQuery } from './geocodeService'

function toResource(id: string, data: any): Resource {
  return {
    ...data,
    id,
    notHelpful: data.notHelpful ?? 0,
    flags: data.flags ?? 0,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    removedAt: data.removedAt?.toDate(),
  }
}

export function subscribeResources(topicId: string, callback: (resources: Resource[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'resources'),
    where('topicId', '==', topicId),
    where('moderationStatus', '==', 'live'),
    orderBy('likes', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toResource(d.id, d.data())))
  })
}

export function subscribeAllResourcesGlobal(callback: (resources: Resource[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'resources'),
    where('moderationStatus', '==', 'live'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toResource(d.id, d.data())))
  })
}

export async function createResource(
  input: CreateResourceInput,
  userId: string,
  displayName: string,
  topicTitle: string,
  topicSlug: string,
): Promise<void> {
  const locationQuery = input.location ? buildLocationQuery(input.location) : ''
  const coordinates = locationQuery ? await geocodeAddress(locationQuery) : null

  const cleanInput = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined))
  const ref = await addDoc(collection(db, 'resources'), {
    ...cleanInput,
    ...(coordinates ? { coordinates } : {}),
    moderationStatus: 'pending_review',
    submittedBy: userId,
    submittedByDisplayName: displayName,
    likes: 0,
    notHelpful: 0,
    flags: 0,
    createdAt: serverTimestamp(),
  })

  await Promise.all([
    createFeedItem({
      type: 'resource',
      refId: ref.id,
      topicId: input.topicId,
      topicTitle,
      topicSlug,
      title: input.title,
      description: input.description,
      url: input.url,
      likes: 0,
      submittedBy: userId,
      submittedByDisplayName: displayName,
    }),
    incrementTopicCount(input.topicId, 'resourceCount'),
  ])
}

export async function likeResource(resourceId: string) {
  await updateDoc(doc(db, 'resources', resourceId), { likes: increment(1) })
}

export async function unlikeResource(resourceId: string) {
  await updateDoc(doc(db, 'resources', resourceId), { likes: increment(-1) })
}

export async function notHelpfulResource(resourceId: string) {
  await updateDoc(doc(db, 'resources', resourceId), { notHelpful: increment(1) })
}

export async function unNotHelpfulResource(resourceId: string) {
  await updateDoc(doc(db, 'resources', resourceId), { notHelpful: increment(-1) })
}

export async function flagResource(resourceId: string) {
  await updateDoc(doc(db, 'resources', resourceId), { flags: increment(1) })
}

export async function unflagResource(resourceId: string) {
  await updateDoc(doc(db, 'resources', resourceId), { flags: increment(-1) })
}

export function subscribePendingResources(callback: (resources: Resource[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'resources'),
    where('moderationStatus', '==', 'pending_review'),
  )
  return onSnapshot(q, (snap) => {
    const resources = snap.docs.map(d => toResource(d.id, d.data()))
    resources.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    callback(resources)
  }, (err) => {
    console.error('subscribePendingResources error:', err)
    callback([])
  })
}

export async function setResourceModerationStatus(id: string, status: import('../types').ModerationStatus, reason?: string) {
  await updateDoc(doc(db, 'resources', id), {
    moderationStatus: status,
    ...(reason !== undefined ? { moderationReason: reason } : {}),
  })
}

export async function softDeleteResource(id: string, removedBy: string, removedByDisplayName: string, reason?: string): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, 'resources', id), {
      moderationStatus: 'removed',
      removedBy,
      removedByDisplayName,
      removedAt: serverTimestamp(),
      ...(reason !== undefined ? { moderationReason: reason } : {}),
    }),
    deleteFeedItemByRefId(id),
  ])
}

export function subscribeRemovedResources(callback: (resources: Resource[]) => void): Unsubscribe {
  const q = query(collection(db, 'resources'), where('moderationStatus', '==', 'removed'))
  return onSnapshot(q, (snap) => {
    const resources = snap.docs.map(d => toResource(d.id, d.data()))
    resources.sort((a, b) => (b.removedAt?.getTime() ?? 0) - (a.removedAt?.getTime() ?? 0))
    callback(resources)
  }, (err) => { console.error('subscribeRemovedResources error:', err); callback([]) })
}

export async function restoreResource(id: string): Promise<void> {
  await updateDoc(doc(db, 'resources', id), {
    moderationStatus: 'live',
    removedBy: null,
    removedByDisplayName: null,
    removedAt: null,
    moderationReason: null,
  })
}

export async function deleteResource(id: string, topicId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'resources', id)),
    deleteFeedItemByRefId(id),
    decrementTopicCount(topicId, 'resourceCount'),
  ])
}

export async function updateResource(
  id: string,
  update: Partial<Pick<Resource, 'title' | 'url' | 'type' | 'typeOther' | 'description'>>,
): Promise<void> {
  await updateDoc(doc(db, 'resources', id), update)
}
