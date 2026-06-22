import 'leaflet/dist/leaflet.css'
import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { MapPin, MapPinType, CreateMapPinInput, StructuredLocation, Topic } from '../../types'
import {
  subscribeMapPins, createMapPin,
  likeMapPin, unlikeMapPin, flagMapPin, unflagMapPin,
  softDeleteMapPin, deleteMapPin,
} from '../../services/mapsService'
import { geocodeAddress, isGeocodeable, formatLocation } from '../../services/geocodeService'
import { useAuth } from '../../hooks/useAuth'
import { useLiked, useFlag } from '../../hooks/useLiked'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'
import { ModerateButtons } from '../ui/ModerateButtons'
import { FlagButton } from '../ui/FlagButton'
import { Tooltip } from '../ui/Tooltip'
import { LocationInput } from '../ui/LocationInput'

const DEFAULT_PIN_COLOR = '#10b981'

const iconCache = new Map<string, L.DivIcon>()

function pinIcon(color: string, focused: boolean): L.DivIcon {
  const key = `${color}:${focused}`
  const cached = iconCache.get(key)
  if (cached) return cached
  const icon = focused
    ? L.divIcon({
        html: `<div style="width:17px;height:17px;background:${color};border:2.5px solid rgba(6,78,59,0.9);border-radius:50%;box-shadow:0 0 0 5px ${color}4d,0 2px 8px rgba(0,0,0,0.5)"></div>`,
        className: '',
        iconSize: [17, 17],
        iconAnchor: [8, 8],
        popupAnchor: [0, -14],
      })
    : L.divIcon({
        html: `<div style="width:13px;height:13px;background:${color};border:2px solid rgba(6,78,59,0.9);border-radius:50%;box-shadow:0 0 0 4px ${color}33,0 2px 6px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [13, 13],
        iconAnchor: [6, 6],
        popupAnchor: [0, -12],
      })
  iconCache.set(key, icon)
  return icon
}

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || pins.length === 0) return
    fitted.current = true
    if (pins.length === 1) {
      map.setView([pins[0].coordinates.lat, pins[0].coordinates.lng], 10)
    } else {
      const bounds = L.latLngBounds(pins.map(p => [p.coordinates.lat, p.coordinates.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    }
  }, [pins, map])
  return null
}

function FlyToPin({ target }: { target: [number, number] | null }) {
  const map = useMap()
  const prev = useRef<string>('')
  useEffect(() => {
    if (!target) return
    const key = `${target[0]},${target[1]}`
    if (key === prev.current) return
    prev.current = key
    map.flyTo(target, Math.max(map.getZoom(), 10), { duration: 0.5 })
  }, [target, map])
  return null
}

export function MapsComponent({ topic }: { topic: Topic }) {
  const [pins, setPins] = useState<MapPin[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const { user, role } = useAuth()

  useEffect(() => {
    return subscribeMapPins(topic.id, (data) => {
      setPins(data)
      setLoading(false)
    })
  }, [topic.id])

  function handlePinFocus(pin: MapPin) {
    setFocusedId(pin.id)
    setFlyTarget([pin.coordinates.lat, pin.coordinates.lng])
  }

  function typeFor(pin: MapPin) {
    return topic.mapPinTypes?.find(t => t.value === pin.type)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">{pins.length} pin{pins.length !== 1 ? 's' : ''} on map</p>
        <Button size="sm" onClick={() => user ? setAddOpen(true) : null}>+ Add Pin</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : pins.length === 0 ? (
        <EmptyState onAdd={() => setAddOpen(true)} />
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 rounded-xl overflow-hidden border border-zinc-800 h-[300px] lg:h-[520px]">
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom
              zoomControl
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                subdomains="abcd"
                maxZoom={20}
              />
              <FitBounds pins={pins} />
              <FlyToPin target={flyTarget} />
              {pins.map(pin => {
                const pinType = typeFor(pin)
                return (
                <Marker
                  key={pin.id}
                  position={[pin.coordinates.lat, pin.coordinates.lng]}
                  icon={pinIcon(pinType?.color ?? DEFAULT_PIN_COLOR, focusedId === pin.id)}
                  eventHandlers={{ click: () => setFocusedId(pin.id) }}
                >
                  <Popup className="impetus-map-popup">
                    <div className="min-w-[160px] max-w-[220px]">
                      <p className="font-semibold text-sm leading-snug mb-1">{pin.name}</p>
                      {pinType && (
                        <p className="text-xs font-medium mb-1.5" style={{ color: pinType.color }}>{pinType.label}</p>
                      )}
                      {pin.description && (
                        <p className="text-xs leading-relaxed mb-1.5 opacity-70">{pin.description}</p>
                      )}
                      {pin.location && (
                        <p className="text-xs opacity-50 mb-1">{formatLocation(pin.location)}</p>
                      )}
                      {pin.url && (
                        <a
                          href={pin.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 block mt-1"
                        >
                          Source ↗
                        </a>
                      )}
                      {pin.moderationStatus === 'pending_review' && (
                        <span className="text-xs text-amber-500/80 block mt-1">Under Review</span>
                      )}
                    </div>
                  </Popup>
                </Marker>
                )
              })}
            </MapContainer>
          </div>

          <div className="lg:w-72 xl:w-80 shrink-0 flex flex-col lg:h-[520px]">
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 lg:pr-0.5">
              {pins.map(pin => (
                <PinListItem
                  key={pin.id}
                  pin={pin}
                  pinType={typeFor(pin)}
                  active={focusedId === pin.id}
                  onFocus={() => handlePinFocus(pin)}
                  role={role}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <AddPinModal open={addOpen} onClose={() => setAddOpen(false)} topic={topic} />
    </div>
  )
}

function PinListItem({ pin, pinType, active, onFocus, role }: {
  pin: MapPin
  pinType?: MapPinType
  active: boolean
  onFocus: () => void
  role: string | null
}) {
  const { liked, toggle, canLike } = useLiked(pin.id, 'standard')
  const { flagged, flag, unflag, canFlag } = useFlag(pin.id)
  const canModerate = role === 'admin' || role === 'moderator'
  const isAdmin = role === 'admin'

  return (
    <button
      onClick={onFocus}
      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
        active
          ? 'border-emerald-700 bg-emerald-500/5'
          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap min-w-0">
          <span className="text-zinc-100 text-sm font-medium">{pin.name}</span>
          {pinType && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium shrink-0"
              style={{ color: pinType.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pinType.color }} />
              {pinType.label}
            </span>
          )}
          {pin.moderationStatus === 'pending_review' && (
            <Tooltip text="Visible but awaiting moderator review">
              <span className="text-xs text-amber-500/80 font-medium shrink-0">Under Review</span>
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 pt-0.5" onClick={e => e.stopPropagation()}>
          {canModerate && (
            <ModerateButtons
              onSoftDelete={(uid, name, reason) => softDeleteMapPin(pin.id, uid, name, reason)}
              onHardDelete={isAdmin ? () => deleteMapPin(pin.id, pin.topicId) : undefined}
            />
          )}
          <Tooltip text={liked ? 'Unlike' : canLike ? 'Like' : 'Sign in to like'}>
            <button
              onClick={() => toggle(() => likeMapPin(pin.id), () => unlikeMapPin(pin.id))}
              className={`flex items-center gap-0.5 text-xs transition-colors select-none cursor-pointer ${
                liked ? 'text-emerald-400' : canLike ? 'text-zinc-500 hover:text-emerald-400' : 'text-zinc-600 cursor-default'
              }`}
            >
              <HeartIcon filled={liked} />
              <span>{pin.likes}</span>
            </button>
          </Tooltip>
          <FlagButton
            flagged={flagged}
            onFlag={() => flag(() => flagMapPin(pin.id))}
            onUnflag={() => unflag(() => unflagMapPin(pin.id))}
            canFlag={canFlag}
          />
        </div>
      </div>
      {pin.location && (
        <p className="text-zinc-500 text-xs leading-relaxed">{formatLocation(pin.location)}</p>
      )}
      {pin.description && (
        <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{pin.description}</p>
      )}
      {pin.url && (
        <a
          href={pin.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-xs text-emerald-400 hover:text-emerald-300 mt-1 inline-block"
        >
          Source ↗
        </a>
      )}
    </button>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="w-3 h-3" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13.7l-.7-.6C3.1 10 1 7.9 1 5.5 1 3.5 2.5 2 4.5 2c1.1 0 2.2.5 3.5 1.7C9.3 2.5 10.4 2 11.5 2 13.5 2 15 3.5 15 5.5c0 2.4-2.1 4.5-6.3 7.6L8 13.7z" />
    </svg>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
      <p className="text-zinc-500 text-sm mb-3">No pins added yet.</p>
      <Button variant="secondary" size="sm" onClick={onAdd}>Add the first pin</Button>
    </div>
  )
}

const INPUT_CLASS = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactElement<{ className?: string }> }) {
  return (
    <label className="block">
      <span className="block text-xs text-zinc-400 mb-1">{label}</span>
      {React.cloneElement(children, { className: INPUT_CLASS })}
    </label>
  )
}

function AddPinModal({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: Topic }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<StructuredLocation>({})
  const [url, setUrl] = useState('')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [geocodeError, setGeocodeError] = useState(false)

  function reset() {
    setName(''); setType(''); setDescription(''); setLocation({}); setUrl('')
    setManualLat(''); setManualLng(''); setShowManual(false)
    setGeocodeError(false); setDone(false)
  }

  function handleClose() {
    onClose()
    reset()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setGeocodeError(false)
    try {
      let coordinates: { lat: number; lng: number } | null = null

      if (showManual) {
        const lat = parseFloat(manualLat)
        const lng = parseFloat(manualLng)
        if (isNaN(lat) || isNaN(lng)) return
        coordinates = { lat, lng }
      } else {
        if (!isGeocodeable(location)) {
          setGeocodeError(true)
          return
        }
        coordinates = await geocodeAddress(location)
        if (!coordinates) {
          setGeocodeError(true)
          setShowManual(true)
          return
        }
      }

      const input: CreateMapPinInput = {
        topicId: topic.id,
        name,
        coordinates,
        ...(type ? { type } : {}),
        ...(description ? { description } : {}),
        ...(Object.keys(location).length ? { location } : {}),
        ...(url ? { url } : {}),
      }

      await createMapPin(input, user.uid, user.displayName ?? 'Anonymous', topic.title, topic.slug)
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Modal open={open} onClose={handleClose} title="Pin Added">
        <div className="text-center py-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <span className="text-emerald-400 text-sm font-bold">✓</span>
          </div>
          <p className="text-zinc-300 text-sm">Your pin is now live. A moderator will review it shortly.</p>
          <Button className="mt-4" onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add a Map Pin">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name *">
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="What is this location?" />
        </Field>

        {topic.mapPinTypes && topic.mapPinTypes.length > 0 && (
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Type *</span>
            <select
              required
              value={type}
              onChange={e => setType(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="" disabled>Select a type…</option>
              {topic.mapPinTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
        )}

        <Field label="Description">
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details…" />
        </Field>

        <div>
          <span className="block text-xs text-zinc-400 mb-1">Location *</span>
          <LocationInput
            value={location}
            onChange={loc => { setLocation(loc); setGeocodeError(false) }}
            showStreet
            required
          />
        </div>
        {geocodeError && (
          <p className="text-amber-400 text-xs -mt-2">
            Couldn't locate that — enter coordinates manually below.
          </p>
        )}

        {showManual && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude *">
                <input
                  required
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={e => setManualLat(e.target.value)}
                  placeholder="e.g. 40.7128"
                />
              </Field>
              <Field label="Longitude *">
                <input
                  required
                  type="number"
                  step="any"
                  value={manualLng}
                  onChange={e => setManualLng(e.target.value)}
                  placeholder="e.g. -74.0060"
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => { setShowManual(false); setGeocodeError(false) }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Use location fields instead
            </button>
          </>
        )}

        {!showManual && (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors block -mt-2"
          >
            Enter coordinates manually instead
          </button>
        )}

        <Field label="Source URL">
          <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Locating…' : 'Add Pin'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
