import { useEffect, useState } from 'react'
import { subscribeTopics, subscribeTopic } from '../services/topicsService'
import type { Topic } from '../types'

export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeTopics((data) => {
      setTopics(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { topics, loading }
}

export function useTopic(slug: string) {
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    const unsub = subscribeTopic(slug, (data) => {
      setTopic(data)
      setLoading(false)
    })
    return unsub
  }, [slug])

  return { topic, loading }
}
