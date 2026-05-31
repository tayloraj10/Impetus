import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc,
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
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  }
}

export function subscribeGroups(topicId: string, callback: (groups: Group[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'groups'),
    where('topicId', '==', topicId),
    where('moderationStatus', '==', 'live'),
    orderBy('likes', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toGroup(d.id, d.data())))
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

export async function flagGroup(groupId: string) {
  await updateDoc(doc(db, 'groups', groupId), { flags: increment(1) })
}
