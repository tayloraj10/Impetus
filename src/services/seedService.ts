import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'

let SEED_USER = 'seed'
let SEED_NAME = 'Impetus Team'

function ts(daysAgo: number, hoursAgo = 0, minutesAgo = 0): Timestamp {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(d.getHours() - hoursAgo)
  d.setMinutes(d.getMinutes() - minutesAgo)
  return Timestamp.fromDate(d)
}

async function findOrCreateTopic(slug: string, topicData: {
  title: string; description: string; category: string; tags: string[]
  parentTopicId?: string; parentTopicSlug?: string; parentTopicTitle?: string
}): Promise<{ id: string; title: string; slug: string }> {
  const snap = await getDocs(query(collection(db, 'topics'), where('slug', '==', slug)))
  if (!snap.empty) {
    const d = snap.docs[0]
    const updates: Record<string, string> = {}
    if (topicData.parentTopicId) updates.parentTopicId = topicData.parentTopicId
    if (topicData.parentTopicSlug) updates.parentTopicSlug = topicData.parentTopicSlug
    if (topicData.parentTopicTitle) updates.parentTopicTitle = topicData.parentTopicTitle
    if (Object.keys(updates).length > 0) await updateDoc(d.ref, updates)
    return { id: d.id, title: d.data().title as string, slug }
  }
  const ref = await addDoc(collection(db, 'topics'), {
    ...topicData,
    slug,
    status: 'active',
    enabledComponents: [],
    activityScore: 0,
    groupCount: 0, resourceCount: 0, eventCount: 0, challengeCount: 0,
    createdBy: SEED_USER,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastActivityAt: Timestamp.now(),
  })
  return { id: ref.id, title: topicData.title, slug }
}

async function wipeTopic(topicId: string) {
  await Promise.all(
    ['groups', 'resources', 'events', 'challenges', 'feed'].map(async col => {
      const existing = await getDocs(
        query(collection(db, col), where('topicId', '==', topicId))
      )
      await Promise.all(existing.docs.map(d => deleteDoc(d.ref)))
    })
  )
}

// ─── TRASH CLEANUPS ──────────────────────────────────────────────────────────
// lastActivityAt target: ~1.5h ago (second most recent in testing)

