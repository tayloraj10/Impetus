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

export async function createFeedItem(data: Omit<FeedItem, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'feed'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}
