import { useEffect, useState } from 'react'
import { subscribeTopics, subscribeTopic, subscribeAllTopics, subscribeChildTopics } from '../services/topicsService'
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

export function useAllTopics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeAllTopics((data) => {
      setTopics(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { topics, loading }
}

export function useChildTopics(parentTopicId: string) {
  const [topics, setTopics] = useState<Topic[]>([])

  useEffect(() => {
    const unsub = subscribeChildTopics(parentTopicId, setTopics)
    return unsub
  }, [parentTopicId])

  return { topics }
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
