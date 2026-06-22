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
  return {
    id,
    label: data.label,
    kind: data.kind ?? 'group',
    status: data.status ?? 'approved',
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}

export function subscribeCategories(callback: (cats: Category[]) => void, kind: string = 'group'): Unsubscribe {
  const q = query(collection(db, 'categories'), orderBy('label'))
  return onSnapshot(q, (snap) => {
    const cats = snap.docs
      .map(d => toCategory(d.id, d.data()))
      .filter(c => (c.kind ?? 'group') === kind)
    callback(cats)
  })
}

export async function addCategory(label: string, kind: string = 'group'): Promise<void> {
  const trimmed = label.trim()
  if (!trimmed) return
  const id = `${kind}__${labelToId(trimmed)}`
  await setDoc(doc(db, 'categories', id), {
    label: trimmed,
    kind,
    status: 'approved',
    createdAt: serverTimestamp(),
  })
}

export async function rejectCategorySuggestion(label: string, kind: string = 'group'): Promise<void> {
  const trimmed = label.trim()
  if (!trimmed) return
  const id = `${kind}__${labelToId(trimmed)}`
  await setDoc(doc(db, 'categories', id), {
    label: trimmed,
    kind,
    status: 'rejected',
    createdAt: serverTimestamp(),
  })
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id))
}

export function isApproved(categories: Category[], label: string): boolean {
  const trimmed = label.trim().toLowerCase()
  return categories.some(c => (c.status ?? 'approved') === 'approved' && c.label.trim().toLowerCase() === trimmed)
}

export function isRejected(categories: Category[], label: string): boolean {
  const trimmed = label.trim().toLowerCase()
  return categories.some(c => c.status === 'rejected' && c.label.trim().toLowerCase() === trimmed)
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
