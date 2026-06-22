import { useEffect, useRef, useState } from 'react'
import type { StructuredLocation } from '../../types'
import { isGeocodeable, buildLocationQuery, lookupLocation, properCase } from '../../services/geocodeService'

const INPUT_CLASS = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'

interface LocationInputProps {
  value: StructuredLocation
  onChange: (loc: StructuredLocation) => void
  /** Show a street address field — relevant when pinning an exact location rather than a general region. */
  showStreet?: boolean
  /** Location is mandatory for this use case — swaps the "optional" helper copy for a prompt instead. */
  required?: boolean
}

export function LocationInput({ value, onChange, showStreet = false, required = false }: LocationInputProps) {
  const hasAny = !!(value.street || value.city || value.state || value.zipCode || value.country)
  const hasGaps = !value.city || !value.state || !value.country || (showStreet && !value.street)
  const [autofilling, setAutofilling] = useState(false)
  const lastQuery = useRef('')

  // Firestore rejects explicit `undefined` field values, so cleared/unset fields must be
  // omitted from the object entirely rather than assigned `undefined`.
  function prune(loc: StructuredLocation): StructuredLocation {
    return Object.fromEntries(Object.entries(loc).filter(([, v]) => v !== undefined && v !== '')) as StructuredLocation
  }

  function set(field: keyof StructuredLocation, val: string) {
    onChange(prune({ ...value, [field]: val }))
  }

  // Applied on blur (not while typing) so the abbreviation heuristic in properCase doesn't
  // flicker on short in-progress words like "Ta" before "Tampa" is finished.
  function applyCasing(field: keyof StructuredLocation) {
    const val = value[field]
    if (!val) return
    onChange({ ...value, [field]: properCase(val) })
  }

  useEffect(() => {
    if (!isGeocodeable(value) || !hasGaps) return
    const query = buildLocationQuery(value)
    if (!query || query === lastQuery.current) return

    const timer = setTimeout(async () => {
      lastQuery.current = query
      setAutofilling(true)
      const result = await lookupLocation(value)
      setAutofilling(false)
      if (!result) return
      onChange(prune({
        street: value.street ?? result.street,
        city: value.city ?? result.city,
        state: value.state ?? result.state,
        zipCode: value.zipCode ?? result.zipCode,
        country: value.country ?? result.country,
      }))
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.street, value.city, value.state, value.zipCode, value.country])

  return (
    <div className="space-y-2">
      {showStreet && (
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Street Address</span>
          <input value={value.street ?? ''} onChange={e => set('street', e.target.value)} onBlur={() => applyCasing('street')} className={INPUT_CLASS} />
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">City</span>
          <input value={value.city ?? ''} onChange={e => set('city', e.target.value)} onBlur={() => applyCasing('city')} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">State / Province</span>
          <input value={value.state ?? ''} onChange={e => set('state', e.target.value)} onBlur={() => applyCasing('state')} className={INPUT_CLASS} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Zip / Postal Code</span>
          <input value={value.zipCode ?? ''} onChange={e => set('zipCode', e.target.value)} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Country</span>
          <input value={value.country ?? ''} onChange={e => set('country', e.target.value)} onBlur={() => applyCasing('country')} className={INPUT_CLASS} />
        </label>
      </div>
      {autofilling ? (
        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
          Filling in the rest…
        </p>
      ) : isGeocodeable(value) ? (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <span>✓</span> Location set — will appear on the map
        </p>
      ) : hasAny ? (
        <p className="text-xs text-amber-400/80">
          Add city + state/country, or zip code to appear on the map
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          {required
            ? 'Add city + state/country, or zip code to pin this on the map'
            : 'Optional — provide location to pin this on the global map'}
        </p>
      )}
    </div>
  )
}
