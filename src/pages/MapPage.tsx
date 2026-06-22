import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { subscribeAllEventsGlobal } from '../services/eventsService'
import { subscribeAllGroups } from '../services/groupsService'
import { subscribeAllResourcesGlobal } from '../services/resourcesService'
import { formatLocation } from '../services/geocodeService'
import { useTopics } from '../hooks/useTopics'
import type { ImpetusEvent, Group, Resource } from '../types'

const eventIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;background:#f59e0b;border-radius:50%;border:2px solid #fcd34d;box-shadow:0 0 8px rgba(245,158,11,0.7)"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
})

const groupIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;background:#10b981;border-radius:50%;border:2px solid #34d399;box-shadow:0 0 8px rgba(16,185,129,0.7)"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
})

const resourceIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;background:#3b82f6;border-radius:50%;border:2px solid #93c5fd;box-shadow:0 0 8px rgba(59,130,246,0.7)"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
})

export function MapPage() {
  const [events, setEvents] = useState<ImpetusEvent[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const { topics } = useTopics()
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [showEvents, setShowEvents] = useState(true)
  const [showGroups, setShowGroups] = useState(true)
  const [showResources, setShowResources] = useState(true)

  useEffect(() => {
    const unsub1 = subscribeAllEventsGlobal(setEvents)
    const unsub2 = subscribeAllGroups(setGroups)
    const unsub3 = subscribeAllResourcesGlobal(setResources)
    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  const topicMap = useMemo(() => new Map(topics.map(t => [t.id, t])), [topics])

  const filteredEvents = events.filter(e =>
    Number.isFinite(e.coordinates?.lat) && Number.isFinite(e.coordinates?.lng) &&
    (!selectedTopicId || e.topicId === selectedTopicId)
  )
  const filteredGroups = groups.filter(g =>
    Number.isFinite(g.coordinates?.latitude) && Number.isFinite(g.coordinates?.longitude) &&
    (!selectedTopicId || g.topicId === selectedTopicId)
  )
  const filteredResources = resources.filter(r =>
    Number.isFinite(r.coordinates?.lat) && Number.isFinite(r.coordinates?.lng) &&
    (!selectedTopicId || r.topicId === selectedTopicId)
  )

  const totalPins = (showEvents ? filteredEvents.length : 0) + (showGroups ? filteredGroups.length : 0) + (showResources ? filteredResources.length : 0)

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex items-center gap-3 flex-wrap shrink-0 backdrop-blur-sm">
        <select
          value={selectedTopicId}
          onChange={e => setSelectedTopicId(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option value="">All Topics</option>
          {topics.map(t => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>

        <button
          onClick={() => setShowGroups(v => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
            showGroups
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          Groups
          <span className={`text-xs ${showGroups ? 'text-emerald-500/70' : 'text-zinc-600'}`}>
            {filteredGroups.length}
          </span>
        </button>

        <button
          onClick={() => setShowEvents(v => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
            showEvents
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          Events
          <span className={`text-xs ${showEvents ? 'text-amber-500/70' : 'text-zinc-600'}`}>
            {filteredEvents.length}
          </span>
        </button>

        <button
          onClick={() => setShowResources(v => !v)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
            showResources
              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          Resources
          <span className={`text-xs ${showResources ? 'text-blue-500/70' : 'text-zinc-600'}`}>
            {filteredResources.length}
          </span>
        </button>

        <span className="text-xs text-zinc-600 ml-auto">
          {totalPins} pin{totalPins !== 1 ? 's' : ''} on map
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {totalPins === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-[400] pointer-events-none">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-5 py-4 text-sm text-zinc-500 text-center backdrop-blur-sm">
              No mapped locations yet.<br />
              <span className="text-zinc-600 text-xs">Events, groups, and resources with location data will appear here.</span>
            </div>
          </div>
        )}
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {showGroups && filteredGroups.map(group => (
            <Marker
              key={group.id}
              position={[group.coordinates!.latitude, group.coordinates!.longitude]}
              icon={groupIcon}
            >
              <Popup className="impetus-map-popup">
                <div className="text-sm min-w-[180px]">
                  <div className="font-semibold text-zinc-100 leading-snug mb-1">{group.name}</div>
                  <div className="text-xs text-emerald-400 mb-1.5">
                    {topicMap.get(group.topicId)?.title ?? 'Group'}
                  </div>
                  {group.description && (
                    <p className="text-zinc-400 text-xs mb-2 line-clamp-3 leading-relaxed">
                      {group.description}
                    </p>
                  )}
                  {group.location && (
                    <div className="text-xs text-zinc-600 mb-1.5">
                      {formatLocation(group.location)}
                    </div>
                  )}
                  {group.socialLinks.website && (
                    <a
                      href={group.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Visit website →
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {showEvents && filteredEvents.map(event => (
            <Marker
              key={event.id}
              position={[event.coordinates!.lat, event.coordinates!.lng]}
              icon={eventIcon}
            >
              <Popup className="impetus-map-popup">
                <div className="text-sm min-w-[180px]">
                  <div className="font-semibold text-zinc-100 leading-snug mb-1">{event.title}</div>
                  <div className="text-xs text-amber-400 mb-1.5">
                    {topicMap.get(event.topicId)?.title ?? 'Event'} &middot;{' '}
                    {event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  {event.description && (
                    <p className="text-zinc-400 text-xs mb-2 line-clamp-3 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                  {event.location && (
                    <div className="text-xs text-zinc-600 mb-1.5">{formatLocation(event.location)}</div>
                  )}
                  <a
                    href={event.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Event details →
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}

          {showResources && filteredResources.map(resource => (
            <Marker
              key={resource.id}
              position={[resource.coordinates!.lat, resource.coordinates!.lng]}
              icon={resourceIcon}
            >
              <Popup className="impetus-map-popup">
                <div className="text-sm min-w-[180px]">
                  <div className="font-semibold text-zinc-100 leading-snug mb-1">{resource.title}</div>
                  <div className="text-xs text-blue-400 mb-1.5">
                    {topicMap.get(resource.topicId)?.title ?? 'Resource'}
                  </div>
                  {resource.description && (
                    <p className="text-zinc-400 text-xs mb-2 line-clamp-3 leading-relaxed">
                      {resource.description}
                    </p>
                  )}
                  {resource.location && (
                    <div className="text-xs text-zinc-600 mb-1.5">{formatLocation(resource.location)}</div>
                  )}
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View resource →
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
