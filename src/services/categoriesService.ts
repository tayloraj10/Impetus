import {
  collection, onSnapshot, setDoc, deleteDoc, doc, getDocs, query, orderBy,
  serverTimestamp, type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Category } from '../types'

function labelToId(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toCategory(id: string, data: any): Category {
  return { id, label: data.label, createdAt: data.createdAt?.toDate() ?? new Date() }
}

export function subscribeCategories(callback: (cats: Category[]) => void): Unsubscribe {
  const q = query(collection(db, 'categories'), orderBy('label'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toCategory(d.id, d.data())))
  })
}

export async function addCategory(label: string): Promise<void> {
  const trimmed = label.trim()
  if (!trimmed) return
  const id = labelToId(trimmed)
  await setDoc(doc(db, 'categories', id), {
    label: trimmed,
    createdAt: serverTimestamp(),
  })
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id))
}

const DEFAULT_CATEGORIES = [
  // Organization types — used to classify groups
  'Nonprofit',
  'Grassroots / Community',
  'Government Agency',
  'Corporate / Business',
  'Faith-based',
  'Online Community',
  'University / Research',
  // Issue areas — used to classify topics
  'Agriculture & Food',
  'Community & Sustainability',
  'Consumer Rights',
  'Environment',
  'Social Justice',
  'Technology & Ethics',
  // General
  'Other',
]

export async function seedDefaultCategories(): Promise<void> {
  const snap = await getDocs(collection(db, 'categories'))
  if (!snap.empty) return
  await Promise.all(DEFAULT_CATEGORIES.map(label => addCategory(label)))
}
