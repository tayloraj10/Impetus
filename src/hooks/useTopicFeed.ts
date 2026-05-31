import { useEffect, useState } from 'react'
import { subscribeTopicsByActivity } from '../services/topicsService'
import { subscribeRecentFeed } from '../services/feedService'
import type { Topic, FeedItem } from '../types'

export interface TopicFeedEntry {
  topic: Topic
  items: FeedItem[]
  totalCount: number
}

export function useTopicFeed() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [topicsReady, setTopicsReady] = useState(false)
  const [feedReady, setFeedReady] = useState(false)

  useEffect(() => {
    const unsubTopics = subscribeTopicsByActivity((data) => {
      setTopics(data)
      setTopicsReady(true)
    })
    const unsubFeed = subscribeRecentFeed((data) => {
      setFeedItems(data)
      setFeedReady(true)
    })
    return () => { unsubTopics(); unsubFeed() }
  }, [])

  return {
    topics,
    feedItems,
    loading: !topicsReady || !feedReady,
  }
}
