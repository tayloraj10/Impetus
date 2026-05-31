import {
  collection, doc, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, serverTimestamp, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Topic } from '../types'

export function subscribeTopics(callback: (topics: Topic[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'topics'),
    where('status', '==', 'active'),
    orderBy('activityScore', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Topic))
  })
}

export function subscribeTopic(slug: string, callback: (topic: Topic | null) => void): Unsubscribe {
  const q = query(collection(db, 'topics'), where('slug', '==', slug))
  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return }
    const d = snap.docs[0]
    callback({ id: d.id, ...d.data() } as Topic)
  })
}

export async function createTopic(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'activityScore' | 'groupCount' | 'resourceCount' | 'eventCount' | 'challengeCount'>) {
  return addDoc(collection(db, 'topics'), {
    ...data,
    activityScore: 0,
    groupCount: 0,
    resourceCount: 0,
    eventCount: 0,
    challengeCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  })
}

export async function incrementTopicCount(topicId: string, field: 'groupCount' | 'resourceCount' | 'eventCount' | 'challengeCount') {
  await updateDoc(doc(db, 'topics', topicId), {
    [field]: increment(1),
    activityScore: increment(5),
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function suggestTopic(title: string, description: string, userId: string, displayName: string) {
  return addDoc(collection(db, 'topic_suggestions'), {
    title,
    description,
    suggestedBy: userId,
    suggestedByDisplayName: displayName,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}
