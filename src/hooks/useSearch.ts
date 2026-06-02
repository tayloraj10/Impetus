import { useState, useEffect } from 'react'
import {
  fetchSearchableTopics,
  fetchSearchableGroups,
  fetchSearchableResources,
  fetchSearchableEvents,
  fetchSearchableChallenges,
} from '../services/searchService'
import type { Topic, Group, Resource, ImpetusEvent, Challenge } from '../types'

export interface SearchResults {
  topics: Topic[]
  groups: Group[]
  resources: Resource[]
  events: ImpetusEvent[]
  challenges: Challenge[]
  total: number
}

function hit(text: string | undefined | null, q: string): boolean {
  return !!text && text.toLowerCase().includes(q)
}

function matchesTopic(t: Topic, q: string): boolean {
  return hit(t.title, q) || hit(t.description, q) || (t.tags ?? []).some(tag => hit(tag, q))
}

function matchesGroup(g: Group, q: string): boolean {
  return hit(g.name, q) || hit(g.description, q) ||
    hit(g.location?.city, q) || hit(g.location?.state, q) || hit(g.location?.country, q)
}

function matchesResource(r: Resource, q: string): boolean {
  return hit(r.title, q) || hit(r.description, q) ||
    hit(r.location?.city, q) || hit(r.location?.state, q) || hit(r.location?.country, q)
}

function matchesEvent(e: ImpetusEvent, q: string): boolean {
  return hit(e.title, q) || hit(e.description, q) ||
    hit(e.location?.city, q) || hit(e.location?.state, q) || hit(e.location?.country, q)
}

function matchesChallenge(c: Challenge, q: string): boolean {
  return hit(c.title, q) || hit(c.description, q) || hit(c.actionPrompt, q)
}

export function useSearch(queryStr: string) {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [topicById, setTopicById] = useState<Map<string, Topic>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = queryStr.trim()
    if (!trimmed) {
      setResults(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      fetchSearchableTopics(),
      fetchSearchableGroups(),
      fetchSearchableResources(),
      fetchSearchableEvents(),
      fetchSearchableChallenges(),
    ]).then(([allTopics, groups, resources, events, challenges]) => {
      if (cancelled) return
      const q = trimmed.toLowerCase()
      const map = new Map(allTopics.map(t => [t.id, t]))
      setTopicById(map)

      const filtered: SearchResults = {
        topics: allTopics.filter(t => matchesTopic(t, q)),
        groups: groups.filter(g => matchesGroup(g, q)),
        resources: resources.filter(r => matchesResource(r, q)),
        events: events.filter(e => matchesEvent(e, q)),
        challenges: challenges.filter(c => matchesChallenge(c, q)),
        total: 0,
      }
      filtered.total =
        filtered.topics.length +
        filtered.groups.length +
        filtered.resources.length +
        filtered.events.length +
        filtered.challenges.length

      setResults(filtered)
      setLoading(false)
    }).catch(err => {
      if (cancelled) return
      setError(err instanceof Error ? err.message : 'Search failed')
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [queryStr])

  return { results, topicById, loading, error }
}
