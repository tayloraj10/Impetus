import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Group, CreateGroupInput } from '../types'
import { createFeedItem } from './feedService'
import { incrementTopicCount } from './topicsService'

function toGroup(id: string, data: any): Group {
  return {
    ...data,
    id,
    likes: data.likes ?? 0,
    flags: data.flags ?? 0,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  }
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
  const ref = await addDoc(collection(db, 'groups'), {
    ...input,
    links: input.links ?? {},
    imageUrl: input.imageUrl ?? null,
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

export async function setGroupModerationStatus(id: string, status: import('../types').ModerationStatus) {
  await updateDoc(doc(db, 'groups', id), { moderationStatus: status, updatedAt: serverTimestamp() })
}
