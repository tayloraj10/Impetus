import {
  collection, query, where, orderBy, onSnapshot, addDoc,
  serverTimestamp, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { ImpetusEvent, CreateEventInput } from '../types'
import { createFeedItem } from './feedService'
import { incrementTopicCount } from './topicsService'

export function subscribeEvents(topicId: string, callback: (events: ImpetusEvent[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'events'),
    where('topicId', '==', topicId),
    where('moderationStatus', '==', 'live'),
    orderBy('date', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as ImpetusEvent))
  })
}

export async function createEvent(
  input: CreateEventInput,
  userId: string,
  displayName: string,
  topicTitle: string,
  topicSlug: string,
): Promise<void> {
  const ref = await addDoc(collection(db, 'events'), {
    ...input,
    date: Timestamp.fromDate(input.date),
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    moderationStatus: 'pending_review',
    submittedBy: userId,
    submittedByDisplayName: displayName,
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
      description: input.description,
      url: input.externalUrl,
      likes: 0,
      submittedBy: userId,
      submittedByDisplayName: displayName,
    }),
    incrementTopicCount(input.topicId, 'eventCount'),
  ])
}
