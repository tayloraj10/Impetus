import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, increment, limit,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Challenge, ChallengeSubmission } from '../types'
import { createFeedItem, deleteFeedItemByRefId } from './feedService'
import { incrementTopicCount, decrementTopicCount } from './topicsService'
import { uploadImage, submissionImagePath } from './storageService'

function toChallenge(id: string, data: any): Challenge {
  return {
    ...data,
    id,
    deadline: data.deadline?.toDate(),
    upvotes: data.upvotes ?? 0,
    flags: data.flags ?? 0,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    removedAt: data.removedAt?.toDate(),
  }
}

function toSubmission(id: string, data: any): ChallengeSubmission {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  }
}

export function subscribeChallenges(topicId: string, callback: (challenges: Challenge[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'challenges'),
    where('topicId', '==', topicId),
    where('moderationStatus', 'in', ['active', 'ended']),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toChallenge(d.id, d.data())))
  })
}

export function subscribeChallengeSubmissions(challengeId: string, callback: (submissions: ChallengeSubmission[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'challenge_submissions'),
    where('challengeId', '==', challengeId),
    orderBy('createdAt', 'desc'),
    limit(50),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => toSubmission(d.id, d.data())))
  })
}

export async function createChallenge(
  data: Omit<Challenge, 'id' | 'createdAt' | 'participantCount' | 'upvotes' | 'flags'>,
  topicTitle: string,
  topicSlug: string,
): Promise<void> {
  const ref = await addDoc(collection(db, 'challenges'), {
    ...data,
    participantCount: 0,
    upvotes: 0,
    flags: 0,
    createdAt: serverTimestamp(),
  })

  await Promise.all([
    createFeedItem({
      type: 'challenge',
      refId: ref.id,
      topicId: data.topicId,
      topicTitle,
      topicSlug,
      title: data.title,
      description: data.description,
      likes: 0,
      submittedBy: data.createdBy,
    }),
    incrementTopicCount(data.topicId, 'challengeCount'),
  ])
}

export async function submitChallengeAction(
  challengeId: string,
  submission: Omit<ChallengeSubmission, 'id' | 'createdAt' | 'proofImageUrl'>,
  imageFile?: File,
): Promise<void> {
  let proofImageUrl: string | undefined
  if (imageFile) {
    proofImageUrl = await uploadImage(imageFile, submissionImagePath(challengeId, submission.userId, imageFile))
  }

  await Promise.all([
    addDoc(collection(db, 'challenge_submissions'), {
      ...submission,
      ...(proofImageUrl ? { proofImageUrl } : {}),
      createdAt: serverTimestamp(),
    }),
    updateDoc(doc(db, 'challenges', challengeId), {
      participantCount: increment(1),
    }),
  ])
}

export async function upvoteChallenge(challengeId: string) {
  await updateDoc(doc(db, 'challenges', challengeId), { upvotes: increment(1) })
}

export async function unupvoteChallenge(challengeId: string) {
  await updateDoc(doc(db, 'challenges', challengeId), { upvotes: increment(-1) })
}

export async function flagChallenge(challengeId: string) {
  await updateDoc(doc(db, 'challenges', challengeId), { flags: increment(1) })
}

export async function unflagChallenge(challengeId: string) {
  await updateDoc(doc(db, 'challenges', challengeId), { flags: increment(-1) })
}

export async function softDeleteChallenge(id: string, removedBy: string, removedByDisplayName: string, reason?: string): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, 'challenges', id), {
      moderationStatus: 'removed',
      removedBy,
      removedByDisplayName,
      removedAt: serverTimestamp(),
      ...(reason !== undefined ? { moderationReason: reason } : {}),
    }),
    deleteFeedItemByRefId(id),
  ])
}

export function subscribeRemovedChallenges(callback: (challenges: Challenge[]) => void): Unsubscribe {
  const q = query(collection(db, 'challenges'), where('moderationStatus', '==', 'removed'))
  return onSnapshot(q, (snap) => {
    const challenges = snap.docs.map(d => toChallenge(d.id, d.data()))
    challenges.sort((a, b) => (b.removedAt?.getTime() ?? 0) - (a.removedAt?.getTime() ?? 0))
    callback(challenges)
  }, (err) => { console.error('subscribeRemovedChallenges error:', err); callback([]) })
}

export async function restoreChallenge(id: string): Promise<void> {
  await updateDoc(doc(db, 'challenges', id), {
    moderationStatus: 'active',
    removedBy: null,
    removedByDisplayName: null,
    removedAt: null,
    moderationReason: null,
  })
}

export async function deleteChallenge(id: string, topicId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'challenges', id)),
    deleteFeedItemByRefId(id),
    decrementTopicCount(topicId, 'challengeCount'),
  ])
}

export async function deleteChallengeSubmission(submissionId: string, challengeId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, 'challenge_submissions', submissionId)),
    updateDoc(doc(db, 'challenges', challengeId), { participantCount: increment(-1) }),
  ])
}

export async function updateChallengeSubmission(submissionId: string, note: string | null): Promise<void> {
  await updateDoc(doc(db, 'challenge_submissions', submissionId), { note })
}
