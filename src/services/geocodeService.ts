export interface Coordinates {
  lat: number
  lng: number
}

// Nominatim (OpenStreetMap) — free, no API key, 1 req/sec rate limit
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export async function geocodeAddress(query: string): Promise<Coordinates | null> {
  if (!query.trim()) return null
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
    })
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Impetus/1.0 (tayloraj10@gmail.com)' },
    })
    if (!res.ok) return null
    const results = await res.json()
    if (!results.length) return null
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
  } catch {
    return null
  }
}

export function buildGroupLocationQuery(location: {
  city?: string
  state?: string
  zipCode?: string
  country?: string
}): string {
  const { city, state, zipCode, country } = location
  // Zip code is specific enough on its own (add country for international disambiguation)
  if (zipCode) return [zipCode, country].filter(Boolean).join(', ')
  // City needs at least one qualifier; country alone covers international entries without states
  if (city && (state || country)) return [city, state, country].filter(Boolean).join(', ')
  return ''
}
