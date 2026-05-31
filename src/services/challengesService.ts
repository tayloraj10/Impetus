import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Challenge, ChallengeSubmission } from '../types'
import { createFeedItem } from './feedService'
import { incrementTopicCount } from './topicsService'

export function subscribeChallenges(topicId: string, callback: (challenges: Challenge[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'challenges'),
    where('topicId', '==', topicId),
    where('moderationStatus', 'in', ['active', 'ended']),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Challenge))
  })
}

export async function createChallenge(
  data: Omit<Challenge, 'id' | 'createdAt' | 'participantCount'>,
  topicTitle: string,
  topicSlug: string,
): Promise<void> {
  const ref = await addDoc(collection(db, 'challenges'), {
    ...data,
    participantCount: 0,
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
  submission: Omit<ChallengeSubmission, 'id' | 'createdAt'>,
): Promise<void> {
  await Promise.all([
    addDoc(collection(db, 'challenge_submissions'), {
      ...submission,
      createdAt: serverTimestamp(),
    }),
    updateDoc(doc(db, 'challenges', challengeId), {
      participantCount: increment(1),
    }),
  ])
}
