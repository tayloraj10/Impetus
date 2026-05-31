import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

function readSet(uid: string, ns: string): Set<string> {
  try {
    const raw = localStorage.getItem(`impetus_${ns}_${uid}`)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function writeSet(uid: string, ns: string, set: Set<string>) {
  try {
    localStorage.setItem(`impetus_${ns}_${uid}`, JSON.stringify([...set]))
  } catch {}
}

export function useLiked(itemId: string, namespace = 'liked') {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (!user) { setLiked(false); return }
    setLiked(readSet(user.uid, namespace).has(itemId))
  }, [user?.uid, itemId, namespace])

  const toggle = useCallback(async (likeAction: () => Promise<void>, unlikeAction: () => Promise<void>) => {
    if (!user) return
    const set = readSet(user.uid, namespace)
    if (liked) {
      setLiked(false)
      set.delete(itemId)
      writeSet(user.uid, namespace, set)
      await unlikeAction()
    } else {
      setLiked(true)
      set.add(itemId)
      writeSet(user.uid, namespace, set)
      await likeAction()
    }
  }, [liked, user, itemId, namespace])

  return { liked, toggle, canLike: !!user }
}

export function useFlag(itemId: string) {
  const { user } = useAuth()
  const [flagged, setFlagged] = useState(false)

  useEffect(() => {
    if (!user) { setFlagged(false); return }
    setFlagged(readSet(user.uid, 'flagged').has(itemId))
  }, [user?.uid, itemId])

  const flag = useCallback(async (flagAction: () => Promise<void>) => {
    if (!user || flagged) return
    setFlagged(true)
    const set = readSet(user.uid, 'flagged')
    set.add(itemId)
    writeSet(user.uid, 'flagged', set)
    await flagAction()
  }, [flagged, user, itemId])

  const unflag = useCallback(async (unflagAction: () => Promise<void>) => {
    if (!user || !flagged) return
    setFlagged(false)
    const set = readSet(user.uid, 'flagged')
    set.delete(itemId)
    writeSet(user.uid, 'flagged', set)
    await unflagAction()
  }, [flagged, user, itemId])

  return { flagged, flag, unflag, canFlag: !!user }
}
