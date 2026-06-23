import {
  collection, doc, query, orderBy, where, onSnapshot,
  addDoc, updateDoc, runTransaction,
  serverTimestamp, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Definition, CreateDefinitionInput } from '../types'

function toDefinition(id: string, data: any): Definition {
  return {
    ...data,
    id,
    relatedTerms: data.relatedTerms ?? [],
    ratingSum: data.ratingSum ?? 0,
    ratingCount: data.ratingCount ?? 0,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  }
}

export function subscribeDefinitions(callback: (defs: Definition[]) => void): Unsubscribe {
  const q = query(collection(db, 'definitions'), orderBy('term', 'asc'))
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs
        .map(d => toDefinition(d.id, d.data()))
        .filter(d => d.status === 'live'),
    )
  }, (err) => {
    console.error('subscribeDefinitions error:', err)
    callback([])
  })
}

export function subscribeAllDefinitions(callback: (defs: Definition[]) => void): Unsubscribe {
  const q = query(collection(db, 'definitions'), orderBy('term', 'asc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toDefinition(d.id, d.data())))
  }, (err) => {
    console.error('subscribeAllDefinitions error:', err)
    callback([])
  })
}

export async function createDefinition(input: CreateDefinitionInput) {
  return addDoc(collection(db, 'definitions'), {
    term: input.term.trim(),
    definition: input.definition.trim(),
    extendedNote: input.extendedNote?.trim() || null,
    example: input.example?.trim() || null,
    category: input.category,
    categoryOther: input.category === 'other' ? (input.categoryOther?.trim() || null) : null,
    relatedTerms: input.relatedTerms ?? [],
    createdBy: input.createdBy,
    status: 'live',
    ratingSum: 0,
    ratingCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function suggestDefinition(input: CreateDefinitionInput) {
  return addDoc(collection(db, 'definitions'), {
    term: input.term.trim(),
    definition: input.definition.trim(),
    extendedNote: input.extendedNote?.trim() || null,
    example: input.example?.trim() || null,
    category: input.category,
    categoryOther: input.category === 'other' ? (input.categoryOther?.trim() || null) : null,
    relatedTerms: input.relatedTerms ?? [],
    createdBy: input.createdBy,
    createdByDisplayName: input.createdByDisplayName ?? null,
    status: 'pending_approval',
    ratingSum: 0,
    ratingCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function subscribePendingDefinitions(callback: (defs: Definition[]) => void): Unsubscribe {
  const q = query(collection(db, 'definitions'), where('status', '==', 'pending_approval'))
  return onSnapshot(q, (snap) => {
    const defs = snap.docs.map(d => toDefinition(d.id, d.data()))
    defs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    callback(defs)
  }, (err) => {
    console.error('subscribePendingDefinitions error:', err)
    callback([])
  })
}

export async function setDefinitionModerationStatus(id: string, status: 'live' | 'rejected', reason?: string) {
  await updateDoc(doc(db, 'definitions', id), {
    status,
    ...(reason !== undefined ? { moderationReason: reason } : {}),
    updatedAt: serverTimestamp(),
  })
}

export async function updateDefinition(
  id: string,
  data: Partial<Pick<Definition, 'term' | 'definition' | 'extendedNote' | 'example' | 'category' | 'categoryOther' | 'relatedTerms' | 'status'>>,
) {
  await updateDoc(doc(db, 'definitions', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export function subscribeUserRatings(
  userId: string,
  callback: (ratings: Record<string, number>) => void,
): Unsubscribe {
  const q = query(collection(db, 'definition_ratings'), where('userId', '==', userId))
  return onSnapshot(q, (snap) => {
    const ratings: Record<string, number> = {}
    snap.docs.forEach(d => {
      const data = d.data()
      ratings[data.definitionId as string] = data.rating as number
    })
    callback(ratings)
  }, (err) => {
    console.error('subscribeUserRatings error:', err)
    callback({})
  })
}

export async function rateDefinition(definitionId: string, userId: string, newRating: number): Promise<void> {
  const ratingRef = doc(db, 'definition_ratings', `${definitionId}_${userId}`)
  const defRef = doc(db, 'definitions', definitionId)

  await runTransaction(db, async (tx) => {
    const ratingSnap = await tx.get(ratingRef)
    const oldRating = ratingSnap.exists() ? (ratingSnap.data().rating as number) : null

    if (oldRating === newRating) return

    if (oldRating === null) {
      tx.set(ratingRef, {
        definitionId,
        userId,
        rating: newRating,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      tx.update(defRef, {
        ratingSum: increment(newRating),
        ratingCount: increment(1),
        updatedAt: serverTimestamp(),
      })
    } else {
      tx.update(ratingRef, { rating: newRating, updatedAt: serverTimestamp() })
      tx.update(defRef, {
        ratingSum: increment(newRating - oldRating),
        updatedAt: serverTimestamp(),
      })
    }
  })
}