export async function seedTrashCleanups(userId: string, displayName: string): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  const { id: topicId, title: topicTitle } = await findOrCreateTopic('trash-cleanup', {
    title: 'Trash Cleanups',
    description: 'Find, join, and organize community cleanup events in your area. From neighborhood litter picks to river restoration — every piece counts.',
    category: 'Environment',
    tags: ['environment', 'community', 'volunteer', 'outdoors'],
  })
  await wipeTopic(topicId)
  const topicSlug = 'trash-cleanup'

  const groups = [
    {
      topicId, name: 'Keep Austin Clean',
      category: 'Nonprofit',
      description: 'Community-led cleanup org covering Austin parks, trails, and neighborhoods. Running monthly events since 2018.',
      location: { city: 'Austin', state: 'TX', country: 'US' },
      coordinates: { lat: 30.2672, lng: -97.7431 },
      links: { website: 'https://keepaustinclean.org', instagram: 'https://instagram.com/keepaustinclean' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 24, flags: 0, createdAt: ts(5), updatedAt: ts(5),
    },
    {
      topicId, name: 'NYC Sanitation Volunteers',
      category: 'Government Agency',
      description: 'Partnered with NYC DSNY to fill sanitation gaps — deploying volunteer squads in underserved neighborhoods.',
      location: { city: 'New York', state: 'NY', country: 'US' },
      coordinates: { lat: 40.7128, lng: -74.006 },
      links: { website: 'https://nycservice.org', facebook: 'https://facebook.com/nycservice' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 18, flags: 0, createdAt: ts(4), updatedAt: ts(4),
    },
    {
      topicId, name: 'Bay Area Cleanup Crew',
      category: 'Grassroots / Community',
      description: 'Weekly beach and park cleanups across the Bay. All gear provided, no experience needed.',
      location: { city: 'San Francisco', state: 'CA', country: 'US' },
      coordinates: { lat: 37.7749, lng: -122.4194 },
      links: { instagram: 'https://instagram.com/baycleanup', website: 'https://baycleanup.org' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 31, flags: 0, createdAt: ts(0, 1, 30), updatedAt: ts(0, 1, 30),
    },
  ]

  const resources = [
    {
      topicId, title: 'How to Organize a Neighborhood Cleanup',
      url: 'https://www.epa.gov/trash-free-waters/how-conduct-trash-cleanup',
      type: 'guide',
      description: 'Step-by-step EPA guide: planning, permits, volunteer coordination, and waste disposal.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 14, flags: 0, createdAt: ts(6),
    },
    {
      topicId, title: 'Keep America Beautiful — Volunteer Network',
      url: 'https://kab.org/volunteer/',
      type: 'tool',
      description: 'National volunteer portal to find cleanup events in your area and connect with local affiliates.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 9, flags: 0, createdAt: ts(0, 2, 15),
    },
    {
      topicId, title: 'Litterati: Identify and Log the Litter You Pick Up',
      url: 'https://www.litterati.org',
      type: 'tool',
      description: 'App that lets you photograph litter, tag it by brand, and contribute to a global litter dataset.',
      moderationStatus: 'pending_review', submittedBy: 'user_demo3', submittedByDisplayName: 'eco_rachel',
      likes: 0, flags: 0, createdAt: ts(0, 2),
    },
  ]

  const events = [
    {
      topicId, title: 'Austin Earth Day Cleanup',
      date: Timestamp.fromDate(new Date('2026-06-15T09:00:00')),
      endDate: Timestamp.fromDate(new Date('2026-06-15T13:00:00')),
      location: 'Zilker Park, Austin, TX',
      coordinates: { lat: 30.2667, lng: -97.7713 },
      isVirtual: false,
      externalUrl: 'https://keepaustinclean.org/events',
      description: 'Annual Earth Day event — free gloves and bags provided. Meet at the main pavilion.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(5),
    },
    {
      topicId, title: 'National CleanUp Day',
      date: Timestamp.fromDate(new Date('2026-09-19T08:00:00')),
      location: 'Nationwide — find your local event at cleanup.org',
      isVirtual: false,
      externalUrl: 'https://www.cleanup.org',
      description: 'The biggest single-day cleanup event in the US. Events registered in all 50 states.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(3),
    },
  ]

  const challenge = {
    topicId, title: 'Grab 5 Challenge',
    description: 'Every walk is an opportunity. Pick up 5 pieces of litter on your next outing and log it here.',
    actionPrompt: 'Take a photo of your 5 pieces and share where you cleaned up.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 47, createdAt: ts(7),
  }

  const [groupRefs, resourceRefs, eventRefs, challengeRef] = await Promise.all([
    Promise.all(groups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(resources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(events.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), challenge),
  ])

  const mostRecentTs = ts(0, 1, 30)

  const feedItems = [
    { type: 'group',    refId: groupRefs[2].id,    likes: 31, createdAt: ts(0, 1, 30), title: groups[2].name,      description: groups[2].description },
    { type: 'resource', refId: resourceRefs[1].id,  likes: 9,  createdAt: ts(0, 2, 15), title: resources[1].title,  description: resources[1].description, url: resources[1].url },
    { type: 'group',    refId: groupRefs[0].id,    likes: 24, createdAt: ts(5),         title: groups[0].name,      description: groups[0].description },
    { type: 'group',    refId: groupRefs[1].id,    likes: 18, createdAt: ts(4),         title: groups[1].name,      description: groups[1].description },
    { type: 'resource', refId: resourceRefs[0].id, likes: 14, createdAt: ts(6),         title: resources[0].title,  description: resources[0].description, url: resources[0].url },
    { type: 'event',    refId: eventRefs[0].id,    likes: 0,  createdAt: ts(5),         title: events[0].title,     description: events[0].description,    url: events[0].externalUrl },
    { type: 'event',    refId: eventRefs[1].id,    likes: 0,  createdAt: ts(3),         title: events[1].title,     description: events[1].description,    url: events[1].externalUrl },
    { type: 'challenge',refId: challengeRef.id,    likes: 0,  createdAt: ts(7),         title: challenge.title,     description: challenge.description },
  ].map(fi => ({ ...fi, topicId, topicTitle, topicSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(feedItems.map(fi => addDoc(collection(db, 'feed'), fi)))

  await updateDoc(doc(db, 'topics', topicId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: groups.length,
    resourceCount: resources.length,
    eventCount: events.length,
    challengeCount: 1,
    activityScore: 120,
    lastActivityAt: mostRecentTs,
    updatedAt: mostRecentTs,
  })
}

// ─── AMAZON BOYCOTT ───────────────────────────────────────────────────────────
// lastActivityAt target: ~20min ago (most recent in feed)

export async function seedAmazonBoycott(
  userId: string,
  displayName: string,
  parent?: { id: string; slug: string; title: string },
): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  const { id: topicId, title: topicTitle } = await findOrCreateTopic('amazon-boycott', {
    title: 'Amazon Boycott',
    description: 'Coordinating consumer campaigns against Amazon\'s labor practices, anti-competitive behavior, and worker rights violations. Finding alternatives and supporting the workers organizing inside.',
    category: 'Consumer Rights',
    tags: ['boycott', 'corporate-accountability', 'workers-rights', 'consumer-activism'],
    ...(parent ? { parentTopicId: parent.id, parentTopicSlug: parent.slug, parentTopicTitle: parent.title } : {}),
  })
  await wipeTopic(topicId)
  const topicSlug = 'amazon-boycott'

  const groups = [
    {
      topicId, name: 'Amazon Workers United',
      category: 'Grassroots / Community',
      description: 'Independent labor union organizing drive across Amazon warehouses and delivery network. First successful Amazon union in the US.',
      location: { city: 'Staten Island', state: 'NY', country: 'US' },
      coordinates: { lat: 40.5795, lng: -74.1502 },
      links: { website: 'https://amazonlaborunion.org', twitter: 'https://twitter.com/AmazonLabor' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 87, flags: 0, createdAt: ts(0, 0, 20), updatedAt: ts(0, 0, 20),
    },
    {
      topicId, name: 'Shut Down Prime Alliance',
      category: 'Grassroots / Community',
      description: 'Consumer coalition coordinating Prime Day boycotts and building awareness around ethical alternatives to Amazon shopping.',
      location: {},
      links: { instagram: 'https://instagram.com/shutdownprime' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 43, flags: 0, createdAt: ts(0, 1), updatedAt: ts(0, 1),
    },
  ]

  const resources = [
    {
      topicId, title: 'Amazon Labor Union — Official Site',
      url: 'https://amazonlaborunion.org',
      type: 'tool',
      description: 'Resources, updates, and organizing guides from the Amazon Labor Union.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 52, flags: 0, createdAt: ts(0, 2),
    },
    {
      topicId, title: 'How to Quit Amazon: The Complete Guide',
      url: 'https://www.wired.com',
      type: 'guide',
      description: 'Step-by-step alternatives for every Amazon service: shopping, Prime Video, Kindle, AWS-hosted apps, and more.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 38, flags: 0, createdAt: ts(0, 4),
    },
    {
      topicId, title: 'Amazon\'s Monopoly Problem — The Atlantic',
      url: 'https://www.theatlantic.com',
      type: 'article',
      description: 'Long-read investigation into Amazon\'s market dominance, third-party seller treatment, and regulatory capture.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 29, flags: 0, createdAt: ts(0, 6),
    },
  ]

  const events = [
    {
      topicId, title: 'Prime Day Alternatives Fair',
      date: Timestamp.fromDate(new Date('2026-07-11T10:00:00')),
      location: 'Virtual + local chapters',
      isVirtual: true,
      externalUrl: 'https://amazonlaborunion.org',
      description: 'Community market showcasing local and ethical alternatives to Amazon. Simultaneous events in 12 cities.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(0, 8),
    },
  ]

  const challenge = {
    topicId, title: 'Amazon-Free for 30 Days',
    description: 'Go the entire month without buying from Amazon. Log your alternatives — where did you shop instead?',
    actionPrompt: 'Share what you bought and where. Every purchase is a vote.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 312, createdAt: ts(0, 10),
  }

  const [groupRefs, resourceRefs, eventRefs, challengeRef] = await Promise.all([
    Promise.all(groups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(resources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(events.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), challenge),
  ])

  const mostRecentTs = ts(0, 0, 20)

  const feedItems = [
    { type: 'group',    refId: groupRefs[0].id,    likes: 87, createdAt: ts(0, 0, 20), title: groups[0].name,     description: groups[0].description },
    { type: 'group',    refId: groupRefs[1].id,    likes: 43, createdAt: ts(0, 1),     title: groups[1].name,     description: groups[1].description },
    { type: 'resource', refId: resourceRefs[0].id, likes: 52, createdAt: ts(0, 2),     title: resources[0].title, description: resources[0].description, url: resources[0].url },
    { type: 'resource', refId: resourceRefs[1].id, likes: 38, createdAt: ts(0, 4),     title: resources[1].title, description: resources[1].description, url: resources[1].url },
    { type: 'resource', refId: resourceRefs[2].id, likes: 29, createdAt: ts(0, 6),     title: resources[2].title, description: resources[2].description, url: resources[2].url },
    { type: 'event',    refId: eventRefs[0].id,    likes: 0,  createdAt: ts(0, 8),     title: events[0].title,    description: events[0].description,    url: events[0].externalUrl },
    { type: 'challenge',refId: challengeRef.id,    likes: 0,  createdAt: ts(0, 10),    title: challenge.title,    description: challenge.description },
  ].map(fi => ({ ...fi, topicId, topicTitle, topicSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(feedItems.map(fi => addDoc(collection(db, 'feed'), fi)))

  await updateDoc(doc(db, 'topics', topicId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: groups.length,
    resourceCount: resources.length,
    eventCount: events.length,
    challengeCount: 1,
    activityScore: 200,
    lastActivityAt: mostRecentTs,
    updatedAt: mostRecentTs,
  })
}

// ─── DATA CENTERS ─────────────────────────────────────────────────────────────
// lastActivityAt target: ~3h ago

export async function seedDataCenters(userId: string, displayName: string): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  const { id: topicId, title: topicTitle } = await findOrCreateTopic('data-centers', {
    title: 'Data Centers',
    description: 'Tracking the explosive energy and water consumption of AI and cloud data centers. Advocating for renewable energy mandates, water-use disclosure, and community impact accountability.',
    category: 'Technology & Ethics',
    tags: ['tech', 'ai', 'energy', 'climate', 'corporate-accountability'],
  })
  await wipeTopic(topicId)
  const topicSlug = 'data-centers'

  const groups = [
    {
      topicId, name: 'Clean Computing Alliance',
      category: 'Nonprofit',
      description: 'Advocacy group pushing for 100% renewable energy standards and water use caps across the tech industry.',
      location: {},
      links: { website: 'https://cleancomputing.org', twitter: 'https://twitter.com/cleancomputing' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 61, flags: 0, createdAt: ts(0, 3), updatedAt: ts(0, 3),
    },
    {
      topicId, name: 'AI Climate Accountability Watch',
      category: 'University / Research',
      description: 'Researchers and journalists tracking the actual vs. claimed environmental footprint of AI development.',
      location: {},
      links: { website: 'https://aiclimatewatch.org' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 44, flags: 0, createdAt: ts(0, 5), updatedAt: ts(0, 5),
    },
  ]

  const resources = [
    {
      topicId, title: 'AI\'s Thirst Problem: How Data Centers Are Draining Local Water Supplies',
      url: 'https://www.bloomberg.com',
      type: 'article',
      description: 'Investigation into how AI training and inference are driving unprecedented water consumption in drought-prone regions.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 73, flags: 0, createdAt: ts(0, 4),
    },
    {
      topicId, title: 'Greenpeace Clicking Clean Report',
      url: 'https://www.greenpeace.org/usa/reports/click-clean/',
      type: 'government',
      description: 'Annual scorecard of tech companies\' renewable energy use and environmental commitments.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 35, flags: 0, createdAt: ts(0, 6),
    },
    {
      topicId, title: 'Data Center Locator & Ownership Database',
      url: 'https://www.datacentermap.com',
      type: 'tool',
      description: 'Interactive map of data centers worldwide with ownership, capacity, and energy source data.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 28, flags: 0, createdAt: ts(1),
    },
  ]

  const events = [
    {
      topicId, title: 'Tech Climate Accountability Summit 2026',
      date: Timestamp.fromDate(new Date('2026-08-20T09:00:00')),
      location: 'San Francisco, CA + Virtual',
      isVirtual: false,
      externalUrl: 'https://techclimatesummit.org',
      description: 'Annual conference bringing together researchers, regulators, and advocates on AI\'s environmental impact.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(1),
    },
  ]

  const challenge = {
    topicId, title: 'Map a Data Center Near You',
    description: 'Find and document a data center in your area. Submit its location, ownership, and any visible environmental information.',
    actionPrompt: 'Share the address, operator, and any signage or infrastructure you can observe from public space.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 89, createdAt: ts(0, 7),
  }

  const [groupRefs, resourceRefs, eventRefs, challengeRef] = await Promise.all([
    Promise.all(groups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(resources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(events.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), challenge),
  ])

  const mostRecentTs = ts(0, 3)

  const feedItems = [
    { type: 'group',    refId: groupRefs[0].id,    likes: 61, createdAt: ts(0, 3),  title: groups[0].name,     description: groups[0].description },
    { type: 'resource', refId: resourceRefs[0].id, likes: 73, createdAt: ts(0, 4),  title: resources[0].title, description: resources[0].description, url: resources[0].url },
    { type: 'group',    refId: groupRefs[1].id,    likes: 44, createdAt: ts(0, 5),  title: groups[1].name,     description: groups[1].description },
    { type: 'resource', refId: resourceRefs[1].id, likes: 35, createdAt: ts(0, 6),  title: resources[1].title, description: resources[1].description, url: resources[1].url },
    { type: 'challenge',refId: challengeRef.id,    likes: 0,  createdAt: ts(0, 7),  title: challenge.title,    description: challenge.description },
    { type: 'resource', refId: resourceRefs[2].id, likes: 28, createdAt: ts(1),     title: resources[2].title, description: resources[2].description, url: resources[2].url },
    { type: 'event',    refId: eventRefs[0].id,    likes: 0,  createdAt: ts(1),     title: events[0].title,    description: events[0].description,    url: events[0].externalUrl },
  ].map(fi => ({ ...fi, topicId, topicTitle, topicSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(feedItems.map(fi => addDoc(collection(db, 'feed'), fi)))

  await updateDoc(doc(db, 'topics', topicId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: groups.length,
    resourceCount: resources.length,
    eventCount: events.length,
    challengeCount: 1,
    activityScore: 160,
    lastActivityAt: mostRecentTs,
    updatedAt: mostRecentTs,
  })
}

// ─── NEW EARTH COMMUNITIES ────────────────────────────────────────────────────
// lastActivityAt target: ~8h ago

export async function seedNewEarthCommunities(userId: string, displayName: string): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  const { id: topicId, title: topicTitle } = await findOrCreateTopic('new-earth-communities', {
    title: 'New Earth Communities',
    description: 'Finding, building, and connecting intentional communities, ecovillages, and cooperative living experiments worldwide. From urban cohousing to rural permaculture villages.',
    category: 'Community & Sustainability',
    tags: ['ecovillage', 'community', 'sustainability', 'intentional-living', 'cooperative'],
  })
  await wipeTopic(topicId)
  const topicSlug = 'new-earth-communities'

  const groups = [
    {
      topicId, name: 'Global Ecovillage Network',
      category: 'Nonprofit',
      description: 'Worldwide network connecting over 10,000 ecovillages in more than 100 countries. Training, events, and community listings.',
      location: {},
      links: { website: 'https://ecovillage.org', facebook: 'https://facebook.com/gen.ecovillage' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 94, flags: 0, createdAt: ts(0, 8), updatedAt: ts(0, 8),
    },
    {
      topicId, name: 'Foundation for Intentional Community',
      category: 'Nonprofit',
      description: 'Largest North American database of intentional communities — cohousing, communes, ecovillages, and co-ops.',
      location: {},
      links: { website: 'https://www.ic.org', instagram: 'https://instagram.com/intentional.community' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 67, flags: 0, createdAt: ts(0, 10), updatedAt: ts(0, 10),
    },
    {
      topicId, name: 'Transition Towns Network',
      category: 'Grassroots / Community',
      description: 'Community-led initiatives building local resilience and transitioning away from fossil fuels. Active in 50+ countries.',
      location: {},
      links: { website: 'https://transitionnetwork.org' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 51, flags: 0, createdAt: ts(0, 12), updatedAt: ts(0, 12),
    },
  ]

  const resources = [
    {
      topicId, title: 'Finding Your Community: A Visitor\'s Guide',
      url: 'https://www.ic.org/community-bookstore/',
      type: 'guide',
      description: 'How to research, visit, evaluate, and eventually join an intentional community. Covers red flags, questions to ask, and trial membership.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 48, flags: 0, createdAt: ts(0, 9),
    },
    {
      topicId, title: 'Creating a Life Together — Diana Leafe Christian',
      url: 'https://www.ic.org/creating-a-life-together/',
      type: 'guide',
      description: 'Definitive guide to starting an intentional community, based on 30 years of case study research.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 36, flags: 0, createdAt: ts(1),
    },
    {
      topicId, title: 'Cohousing Association of the US',
      url: 'https://www.cohousing.org',
      type: 'tool',
      description: 'Directory and resources for cohousing communities, including a map of projects in development across the US.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 22, flags: 0, createdAt: ts(1, 6),
    },
  ]

  const events = [
    {
      topicId, title: 'Global Ecovillage Convergence 2026',
      date: Timestamp.fromDate(new Date('2026-10-10T09:00:00')),
      location: 'Findhorn, Scotland',
      coordinates: { lat: 57.659, lng: -3.6073 },
      isVirtual: false,
      externalUrl: 'https://ecovillage.org',
      description: 'Annual gathering of ecovillage founders, residents, and seekers from around the world.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(2),
    },
    {
      topicId, title: 'Starting an Intentional Community — Weekend Workshop',
      date: Timestamp.fromDate(new Date('2026-07-18T10:00:00')),
      location: 'Virtual',
      isVirtual: true,
      externalUrl: 'https://www.ic.org/events/',
      description: 'Two-day online workshop covering legal structures, land access, governance, and conflict resolution.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(3),
    },
  ]

  const challenge = {
    topicId, title: 'Visit a Community Near You',
    description: 'Find and visit an intentional community or ecovillage in your region. Document your experience.',
    actionPrompt: 'Share photos, reflections, or a written account of your visit.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 156, createdAt: ts(1),
  }

  const [groupRefs, resourceRefs, eventRefs, challengeRef] = await Promise.all([
    Promise.all(groups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(resources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(events.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), challenge),
  ])

  const mostRecentTs = ts(0, 8)

  const feedItems = [
    { type: 'group',    refId: groupRefs[0].id,    likes: 94, createdAt: ts(0, 8),  title: groups[0].name,     description: groups[0].description },
    { type: 'resource', refId: resourceRefs[0].id, likes: 48, createdAt: ts(0, 9),  title: resources[0].title, description: resources[0].description, url: resources[0].url },
    { type: 'group',    refId: groupRefs[1].id,    likes: 67, createdAt: ts(0, 10), title: groups[1].name,     description: groups[1].description },
    { type: 'group',    refId: groupRefs[2].id,    likes: 51, createdAt: ts(0, 12), title: groups[2].name,     description: groups[2].description },
    { type: 'resource', refId: resourceRefs[1].id, likes: 36, createdAt: ts(1),     title: resources[1].title, description: resources[1].description, url: resources[1].url },
    { type: 'challenge',refId: challengeRef.id,    likes: 0,  createdAt: ts(1),     title: challenge.title,    description: challenge.description },
    { type: 'resource', refId: resourceRefs[2].id, likes: 22, createdAt: ts(1, 6),  title: resources[2].title, description: resources[2].description, url: resources[2].url },
    { type: 'event',    refId: eventRefs[0].id,    likes: 0,  createdAt: ts(2),     title: events[0].title,    description: events[0].description,    url: events[0].externalUrl },
    { type: 'event',    refId: eventRefs[1].id,    likes: 0,  createdAt: ts(3),     title: events[1].title,    description: events[1].description,    url: events[1].externalUrl },
  ].map(fi => ({ ...fi, topicId, topicTitle, topicSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(feedItems.map(fi => addDoc(collection(db, 'feed'), fi)))

  await updateDoc(doc(db, 'topics', topicId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: groups.length,
    resourceCount: resources.length,
    eventCount: events.length,
    challengeCount: 1,
    activityScore: 180,
    lastActivityAt: mostRecentTs,
    updatedAt: mostRecentTs,
  })
}

// ─── CORPORATE FARM ACQUISITIONS ─────────────────────────────────────────────
// lastActivityAt target: ~12h ago

export async function seedCorporateFarmAcquisitions(userId: string, displayName: string): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  const { id: topicId, title: topicTitle } = await findOrCreateTopic('corporate-farm-acquisitions', {
    title: 'Corporate Farm Acquisitions',
    description: 'Exposing and fighting the corporate takeover of American farmland. Supporting family farms, food sovereignty, and local food systems against institutional land grabs.',
    category: 'Agriculture & Food',
    tags: ['agriculture', 'land', 'food-system', 'family-farms', 'corporate-accountability'],
  })
  await wipeTopic(topicId)
  const topicSlug = 'corporate-farm-acquisitions'

  const groups = [
    {
      topicId, name: 'Family Farm Action Alliance',
      category: 'Nonprofit',
      description: 'National coalition defending family farmers against consolidation, corporate contract farming, and land loss.',
      location: { city: 'Washington', state: 'DC', country: 'US' },
      coordinates: { lat: 38.9072, lng: -77.0369 },
      links: { website: 'https://familyfarmaction.org', twitter: 'https://twitter.com/FamilyFarmActn' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 58, flags: 0, createdAt: ts(0, 12), updatedAt: ts(0, 12),
    },
    {
      topicId, name: 'National Farmers Union',
      category: 'Nonprofit',
      description: 'One of the oldest US farm organizations, advocating for fair prices, rural communities, and anti-monopoly policies in agriculture.',
      location: { city: 'Washington', state: 'DC', country: 'US' },
      coordinates: { lat: 38.9072, lng: -77.0369 },
      links: { website: 'https://nfu.org', facebook: 'https://facebook.com/nationalfarmersunion' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 41, flags: 0, createdAt: ts(1), updatedAt: ts(1),
    },
    {
      topicId, name: 'Land Stewardship Project',
      category: 'Nonprofit',
      description: 'Minnesota-based org working on farmland access, beginning farmer programs, and farmer-to-farmer networks in the Upper Midwest.',
      location: { city: 'Minneapolis', state: 'MN', country: 'US' },
      coordinates: { lat: 44.9778, lng: -93.265 },
      links: { website: 'https://landstewardshipproject.org' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 27, flags: 0, createdAt: ts(1, 12), updatedAt: ts(1, 12),
    },
  ]

  const resources = [
    {
      topicId, title: 'Who Owns America\'s Farmland? — The Guardian',
      url: 'https://www.theguardian.com',
      type: 'article',
      description: 'Investigative breakdown of institutional investors, foreign governments, and private equity funds buying up US agricultural land.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 82, flags: 0, createdAt: ts(1, 2),
    },
    {
      topicId, title: 'USDA Agricultural Census Data',
      url: 'https://www.nass.usda.gov/AgCensus/',
      type: 'government',
      description: 'Official USDA census data on farm ownership, consolidation trends, and land value changes over decades.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 34, flags: 0, createdAt: ts(2),
    },
    {
      topicId, title: 'Local Harvest — Find a CSA Near You',
      url: 'https://www.localharvest.org',
      type: 'tool',
      description: 'National directory of Community Supported Agriculture, farmers markets, and direct-to-consumer farms.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 46, flags: 0, createdAt: ts(2, 6),
    },
  ]

  const events = [
    {
      topicId, title: 'Farm Crisis Town Hall — Monthly Virtual Call',
      date: Timestamp.fromDate(new Date('2026-06-18T19:00:00')),
      location: 'Virtual (Zoom)',
      isVirtual: true,
      externalUrl: 'https://familyfarmaction.org/events',
      description: 'Monthly call with farmers and advocates on corporate consolidation in agriculture. Q&A with policy experts.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(1, 12),
    },
  ]

  const challenge = {
    topicId, title: 'Join a CSA This Season',
    description: 'Sign up for a Community Supported Agriculture box from a local farm. Redirect your food budget away from corporate supply chains.',
    actionPrompt: 'Share which farm you joined and what you got in your first box.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 203, createdAt: ts(3),
  }

  const [groupRefs, resourceRefs, eventRefs, challengeRef] = await Promise.all([
    Promise.all(groups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(resources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(events.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), challenge),
  ])

  const mostRecentTs = ts(0, 12)

  const feedItems = [
    { type: 'group',    refId: groupRefs[0].id,    likes: 58, createdAt: ts(0, 12),  title: groups[0].name,     description: groups[0].description },
    { type: 'group',    refId: groupRefs[1].id,    likes: 41, createdAt: ts(1),      title: groups[1].name,     description: groups[1].description },
    { type: 'resource', refId: resourceRefs[0].id, likes: 82, createdAt: ts(1, 2),   title: resources[0].title, description: resources[0].description, url: resources[0].url },
    { type: 'resource', refId: resourceRefs[2].id, likes: 46, createdAt: ts(2),      title: resources[2].title, description: resources[2].description, url: resources[2].url },
    { type: 'group',    refId: groupRefs[2].id,    likes: 27, createdAt: ts(1, 12),  title: groups[2].name,     description: groups[2].description },
    { type: 'event',    refId: eventRefs[0].id,    likes: 0,  createdAt: ts(1, 12),  title: events[0].title,    description: events[0].description,    url: events[0].externalUrl },
    { type: 'resource', refId: resourceRefs[1].id, likes: 34, createdAt: ts(2),      title: resources[1].title, description: resources[1].description, url: resources[1].url },
    { type: 'challenge',refId: challengeRef.id,    likes: 0,  createdAt: ts(3),      title: challenge.title,    description: challenge.description },
  ].map(fi => ({ ...fi, topicId, topicTitle, topicSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(feedItems.map(fi => addDoc(collection(db, 'feed'), fi)))

  await updateDoc(doc(db, 'topics', topicId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: groups.length,
    resourceCount: resources.length,
    eventCount: events.length,
    challengeCount: 1,
    activityScore: 140,
    lastActivityAt: mostRecentTs,
    updatedAt: mostRecentTs,
  })
}

// ─── SOLARPUNK ────────────────────────────────────────────────────────────────
// lastActivityAt target: ~6h ago

export async function seedSolarpunk(userId: string, displayName: string): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  const { id: topicId, title: topicTitle } = await findOrCreateTopic('solarpunk', {
    title: 'Solarpunk',
    description: 'A movement imagining — and building — a future that is both sustainable and joyful. Solar energy, community gardens, mutual aid, and a world where technology serves people and planet.',
    category: 'Community & Sustainability',
    tags: ['solarpunk', 'sustainability', 'community', 'futures', 'mutual-aid'],
  })
  await wipeTopic(topicId)
  const topicSlug = 'solarpunk'

  const groups = [
    {
      topicId, name: 'Solarpunk Magazine',
      category: 'Online Community',
      description: 'Online magazine and community hub publishing solarpunk fiction, theory, and practical guides to building the world we want.',
      location: {},
      links: { website: 'https://solarpunkmagazine.com', instagram: 'https://instagram.com/solarpunkmag' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 77, flags: 0, createdAt: ts(0, 6), updatedAt: ts(0, 6),
    },
    {
      topicId, name: 'Sunflower Alliance',
      category: 'Grassroots / Community',
      description: 'Bay Area coalition linking climate, labor, and environmental justice movements. Community organizing, skill-shares, and direct action.',
      location: { city: 'Oakland', state: 'CA', country: 'US' },
      coordinates: { lat: 37.8044, lng: -122.2712 },
      links: { website: 'https://sunflower-alliance.org', twitter: 'https://twitter.com/SunflowerAllnc' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 55, flags: 0, createdAt: ts(0, 8), updatedAt: ts(0, 8),
    },
    {
      topicId, name: 'Solarpunk NYC',
      category: 'Grassroots / Community',
      description: 'Local chapter running community gardens, tool libraries, repair cafes, and mutual aid networks across New York City.',
      location: { city: 'New York', state: 'NY', country: 'US' },
      coordinates: { lat: 40.7128, lng: -74.006 },
      links: { instagram: 'https://instagram.com/solarpunknyc' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 39, flags: 0, createdAt: ts(0, 11), updatedAt: ts(0, 11),
    },
  ]

  const resources = [
    {
      topicId, title: 'A Solarpunk Manifesto',
      url: 'https://www.re-des.org/a-solarpunk-manifesto/',
      type: 'article',
      description: 'The foundational text of the solarpunk movement — a vision of a sustainable, equitable, and beautiful future.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 104, flags: 0, createdAt: ts(0, 7),
    },
    {
      topicId, title: 'Sunvault: Stories of Solarpunk & Eco-Speculation',
      url: 'https://www.uppingtheanti.org/book-review/sunvault-stories-of-solarpunk-eco-speculation/',
      type: 'guide',
      description: 'Anthology of solarpunk fiction showing what the future could look and feel like. A blueprint through storytelling.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 61, flags: 0, createdAt: ts(1),
    },
    {
      topicId, title: 'Permaculture Research Institute',
      url: 'https://www.permaculturenews.org',
      type: 'tool',
      description: 'Practical guides to permaculture design — the design philosophy at the heart of solarpunk land use.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 43, flags: 0, createdAt: ts(1, 8),
    },
  ]

  const events = [
    {
      topicId, title: 'Solarpunk Summit 2026',
      date: Timestamp.fromDate(new Date('2026-09-05T10:00:00')),
      location: 'Virtual + Regional Hubs',
      isVirtual: true,
      externalUrl: 'https://solarpunkmagazine.com/summit',
      description: 'Annual gathering of solarpunk thinkers, makers, and organizers. Art, workshops, panels, and project showcases.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(2),
    },
    {
      topicId, title: 'Community Solar Workshop',
      date: Timestamp.fromDate(new Date('2026-07-05T13:00:00')),
      location: 'Virtual',
      isVirtual: true,
      externalUrl: 'https://sunflower-alliance.org/events',
      description: 'Learn how to set up a community solar co-op in your neighborhood. Covers financing, permitting, and collective ownership models.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(4),
    },
  ]

  const challenge = {
    topicId, title: 'Build Something Solarpunk',
    description: 'Create one thing — a garden bed, a bird box, a mutual aid flyer, a community shelf — that makes your neighborhood a little more solarpunk.',
    actionPrompt: 'Share a photo and a sentence about what you made and why.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 231, createdAt: ts(1, 4),
  }

  const [groupRefs, resourceRefs, eventRefs, challengeRef] = await Promise.all([
    Promise.all(groups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(resources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(events.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), challenge),
  ])

  const mostRecentTs = ts(0, 6)

  const feedItems = [
    { type: 'group',    refId: groupRefs[0].id,    likes: 77,  createdAt: ts(0, 6),  title: groups[0].name,     description: groups[0].description },
    { type: 'resource', refId: resourceRefs[0].id, likes: 104, createdAt: ts(0, 7),  title: resources[0].title, description: resources[0].description, url: resources[0].url },
    { type: 'group',    refId: groupRefs[1].id,    likes: 55,  createdAt: ts(0, 8),  title: groups[1].name,     description: groups[1].description },
    { type: 'group',    refId: groupRefs[2].id,    likes: 39,  createdAt: ts(0, 11), title: groups[2].name,     description: groups[2].description },
    { type: 'resource', refId: resourceRefs[1].id, likes: 61,  createdAt: ts(1),     title: resources[1].title, description: resources[1].description, url: resources[1].url },
    { type: 'challenge',refId: challengeRef.id,    likes: 0,   createdAt: ts(1, 4),  title: challenge.title,    description: challenge.description },
    { type: 'resource', refId: resourceRefs[2].id, likes: 43,  createdAt: ts(1, 8),  title: resources[2].title, description: resources[2].description, url: resources[2].url },
    { type: 'event',    refId: eventRefs[0].id,    likes: 0,   createdAt: ts(2),     title: events[0].title,    description: events[0].description,    url: events[0].externalUrl },
    { type: 'event',    refId: eventRefs[1].id,    likes: 0,   createdAt: ts(4),     title: events[1].title,    description: events[1].description,    url: events[1].externalUrl },
  ].map(fi => ({ ...fi, topicId, topicTitle, topicSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(feedItems.map(fi => addDoc(collection(db, 'feed'), fi)))

  await updateDoc(doc(db, 'topics', topicId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: groups.length,
    resourceCount: resources.length,
    eventCount: events.length,
    challengeCount: 1,
    activityScore: 190,
    lastActivityAt: mostRecentTs,
    updatedAt: mostRecentTs,
  })
}

// ─── URBAN REWILDING ─────────────────────────────────────────────────────────
// lastActivityAt target: ~16h ago

export async function seedUrbanRewilding(userId: string, displayName: string): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  const { id: topicId, title: topicTitle } = await findOrCreateTopic('urban-rewilding', {
    title: 'Urban Rewilding',
    description: 'Bringing nature back into cities — native plant gardens, pollinator corridors, urban forests, and wildlife habitat in the spaces between buildings. Turning concrete into ecosystems.',
    category: 'Environment',
    tags: ['rewilding', 'nature', 'urban', 'biodiversity', 'native-plants'],
  })
  await wipeTopic(topicId)
  const topicSlug = 'urban-rewilding'

  const groups = [
    {
      topicId, name: 'Rewilding Britain',
      category: 'Nonprofit',
      description: 'Leading UK rewilding charity working with landowners, communities, and governments to restore wild nature at scale.',
      location: { city: 'London', country: 'UK' },
      coordinates: { lat: 51.5074, lng: -0.1278 },
      links: { website: 'https://www.rewildingbritain.org.uk', twitter: 'https://twitter.com/RewildingB' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 83, flags: 0, createdAt: ts(0, 16), updatedAt: ts(0, 16),
    },
    {
      topicId, name: 'American Prairie',
      category: 'Nonprofit',
      description: 'Building the largest nature reserve in the continental US by stitching together private and public land on the Great Plains.',
      location: { city: 'Bozeman', state: 'MT', country: 'US' },
      coordinates: { lat: 45.677, lng: -111.0429 },
      links: { website: 'https://www.americanprairie.org', instagram: 'https://instagram.com/americanprairie' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 62, flags: 0, createdAt: ts(0, 18), updatedAt: ts(0, 18),
    },
    {
      topicId, name: 'Pollinator Pathway',
      category: 'Grassroots / Community',
      description: 'Citizen-science project connecting neighborhoods with native plantings to create migration corridors for bees, butterflies, and birds.',
      location: {},
      links: { website: 'https://www.pollinatorpathway.com' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 48, flags: 0, createdAt: ts(1, 4), updatedAt: ts(1, 4),
    },
  ]

  const resources = [
    {
      topicId, title: 'Native Plant Finder — National Wildlife Federation',
      url: 'https://www.nwf.org/NativePlantFinder/',
      type: 'tool',
      description: 'Enter your zip code to find native plants that support local wildlife. Includes which birds and butterflies each plant supports.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 91, flags: 0, createdAt: ts(0, 17),
    },
    {
      topicId, title: 'Feral — George Monbiot',
      url: 'https://www.monbiot.com/feral/',
      type: 'guide',
      description: 'The definitive book on rewilding — what it means, what\'s possible, and why it matters. Gripping and practical.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 67, flags: 0, createdAt: ts(1, 2),
    },
    {
      topicId, title: 'Rewild.com — Community & Resources',
      url: 'https://www.rewild.org',
      type: 'tool',
      description: 'Platform for rewilders with community forums, project listings, and guides for urban and rural restoration.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 38, flags: 0, createdAt: ts(2),
    },
  ]

  const events = [
    {
      topicId, title: 'UK Rewilding Symposium 2026',
      date: Timestamp.fromDate(new Date('2026-11-14T09:00:00')),
      location: 'London, UK + Virtual',
      coordinates: { lat: 51.5074, lng: -0.1278 },
      isVirtual: false,
      externalUrl: 'https://www.rewildingbritain.org.uk/events',
      description: 'Annual conference bringing together scientists, landowners, policymakers, and community groups on rewilding progress.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(3),
    },
    {
      topicId, title: 'Plant a Native Garden Day',
      date: Timestamp.fromDate(new Date('2026-08-08T08:00:00')),
      location: 'Nationwide — register your yard',
      isVirtual: false,
      externalUrl: 'https://www.nwf.org/garden-for-wildlife',
      description: 'Coordinated day of native planting across the US. Register your yard to be counted in the national map.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(4),
    },
  ]

  const challenge = {
    topicId, title: 'Plant One Native Species',
    description: 'Replace any non-native plant in your yard, balcony, or community space with a locally native species.',
    actionPrompt: 'Share what you planted, where you got it, and any wildlife that\'s already visited.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 178, createdAt: ts(2, 6),
  }

  const [groupRefs, resourceRefs, eventRefs, challengeRef] = await Promise.all([
    Promise.all(groups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(resources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(events.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), challenge),
  ])

  const mostRecentTs = ts(0, 16)

  const feedItems = [
    { type: 'group',    refId: groupRefs[0].id,    likes: 83, createdAt: ts(0, 16), title: groups[0].name,     description: groups[0].description },
    { type: 'resource', refId: resourceRefs[0].id, likes: 91, createdAt: ts(0, 17), title: resources[0].title, description: resources[0].description, url: resources[0].url },
    { type: 'group',    refId: groupRefs[1].id,    likes: 62, createdAt: ts(0, 18), title: groups[1].name,     description: groups[1].description },
    { type: 'resource', refId: resourceRefs[1].id, likes: 67, createdAt: ts(1, 2),  title: resources[1].title, description: resources[1].description, url: resources[1].url },
    { type: 'group',    refId: groupRefs[2].id,    likes: 48, createdAt: ts(1, 4),  title: groups[2].name,     description: groups[2].description },
    { type: 'event',    refId: eventRefs[0].id,    likes: 0,  createdAt: ts(3),     title: events[0].title,    description: events[0].description,    url: events[0].externalUrl },
    { type: 'challenge',refId: challengeRef.id,    likes: 0,  createdAt: ts(2, 6),  title: challenge.title,    description: challenge.description },
    { type: 'resource', refId: resourceRefs[2].id, likes: 38, createdAt: ts(2),     title: resources[2].title, description: resources[2].description, url: resources[2].url },
    { type: 'event',    refId: eventRefs[1].id,    likes: 0,  createdAt: ts(4),     title: events[1].title,    description: events[1].description,    url: events[1].externalUrl },
  ].map(fi => ({ ...fi, topicId, topicTitle, topicSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(feedItems.map(fi => addDoc(collection(db, 'feed'), fi)))

  await updateDoc(doc(db, 'topics', topicId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: groups.length,
    resourceCount: resources.length,
    eventCount: events.length,
    challengeCount: 1,
    activityScore: 170,
    lastActivityAt: mostRecentTs,
    updatedAt: mostRecentTs,
  })
}

// ─── RIGHT TO REPAIR ─────────────────────────────────────────────────────────
// lastActivityAt target: ~20h ago

export async function seedRightToRepair(userId: string, displayName: string): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  const { id: topicId, title: topicTitle } = await findOrCreateTopic('right-to-repair', {
    title: 'Right to Repair',
    description: 'Fighting planned obsolescence and corporate repair monopolies. Advocating for legislation that lets consumers and independent shops fix the products they own.',
    category: 'Consumer Rights',
    tags: ['right-to-repair', 'sustainability', 'consumer-rights', 'electronics', 'waste'],
  })
  await wipeTopic(topicId)
  const topicSlug = 'right-to-repair'

  const groups = [
    {
      topicId, name: 'iFixit',
      category: 'Online Community',
      description: 'Global repair community with 100,000+ free repair guides, a spare parts store, and active lobbying for right-to-repair legislation worldwide.',
      location: { city: 'San Luis Obispo', state: 'CA', country: 'US' },
      coordinates: { lat: 35.2828, lng: -120.6596 },
      links: { website: 'https://www.ifixit.com', twitter: 'https://twitter.com/iFixit' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 112, flags: 0, createdAt: ts(0, 20), updatedAt: ts(0, 20),
    },
    {
      topicId, name: 'Repair Café International',
      category: 'Nonprofit',
      description: 'Network of 2,500+ free repair events worldwide where volunteers help people fix their broken items instead of throwing them away.',
      location: {},
      links: { website: 'https://www.repaircafe.org', instagram: 'https://instagram.com/repaircafe_international' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 78, flags: 0, createdAt: ts(1, 2), updatedAt: ts(1, 2),
    },
    {
      topicId, name: 'US PIRG Right to Repair',
      category: 'Nonprofit',
      description: 'Public interest research group leading the Right to Repair legislative campaign across US states. Tracks bills and coordinates advocacy.',
      location: { city: 'Washington', state: 'DC', country: 'US' },
      coordinates: { lat: 38.9072, lng: -77.0369 },
      links: { website: 'https://pirg.org/campaigns/right-to-repair/', twitter: 'https://twitter.com/USPIRG' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 54, flags: 0, createdAt: ts(1, 8), updatedAt: ts(1, 8),
    },
  ]

  const resources = [
    {
      topicId, title: 'iFixit Repair Guides',
      url: 'https://www.ifixit.com/Guide',
      type: 'tool',
      description: 'Free step-by-step repair guides for phones, laptops, appliances, and more. Written and verified by community members.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 128, flags: 0, createdAt: ts(0, 21),
    },
    {
      topicId, title: 'Right to Repair State Legislation Tracker',
      url: 'https://pirg.org/campaigns/right-to-repair/',
      type: 'tool',
      description: 'Live tracker of right-to-repair bills across all 50 states — status, sponsors, and how to contact your reps.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 76, flags: 0, createdAt: ts(1, 4),
    },
    {
      topicId, title: 'The Story of Electronics — Short Film',
      url: 'https://www.storyofstuff.org/movies/story-of-electronics/',
      type: 'article',
      description: 'Seven-minute documentary on planned obsolescence, e-waste, and why the "designed for the dump" economy needs to change.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 49, flags: 0, createdAt: ts(2),
    },
  ]

  const events = [
    {
      topicId, title: 'National Repair Day 2026',
      date: Timestamp.fromDate(new Date('2026-10-17T10:00:00')),
      location: 'Nationwide — find a local Repair Café',
      isVirtual: false,
      externalUrl: 'https://www.repaircafe.org/en/visit/',
      description: 'Annual day of repair events across the country. Bring your broken items — volunteers will help you fix them for free.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(2, 6),
    },
    {
      topicId, title: 'Right to Repair Day of Action — DC',
      date: Timestamp.fromDate(new Date('2026-07-29T09:00:00')),
      location: 'Washington, DC',
      coordinates: { lat: 38.9072, lng: -77.0369 },
      isVirtual: false,
      externalUrl: 'https://pirg.org/campaigns/right-to-repair/',
      description: 'Lobby day on Capitol Hill. Meet with your Congressional reps to push for federal right-to-repair legislation.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(3),
    },
  ]

  const challenge = {
    topicId, title: 'Fix It Instead',
    description: 'The next time something breaks, fix it instead of replacing it. Use iFixit, a repair café, or your own skills.',
    actionPrompt: 'Share what you fixed, how long it took, and how much you saved (or kept out of the landfill).',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 284, createdAt: ts(1, 6),
  }

  const [groupRefs, resourceRefs, eventRefs, challengeRef] = await Promise.all([
    Promise.all(groups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(resources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(events.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), challenge),
  ])

  const mostRecentTs = ts(0, 20)

  const feedItems = [
    { type: 'group',    refId: groupRefs[0].id,    likes: 112, createdAt: ts(0, 20), title: groups[0].name,     description: groups[0].description },
    { type: 'resource', refId: resourceRefs[0].id, likes: 128, createdAt: ts(0, 21), title: resources[0].title, description: resources[0].description, url: resources[0].url },
    { type: 'group',    refId: groupRefs[1].id,    likes: 78,  createdAt: ts(1, 2),  title: groups[1].name,     description: groups[1].description },
    { type: 'resource', refId: resourceRefs[1].id, likes: 76,  createdAt: ts(1, 4),  title: resources[1].title, description: resources[1].description, url: resources[1].url },
    { type: 'challenge',refId: challengeRef.id,    likes: 0,   createdAt: ts(1, 6),  title: challenge.title,    description: challenge.description },
    { type: 'group',    refId: groupRefs[2].id,    likes: 54,  createdAt: ts(1, 8),  title: groups[2].name,     description: groups[2].description },
    { type: 'resource', refId: resourceRefs[2].id, likes: 49,  createdAt: ts(2),     title: resources[2].title, description: resources[2].description, url: resources[2].url },
    { type: 'event',    refId: eventRefs[0].id,    likes: 0,   createdAt: ts(2, 6),  title: events[0].title,    description: events[0].description,    url: events[0].externalUrl },
    { type: 'event',    refId: eventRefs[1].id,    likes: 0,   createdAt: ts(3),     title: events[1].title,    description: events[1].description,    url: events[1].externalUrl },
  ].map(fi => ({ ...fi, topicId, topicTitle, topicSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(feedItems.map(fi => addDoc(collection(db, 'feed'), fi)))

  await updateDoc(doc(db, 'topics', topicId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: groups.length,
    resourceCount: resources.length,
    eventCount: events.length,
    challengeCount: 1,
    activityScore: 210,
    lastActivityAt: mostRecentTs,
    updatedAt: mostRecentTs,
  })
}

// ─── ETHICAL AI ───────────────────────────────────────────────────────────────
// Bare topic only — no content, simulates a brand-new topic

export async function seedEthicalAI(userId: string, displayName: string): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  const { id: topicId } = await findOrCreateTopic('ethical-ai', {
    title: 'Ethical AI',
    description: 'Advocating for AI systems that are transparent, fair, and accountable. Addressing algorithmic bias, surveillance, autonomous weapons, and who benefits from AI — and who bears its risks.',
    category: 'Technology & Ethics',
    tags: ['ai', 'ethics', 'technology', 'accountability', 'bias'],
  })
  await wipeTopic(topicId)

  const bareTs = ts(1)

  await updateDoc(doc(db, 'topics', topicId), {
    enabledComponents: [],
    groupCount: 0,
    resourceCount: 0,
    eventCount: 0,
    challengeCount: 0,
    activityScore: 0,
    lastActivityAt: bareTs,
    updatedAt: bareTs,
  })
}

// ─── BOYCOTTS (parent + children) ─────────────────────────────────────────────

export async function seedBoycotts(userId: string, displayName: string): Promise<void> {
  SEED_USER = userId
  SEED_NAME = displayName || 'Admin'

  // ── Parent topic ──
  const { id: parentId, title: parentTitle } = await findOrCreateTopic('boycotts', {
    title: 'Boycotts',
    description: 'Tracking and coordinating active consumer boycott campaigns. Find what\'s being boycotted, why, and how to participate — plus alternatives to the brands and products you\'re stepping away from.',
    category: 'Consumer Rights',
    tags: ['boycott', 'consumer-activism', 'corporate-accountability'],
  })
  await wipeTopic(parentId)
  const parentSlug = 'boycotts'

  const parentResources = [
    {
      topicId: parentId, title: 'How Consumer Boycotts Work — And When They Don\'t',
      url: 'https://www.vox.com',
      type: 'article',
      description: 'Analysis of boycott history and effectiveness: the psychology of consumer activism and which conditions make campaigns succeed.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 44, flags: 0, createdAt: ts(0, 0, 15),
    },
    {
      topicId: parentId, title: 'Good On You — Ethical Brand Ratings',
      url: 'https://goodonyou.eco',
      type: 'tool',
      description: 'Rates fashion and consumer brands on environmental impact, labor rights, and animal welfare. Great for finding alternatives.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 31, flags: 0, createdAt: ts(0, 1),
    },
    {
      topicId: parentId, title: 'Behind the Brands — Oxfam Scorecard',
      url: 'https://www.oxfamamerica.org/explore/issues/food-and-hunger/behind-the-brands/',
      type: 'tool',
      description: 'Oxfam scorecard rating the 10 largest food and beverage corporations on social and environmental policies.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 27, flags: 0, createdAt: ts(0, 2),
    },
  ]

  const parentChallenge = {
    topicId: parentId, title: 'Pick One, Skip One — 30 Days',
    description: 'Choose one active boycott from the campaigns below and commit to avoiding that brand or product for 30 days. Document your alternatives.',
    actionPrompt: 'Share which boycott you joined, what you\'re avoiding, and what you\'re using instead.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 521, createdAt: ts(1),
  }

  const [parentResourceRefs, parentChallengeRef] = await Promise.all([
    Promise.all(parentResources.map(r => addDoc(collection(db, 'resources'), r))),
    addDoc(collection(db, 'challenges'), parentChallenge),
  ])

  const parentMostRecentTs = ts(0, 0, 15)
  const parentFeedItems = [
    { type: 'resource', refId: parentResourceRefs[0].id, likes: 44, createdAt: ts(0, 0, 15), title: parentResources[0].title, description: parentResources[0].description, url: parentResources[0].url },
    { type: 'resource', refId: parentResourceRefs[1].id, likes: 31, createdAt: ts(0, 1),     title: parentResources[1].title, description: parentResources[1].description, url: parentResources[1].url },
    { type: 'resource', refId: parentResourceRefs[2].id, likes: 27, createdAt: ts(0, 2),     title: parentResources[2].title, description: parentResources[2].description, url: parentResources[2].url },
    { type: 'challenge', refId: parentChallengeRef.id,  likes: 0,  createdAt: ts(1),         title: parentChallenge.title,    description: parentChallenge.description },
  ].map(fi => ({ ...fi, topicId: parentId, topicTitle: parentTitle, topicSlug: parentSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(parentFeedItems.map(fi => addDoc(collection(db, 'feed'), fi)))
  await updateDoc(doc(db, 'topics', parentId), {
    enabledComponents: ['resources', 'challenges'],
    groupCount: 0,
    resourceCount: parentResources.length,
    eventCount: 0,
    challengeCount: 1,
    activityScore: 100,
    lastActivityAt: parentMostRecentTs,
    updatedAt: parentMostRecentTs,
  })

  const parent = { id: parentId, slug: parentSlug, title: parentTitle }

  // ── Child: Amazon Boycott ──
  await seedAmazonBoycott(userId, displayName, parent)

  // ── Child: Tesla Boycott ──
  const { id: teslaId, title: teslaTitle } = await findOrCreateTopic('tesla-boycott', {
    title: 'Tesla Boycott',
    description: 'Consumer campaigns stepping away from Tesla and SpaceX products in response to Elon Musk\'s political activity and workforce treatment. A growing EV market means real alternatives exist.',
    category: 'Consumer Rights',
    tags: ['boycott', 'tesla', 'elon-musk', 'consumer-activism', 'electric-vehicles'],
    parentTopicId: parentId, parentTopicSlug: parentSlug, parentTopicTitle: parentTitle,
  })
  await wipeTopic(teslaId)
  const teslaSlug = 'tesla-boycott'

  const teslaGroups = [
    {
      topicId: teslaId, name: 'Don\'t Buy Tesla Alliance',
      category: 'Grassroots / Community',
      description: 'Consumer coalition coordinating boycott actions and tracking Tesla sales impacts. Maintains a directory of EV alternatives with side-by-side comparisons.',
      location: {},
      links: { instagram: 'https://instagram.com/dontbuytesl' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 76, flags: 0, createdAt: ts(0, 0, 25), updatedAt: ts(0, 0, 25),
    },
    {
      topicId: teslaId, name: 'EV Owners for Accountability',
      category: 'Grassroots / Community',
      description: 'Network of current and former EV owners — including ex-Tesla owners who have switched — sharing experiences and helping others make the transition.',
      location: {},
      links: { website: 'https://evownersforaccountability.org' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 51, flags: 0, createdAt: ts(0, 1),     updatedAt: ts(0, 1),
    },
  ]

  const teslaResources = [
    {
      topicId: teslaId, title: 'Tesla Alternatives: Every EV Worth Considering in 2026',
      url: 'https://www.caranddriver.com',
      type: 'guide',
      description: 'Comprehensive guide to non-Tesla EVs by price range, range, and use case. Updated quarterly.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 63, flags: 0, createdAt: ts(0, 1, 30),
    },
    {
      topicId: teslaId, title: 'The DOGE Effect: How Musk\'s Political Role Reshaped Tesla Buyers',
      url: 'https://www.nytimes.com',
      type: 'article',
      description: 'Analysis of Tesla\'s sales slump and customer sentiment shift following Musk\'s involvement in government.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 48, flags: 0, createdAt: ts(0, 3),
    },
    {
      topicId: teslaId, title: 'Tesla Worker Safety Record — OSHA Data',
      url: 'https://www.osha.gov',
      type: 'government',
      description: 'OSHA inspection records and injury rate data for Tesla manufacturing facilities.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 29, flags: 0, createdAt: ts(0, 5),
    },
  ]

  const teslaEvents = [
    {
      topicId: teslaId, title: 'EV Alternatives Showcase — Virtual',
      date: Timestamp.fromDate(new Date('2026-06-14T14:00:00')),
      location: 'Virtual (Zoom)',
      isVirtual: true,
      externalUrl: 'https://evownersforaccountability.org/events',
      description: 'Live walkthroughs of Rivian R2, Chevy Equinox EV, Kia EV6, and VW ID.4 with owner Q&A.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(1),
    },
  ]

  const teslaChallenge = {
    topicId: teslaId, title: 'Test Drive a Non-Tesla EV',
    description: 'Visit a dealership and test drive any non-Tesla EV. Share your impressions — is it a viable alternative?',
    actionPrompt: 'Share which car you drove, your honest reaction, and whether it could replace a Tesla for your needs.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 188, createdAt: ts(0, 8),
  }

  const [teslaGroupRefs, teslaResourceRefs, teslaEventRefs, teslaChallengeRef] = await Promise.all([
    Promise.all(teslaGroups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(teslaResources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(teslaEvents.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), teslaChallenge),
  ])

  const teslaMostRecentTs = ts(0, 0, 25)
  const teslaFeedItems = [
    { type: 'group',    refId: teslaGroupRefs[0].id,    likes: 76, createdAt: ts(0, 0, 25), title: teslaGroups[0].name,      description: teslaGroups[0].description },
    { type: 'group',    refId: teslaGroupRefs[1].id,    likes: 51, createdAt: ts(0, 1),     title: teslaGroups[1].name,      description: teslaGroups[1].description },
    { type: 'resource', refId: teslaResourceRefs[0].id, likes: 63, createdAt: ts(0, 1, 30), title: teslaResources[0].title,  description: teslaResources[0].description, url: teslaResources[0].url },
    { type: 'resource', refId: teslaResourceRefs[1].id, likes: 48, createdAt: ts(0, 3),     title: teslaResources[1].title,  description: teslaResources[1].description, url: teslaResources[1].url },
    { type: 'resource', refId: teslaResourceRefs[2].id, likes: 29, createdAt: ts(0, 5),     title: teslaResources[2].title,  description: teslaResources[2].description, url: teslaResources[2].url },
    { type: 'challenge', refId: teslaChallengeRef.id,   likes: 0,  createdAt: ts(0, 8),     title: teslaChallenge.title,     description: teslaChallenge.description },
    { type: 'event',    refId: teslaEventRefs[0].id,    likes: 0,  createdAt: ts(1),         title: teslaEvents[0].title,     description: teslaEvents[0].description, url: teslaEvents[0].externalUrl },
  ].map(fi => ({ ...fi, topicId: teslaId, topicTitle: teslaTitle, topicSlug: teslaSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(teslaFeedItems.map(fi => addDoc(collection(db, 'feed'), fi)))
  await updateDoc(doc(db, 'topics', teslaId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: teslaGroups.length,
    resourceCount: teslaResources.length,
    eventCount: teslaEvents.length,
    challengeCount: 1,
    activityScore: 175,
    lastActivityAt: teslaMostRecentTs,
    updatedAt: teslaMostRecentTs,
  })

  // ── Child: Fast Fashion Boycott ──
  const { id: fashionId, title: fashionTitle } = await findOrCreateTopic('fast-fashion-boycott', {
    title: 'Fast Fashion Boycott',
    description: 'Stepping away from disposable fashion brands to protect garment workers, reduce textile waste, and push back against the cycle of cheap, quickly-discarded clothing.',
    category: 'Consumer Rights',
    tags: ['boycott', 'fashion', 'sustainability', 'workers-rights', 'consumer-activism'],
    parentTopicId: parentId, parentTopicSlug: parentSlug, parentTopicTitle: parentTitle,
  })
  await wipeTopic(fashionId)
  const fashionSlug = 'fast-fashion-boycott'

  const fashionGroups = [
    {
      topicId: fashionId, name: 'Fashion Revolution',
      category: 'Nonprofit',
      description: 'Global movement demanding transparency from fashion brands. Known for #WhoMadeMyClothes campaign. Active in 90+ countries.',
      location: { city: 'London', country: 'UK' },
      links: { website: 'https://www.fashionrevolution.org', instagram: 'https://instagram.com/fash_rev' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 95, flags: 0, createdAt: ts(0, 4), updatedAt: ts(0, 4),
    },
    {
      topicId: fashionId, name: 'Remake',
      category: 'Nonprofit',
      description: 'Advocacy org fighting for living wages and safe conditions for the 80% of garment workers who are women. Campaigns, petitions, and brand scorecards.',
      location: { city: 'San Francisco', state: 'CA', country: 'US' },
      links: { website: 'https://remake.world', instagram: 'https://instagram.com/remakeourworld' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 72, flags: 0, createdAt: ts(0, 6), updatedAt: ts(0, 6),
    },
    {
      topicId: fashionId, name: 'Buy Nothing Project',
      category: 'Grassroots / Community',
      description: 'Hyperlocal gifting and borrowing communities in thousands of neighborhoods. The original anti-consumption network for clothing and goods.',
      location: {},
      links: { website: 'https://buynothingproject.org', facebook: 'https://facebook.com/groups/buynothingproject' },
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 54, flags: 0, createdAt: ts(0, 9), updatedAt: ts(0, 9),
    },
  ]

  const fashionResources = [
    {
      topicId: fashionId, title: 'Good On You — Ethical Fashion Brand Directory',
      url: 'https://goodonyou.eco',
      type: 'tool',
      description: 'Rates 3,000+ fashion brands on environment, labor, and animal welfare. Find ethical alternatives to boycotted fast fashion brands.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 118, flags: 0, createdAt: ts(0, 5),
    },
    {
      topicId: fashionId, title: 'The True Cost — Full Documentary',
      url: 'https://truecostmovie.com',
      type: 'video',
      description: 'Documentary exposing the human and environmental cost of cheap fashion, featuring garment workers in Bangladesh and cotton farmers in Texas.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 87, flags: 0, createdAt: ts(0, 7),
    },
    {
      topicId: fashionId, title: 'How to Build a Capsule Wardrobe',
      url: 'https://www.theguardian.com',
      type: 'guide',
      description: 'Practical guide to reducing your wardrobe to quality essentials. Less buying, less waste, more intention.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      likes: 46, flags: 0, createdAt: ts(1),
    },
  ]

  const fashionEvents = [
    {
      topicId: fashionId, title: 'Fashion Revolution Week 2026',
      date: Timestamp.fromDate(new Date('2026-04-24T00:00:00')),
      endDate: Timestamp.fromDate(new Date('2026-04-30T23:59:59')),
      location: 'Worldwide + Virtual',
      isVirtual: false,
      externalUrl: 'https://www.fashionrevolution.org/get-involved/',
      description: 'Annual week of action on the anniversary of the Rana Plaza factory collapse. Thousands of events worldwide asking brands #WhoMadeMyClothes.',
      moderationStatus: 'live', submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME,
      createdAt: ts(3),
    },
  ]

  const fashionChallenge = {
    topicId: fashionId, title: '30-Day Fashion Fast',
    description: 'Go 30 days without buying any new clothing. Thrift, borrow, repair, or simply go without.',
    actionPrompt: 'Share how you handled a clothing need without buying new — and how much you saved.',
    type: 'individual',
    moderationStatus: 'active', createdBy: SEED_USER,
    participantCount: 403, createdAt: ts(1, 6),
  }

  const [fashionGroupRefs, fashionResourceRefs, fashionEventRefs, fashionChallengeRef] = await Promise.all([
    Promise.all(fashionGroups.map(g => addDoc(collection(db, 'groups'), g))),
    Promise.all(fashionResources.map(r => addDoc(collection(db, 'resources'), r))),
    Promise.all(fashionEvents.map(e => addDoc(collection(db, 'events'), e))),
    addDoc(collection(db, 'challenges'), fashionChallenge),
  ])

  const fashionMostRecentTs = ts(0, 4)
  const fashionFeedItems = [
    { type: 'group',    refId: fashionGroupRefs[0].id,    likes: 95,  createdAt: ts(0, 4), title: fashionGroups[0].name,     description: fashionGroups[0].description },
    { type: 'resource', refId: fashionResourceRefs[0].id, likes: 118, createdAt: ts(0, 5), title: fashionResources[0].title, description: fashionResources[0].description, url: fashionResources[0].url },
    { type: 'group',    refId: fashionGroupRefs[1].id,    likes: 72,  createdAt: ts(0, 6), title: fashionGroups[1].name,     description: fashionGroups[1].description },
    { type: 'resource', refId: fashionResourceRefs[1].id, likes: 87,  createdAt: ts(0, 7), title: fashionResources[1].title, description: fashionResources[1].description, url: fashionResources[1].url },
    { type: 'group',    refId: fashionGroupRefs[2].id,    likes: 54,  createdAt: ts(0, 9), title: fashionGroups[2].name,     description: fashionGroups[2].description },
    { type: 'resource', refId: fashionResourceRefs[2].id, likes: 46,  createdAt: ts(1),    title: fashionResources[2].title, description: fashionResources[2].description, url: fashionResources[2].url },
    { type: 'challenge', refId: fashionChallengeRef.id,   likes: 0,   createdAt: ts(1, 6), title: fashionChallenge.title,    description: fashionChallenge.description },
    { type: 'event',    refId: fashionEventRefs[0].id,    likes: 0,   createdAt: ts(3),    title: fashionEvents[0].title,    description: fashionEvents[0].description, url: fashionEvents[0].externalUrl },
  ].map(fi => ({ ...fi, topicId: fashionId, topicTitle: fashionTitle, topicSlug: fashionSlug, submittedBy: SEED_USER, submittedByDisplayName: SEED_NAME }))

  await Promise.all(fashionFeedItems.map(fi => addDoc(collection(db, 'feed'), fi)))
  await updateDoc(doc(db, 'topics', fashionId), {
    enabledComponents: ['groups', 'resources', 'events', 'challenges'],
    groupCount: fashionGroups.length,
    resourceCount: fashionResources.length,
    eventCount: fashionEvents.length,
    challengeCount: 1,
    activityScore: 185,
    lastActivityAt: fashionMostRecentTs,
    updatedAt: fashionMostRecentTs,
  })
}

// ─── ORCHESTRATOR ─────────────────────────────────────────────────────────────

export async function seedAllTopics(userId: string, displayName: string): Promise<void> {
  await seedBoycotts(userId, displayName)
  await seedTrashCleanups(userId, displayName)
  await seedDataCenters(userId, displayName)
  await seedSolarpunk(userId, displayName)
  await seedNewEarthCommunities(userId, displayName)
  await seedCorporateFarmAcquisitions(userId, displayName)
  await seedUrbanRewilding(userId, displayName)
  await seedRightToRepair(userId, displayName)
  await seedEthicalAI(userId, displayName)
}
