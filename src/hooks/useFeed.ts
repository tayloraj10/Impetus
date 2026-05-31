import { useEffect, useState } from 'react'
import { subscribeFeed } from '../services/feedService'
import type { FeedItem } from '../types'

export function useFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeFeed((data) => {
      setItems(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { items, loading }
}
