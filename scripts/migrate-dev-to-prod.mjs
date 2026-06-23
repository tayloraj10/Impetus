// One-off tooling to selectively copy data from the 'impetus-dev' Firestore
// database into the '(default)' (prod) database — both live inside the same
// Firebase project (impetus-a9558), so this never crosses projects.
//
// Setup (run once):
//   npm install --save-dev firebase-admin
//   Auth via ONE of:
//     - gcloud auth application-default login   (uses your own IAM permissions)
//     - GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
//   Your account/service account needs Firestore read/write on the project.
//
// Commands:
//   node scripts/migrate-dev-to-prod.mjs export
//     Dumps dev 'topics' and 'definitions' collections to scripts/_export/*.json
//     (gitignored) so they can be inspected before any writes happen.
//
//   node scripts/migrate-dev-to-prod.mjs add-definitions [--commit]
//     Reads scripts/_export/new-definitions.json and creates any term that
//     doesn't already exist (case-insensitive) in the DEV 'definitions'
//     collection. Dry-run by default — pass --commit to actually write.
//
//   node scripts/migrate-dev-to-prod.mjs migrate [--commit] [--overwrite]
//     Copies the allow-listed topics (see TOPIC_TITLES below) plus any of
//     their subtopics from dev -> prod, with all components stripped
//     (enabledComponents: [], counts zeroed). Copies ALL 'definitions' docs
//     dev -> prod. Never touches groups/resources/events/challenges/maps.
//     Dry-run by default — pass --commit to actually write. By default,
//     anything that already exists in prod (matched by slug/term) is left
//     alone; pass --overwrite to replace it anyway.

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const PROJECT_ID = 'impetus-a9558'
const EXPORT_DIR = path.join(import.meta.dirname, '_export')

const TOPIC_TITLES = [
  'Right to Repair',
  'Boycotts',
  'Solarpunk',
  'New Earth Communities',
  'Urban Rewilding',
  'Data Centers',
  'Corporate Farm Acquisitions',
  'Trash Cleanup',
  'Ethical AI',
]

const args = process.argv.slice(2)
const command = args[0]
const flags = new Set(args.slice(1))
const COMMIT = flags.has('--commit')
const OVERWRITE = flags.has('--overwrite')

const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
const devDb = getFirestore(app, 'impetus-dev')
const prodDb = getFirestore(app)

function serialize(data) {
  const out = {}
  for (const [k, v] of Object.entries(data)) {
    out[k] = v instanceof Timestamp ? { __ts__: v.toDate().toISOString() } : v
  }
  return out
}

function deserialize(data) {
  const out = {}
  for (const [k, v] of Object.entries(data)) {
    out[k] = v && typeof v === 'object' && '__ts__' in v ? Timestamp.fromDate(new Date(v.__ts__)) : v
  }
  return out
}

async function cmdExport() {
  mkdirSync(EXPORT_DIR, { recursive: true })

  const topicsSnap = await devDb.collection('topics').get()
  const topics = topicsSnap.docs.map(d => ({ id: d.id, ...serialize(d.data()) }))
  writeFileSync(path.join(EXPORT_DIR, 'topics.json'), JSON.stringify(topics, null, 2))

  const defsSnap = await devDb.collection('definitions').get()
  const definitions = defsSnap.docs.map(d => ({ id: d.id, ...serialize(d.data()) }))
  writeFileSync(path.join(EXPORT_DIR, 'definitions.json'), JSON.stringify(definitions, null, 2))

  console.log(`Exported ${topics.length} topics -> scripts/_export/topics.json`)
  console.log(`Exported ${definitions.length} definitions -> scripts/_export/definitions.json`)
  console.log('\nTopic titles found:')
  topics.forEach(t => console.log(`  - ${t.title}${t.parentTopicTitle ? ` (subtopic of ${t.parentTopicTitle})` : ''}`))
  console.log('\nDefinition terms found:')
  definitions.forEach(d => console.log(`  - ${d.term}`))
}

