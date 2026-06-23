import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useTopic, useChildTopics } from '../hooks/useTopics'
import { GroupsComponent } from '../components/topic-components/GroupsComponent'
import { ResourcesComponent } from '../components/topic-components/ResourcesComponent'
import { EventsComponent } from '../components/topic-components/EventsComponent'
import { ChallengesComponent } from '../components/topic-components/ChallengesComponent'
import { MapsComponent } from '../components/topic-components/MapsComponent'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import type { ComponentType, Topic } from '../types'

const componentLabels: Record<ComponentType, string> = {
  groups: 'Groups',
  resources: 'Resources',
  events: 'Events',
  challenges: 'Challenges',
  maps: 'Map',
}

export function TopicPage() {
  const { slug } = useParams<{ slug: string }>()
  const { topic, loading } = useTopic(slug ?? '')
  const { topics: childTopics } = useChildTopics(topic?.id ?? '')
  const [activeTab, setActiveTab] = useState<ComponentType | null>(null)

  if (loading) {
    return (
      <div className="flex justify-center py-24"><Spinner size="lg" /></div>
    )
  }

  if (!topic) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 text-lg mb-4">Topic not found.</p>
        <Link to="/topics" className="text-emerald-400 hover:text-emerald-300 transition-colors">← Back to Topics</Link>
      </div>
    )
  }

  const currentTab = activeTab ?? topic.enabledComponents[0]
  const hasTabs = topic.enabledComponents.length > 0
  const hasChildren = childTopics.length > 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {topic.parentTopicId ? (
        <Link to={`/topic/${topic.parentTopicSlug}`} className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors mb-6 inline-flex items-center gap-1">
          ← {topic.parentTopicTitle}
        </Link>
      ) : (
        <Link to="/topics" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors mb-6 inline-flex items-center gap-1">
          ← Topics
        </Link>
      )}

      <TopicHeader topic={topic} />

      <StatsBar topic={topic} />

      {hasChildren && <SubTopicsSection childTopics={childTopics} />}

      {hasTabs && (
        <div className="mt-6">
          <div className="flex gap-0.5 border-b border-zinc-800 mb-6 overflow-x-auto">
            {topic.enabledComponents.map(comp => (
              <button
                key={comp}
                onClick={() => setActiveTab(comp)}
                className={`px-4 py-2.5 text-sm font-medium transition-all cursor-pointer -mb-px border-b-2 rounded-t-md whitespace-nowrap ${
                  currentTab === comp
                    ? 'text-emerald-400 border-emerald-400 bg-emerald-500/5'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {componentLabels[comp]}
              </button>
            ))}
          </div>

          <ComponentRenderer topic={topic} activeTab={currentTab} />
        </div>
      )}
    </div>
  )
}

function SubTopicsSection({ childTopics }: { childTopics: Topic[] }) {
  return (
    <div className="mt-8 mb-2">
      <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
        Sub-Topics ({childTopics.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {childTopics.map(child => (
          <Link
            key={child.id}
            to={`/topic/${child.slug}`}
            className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors"
          >
            <h3 className="text-zinc-100 font-semibold text-sm mb-1.5 group-hover:text-emerald-400 transition-colors">
              {child.title}
            </h3>
            <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 mb-3">
              {child.description}
            </p>
            <div className="flex flex-wrap gap-3">
              {child.groupCount > 0 && (
                <span className="text-zinc-600 text-xs">{child.groupCount} groups</span>
              )}
              {child.resourceCount > 0 && (
                <span className="text-zinc-600 text-xs">{child.resourceCount} resources</span>
              )}
              {child.eventCount > 0 && (
                <span className="text-zinc-600 text-xs">{child.eventCount} events</span>
              )}
              {child.challengeCount > 0 && (
                <span className="text-zinc-600 text-xs">{child.challengeCount} challenges</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function TopicHeader({ topic }: { topic: Topic }) {
  return (
    <div className="mb-6">
      {topic.imageUrl && (
        <div className="w-full h-52 md:h-72 rounded-2xl overflow-hidden mb-6">
          <img src={topic.imageUrl} alt={topic.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">{topic.title}</h1>
      </div>
      <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl mb-4">{topic.description}</p>
      <div className="flex flex-wrap gap-2">
        {topic.tags.map(tag => <Badge key={tag} size="md">{tag}</Badge>)}
      </div>
    </div>
  )
}

function StatsBar({ topic }: { topic: Topic }) {
  const stats = [
    { label: 'Groups', value: topic.groupCount, show: topic.enabledComponents.includes('groups') },
    { label: 'Resources', value: topic.resourceCount, show: topic.enabledComponents.includes('resources') },
    { label: 'Events', value: topic.eventCount, show: topic.enabledComponents.includes('events') },
    { label: 'Challenges', value: topic.challengeCount, show: topic.enabledComponents.includes('challenges') },
    { label: 'Pins', value: topic.mapPinCount, show: topic.enabledComponents.includes('maps') },
  ].filter(s => s.show)

  return (
    <div className="flex flex-wrap gap-8 py-5 border-y border-zinc-800">
      {stats.map(s => (
        <div key={s.label} className="flex flex-col gap-0.5">
          <span className="text-2xl font-bold text-zinc-100 leading-none">{s.value}</span>
          <span className="text-zinc-500 text-xs uppercase tracking-wider">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function ComponentRenderer({ topic, activeTab }: { topic: Topic; activeTab: ComponentType }) {
  switch (activeTab) {
    case 'groups': return <GroupsComponent topic={topic} />
    case 'resources': return <ResourcesComponent topic={topic} />
    case 'events': return <EventsComponent topic={topic} />
    case 'challenges': return <ChallengesComponent topic={topic} />
    case 'maps': return <MapsComponent topic={topic} />
    default: return null
  }
}
