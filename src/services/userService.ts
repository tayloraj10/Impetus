import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore'
import { deleteUser } from 'firebase/auth'
import { db, auth } from '../config/firebase'
import type { UserProfile, Group, Resource, ImpetusEvent, ChallengeSubmission } from '../types'
import { deleteGroup } from './groupsService'
import { deleteResource } from './resourcesService'
import { deleteEvent } from './eventsService'
import { deleteChallengeSubmission } from './challengesService'

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    ...(data as Omit<UserProfile, 'id' | 'createdAt'>),
    id: snap.id,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}

export interface UserContributions {
  groups: Group[]
  resources: Resource[]
  events: ImpetusEvent[]
  challengeSubmissions: ChallengeSubmission[]
}

export async function getUserContributions(uid: string): Promise<UserContributions> {
  const [groupsSnap, resourcesSnap, eventsSnap, submissionsSnap] = await Promise.all([
    getDocs(query(collection(db, 'groups'), where('submittedBy', '==', uid))),
    getDocs(query(collection(db, 'resources'), where('submittedBy', '==', uid))),
    getDocs(query(collection(db, 'events'), where('submittedBy', '==', uid))),
    getDocs(query(collection(db, 'challenge_submissions'), where('userId', '==', uid))),
  ])

  const groups: Group[] = groupsSnap.docs
    .map(d => {
      const data = d.data()
      return {
        ...data,
        id: d.id,
        likes: data.likes ?? 0,
        flags: data.flags ?? 0,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date(),
        removedAt: data.removedAt?.toDate(),
      } as Group
    })
    .filter(g => g.moderationStatus !== 'removed')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const resources: Resource[] = resourcesSnap.docs
    .map(d => {
      const data = d.data()
      return {
        ...data,
        id: d.id,
        likes: data.likes ?? 0,
        notHelpful: data.notHelpful ?? 0,
        flags: data.flags ?? 0,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        removedAt: data.removedAt?.toDate(),
      } as Resource
    })
    .filter(r => r.moderationStatus !== 'removed')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const events: ImpetusEvent[] = eventsSnap.docs
    .map(d => {
      const data = d.data()
      return {
        ...data,
        id: d.id,
        date: data.date?.toDate() ?? new Date(),
        endDate: data.endDate?.toDate(),
        interested: data.interested ?? 0,
        going: data.going ?? 0,
        flags: data.flags ?? 0,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        removedAt: data.removedAt?.toDate(),
      } as ImpetusEvent
    })
    .filter(e => e.moderationStatus !== 'removed')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const challengeSubmissions: ChallengeSubmission[] = submissionsSnap.docs
    .map(d => {
      const data = d.data()
      return {
        ...data,
        id: d.id,
        createdAt: data.createdAt?.toDate() ?? new Date(),
      } as ChallengeSubmission
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return { groups, resources, events, challengeSubmissions }
}

export async function deleteAllUserData(contributions: UserContributions): Promise<void> {
  await Promise.all([
    ...contributions.groups.map(g => deleteGroup(g.id, g.topicId)),
    ...contributions.resources.map(r => deleteResource(r.id, r.topicId)),
    ...contributions.events.map(e => deleteEvent(e.id, e.topicId)),
    ...contributions.challengeSubmissions.map(s => deleteChallengeSubmission(s.id, s.challengeId)),
  ])
}

export async function deleteUserAccount(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid))
  const currentUser = auth.currentUser
  if (currentUser) await deleteUser(currentUser)
}
