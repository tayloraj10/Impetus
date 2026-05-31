import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

function readLiked(uid: string): Set<string> {
  try {
    const raw = localStorage.getItem(`impetus_liked_${uid}`)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function writeLiked(uid: string, liked: Set<string>) {
  try {
    localStorage.setItem(`impetus_liked_${uid}`, JSON.stringify([...liked]))
  } catch {}
}

export function useLiked(itemId: string) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (!user) { setLiked(false); return }
    setLiked(readLiked(user.uid).has(itemId))
  }, [user?.uid, itemId])

  const toggle = useCallback(async (likeAction: () => Promise<void>, unlikeAction: () => Promise<void>) => {
    if (!user) return
    const set = readLiked(user.uid)
    if (liked) {
      setLiked(false)
      set.delete(itemId)
      writeLiked(user.uid, set)
      await unlikeAction()
    } else {
      setLiked(true)
      set.add(itemId)
      writeLiked(user.uid, set)
      await likeAction()
    }
  }, [liked, user, itemId])

  return { liked, toggle, canLike: !!user }
}
