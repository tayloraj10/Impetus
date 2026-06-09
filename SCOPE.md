# Impetus — Scope & Roadmap

> Snapshot as of June 2026. Use this to re-orient after time away from the project.
> For architecture conventions and Firestore schema basics, see [CLAUDE.md](./CLAUDE.md) (note: CLAUDE.md is partially outdated — this file reflects the current codebase).
>
> **Incomplete work:** see [Gaps Register](#gaps-register-codebase-audit) for the full checklist of flagged issues (35 items).

---

## What Impetus Is

Impetus is a web platform that connects people to social-good initiatives. The core idea is not just a directory of causes, but **guided pathways to action**: someone goes from "I care about this issue" to "here's exactly what I can do right now."

The product is democratic and crowd-sourced. Anyone can contribute content; quality is shaped by moderation, community feedback (likes, flags), and social momentum.

**Tone:** Dark UI (zinc-950 + emerald primary + amber accent), mobile-responsive SPA, Firebase backend.

---

## Routes (Current)

| Path | Page | Purpose |
|------|------|---------|
| `/` | HomePage | Topic-grouped activity feed with filters |
| `/topics` | TopicsPage | Browse all topic hubs |
| `/topic/:slug` | TopicPage | Topic hub with pluggable component tabs |
| `/groups` | GroupsPage | Cross-topic group directory |
| `/groups/:id` | GroupPage | Single group detail |
| `/map` | MapPage | Global Leaflet map (groups, events, resources with coordinates) |
| `/calendar` | CalendarPage | Cross-topic event calendar |
| `/search?q=` | SearchPage | Cross-topic search |
| `/definitions` | DefinitionsPage | Civic/policy glossary with user ratings |
| `/profile` | ProfilePage | Own profile (redirects via auth) |
| `/profile/:userId` | ProfilePage | Public profile + contribution history |
| `/admin` | AdminPage | Moderation, topics, categories, definitions (mod/admin) |

---

## Feature Inventory

### Core layers

#### 1. Global feed (`/`)
- Topics ordered by `activityScore`, each showing up to 3 recent feed items
- Desktop: viewport-locked layout with sidebar filters (topic + activity type)
- Mobile: horizontal chip filters
- Activity types shown: groups, resources, events, challenges (map pins not in type filter yet)

#### 2. Topics (`/topics`, `/topic/:slug`)
- Admin-created topic hubs with cover images, tags, descriptions
- **Parent/child topic hierarchy** (sub-topics linked from parent topic page)
- Per-topic **enabled components** (admin configures which tabs appear):
  - **Groups** — orgs with location, social links, optional logo upload
  - **Resources** — articles, videos, gov links, tools, guides, content creators
  - **Events** — externally linked events with date/location, interested/going counts
  - **Challenges** — action prompts; users log participation with optional proof photo
  - **Maps** — topic-specific map pins (Leaflet)

#### 3. Cross-topic views
- **Groups directory** (`/groups`) — filter by topic, like, flag, navigate to group page
- **Global map** (`/map`) — events (amber), groups (emerald), resources (blue); topic + layer toggles
- **Calendar** (`/calendar`) — month view with topic filter and day detail panel
- **Search** (`/search`) — client-side filter across topics, groups, resources, events, challenges
- **Definitions** (`/definitions`) — searchable glossary; 1–5 star ratings per signed-in user

### Authentication
- Google Sign-In
- Email/password (register + sign in)
- Phone OTP
- Email magic link
- Sign-in prompts gate content submission and social actions

### User profiles (`/profile/:userId`)
- View contributions: groups, resources, events, challenge submissions
- Edit display name and profile photo (with crop modal)
- Edit/delete own submissions
- See moderation status (pending, rejected, removed) with reasons
- Danger zone: wipe all contributions, delete account

### Moderation (`/admin`)
- **Pending review queue:** groups, resources, events, map pins
- **Removed content:** groups, resources, events, challenges, map pins — restore or hard-delete
- Approve/reject with optional reason (stored as `moderationReason`)
- Topic CRUD (admin): create/edit, cover image upload, enable components, parent topic assignment
- Group category management (shared labels for group classification)
- Definitions management (admin CRUD)
- Dev-only: seed all topics, wipe content collections

### Social feedback (on content cards)
- **Likes / confirms** on groups, resources, feed items
- **Not helpful** votes on resources
- **Interested / Going** on events
- **Flags** with reason picker (inaccurate, broken link, spam, duplicate, other)
- **Moderate buttons** for mods/admins (remove with reason, hard delete for admins)

### Data & backend
- Firebase Firestore for all data
- Firebase Storage for topic covers, group logos, profile photos, challenge proof images
- All Firebase access through `src/services/` (components never import `firebase/*` directly)
- Real-time subscriptions via `onSnapshot` throughout

---

## Firestore Collections

| Collection | Notes |
|-----------|-------|
| `topics` | Topic hubs + counts + parent refs |
| `feed` | Denormalized feed items written on create |
| `groups` | Keyed by `topicId` |
| `resources` | Keyed by `topicId` |
| `events` | Keyed by `topicId` |
| `challenges` | Moderator-created |
| `challenge_submissions` | User action logs |
| `map_pins` | Topic map layer pins |
| `topic_suggestions` | **Service only — no UI yet** |
| `users` | Profiles + roles |
| `definitions` | Glossary terms |
| `definition_ratings` | Per-user star ratings |
| `categories` | Group category labels |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| `user` | Browse, submit groups/resources/events/map pins, log challenge actions, rate definitions |
| `moderator` | Above + moderation queue, create challenges, remove content |
| `admin` | Above + create/edit topics, manage categories & definitions, hard-delete, dev tools |

Role assignment is currently **manual in Firestore** (`users/{uid}.role`). No in-app UI.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Maps | Leaflet + react-leaflet |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| Hosting | Firebase Hosting |
| Storage | Firebase Storage |

```bash
npm run dev      # localhost:5173
npm run build    # production build
npx tsc --noEmit # type check
firebase deploy  # hosting + rules
```

---

## What's Done vs. What CLAUDE.md Still Lists as Missing

Several items in CLAUDE.md's "What's Not Built Yet" have since been built:

| CLAUDE.md item | Status |
|----------------|--------|
| Moderation queue UI | **Done** — AdminPage |
| Likes on feed items | **Partial** — `FeedCard` has likes, but homepage uses `TopicActivityCard` without likes; `FeedCard` is unused |
| Flag reporting UI | **Done** — `FlagButton` wired; reasons collected in UI but **not persisted** |
| Search | **Done** — client-side, capped at 200 docs/type |
| Maps component | **Done** — per-topic `MapsComponent` + global `/map` (without map pins) |
| Challenge proof upload | **Done** — optional image in submission modal |

Still not built: topic suggestions UI, boycotts, dedicated content creators component, data viz, notifications, React Native.

---

## Gaps Register (Codebase Audit)

> Full list of issues flagged during the June 2026 codebase review. Use as the canonical backlog of incomplete, broken, or missing functionality. Items are grouped by severity; each maps to tasks in [Suggested Dev Tasks](#suggested-dev-tasks) below.

### Production blockers

- [ ] **Firestore rules: missing collections** — `map_pins` and `categories` have no security rules; denied by default once rules are deployed
- [ ] **Firestore rules: social actions blocked** — `groups`, `resources`, `events` only allow `update`/`delete` for moderators, but the app lets any signed-in user like, flag, mark interested/going, not-helpful vote, and edit/delete own content via ProfilePage — all will fail for regular users in production
- [ ] **Firestore rules: map pin CRUD** — users can submit map pins in the UI, but with no `map_pins` rules the entire flow is broken in production
- [ ] **Firestore composite indexes** — search queries (`moderationStatus` + `orderBy createdAt`) and child-topic queries (`parentTopicId`) may fail at runtime without deployed indexes; only two indexes exist in `firestore.indexes.json` today

### Incomplete features (service or UI exists, flow not finished)

- [ ] **Topic suggestion flow** — `suggestTopic()` in `topicsService.ts` writes to `topic_suggestions`, but there is no user-facing submit form (TopicsPage, modal, etc.)
- [ ] **Topic suggestion admin review** — no AdminPage panel to approve/reject suggestions; collection is mod-readable only, users can't track status
- [ ] **Flag reasons not persisted** — `FlagButton` collects reason (inaccurate, broken link, spam, duplicate, other), but handlers only call `increment(flags)`; reason string is discarded and moderators never see it
- [ ] **Feed likes on homepage** — `FeedCard` + `LikeButton` + `likeFeedItem()` are built but `FeedCard` is not rendered anywhere; HomePage uses `TopicActivityCard` with activity rows that have no like actions
- [ ] **Feed ranking algorithm unused** — `subscribeFeed()` applies `hotScore` (likes × 3 + recency boost), but `useFeed` hook is dead code; homepage uses `subscribeRecentFeed` (recency only, no scoring)
- [ ] **Challenge `pending_approval` queue** — type supports the status, but AdminPage has no pending-challenges tab; challenges go `active` immediately when moderators create them
- [ ] **Pre-moderation tier unused** — `pending_approval` is defined for groups/resources/events but user submissions default to `pending_review` (post-moderate); no content type uses true pre-moderation end-to-end
- [ ] **User role management** — roles assigned only by manually editing `users/{uid}.role` in Firestore; no in-app admin UI
- [ ] **Profile: map pin contributions** — profile shows groups, resources, events, challenge submissions but not map pins; no edit/delete for pins from profile
- [ ] **Definitions: user submission** — definitions are admin-created only (AdminPage); public DefinitionsPage is read + rate only, no crowd-sourced term suggestions

### UX / discovery gaps

- [ ] **Search: 200-doc cap per type** — `searchService.ts` fetches max 200 live docs per collection; older content is invisible to search
- [ ] **Search: client-side only** — no server-side full-text or Algolia-style index; entire dataset loaded then filtered in browser
- [ ] **Search: no debounce** — `useSearch` refetches all collections on every query string change
- [ ] **Search: missing entity types** — map pins and definitions are not searchable
- [ ] **Search: weak result links** — group hits link to `/topic/:slug`, not `/groups/:id`; no deep links for individual resources/events/challenges
- [ ] **Global map: no topic map pins** — `/map` shows geocoded groups, events, resources only; `map_pins` from per-topic Maps component are excluded
- [ ] **Homepage: `map_pin` filter missing** — feed items support `map_pin` type but desktop sidebar and mobile chip filters omit it
- [ ] **Mobile navigation** — main nav (Feed, Topics, Groups, Map, Calendar, Definitions, Admin) hidden below `sm`; mobile users get logo + search icon only, no hamburger menu
- [ ] **Like/flag state: localStorage only** — `useLiked` / `useFlag` persist per-user state in browser localStorage, not Firestore; clearing storage allows re-voting; counts can inflate
- [ ] **No approval/rejection notifications** — users see status on ProfilePage if they check, but no email or in-app alert when content is approved, rejected, or removed

### Unbuilt product areas (planned but not started)

- [ ] **Boycotts component** — listed in CLAUDE.md vision, no type/service/UI
- [ ] **Content Creators component** — only exists as a `resource.type` option, not a standalone topic component
- [ ] **Data / Visualizations component** — not started
- [ ] **Admin feed priority boost** — CLAUDE.md mentions admin-prioritized feed items; no `priority` field or ranking logic
- [ ] **Push notifications** — not started
- [ ] **Email digest** — not started
- [ ] **React Native mobile app** — web only; explicitly deferred in CLAUDE.md

### Technical debt & docs

- [ ] **Dead code** — `src/hooks/useFeed.ts` and `src/components/feed/FeedCard.tsx` are unused (unless homepage is re-wired to use them)
- [ ] **CLAUDE.md out of date** — missing routes (`/groups`, `/map`, `/calendar`, `/search`, `/profile`, `/definitions`), services (`searchService`, `mapsService`, `definitionsService`, `categoriesService`, `userService`, `geocodeService`), components (Maps, FlagButton, LikeButton, SignInModal, etc.), and incorrect "not built" backlog
- [ ] **No automated tests** — no E2E or integration tests for auth, submit, or moderate flows
- [ ] **No pagination** — groups directory, search, and topic component lists load full result sets with no cursor/infinite scroll

---

## Suggested Dev Tasks

Organized by theme. Pick based on what you want to ship next.

### Production readiness
- [ ] Fix Firestore rules: `map_pins`, `categories`, owner edits, social counter updates
- [ ] Deploy missing Firestore indexes; verify search queries in production
- [ ] Persist flag reasons (new `flags` subcollection or `flagReports` array field)
- [ ] Server-side per-user like/flag tracking (subcollections or dedicated docs)

### Complete half-finished flows
- [ ] Topic suggestion form (TopicsPage or modal) + admin review panel in AdminPage
- [ ] Wire `FeedCard` likes into homepage OR add likes to `TopicActivityCard`
- [ ] Re-enable feed ranking (`hotScore`) on homepage or document why recency-only is preferred
- [ ] Admin UI for user role management
- [ ] Challenge `pending_approval` queue (if pre-moderation is desired for challenges)

### Search & discovery
- [ ] Add map pins and definitions to search
- [ ] Link group search results to `/groups/:id`
- [ ] Mobile hamburger nav
- [ ] Add map pins layer to global `/map`
- [ ] Add `map_pin` to homepage type filter chips

### Content & components
- [ ] Boycotts component (new topic component type)
- [ ] Standalone Content Creators component (vs. resource type)
- [ ] Data / visualizations component
- [ ] User-submitted definitions (with moderation) vs. admin-only today

### Profile & contributions
- [ ] Profile: show map pin contributions
- [ ] Profile: edit map pins
- [ ] Notification when submission is approved/rejected

### Polish & maintenance
- [ ] Update CLAUDE.md to match current routes, services, and backlog
- [ ] Remove or integrate dead code (`useFeed`, unused `FeedCard`)
- [ ] E2E smoke tests for auth, submit, moderate flows
- [ ] Performance: paginate large lists (groups directory, search)

### Growth (later)
- [ ] Email digest of weekly activity per followed topic
- [ ] Push notifications
- [ ] React Native mobile app

---

## Quick "Where Was I?" Summary

If you were away for ~1 week, the most recent work (per git history) focused on:

1. **Moderation** — reason tracking on approve/reject/remove across content types
2. **Profile page** — contribution management, edit/delete, account deletion
3. **Definitions** — glossary page + admin management + user ratings
4. **Location handling** — structured location refactor across groups/events/resources
5. **Sign-in prompts** — gating actions behind auth across components
6. **Topic hierarchy** — parent/child topics in admin + topic page
7. **Maps** — topic map pins + global map/calendar routes
8. **Groups** — dedicated groups page, group detail page, categories, logo upload

**Most likely next useful task:** fix Firestore security rules (production blocker), then topic suggestion flow (service exists, UI missing), then reconnect feed likes to the homepage.
