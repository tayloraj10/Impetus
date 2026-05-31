# Impetus — Project Source of Truth

## Vision

A platform to connect people to social good initiatives and make it easy to take action. The core problem: people want to help but don't know where to start, and existing resources are scattered across dozens of sites, groups, and apps. Impetus is the centralized infrastructure that ties it all together.

**Core differentiator:** Guided pathways to getting involved. Not just a directory — a place where someone goes from "I care about this" to "here's exactly what I can do right now."

**Tone:** Democratic, crowd-sourced, momentum-driven. Anyone can contribute. The community surfaces what's reliable through social feedback.

---

## Architecture: Three Layers

### 1. Global Feed
Everything in the ecosystem in one stream. Ordered by recency with algorithmic weighting so high-momentum or admin-prioritized items don't get buried. This is the homepage — meant to be an alternative to scrolling social media, but for things that matter.

### 2. Topics
One discrete social good issue per topic (e.g. Trash Cleanups, Ocean Plastic, Data Centers, Company Boycotts). Topics are created by admins only. Users can suggest new ones. Topics should be meaningfully distinct — avoid duplication.

- `Trash Cleanups` = broad activity hub, repository of all cleanup groups worldwide
- `Ocean Plastic` = narrower issue, resources and orgs for something harder to act on directly
- When in doubt: would these communities overlap heavily? If yes, merge. If no, keep separate.

### 3. Components
Pluggable modules that attach to a topic. Not every component makes sense for every topic — admins configure which are enabled per topic.

**MVP components (built):**
- **Groups** — orgs and groups working on this issue, with location + social links
- **Resources** — articles, videos, government links, tools, guides
- **Events** — externally-linked events with date/location
- **Challenges** — action prompts where users can log participation and submit proof

**Future components (not yet built):**
- **Maps** — geographic data layers (e.g. data center locations, cleanup sites)
- **Content Creators** — social media accounts posting about the issue
- **Boycotts** — active campaigns with tracking
- **Data / Visualizations** — charts and stats about the issue

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | React + Vite + TypeScript | Modern, fast, great DX |
| Styling | Tailwind CSS v4 | Utility-first, responsive out of the box |
| Database | Firebase Firestore | Real-time out of the box, generous free tier, no cold starts |
| Auth | Firebase Auth (Google Sign-In) | Already have Firebase project, easy to set up |
| Hosting | Firebase Hosting | Everything in one place |
| Fonts | Inter via Google Fonts | Clean, readable |

**Firebase project:** `impetus-a9558`

### Backend Separation Principle
All Firestore/Firebase calls go through `src/services/`. React components never import from `firebase/*` directly. This means if we ever swap Firebase for a different backend, only the service layer changes.

```
src/config/firebase.ts     ← only place Firebase app is initialized
src/services/              ← all Firestore reads/writes live here
src/hooks/                 ← React hooks that wrap services
src/components/            ← never import firebase directly
```

---

## Firestore Collections

| Collection | Description |
|-----------|-------------|
| `topics` | Topic hub documents |
| `feed` | Denormalized feed items (written alongside every create) |
| `groups` | Groups, keyed by topicId |
| `resources` | Resources, keyed by topicId |
| `events` | Events, keyed by topicId |
| `challenges` | Challenges, keyed by topicId |
| `challenge_submissions` | User action logs |
| `topic_suggestions` | User-submitted topic ideas |
| `users` | User profiles + roles |

---

## Moderation Tiers

Three levels of content moderation:

1. **Live immediately** — goes public instantly (e.g. challenge action submissions)
2. **Post-moderate** (`pending_review`) — live immediately, moderator reviews async, can remove
3. **Pre-moderate** (`pending_approval`) — held in queue, requires admin sign-off before going live

Currently groups and resources default to `pending_review`. This can be tightened per content type as needed.

---

## User Roles

| Role | Capabilities |
|------|-------------|
| `user` | Browse, submit groups/resources/events, log challenge actions |
| `moderator` | Everything above + moderation queue, create challenges |
| `admin` | Everything above + create/edit topics, set user roles |

To make yourself admin: find your user document in Firestore (`users/{uid}`) and set `role: "admin"`.

---

## Feed Ranking

Feed items are fetched newest-first (limit 60), then client-side scored:

```
score = likes × 3 + max(0, 48 - ageInHours) × 2
```

Items with lots of recent likes float up. Items older than 48 hours get no recency boost. Future: admin priority boost field.

---

## Content Philosophy

- **Light and dark:** Topics can show both what's wrong (the problem) and what's being done (the progress). Don't only highlight wins — bring awareness to issues so they can be addressed.
- **No niche:** Impetus is broadly encompassing. Environment, health, social justice, civic issues — all welcome.
- **Anti-silo:** The point is to connect existing groups, not compete with them. Link out generously. Groups keep their own communities; Impetus is the connective tissue.
- **Democratic:** Anyone can contribute content. Quality is enforced through moderation + social feedback (likes, flags, inaccurate reports), not gatekeeping.

---

## UI Principles

- Dark theme, zinc-950 background, emerald-500 primary, amber-500 accent
- Smooth, modern, no clutter
- Mobile-responsive from day one (web only for now, React Native later if needed)
- Single page app with React Router — no full page reloads

---

## Project Structure

```
impetus/
├── src/
│   ├── config/firebase.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── topicsService.ts
│   │   ├── feedService.ts
│   │   ├── groupsService.ts
│   │   ├── resourcesService.ts
│   │   ├── eventsService.ts
│   │   └── challengesService.ts
│   ├── hooks/
│   │   ├── useAuth.tsx       ← AuthProvider + useAuth hook
│   │   ├── useFeed.ts
│   │   └── useTopics.ts      ← useTopics + useTopic
│   ├── types/index.ts
│   ├── utils/time.ts
│   ├── components/
│   │   ├── ui/               ← Button, Badge, Spinner, Modal
│   │   ├── layout/Header.tsx
│   │   ├── feed/FeedCard.tsx
│   │   └── topic-components/
│   │       ├── GroupsComponent.tsx
│   │       ├── ResourcesComponent.tsx
│   │       ├── EventsComponent.tsx
│   │       └── ChallengesComponent.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── TopicsPage.tsx
│   │   ├── TopicPage.tsx
│   │   └── AdminPage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── CLAUDE.md
```

---

## Routes

| Path | Page |
|------|------|
| `/` | Global feed + topic/type filters |
| `/topics` | Topic grid |
| `/topic/:slug` | Topic hub with component tabs |
| `/admin` | Admin panel (role-gated) |

---

## What's Not Built Yet (Ordered by Priority)

1. **Moderation queue UI** — admin page to approve/reject pending content
2. **Topic suggestion flow** — user-facing form to suggest a new topic
3. **Likes on feed items** — currently tracked on source docs, not wired to feed cards
4. **Inaccurate/flag reporting UI** — service exists, no UI yet
5. **Search** — cross-topic search for groups, resources, etc.
6. **Maps component** — geographic data layer per topic
7. **Content Creators component**
8. **Boycotts component**
9. **Data/Visualizations component**
10. **Image upload for challenge submissions** — Firebase Storage needed
11. **Push notifications / email digest**
12. **React Native mobile app** (future, after web is solid)

---

## Dev Commands

```bash
npm run dev      # start dev server at localhost:5173
npm run build    # production build
npm run preview  # preview production build
npx tsc --noEmit # type check
```

## Deploy

Firebase Hosting. Run `firebase deploy` (requires Firebase CLI and login).
