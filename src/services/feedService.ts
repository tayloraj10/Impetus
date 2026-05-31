import {
  collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp,
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
    const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }) as FeedItem)
    // Client-side hot score: likes boost + recency
    const scored = raw.map(item => ({
      item,
      score: hotScore(item),
    }))
    scored.sort((a, b) => b.score - a.score)
    callback(scored.map(s => s.item))
  })
}

function hotScore(item: FeedItem): number {
  const ageHours = item.createdAt
    ? (Date.now() - (item.createdAt as any).toMillis()) / 3_600_000
    : 999
  const recency = Math.max(0, 48 - ageHours) * 2
  return item.likes * 3 + recency
}

export async function createFeedItem(data: Omit<FeedItem, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'feed'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}
