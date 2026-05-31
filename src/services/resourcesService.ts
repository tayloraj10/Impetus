import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Resource, CreateResourceInput } from '../types'
import { createFeedItem } from './feedService'
import { incrementTopicCount } from './topicsService'

function toResource(id: string, data: any): Resource {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate() ?? new Date(),
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

export async function createResource(
  input: CreateResourceInput,
  userId: string,
  displayName: string,
  topicTitle: string,
  topicSlug: string,
): Promise<void> {
  const ref = await addDoc(collection(db, 'resources'), {
    ...input,
    moderationStatus: 'pending_review',
    submittedBy: userId,
    submittedByDisplayName: displayName,
    likes: 0,
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

export async function flagResource(resourceId: string) {
  await updateDoc(doc(db, 'resources', resourceId), { flags: increment(1) })
}
