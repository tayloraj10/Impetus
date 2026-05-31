import {
  collection, query, orderBy, limit, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs,
  serverTimestamp, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { FeedItem } from '../types'

export function subscribeFeed(callback: (items: FeedItem[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'feed'),
    orderBy('createdAt', 'desc'),
    limit(60),
  )
  return onSnapshot(q, (snap) => {
    const raw = snap.docs.map(d => toFeedItem(d.id, d.data()))
    const scored = raw.map(item => ({ item, score: hotScore(item) }))
    scored.sort((a, b) => b.score - a.score)
    callback(scored.map(s => s.item))
  }, (err) => {
    console.error('subscribeFeed error:', err)
    callback([])
  })
}

function toFeedItem(id: string, data: any): FeedItem {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}

function hotScore(item: FeedItem): number {
  const ageHours = (Date.now() - item.createdAt.getTime()) / 3_600_000
  const recency = Math.max(0, 48 - ageHours) * 2
  return item.likes * 3 + recency
}

export function subscribeRecentFeed(callback: (items: FeedItem[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'feed'),
    orderBy('createdAt', 'desc'),
    limit(100),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toFeedItem(d.id, d.data())))
  }, (err) => {
    console.error('subscribeRecentFeed error:', err)
    callback([])
  })
}

export async function likeFeedItem(feedId: string) {
  await updateDoc(doc(db, 'feed', feedId), { likes: increment(1) })
}

export async function unlikeFeedItem(feedId: string) {
  await updateDoc(doc(db, 'feed', feedId), { likes: increment(-1) })
}

export async function createFeedItem(data: Omit<FeedItem, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'feed'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function deleteFeedItemByRefId(refId: string): Promise<void> {
  const q = query(collection(db, 'feed'), where('refId', '==', refId))
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}
