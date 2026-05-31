export type ComponentType = 'groups' | 'resources' | 'events' | 'challenges'

export type ModerationStatus = 'live' | 'pending_review' | 'pending_approval' | 'rejected'

export interface Topic {
  id: string
  title: string
  slug: string
  description: string
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
}

export interface FeedItem {
  id: string
  type: 'group' | 'resource' | 'event' | 'challenge' | 'topic_created'
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
  imageUrl?: string
  location?: {
    city?: string
    state?: string
    country?: string
  }
  links: {
    website?: string
    instagram?: string
    facebook?: string
    twitter?: string
    youtube?: string
  }
  moderationStatus: ModerationStatus
  submittedBy: string
  submittedByDisplayName?: string
  createdAt: Date
  updatedAt: Date
  likes: number
  flags: number
}

export interface Resource {
  id: string
  topicId: string
  title: string
  url: string
  type: 'article' | 'video' | 'government' | 'tool' | 'guide' | 'other'
  description?: string
  moderationStatus: ModerationStatus
  submittedBy: string
  submittedByDisplayName?: string
  createdAt: Date
  likes: number
  notHelpful: number
  flags: number
}

export interface ImpetusEvent {
  id: string
  topicId: string
  title: string
  date: Date
  endDate?: Date
  location?: string
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
}

export interface Challenge {
  id: string
  topicId: string
  title: string
  description: string
  actionPrompt: string
  deadline?: Date
  type: 'individual' | 'group_competition'
  moderationStatus: 'active' | 'ended' | 'pending_approval' | 'rejected'
  createdBy: string
  createdAt: Date
  participantCount: number
  upvotes: number
  flags: number
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
  imageUrl?: string
  location?: Group['location']
  links?: Group['links']
}

export interface CreateResourceInput {
  topicId: string
  title: string
  url: string
  type: Resource['type']
  description?: string
}

export interface CreateEventInput {
  topicId: string
  title: string
  date: Date
  endDate?: Date
  location?: string
  isVirtual: boolean
  externalUrl: string
  description?: string
}
