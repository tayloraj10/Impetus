import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, increment, limit,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Challenge, ChallengeSubmission } from '../types'
import { createFeedItem } from './feedService'
import { incrementTopicCount } from './topicsService'
import { uploadImage, submissionImagePath } from './storageService'

function toChallenge(id: string, data: any): Challenge {
  return {
    ...data,
    id,
    deadline: data.deadline?.toDate(),
    upvotes: data.upvotes ?? 0,
    flags: data.flags ?? 0,
    createdAt: data.createdAt?.toDate() ?? new Date(),
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