async function cmdAddDefinitions() {
  const file = path.join(EXPORT_DIR, 'new-definitions.json')
  if (!existsSync(file)) {
    console.error(`Missing ${file} — run 'export' first and add this file.`)
    process.exit(1)
  }
  const newDefs = JSON.parse(readFileSync(file, 'utf-8'))

  const existingSnap = await devDb.collection('definitions').get()
  const existingTerms = new Set(existingSnap.docs.map(d => (d.data().term || '').trim().toLowerCase()))

  let created = 0
  let skipped = 0
  for (const def of newDefs) {
    const key = def.term.trim().toLowerCase()
    if (existingTerms.has(key)) {
      console.log(`SKIP (exists): ${def.term}`)
      skipped++
      continue
    }
    console.log(`${COMMIT ? 'CREATE' : '[dry-run] would create'}: ${def.term}`)
    if (COMMIT) {
      const now = Timestamp.now()
      await devDb.collection('definitions').add({
        term: def.term.trim(),
        definition: def.definition.trim(),
        extendedNote: def.extendedNote?.trim() || null,
        example: def.example?.trim() || null,
        category: def.category,
        categoryOther: def.categoryOther || null,
        relatedTerms: def.relatedTerms ?? [],
        createdBy: 'impetus-team',
        status: 'live',
        ratingSum: 0,
        ratingCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      existingTerms.add(key)
    }
    created++
  }
  console.log(`\n${COMMIT ? 'Created' : 'Would create'} ${created}, skipped ${skipped} (already existed).`)
  if (!COMMIT) console.log('Re-run with --commit to write these to dev.')
}

async function cmdMigrate() {
  const topicsSnap = await devDb.collection('topics').get()
  const allTopics = topicsSnap.docs.map(d => ({ id: d.id, data: d.data() }))

  const wantedTitles = new Set(TOPIC_TITLES.map(t => t.toLowerCase()))
  const roots = allTopics.filter(t => wantedTitles.has((t.data.title || '').toLowerCase()))
  const rootIds = new Set(roots.map(t => t.id))
  const subtopics = allTopics.filter(t => t.data.parentTopicId && rootIds.has(t.data.parentTopicId))

  const toCopy = [...roots, ...subtopics]
  console.log(`Found ${roots.length} root topics + ${subtopics.length} subtopics = ${toCopy.length} topics to copy.`)

  const missing = TOPIC_TITLES.filter(title => !roots.some(r => (r.data.title || '').toLowerCase() === title.toLowerCase()))
  if (missing.length) console.warn(`WARNING: not found in dev: ${missing.join(', ')}`)

  for (const { id, data } of toCopy) {
    const prodRef = prodDb.collection('topics').doc(id)
    const existing = await prodRef.get()
    if (existing.exists && !OVERWRITE) {
      console.log(`SKIP (already in prod): ${data.title}`)
      continue
    }
    const stripped = {
      ...data,
      enabledComponents: [],
      mapPinTypes: [],
      mapPinsAutoApprove: false,
      groupCount: 0,
      resourceCount: 0,
      eventCount: 0,
      challengeCount: 0,
      mapPinCount: 0,
      activityScore: 0,
      lastActivityAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
    console.log(`${COMMIT ? 'WRITE' : '[dry-run] would write'} topic: ${data.title}${data.parentTopicTitle ? ` (subtopic of ${data.parentTopicTitle})` : ''}`)
    if (COMMIT) await prodRef.set(stripped)
  }

  const defsSnap = await devDb.collection('definitions').get()
  console.log(`\nFound ${defsSnap.size} definitions to copy.`)
  for (const docSnap of defsSnap.docs) {
    const data = docSnap.data()
    const prodRef = prodDb.collection('definitions').doc(docSnap.id)
    const existing = await prodRef.get()
    if (existing.exists && !OVERWRITE) {
      console.log(`SKIP (already in prod): ${data.term}`)
      continue
    }
    const copy = { ...data, ratingSum: 0, ratingCount: 0, updatedAt: Timestamp.now() }
    console.log(`${COMMIT ? 'WRITE' : '[dry-run] would write'} definition: ${data.term}`)
    if (COMMIT) await prodRef.set(copy)
  }

  if (!COMMIT) console.log('\nDry run only — re-run with --commit to actually write to prod.')
}

switch (command) {
  case 'export': await cmdExport(); break
  case 'add-definitions': await cmdAddDefinitions(); break
  case 'migrate': await cmdMigrate(); break
  default:
    console.error('Usage: node scripts/migrate-dev-to-prod.mjs <export|add-definitions|migrate> [--commit] [--overwrite]')
    process.exit(1)
}
