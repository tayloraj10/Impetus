import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '../config/firebase'

const WIPEABLE = ['feed', 'groups', 'resources', 'events', 'challenges', 'challenge_submissions', 'topic_suggestions', 'map_pins']

export async function wipeContentCollections(): Promise<void> {
  for (const col of WIPEABLE) {
    const snap = await getDocs(collection(db, col))
    const batches: ReturnType<typeof writeBatch>[] = []
    let current = writeBatch(db)
    let count = 0
    for (const d of snap.docs) {
      current.delete(doc(db, col, d.id))
      count++
      if (count === 500) {
        batches.push(current)
        current = writeBatch(db)
        count = 0
      }
    }
    if (count > 0) batches.push(current)
    await Promise.all(batches.map(b => b.commit()))
  }
}
