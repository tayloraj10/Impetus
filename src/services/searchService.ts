import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Topic, Group, Resource, ImpetusEvent, Challenge } from '../types'

const SEARCH_LIMIT = 200

function toDate(v: any): Date {
  return v?.toDate?.() ?? new Date()
}

export async function fetchSearchableTopics(): Promise<Topic[]> {
  const q = query(collection(db, 'topics'), where('status', '==', 'active'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      lastActivityAt: toDate(data.lastActivityAt),
    } as Topic
  })
}

export async function fetchSearchableGroups(): Promise<Group[]> {
  const q = query(
    collection(db, 'groups'),
    where('moderationStatus', '==', 'live'),
    orderBy('createdAt', 'desc'),
    limit(SEARCH_LIMIT),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as Group
  })
}

export async function fetchSearchableResources(): Promise<Resource[]> {
  const q = query(
    collection(db, 'resources'),
    where('moderationStatus', '==', 'live'),
    orderBy('createdAt', 'desc'),
    limit(SEARCH_LIMIT),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      createdAt: toDate(data.createdAt),
    } as Resource
  })
}

export async function fetchSearchableEvents(): Promise<ImpetusEvent[]> {
  const q = query(
    collection(db, 'events'),
    where('moderationStatus', '==', 'live'),
    orderBy('createdAt', 'desc'),
    limit(SEARCH_LIMIT),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      date: toDate(data.date),
      endDate: data.endDate ? toDate(data.endDate) : undefined,
      createdAt: toDate(data.createdAt),
    } as ImpetusEvent
  })
}

export async function fetchSearchableChallenges(): Promise<Challenge[]> {
  const q = query(
    collection(db, 'challenges'),
    where('moderationStatus', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(SEARCH_LIMIT),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      createdAt: toDate(data.createdAt),
      deadline: data.deadline ? toDate(data.deadline) : undefined,
    } as Challenge
  })
}
