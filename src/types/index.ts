export type ComponentType = 'groups' | 'resources' | 'events' | 'challenges' | 'maps'

export interface StructuredLocation {
  city?: string
  state?: string
  zipCode?: string
  country?: string
}

export type ModerationStatus = 'live' | 'pending_review' | 'pending_approval' | 'rejected' | 'removed'

export interface Topic {
  id: string
  title: string
  slug: string
  description: string
  category?: string
  tags: string[]
  imageUrl?: string
  enabledComponents: ComponentType[]
  status: 'active' | 'pending' | 'archived'
  createdBy: string
  createdAt: Date
  updatedAt: Date
  activityScore: number
  lastActivityAt: Date
  groupCount: number
  resourceCount: number
  eventCount: number
  challengeCount: number
  mapPinCount: number
  parentTopicId?: string
  parentTopicSlug?: string
  parentTopicTitle?: string
}

export interface FeedItem {
  id: string
  type: 'group' | 'resource' | 'event' | 'challenge' | 'map_pin' | 'topic_created'
  refId: string
  topicId: string
  topicTitle: string
  topicSlug: string
  title: string
  description?: string
  url?: string
  createdAt: Date
  likes: number
  submittedBy: string
  submittedByDisplayName?: string
}

export interface Group {
  id: string
  topicId: string
  name: string
  description: string
  category?: string
  imageUrl?: string
  location?: StructuredLocation
  coordinates?: { lat: number; lng: number }
  links: {
    website?: string
    instagram?: string
    tiktok?: string
    youtube?: string
    facebook?: string
    twitter?: string
  }
  moderationStatus: ModerationStatus
  submittedBy: string
  submittedByDisplayName?: string
  createdAt: Date
  updatedAt: Date
  likes: number
  flags: number
  removedBy?: string
  removedByDisplayName?: string
  removedAt?: Date
}

export interface Resource {
  id: string
  topicId: string
  title: string
  url?: string
  type: 'article' | 'video' | 'government' | 'tool' | 'guide' | 'content_creator' | 'other'
  typeOther?: string
  location?: StructuredLocation
  coordinates?: { lat: number; lng: number }
  description?: string
  moderationStatus: ModerationStatus
  submittedBy: string
  submittedByDisplayName?: string
  createdAt: Date
  likes: number
  notHelpful: number
  flags: number
  removedBy?: string
  removedByDisplayName?: string
  removedAt?: Date
}

export interface ImpetusEvent {
  id: string
  topicId: string
  title: string
  date: Date
  endDate?: Date
  location?: StructuredLocation
  coordinates?: { lat: number; lng: number }
  isVirtual: boolean
  externalUrl: string
  description?: string
  moderationStatus: ModerationStatus
  submittedBy: string
  submittedByDisplayName?: string
  createdAt: Date
  interested: number
  going: number
  flags: number
  removedBy?: string
  removedByDisplayName?: string
  removedAt?: Date
}

export interface Challenge {
  id: string
  topicId: string
  title: string
  description: string
  actionPrompt: string
  deadline?: Date
  type: 'individual' | 'group_competition'
  moderationStatus: 'active' | 'ended' | 'pending_approval' | 'rejected' | 'removed'
  createdBy: string
  createdAt: Date
  participantCount: number
  upvotes: number
  flags: number
  removedBy?: string
  removedByDisplayName?: string
  removedAt?: Date
}

export interface ChallengeSubmission {
  id: string
  challengeId: string
  topicId: string
  userId: string
  userDisplayName: string
  proofImageUrl?: string
  note?: string
  createdAt: Date
}

export interface TopicSuggestion {
  id: string
  title: string
  description: string
  suggestedBy: string
  suggestedByDisplayName?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

export interface UserProfile {
  id: string
  displayName: string
  email: string
  photoURL?: string
  role: 'user' | 'moderator' | 'admin'
  createdAt: Date
}

export interface CreateGroupInput {
  topicId: string
  name: string
  description: string
  category?: string
  imageUrl?: string
  location?: Group['location']
  links?: Group['links']
}

export interface Category {
  id: string
  label: string
  createdAt: Date
}

export interface CreateResourceInput {
  topicId: string
  title: string
  url?: string
  type: Resource['type']
  typeOther?: string
  location?: StructuredLocation
  description?: string
}

export interface CreateEventInput {
  topicId: string
  title: string
  date: Date
  endDate?: Date
  location?: StructuredLocation
  isVirtual: boolean
  externalUrl: string
  description?: string
}

export interface MapPin {
  id: string
  topicId: string
  name: string
  description?: string
  address?: string
  url?: string
  coordinates: { lat: number; lng: number }
  moderationStatus: ModerationStatus
  submittedBy: string
  submittedByDisplayName?: string
  createdAt: Date
  likes: number
  flags: number
  removedBy?: string
  removedByDisplayName?: string
  removedAt?: Date
}

export interface CreateMapPinInput {
  topicId: string
  name: string
  description?: string
  address?: string
  url?: string
  coordinates: { lat: number; lng: number }
}
