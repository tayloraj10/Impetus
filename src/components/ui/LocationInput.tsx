import type { StructuredLocation } from '../../types'
import { isGeocodeable } from '../../services/geocodeService'

const INPUT_CLASS = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'

interface LocationInputProps {
  value: StructuredLocation
  onChange: (loc: StructuredLocation) => void
}

export function LocationInput({ value, onChange }: LocationInputProps) {
  const hasAny = !!(value.city || value.state || value.zipCode || value.country)

  function set(field: keyof StructuredLocation, val: string) {
    onChange({ ...value, [field]: val || undefined })
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">City</span>
          <input value={value.city ?? ''} onChange={e => set('city', e.target.value)} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">State / Province</span>
          <input value={value.state ?? ''} onChange={e => set('state', e.target.value)} className={INPUT_CLASS} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Zip / Postal Code</span>
          <input value={value.zipCode ?? ''} onChange={e => set('zipCode', e.target.value)} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className="block text-xs text-zinc-400 mb-1">Country</span>
          <input value={value.country ?? ''} onChange={e => set('country', e.target.value)} className={INPUT_CLASS} />
        </label>
      </div>
      {isGeocodeable(value) ? (
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <span>✓</span> Location set — will appear on the map
        </p>
      ) : hasAny ? (
        <p className="text-xs text-amber-400/80">
          Add city + state/country, or zip code to appear on the map
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Optional — provide location to pin this on the global map
        </p>
      )}
    </div>
  )
}
