// Generated from https://dogs-api-978597455378.us-central1.run.app/openapi.json
// "DOGS" = Data Organization for Good and Sharing — shared canonical schema across apps.
// These mirror the API's wire format exactly (snake_case, raw JSON types) so payloads
// to/from the live API need no field renaming. Internal app models live in `./index.ts`
// and are kept structurally aligned with these — see service-layer mappers for the
// (mostly mechanical) translation between the two.
//
// Import as a namespace to avoid collisions with app types of the same name, e.g.:
//   import * as Dogs from '../types/dogs'
//   const entry: Dogs.DirectoryEntry = ...

export type ActivityStatus =
  | 'open'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'addressed'
  | 'verified'
  | 'cancelled'

export type CategorySlug = 'animals' | 'environment' | 'fitness' | 'nature' | 'trash' | 'water'

export type TrashReportSeverity = 'low' | 'medium' | 'high'

export interface Category {
  id: string
  slug: CategorySlug
  name: string
}

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface StructuredLocation {
  city?: string | null
  state?: string | null
  zip_code?: string | null
  country?: string | null
}

export interface SocialLinks {
  website?: string | null
  instagram?: string | null
  tiktok?: string | null
  youtube?: string | null
  facebook?: string | null
  twitter?: string | null
}

export interface DirectoryEntry {
  id: string
  name: string
  description?: string | null
  image_url?: string | null
  location?: StructuredLocation | null
  coordinates?: Coordinates | null
  social_links?: SocialLinks | null
  categories: CategorySlug[]
  featured: boolean
  user_ids: string[]
  created_at: string
  updated_at: string
}

export interface DirectoryEntryCreate {
  name: string
  description?: string | null
  image_url?: string | null
  location?: StructuredLocation | null
  social_links?: SocialLinks | null
  categories?: CategorySlug[]
  featured?: boolean
  user_ids?: string[]
}

export interface DirectoryEntryUpdate {
  name?: string | null
  description?: string | null
  image_url?: string | null
  location?: StructuredLocation | null
  social_links?: SocialLinks | null
  categories?: CategorySlug[] | null
  featured?: boolean | null
  user_ids?: string[] | null
}

export interface CleanupMetrics {
  small_bags?: number | null
  large_bags?: number | null
  pounds?: number | null
}

export interface Cleanup {
  id: string
  title: string
  description?: string | null
  location?: StructuredLocation | null
  coordinates?: Coordinates | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  status?: ActivityStatus | null
  photo_urls: string[]
  metrics?: CleanupMetrics | null
  submitted_by_user_id?: string | null
  organizer_user_ids: string[]
  rsvp_user_ids: string[]
  attended_user_ids: string[]
}

export interface CleanupCreate {
  title: string
  description?: string | null
  location?: StructuredLocation | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  status?: ActivityStatus | null
  photo_urls?: string[]
  metrics?: CleanupMetrics | null
  submitted_by_user_id?: string | null
  organizer_user_ids?: string[]
  rsvp_user_ids?: string[]
  attended_user_ids?: string[]
}

export interface CleanupUpdate {
  title?: string | null
  description?: string | null
  location?: StructuredLocation | null
  scheduled_start?: string | null
  scheduled_end?: string | null
  status?: ActivityStatus | null
  photo_urls?: string[] | null
  metrics?: CleanupMetrics | null
  submitted_by_user_id?: string | null
  organizer_user_ids?: string[] | null
  rsvp_user_ids?: string[] | null
  attended_user_ids?: string[] | null
}

export interface TrashReport {
  id: string
  title: string
  description?: string | null
  location?: StructuredLocation | null
  coordinates?: Coordinates | null
  image_urls: string[]
  severity?: TrashReportSeverity | null
  status?: ActivityStatus | null
  reported_at?: string | null
  submitted_by_user_id?: string | null
  resolved_by_user_id?: string | null
  resolved_by_cleanup_id?: string | null
  resolved_at?: string | null
}

export interface TrashReportCreate {
  title: string
  description?: string | null
  location?: StructuredLocation | null
  image_urls?: string[]
  severity?: TrashReportSeverity | null
  status?: ActivityStatus | null
  reported_at?: string | null
  submitted_by_user_id?: string | null
}

export interface TrashReportUpdate {
  title?: string | null
  description?: string | null
  location?: StructuredLocation | null
  image_urls?: string[] | null
  severity?: TrashReportSeverity | null
  status?: ActivityStatus | null
  reported_at?: string | null
  submitted_by_user_id?: string | null
  resolved_by_user_id?: string | null
  resolved_by_cleanup_id?: string | null
  resolved_at?: string | null
}

export interface SheetSyncResponse {
  created: number
  updated: number
  skipped: number
  rows_seen: number
  geocoded: number
  geo_failed: number
  images_skipped: number
  errors: string[]
}

export interface ValidationError {
  loc: (string | number)[]
  msg: string
  type: string
  input?: unknown
  ctx?: Record<string, unknown>
}

export interface HTTPValidationError {
  detail: ValidationError[]
}
