import {
  collection, doc, query, where, orderBy, limit, onSnapshot,
  addDoc, updateDoc, serverTimestamp, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Topic } from '../types'

function toTopic(id: string, data: any): Topic {
  return {
    ...data,
    id,
    mapPinCount: data.mapPinCount ?? 0,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
    lastActivityAt: data.lastActivityAt?.toDate() ?? new Date(),
  }
}

export function subscribeTopicsByActivity(callback: (topics: Topic[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'topics'),
    where('status', '==', 'active'),
    orderBy('lastActivityAt', 'desc'),
    limit(30),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toTopic(d.id, d.data())))
  }, (err) => {
    console.error('subscribeTopicsByActivity error:', err)
    callback([])
  })
}

export function subscribeTopics(callback: (topics: Topic[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'topics'),
    where('status', '==', 'active'),
    orderBy('activityScore', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toTopic(d.id, d.data())))
  }, (err) => {
    console.error('subscribeTopics error:', err)
    callback([])
  })
}

export function subscribeTopic(slug: string, callback: (topic: Topic | null) => void): Unsubscribe {
  const q = query(collection(db, 'topics'), where('slug', '==', slug))
  return onSnapshot(q, (snap) => {
    if (snap.empty) { callback(null); return }
    const d = snap.docs[0]
    callback(toTopic(d.id, d.data()))
  })
}

export async function createTopic(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'activityScore' | 'groupCount' | 'resourceCount' | 'eventCount' | 'challengeCount' | 'mapPinCount'>) {
  return addDoc(collection(db, 'topics'), {
    ...data,
    activityScore: 0,
    groupCount: 0,
    resourceCount: 0,
    eventCount: 0,
    challengeCount: 0,
    mapPinCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  })
}

export async function incrementTopicCount(topicId: string, field: 'groupCount' | 'resourceCount' | 'eventCount' | 'challengeCount' | 'mapPinCount') {
  await updateDoc(doc(db, 'topics', topicId), {
    [field]: increment(1),
    activityScore: increment(5),
    lastActivityAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function decrementTopicCount(topicId: string, field: 'groupCount' | 'resourceCount' | 'eventCount' | 'challengeCount' | 'mapPinCount') {
  await updateDoc(doc(db, 'topics', topicId), {
    [field]: increment(-1),
    updatedAt: serverTimestamp(),
  })
}

export function subscribeChildTopics(parentTopicId: string, callback: (topics: Topic[]) => void): Unsubscribe {
  if (!parentTopicId) {
    callback([])
    return () => {}
  }
  const q = query(
    collection(db, 'topics'),
    where('parentTopicId', '==', parentTopicId),
  )
  return onSnapshot(q, (snap) => {
    const topics = snap.docs
      .map(d => toTopic(d.id, d.data()))
      .filter(t => t.status === 'active')
      .sort((a, b) => b.activityScore - a.activityScore)
    callback(topics)
  }, (err) => {
    console.error('subscribeChildTopics error:', err)
    callback([])
  })
}

export function subscribeAllTopics(callback: (topics: Topic[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'topics'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toTopic(d.id, d.data())))
  }, (err) => {
    console.error('subscribeAllTopics error:', err)
    callback([])
  })
}

export async function updateTopic(id: string, data: Partial<Omit<Topic, 'id' | 'createdAt'>>) {
  await updateDoc(doc(db, 'topics', id), {
    ...data,
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
