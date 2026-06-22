import type { StructuredLocation } from '../types'

export interface Coordinates {
  lat: number
  lng: number
}

// Nominatim (OpenStreetMap) — free, no API key, 1 req/sec rate limit
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

/**
 * Structured params (postalcode=, city=, state=, country=) match against Nominatim's actual
 * address fields. A free-text query like "33629" is ambiguous (e.g. it also collides with
 * Asturias, Spain postcodes) and can match unrelated entities; structured fields don't.
 */
function buildStructuredParams(location: StructuredLocation, extra: Record<string, string> = {}): URLSearchParams | null {
  if (!isGeocodeable(location)) return null
  const { street, city, state, zipCode, country } = location
  const params = new URLSearchParams({ format: 'json', limit: '1', ...extra })
  if (street) params.set('street', street)
  if (city) params.set('city', city)
  if (state) params.set('state', state)
  if (zipCode) params.set('postalcode', zipCode)
  if (country) params.set('country', country)
  return params
}

/**
 * Postal codes aren't globally unique (e.g. "33629" is both Tampa, FL and a postcode in
 * Asturias, Spain) and Nominatim returns them with identical importance scores, so when no
 * country is given we can't tell them apart from the data alone. The browser's locale region
 * is used as a tie-breaker among otherwise-equal candidates.
 */
function preferredCountryCode(): string | undefined {
  try {
    return navigator.language.split('-')[1]?.toLowerCase()
  } catch {
    return undefined
  }
}

function pickBestResult(results: any[]): any {
  if (results.length <= 1) return results[0]
  const preferred = preferredCountryCode()
  return (preferred && results.find(r => r.address?.country_code === preferred)) || results[0]
}

export async function geocodeAddress(location: StructuredLocation): Promise<Coordinates | null> {
  const params = buildStructuredParams(location, { limit: '5', addressdetails: '1' })
  if (!params) return null
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Impetus/1.0 (tayloraj10@gmail.com)' },
    })
    if (!res.ok) return null
    const results = await res.json()
    if (!results.length) return null
    const best = pickBestResult(results)
    return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) }
  } catch {
    return null
  }
}

export interface LocationLookupResult {
  coordinates: Coordinates
  street?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
}

/** Geocodes a partial location and returns the full address breakdown, used to auto-fill the rest of a location form. */
export async function lookupLocation(location: StructuredLocation): Promise<LocationLookupResult | null> {
  const params = buildStructuredParams(location, { limit: '5', addressdetails: '1' })
  if (!params) return null
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Impetus/1.0 (tayloraj10@gmail.com)' },
    })
    if (!res.ok) return null
    const results = await res.json()
    if (!results.length) return null
    const r = pickBestResult(results)
    const addr = r.address ?? {}
    const street = [addr.house_number, addr.road].filter(Boolean).join(' ')
    const city = addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? undefined
    return {
      coordinates: { lat: parseFloat(r.lat), lng: parseFloat(r.lon) },
      street: street ? properCase(street) : undefined,
      city: city ? properCase(city) : undefined,
      state: addr.state ? properCase(addr.state) : undefined,
      zipCode: addr.postcode ?? undefined,
      country: addr.country ? properCase(addr.country) : undefined,
    }
  } catch {
    return null
  }
}

export function buildLocationQuery(location: StructuredLocation): string {
  const { street, city, state, zipCode, country } = location
  // Zip code is specific enough on its own (add country for international disambiguation); a street narrows it to an exact address
  if (zipCode) return [street, zipCode, country].filter(Boolean).join(', ')
  // City needs at least one qualifier; country alone covers international entries without states
  if (city && (state || country)) return [street, city, state, country].filter(Boolean).join(', ')
  // Country alone is geocodeable (for country-level resources/events)
  if (country) return country
  return ''
}

/**
 * Normalizes free-text place names to proper case ("tampa" -> "Tampa", "winston-salem" ->
 * "Winston-Salem"). Short alphabetic strings are treated as abbreviations ("fl" -> "FL")
 * rather than title-cased, since state/country codes shouldn't become "Fl".
 */
export function properCase(value: string): string {
  const trimmed = value.trim()
  if (/^[a-z]{2,3}$/i.test(trimmed)) return trimmed.toUpperCase()
  return value.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, sep, c) => sep + c.toUpperCase())
}

export function formatLocation(location: StructuredLocation): string {
  return [location.street, location.city, location.state, location.zipCode, location.country].filter(Boolean).join(', ')
}

export function isGeocodeable(location: StructuredLocation): boolean {
  return buildLocationQuery(location) !== ''
}
