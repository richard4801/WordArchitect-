# CLAUDE.md — WordArchitect

Guidance for any agent (or human) working in this repo, and the reference
document for the backend team building the API this frontend will consume.
Read this first, then `DESIGN_SYSTEM.md` for the visual spec.

This edition is written specifically for backend handoff: for every
page/feature it documents the exact data shape in use today (real
TypeScript types, not paraphrases), where the mock data backing it lives,
which fields are actually settable through a UI form today vs. only present
in seed data, and any existing API-client/provider code.

**Backend integration is underway — see §3.5 for live status.** The real
backend (`richard4801/WordArchitect-Backend-`) is deployed and Project is
now wired to it for real; everything else below is still the mock
in-memory-array pattern §3.5 also explains, pending its own turn in the
same integration pass. Read §3.5 before touching any store — it has the
current source of truth for what's real versus still mock, which will
keep changing as more domains get wired.

**The app has been purged (all 5 domains).** Every seed array described in
§4 (`projects`, `CHARACTERS`, `WORLD_ENTRIES`/`WORLD_TIMELINE`/
`WORLD_OVERVIEW`/`PINNED_WORLD_ITEMS`, `NOTES`, the shadows-of-elarion
manuscript/outline content) has been emptied to `[]` (or zeroed, for
`WORLD_OVERVIEW`'s numeric fields) in the actual source files — the type
shapes documented below are still exactly accurate, only the demo content
is gone. The app now boots into every page's genuine empty/new-user state
(the Dashboard's "Let's Get You Started" onboarding variant, "No projects
yet" on every full-bleed workspace redirect, empty grids/lists everywhere
else) rather than the shadows-of-elarion demo data. This was intentional,
done ahead of the real backend connection, so the current build is a clean
slate to develop and test the real integration against — not a bug, and
not something to restore mock content for.

**Post-purge follow-up fix:** the purge initially left one class of bug —
Dashboard widgets that hardcoded a reference to the now-deleted
`shadows-of-elarion` project id instead of reading live data. Specifically,
`dashboard-data.ts`'s `continueWriting` export (id, title, chapter, word
counts) was a fully static object always pointing at
`/projects/shadows-of-elarion/...`; once a real project was created, the
Dashboard's "Continue Writing" card still showed the old demo project and
its "Resume Writing"/"Open Project" buttons linked to a project that no
longer existed (landing on the "Project not found" page). This has been
fixed: `ContinueWritingCard` (`src/app/(app)/page.tsx`) now takes a real
`Project` — the most-recently-updated one from `useProjects()`, same
"lowest `updatedRank` wins" convention the top-level workspace redirect
pages already use — and derives title/chapter-label/word-count/links from
it live. The `continueWriting` mock export has been deleted entirely (no
longer needed). `aiInsights`' `linkHref`s were also hardcoded to
`/projects/shadows-of-elarion/...`; they now point at the top-level
workspace redirects (`/writing`, `/characters`) which always resolve to
whichever real project actually exists, and the one insight referencing
the now-deleted "Kaelen Duskryn" by name was reworded generically. The
`activity` mock feed (also all shadows-of-elarion flavor text) was emptied
to `[]` with a proper "No activity yet" empty state added to `ActivityCard`
rather than left showing fabricated history.

**Second post-purge fix — the earlier "mock-widget decision" above is now
superseded; nothing on the Dashboard fabricates numbers anymore.** Two
more problems surfaced after the first fix:

1. **"Create Your First Project" bypassed the real form entirely.**
   `GetStartedCard`'s primary card (`src/app/(app)/page.tsx`) had a
   `directCreate` path that called `createProject({ title: "Untitled
   Project", genre: "Fiction" })` directly on click and navigated straight
   into the new project — skipping `/projects/new` (title/genre/POV/tense/
   template selection) altogether. This is why a project called
   "Untitled Project" / "untitled-project" could appear without the user
   ever filling anything in. Fixed: that card is now a plain `Link` to
   `/projects/new` like every other action on the page. The `directCreate`
   flag, `handleQuickCreate()`, and the now-unused `createProject`/
   `useRouter` imports were removed from `page.tsx` entirely — the only
   way to create a project anywhere in the app is now the real form.
2. **The remaining Dashboard mock widgets still showed fabricated
   numbers** (Today's Progress: 1,250/2,000 words, a 12-day streak, ~20
   filled calendar days; Weekly Stats: 24,560 words written, 8h 45m
   writing time; Writing Goal: 24,560/50,000, 78% consistency) even
   though zero real writing activity had ever happened. These are now
   honestly zeroed in `dashboard-data.ts` (`todaysProgress`, `weeklyStats`,
   `writingGoal`) rather than showing invented activity — `words: 0`,
   `streakDays: 0`, `activeDays: []`, `wordsWritten.value: 0`, etc. The
   Characters/World Entries stat tiles' fake "3 this week"/"7 this week"
   captions were removed (those tiles' totals were already live; only the
   trend caption was fabricated, so it's gone rather than faked). None of
   this data has a real backend resource yet (see §4.7) — it now reads as
   an honest empty state instead of a populated demo.

**Third post-purge pass — full-app audit for crashes and fabricated data
on a genuinely empty project** (every seed array at `[]`, which the first
two passes hadn't fully exercised). Found and fixed:

- **Crash: Characters workspace on a project with zero characters.**
  `src/app/(app)/projects/[id]/characters/page.tsx` initialized
  `selectedId` from `characters[0].id` — threw immediately once
  `CHARACTERS` could actually be empty. Fixed to `characters[0]?.id ??
  null`, and the right-hand detail pane now shows a proper "No characters
  yet" + New Character CTA instead of rendering nothing next to the list.
- **Crash: Outliner's "Add Beat" on a project with zero acts.**
  `src/app/(app)/projects/[id]/outlines/page.tsx` called `addBeat(acts[0].id)`
  — threw once `THREE_ACT_STRUCTURE` was purged to `[]`. Fixed at the
  source: `outline-data.ts` keeps the three Act *containers* (Act I/II/III
  — structural scaffolding every beat needs a home in) even though all
  purging removed their beats. Acts are structure, not seed content — same
  distinction already applied to Worldbuilding's fixed 8-category taxonomy,
  which was correctly left untouched by the original purge.
- **Fabricated stats, found beyond the Dashboard:** the Outliner's "Outline
  Progress" ring was hardcoded `76%` / `38 of 50 beats` regardless of
  actual beat count — now computed live from `allBeats.length` and each
  beat's real `status`. The manuscript editor's side-panel "Daily Goal"
  widget was hardcoded `1,125 / 1,500 words, 12-day streak` — zeroed
  honestly (no session-tracking backend exists yet, same as Dashboard's
  Today's Progress). The manuscript editor's own word/character count in
  the status bar was seeded from a fixed fake baseline (4,580 words /
  26,789 characters) that live edits added deltas onto, regardless of the
  chapter's actual content — now computed for real from the open chapter's
  actual body text (`bodyBaseline` in `chapters/page.tsx`), so a brand-new
  placeholder chapter correctly shows a small real count instead of a
  fictional "whole manuscript so far" number.
- **Missing empty states:** `AchievementsCard` and `TopGenresCard` on
  `/projects` iterated `achievements`/`topGenres()` with no fallback —
  harmless once those arrays could be empty (just rendered nothing) but
  inconsistent with every other list on the purged app; both now show a
  proper empty-state message.
- **Non-functional zoom control, now real:** the manuscript editor's
  toolbar zoom control was a static "120%" label with no-op Minus/Plus
  buttons. Wired to an actual `zoomPercent` state that scales the editor's
  font size (50–200%, ±10 per click) — this was a "doesn't actually work"
  UX gap independent of the purge, caught in the same sweep.
- **Known gap, deliberately not patched locally:** the manuscript editor's
  "Add chapter" button (`ManuscriptPanel`, the `+` icon next to the search
  icon) has no handler — a brand-new project (`chapters: 0`) has no way to
  ever get a first chapter today, so its Writing workspace is permanently
  stuck on "This project doesn't have any chapters yet." This is real and
  worth knowing, but it wasn't given a throwaway local mock-store fix here:
  chapter creation is about to be wired directly to the real backend's
  `POST /manuscript/chapters` (see the backend integration section once
  added), and building disposable local state for it first would just be
  redone immediately after.

---

## 1. What this is

**WordArchitect** is a production web app: an AI-assisted studio for novelists
(projects, characters, worldbuilding, outlines, writing, with AI at the
writer's side). Tagline: **"Write. Craft. Conquer."**

- Product name is WordArchitect (the repo name).
- Live on Vercel: **word-architect-three.vercel.app** (auto-deploys on every
  push to the working branch).
- Built and polished: Dashboard, Projects, New Project, Project Overview tab,
  and five full workspaces — Writing (manuscript editor), Outliner,
  Characters, Worldbuilding, Notes.
- Still stubbed (`<ComingSoon>`, no data model at all yet): Project
  Analytics tab, Project Settings tab, and the top-level Timeline/AI
  Assistant/Templates/Goals/Help nav destinations.
- **The single most important gap:** the manuscript editor's prose is a
  `contentEditable` DOM region wired to zero persistence. There is no
  chapter-body save/load anywhere in the app today — see §5.

## 2. Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js **16.2.11**, App Router, Turbopack, React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (config lives in `src/app/globals.css`, no `tailwind.config.js`) |
| Icons | `lucide-react` |
| AI | Provider-agnostic abstraction, Anthropic/Claude default (`@anthropic-ai/sdk`) — see §6 |

```bash
npm run dev      # local dev server
npm run build    # production build
npm run lint     # eslint
```

No test suite exists. No database, no ORM, no auth are wired up yet.

---

## 3. The mock-store pattern (what the backend replaces)

Every domain below (Projects, Characters, Worldbuilding categories, Notes)
follows one pattern, split across two files:

- **`lib/<domain>-data.ts`** — the TypeScript type(s) for the entity, plus a
  hardcoded seed array (`export const X: Type[] = [...]`).
- **`lib/<domain>-store.ts`** — a tiny in-memory reactive store wrapping that
  array via React's `useSyncExternalStore`:
  ```ts
  let items: Entity[] = [...seedItems];
  const listeners = new Set<() => void>();
  function emit() { for (const l of listeners) l(); }
  function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
  function getSnapshot() { return items; }
  export function useX(): Entity[] { return useSyncExternalStore(subscribe, getSnapshot, getSnapshot); }
  export function createX(input: NewXInput): string { items = [newItem, ...items]; emit(); return newItem.id; }
  ```
  State is **module-level**: it persists across client-side navigation
  (SPA routing) but **resets on a hard page refresh** — there is no
  persistence layer of any kind.

This is the exact seam a real backend replaces. Every page already calls
`useProjects()`, `useCharacters()`, `createNote()`, etc. — swapping each
store's internals for real `fetch` calls against a REST/GraphQL API (plus
loading/error states) should not require touching the UI components
themselves.

**No API client exists yet.** The only network-calling code in the entire
frontend is the single AI proxy route described in §6. There are zero
`fetch()` calls anywhere else in the codebase — confirmed by search. Every
`create*`/`update*`/`toggle*` function today mutates the in-memory array
directly and returns synchronously (no `Promise`, no error path, no loading
state) — the backend team should expect the frontend to need those call
sites converted to `async` with loading/error handling once real endpoints
exist.

**Two domains have no store yet, seed data only:** the Outliner
(`outline-data.ts`) and the Manuscript editor's structure/body content
(`manuscript-data.ts`) — see §5. Nothing in the UI currently creates or
edits outline beats or manuscript structure, and the editor's own prose
isn't read from `manuscript-data.ts` after initial mount at all — see §5's
persistence-gap note.

---

## 3.5. Backend integration status

The real backend is `richard4801/WordArchitect-Backend-` — see its own
`CLAUDE.md` for the authoritative schema/endpoint reference (kept in sync
with its code). Base URL: `https://wordarchitect-backend.onrender.com`,
every route prefixed `/api/v1`. Render's free tier cold-starts after
inactivity — the first request after a quiet period can take several
seconds; every page consuming `useProjects()` (and, as each domain below
gets wired, its equivalent) shows a "Loading…" state precisely so this
isn't mistaken for a hang.

**`src/lib/api-client.ts`** is the shared entry point every store's fetches
should go through: `apiFetch<T>(path, init)` (base URL + JSON + error
handling) and `getUserId()`. The backend has no real auth yet (its own
documented, deliberate MVP tradeoff) — every write just needs *a*
`userId`, so `getUserId()` generates one UUID per browser on first use and
persists it to `localStorage`. This is a single stable pseudo-identity per
browser install, not a real account system — matches the "no real auth
yet, just persist data, single-user for now" decision made before backend
integration started.

Base URL is configurable via `NEXT_PUBLIC_API_BASE_URL` (see
`.env.example`) — defaults to the hosted instance if unset, so no Vercel
env var is required for the common case; only set it to point at a local
backend during backend-side development.

**Per-domain status:**

| Domain | Status | Store |
| --- | --- | --- |
| Project | **Live** — `/books` | `project-store.ts` |
| Character | Mock (next) | `character-store.ts` |
| Worldbuilding | Mock (next) | `worldbuilding-store.ts` |
| Notes | Mock (next) | `notes-store.ts` |
| Manuscript/Chapters | Mock (last — biggest lift) | none yet |
| Outliner | Mock, deferred | none yet (backend has no Outliner endpoints — confirmed low priority) |
| Dashboard-only stats | Mock, deferred | `dashboard-data.ts` (no backend resource exists for these — see §4.7) |

### Project (live)

`project-store.ts` now fetches/writes real `books` rows instead of an
in-memory array. Same public hook signatures as before
(`useProjects()`/`useProject(id)` still return `Project[]`/`Project |
undefined` synchronously from a live cache) plus two new hooks every page
using `useProjects()` should pair it with: `useProjectsLoadStatus():
"idle"|"loading"|"loaded"|"error"` and `useProjectsError(): string |
null`. `createProject()`/`updateProjectTarget()` are now `async` (real
network calls) — both call sites (`/projects/new`'s submit handler,
`(tabs)/layout.tsx`'s inline-editable Target Words field) were updated to
`await` them and show a submitting/error state; every other page that only
*reads* `useProjects()`/`useProject()` needed no changes.

**Response shape — read the actual route source, not just the CLAUDE.md
prose, before wiring the next domain.** The first version of this
integration got both wrong and shipped a live bug (`Couldn't reach the
server — (intermediate value) is not iterable` on the deployed site):
assumed a bare `BookRow[]`/`BookRow` response and camelCase fields,
because that's what the field *names* in the backend's own
"Frontend Integration Reference" table implied. The real
`src/routes/books.ts` wraps every response in an envelope
(`{ books: BookRow[] }` from the list endpoint, `{ book: BookRow }` from
get/create/patch) and returns **raw snake_case Postgres columns**
(`user_id`, `target_words`, `cover_url`, `created_at`, `updated_at` — only
request *bodies* are camelCase, mapped to snake_case server-side in each
route's own `build*Payload` helper). Confirmed this same
envelope-wrapping + snake_case-response pattern by reading `codex.ts`/
`worldCategories.ts`/`notes.ts` directly before wiring those domains —
don't repeat the mistake of trusting the summary table's field names as
the literal response shape without reading the route handler's actual
`res.json(...)` call.

**Field mapping, `books` row → frontend `Project`** (`mapBookToProject` in
`project-store.ts`): `id`/`title`/`pov`/`tense` map directly;
`genre` is `[book.genre, ...book.subgenres].join(" · ")`; `logline` falls
back to `tagline`, then placeholder text (the backend `books` table has no
`description` column, unlike the old mock's own fallback chain — dropped
that branch); `target` defaults to `50000` if `target_words` is unset;
`updated`/`created` are formatted client-side from `updated_at`/
`created_at`; `updatedRank` doesn't exist on the backend row — computed
client-side by sorting the fetched list by `updated_at` descending and
assigning rank by index, same effect as the old mock field.

**Fields that read honestly as zero/absent, not fabricated, because the
backend has no resource for them yet:** `words`, `sessions`, `daysActive`,
and `chapters` are always `0` — the list endpoint (`GET /books?userId=`)
returns only the raw `books` row, none of the best-effort manuscript
stats (`highestChapter`/`totalChapters`/`totalChunks`); those only exist
on `GET /books/:id`, which nothing here calls yet (`useProject(id)` still
just `.find()`s within the already-loaded list, same as the old mock).
`tags`, `povCharacters`, `worldEntries`, `chapterList`, `activityLog`,
`deadline`, `language` (always `"English"`) have no backend column at
all — `deriveRecentChapters`/`deriveRecentActivity` already handle their
absence gracefully (same generic-fallback behavior as before), and
`povCharacters`/`worldEntries` could become real live counts once
Character/Worldbuilding are wired (a `GET /codex?bookId=` count scoped to
this book), not attempted yet.

**Verified working** (against a local mock server matching the real
API's exact envelope/snake-case shape, corrected after the bug above —
this sandbox's network proxy can't reach the real `onrender.com` backend
directly, so this was the closest available verification; still confirm
against the live backend once deployed): create a project through the
real form, confirm it's the real backend's UUID (not a client-side slug)
in the URL, confirm the project and an edited Target Words value both
survive a hard page reload (real server
persistence, unlike the old mock's reset-on-refresh behavior), confirm
Dashboard/`/projects` correctly show a loading state during the fetch
and the real data once it resolves.

---

## 4. Entity reference

For each entity: full type(s) as they exist in source, the seed-data file,
the store file (if any), and the exact `New*Input` shape the one existing
creation form actually submits — i.e. which fields the backend needs to
accept from the client immediately vs. which fields currently only exist
because they're baked into hand-written seed data with no UI to set them.

### 4.1 Project

**Live — backed by the real backend's `/books`, see §3.5 for the field
mapping and integration notes.** Type still defined in
`src/lib/projects-data.ts`; `src/lib/project-store.ts` now fetches/writes
real data instead of wrapping seed data. The `NewProjectInput` shape below
is unchanged (it's what the New Project form submits either way) — the
EDITABLE-vs-SEED-ONLY framing that follows describes the *old* mock's
limitation and no longer fully applies now that Project is live; see §3.5
for which fields are real today versus still absent from the backend
schema.

```ts
export type ProjectStatus = "active" | "completed" | "archived";
export type ProjectStage = "Active" | "Draft" | "Outline";

export type ChapterEntry = {
  number: number;
  title: string;
  words: number;
};

export type ProjectActivityKind = "wrote" | "character" | "world" | "session" | "note";

export type ProjectActivityEntry = {
  id: string;
  kind: ProjectActivityKind;
  text: string;
  time: string;         // display string, e.g. "2h ago" — not a real timestamp
};

export type Project = {
  id: string;
  title: string;
  genre: string;
  logline: string;
  words: number;
  target: number;
  chapters: number;
  sessions: number;
  daysActive: number;         // distinct calendar days with ≥1 writing session
  updated: string;            // display label, e.g. "2h ago"
  updatedRank: number;        // smaller = more recently updated; drives sort order
  status: ProjectStatus;
  stage?: ProjectStage;       // only meaningful when status === "active"

  // Detail-page-only fields (optional; list/rail views ignore them)
  created: string;            // display label, e.g. "May 12, 2024" — not a real timestamp
  pov?: string;
  tense?: string;
  language?: string;
  deadline?: string;
  povCharacters?: number;
  worldEntries?: number;
  tags?: string[];
  chapterList?: ChapterEntry[];         // explicit recent-chapters list; else derived generically
  activityLog?: ProjectActivityEntry[]; // explicit activity feed; else derived generically
};
```

**Creation form** (`/projects/new`) submits:

```ts
export type NewProjectInput = {
  title: string;
  tagline?: string;
  description?: string;
  genre: string;
  subgenres?: string[];
  pov?: string;
  tense?: string;
  language?: string;
  targetWords?: number;
};
```

`createProject()` derives everything else: `words`/`chapters`/`sessions`/
`daysActive` all start at `0`; `status` is always `"active"`, `stage` always
`"Outline"`; `logline` falls back to `tagline` then a 160-char slice of
`description`; `target` defaults to `50000` if `targetWords` is unset;
`tags` is `subgenres.slice(0, 5)`; `created` is today's date formatted
`"Month D, YYYY"`. **EDITABLE-vs-SEED-ONLY:** every field not listed in
`NewProjectInput` above (`chapterList`, `activityLog`, `deadline`,
`povCharacters`/`worldEntries` beyond their `0` default, `words`/
`chapters`/`sessions`/`daysActive` beyond `0`) is **seed-data-only today** —
nothing in the UI ever sets them after creation except:
`updateProjectTarget(id, target)` (an inline-editable "Target Words" field
on the project detail page's right rail — the only post-creation mutation
that exists for Projects).

Derived/computed helpers the frontend relies on (`projects-data.ts`):
`projectStatusCounts()`, `activeWordStats()`, `primaryGenre()`,
`topGenres()`, `deriveRecentChapters()`, `deriveRecentActivity()` — these
are pure functions over the `Project[]` list; the backend does not need to
reproduce them as stored fields, just needs to serve the underlying data
they're computed from.

### 4.2 Character

Source: `src/lib/character-data.ts` (types + 16-item seed roster), wrapped
by `src/lib/character-store.ts`.

```ts
export type CharacterRole = "Main" | "Supporting" | "Minor" | "Extra";
export type RelationshipBond = "Family" | "Ally" | "Friend" | "Mentor" | "Colleague" | "Rival" | "Romantic";

export type Relationship = {
  characterId: string;
  bond: RelationshipBond;
  description: string;
  strength: "Strong" | "Moderate" | "Tense";
};

export type CharacterArc = {
  beginning: string;
  middle: string;
  climax: string;
  end: string;
};

export type LifeEventType = "milestone" | "personal" | "conflict" | "achievement" | "discovery";

export type LifeEvent = {
  year: number;
  title: string;
  description: string;
  type: LifeEventType;
};

export type CulturalBackground = {
  origin: string;
  upbringing: string;
  education: string;
  beliefs: string;
  languages: string;
};

export type CharacterNote = {
  title: string;
  body: string;
  date: string;
  pinned?: boolean;
};

export type Character = {
  id: string;
  name: string;
  nickname?: string;
  epithet: string;
  role: CharacterRole;
  age: number;
  gender: string;
  occupation: string;
  location: string;
  status: string;
  alignment: string;
  roleInStory: string;
  povCharacter: boolean;
  archetype?: string;
  quote?: string;
  favorites: number;
  overview: string;
  physicalDescription: string[];
  personalityTraits: string[];
  motivations: string[];
  motivation?: string;
  goal?: string;
  fear?: string;
  secret?: string;
  arc?: CharacterArc;
  relationships: Relationship[];
  background?: string[];
  lifeEvents?: LifeEvent[];
  culturalBackground?: CulturalBackground;
  strengths?: string[];
  weaknesses?: string[];
  internalConflict?: string;
  notes?: CharacterNote[];
};
```

**Creation form** (`/projects/[id]/characters/new`) submits:

```ts
export type NewCharacterInput = {
  name: string;
  nickname?: string;
  role: CharacterRole;
  age?: number;
  gender?: string;
  occupation?: string;
  status?: string;
  alignment?: string;
  archetype?: string;
  povCharacter: boolean;
  motivation?: string;
  goal?: string;
  fear?: string;
  secret?: string;
  quickTraits: string[];    // maps onto Character.personalityTraits
  summary?: string;         // maps onto Character.overview
};
```

`createCharacter()` fills the rest with defaults (`epithet` = nickname or
role; `location` = `"Unknown"`; `favorites` = `0`; `physicalDescription` =
`[]`; `motivations` = `[motivation, goal].filter(Boolean)`;
`relationships` = `[]`). **EDITABLE-vs-SEED-ONLY:** `arc`, `background`,
`lifeEvents`, `culturalBackground`, `strengths`, `weaknesses`,
`internalConflict`, `notes`, `relationships`, and `quote` are **entirely
seed-data-only** — rich fields the Characters detail page renders across
its Background/Personality/Relationships/Notes/Timeline tabs, but there is
currently no form or UI action anywhere that writes to them. This is the
single biggest EDITABLE gap in the app relative to what the AI-writing
context would want populated — flag this to the backend team as needing
either new forms or a generic rich-edit surface, not just CRUD endpoints.

### 4.3 Worldbuilding — categories and entries

Source: `src/lib/worldbuilding-data.ts` (types + 8 fixed categories + 31
seed entries), category store `src/lib/worldbuilding-store.ts`. **Entries
have no store — `WORLD_ENTRIES` is static, seed-only, no creation form
exists for an individual entry today, only for a category.**

```ts
export type WorldCategoryKey = "places" | "nations" | "cultures" | "history" | "magic" | "factions" | "religion" | "items";

export type WorldCategoryMeta = {
  key: WorldCategoryKey;
  label: string;
  description: string;
  Icon: LucideIcon;   // a React component reference, not serializable as-is — backend should store an icon identifier string instead (see NewCategoryInput note below)
  color: string;      // CSS color value or CSS var() reference
};

export type WorldEntry = {
  id: string;
  name: string;
  category: WorldCategoryKey;
  summary: string;
  updatedHours: number;   // hours-ago, sort-authoritative; "Xh/Xd ago" label is derived via formatAgo(), never stored
};

export type WorldTimelineEvent = {
  year: number;    // negative = years before "present"; 0 = present
  title: string;
  description: string;
};

export const WORLD_OVERVIEW = {
  name: "Elarion",
  description: string,
  regions: number,
  keyLocations: number,
  majorNations: number,
  yearsOfHistory: number,
};

export type PinnedWorldItem = {
  entryId: string;
  note: string;
};
```

**Category creation form** (`/projects/[id]/world/new-category`) submits:

```ts
export type NewCategoryInput = {
  name: string;
  description?: string;
  color: string;
  Icon: WorldCategoryMeta["Icon"];   // picked from a fixed 30-icon library in the form (ICON_LIBRARY) — backend should model this as an enum/string key, not a component
};
```

`createWorldCategory()` slugifies `name` into `key` (dedupes with a `-2`,
`-3`... suffix on collision); `description` defaults to `"A new
worldbuilding category."` if blank. The 8 seed categories
(Places/Nations/Cultures/History/Magic/Factions/Religion/Items & Artifacts)
are otherwise fixed in the current build.

**EDITABLE-vs-SEED-ONLY:** categories are createable (see above);
**individual `WorldEntry` records are 100% seed-only** — there is no "New
Entry" form anywhere in the app today, despite the hub page's Recent
Entries table and category filtering all reading from `WORLD_ENTRIES`.
`WORLD_TIMELINE` (4 fixed events) and `WORLD_OVERVIEW` and
`PINNED_WORLD_ITEMS` are likewise static exports with no UI to edit them.
This is the second-biggest EDITABLE gap for AI-context purposes: a
worldbuilding "codex" the AI would pull from currently has zero write path
for the entries themselves, only for the category taxonomy around them.

### 4.4 Notes

Source: `src/lib/notes-data.ts` (types + 24 seed notes), wrapped by
`src/lib/notes-store.ts`.

```ts
export type NoteCategory = "World Building" | "Character" | "Plot" | "Research" | "Inspiration" | "Magic System";
export type NoteScene = "landscape" | "portrait" | "map" | "book" | "starfield" | "crystal";  // derived 1:1 from category via sceneFor(), purely a cosmetic cover-art selector — not a stored field

export type Note = {
  id: string;
  title: string;
  excerpt: string;
  category: NoteCategory;
  date: string;        // display string, e.g. "May 23, 2026" — assigned directly in seed data, not derived
  dateRank: number;    // manual chronological rank, 1 = newest; sort-authoritative
  comments: number;
  pinned: boolean;
  mine: boolean;
};

export type NoteFolderKey = "all" | "my-notes" | "research" | "inspirations" | "ideas" | "deleted";
// Folders map onto categories: research↔"Research", inspirations↔"Inspiration", ideas↔"Plot"; "deleted" is always empty (no soft-delete implemented)
```

**Two creation paths, both submit the same shape:**

```ts
export type NewNoteInput = {
  title: string;
  excerpt: string;
  category: NoteCategory;
};
```

(1) the "New Note" modal — title/category-dropdown/content; (2) the
"Quick Notes" composer — plain textarea, `category` hardcoded to
`"Inspiration"`, `title` = first 40 chars of the text. `createNote()` sets
`date: "Just now"`, `dateRank: 0` (sorts as newest), `comments: 0`,
`pinned: false`, `mine: true`. **EDITABLE:** `pinned` also toggles via
`togglePinned(id)` (the star icon on any note card). **SEED-ONLY:**
`comments` count and `mine: false` (used to mark 6 of the 24 seed notes as
not-authored-by-the-current-user, simulating shared notes) — no UI sets
either after creation.

### 4.5 Manuscript / Chapters (the biggest gap — read this closely)

Source: `src/lib/manuscript-data.ts`. **No reactive store exists.** Static
exports only, and — critically — the actual prose the user types in the
editor is **never read from or written back to this file after initial
mount**; it lives only in the browser DOM for the current page session.

```ts
export type Scene = {
  id: string;
  title: string;
};

export type ManuscriptChapter = {
  id: string;
  number: number;
  title: string;
  complete: boolean;
  scenes?: Scene[];
};

export type ManuscriptPart = {
  id: string;
  title: string;
  chapters: ManuscriptChapter[];
};

export type Commenter = "Jessica" | "Michael" | "Sarah" | "Daniel";  // hardcoded to the 4 fake collaborator names — not a real user reference

export type ChapterParagraph = {
  id: string;
  text: string;
  emphasis?: boolean;    // renders as styled "foreshadowing" line
  break?: boolean;       // renders as a scene-break marker ("* * *") instead of prose
  commenter?: Commenter; // anchors an inline reviewer comment to this paragraph
};

export type ChapterBody = {
  heading: string;   // e.g. "CHAPTER 18"
  title: string;
  paragraphs: ChapterParagraph[];
};

export type CommentThread = {
  id: string;
  author: Commenter;
  time: string;      // display string, e.g. "2 min ago"
  text: string;
  resolved?: boolean;
};

export type CollaboratorStatus = "Editing" | "Viewing" | "Commenting";
// ACTIVE_COLLABORATORS: { name: string; you?: boolean; status: CollaboratorStatus; tone: Commenter }[]
```

Only one project (`shadows-of-elarion`) has hand-authored manuscript
structure + one full chapter body (`ch-18`) + a comment thread; every other
project gets a `genericManuscript(chapterCount)` (3 parts, evenly split
generic chapter titles) and every chapter without explicit content gets a
single placeholder paragraph via `genericChapterBody()`.

**What actually needs backend support, precisely:**
1. **Chapter body persistence** — the prose editor is a real
   `contentEditable` region with real formatting commands
   (bold/italic/underline/lists/links/color/highlight/font/size/image/
   table/checklist all genuinely apply via `document.execCommand`), but
   there is **no save call anywhere**. Switching chapters, refreshing, or
   navigating away and back always resets to `getChapterBody()`'s static
   text. The "All changes saved" indicator in the toolbar is decorative
   static text — it is never actually false because nothing is ever saved.
   The backend needs a chapter-body resource (likely rich HTML or a
   structured-paragraph format matching `ChapterParagraph[]` above) with
   real load-on-mount / save-on-edit (debounced autosave, most likely).
2. **Word/character counts** — computed client-side as deltas off a
   hardcoded baseline (`4,580` words / `26,789` characters); not derived
   from anything real, resets on remount. Once chapter bodies persist, word
   count should be computed server-side or client-side-from-persisted-text,
   not carried as a separate mutable baseline.
3. **Comments** — real local interactive state (add/resolve/unresolve/
   filter), seeded from `CHAPTER_18_COMMENTS`, resets on remount,
   authorship hardcoded to `"Jessica"` (not a real session/user). Needs a
   comments-on-chapter (or comments-on-paragraph, given the
   `commenter`-per-paragraph anchor) resource plus real auth to attribute
   authorship.
4. **Manuscript structure (Parts → Chapters → Scenes)** — no UI to
   create/reorder/delete a chapter or scene today; entirely seed-only. If
   the AI-writing pipeline needs to read/write structure, this needs CRUD
   endpoints and a corresponding UI, neither of which exist yet.
5. **Version history** — explicitly an honest placeholder in the UI
   ("Version history isn't wired up yet.") — no data shape exists to design
   against yet; would need requirements gathering before schema design.
6. Collaborators/presence and Share are fully decorative/static — not a
   near-term backend priority per the current build.

### 4.6 Outliner (beats)

Source: `src/lib/outline-data.ts`. **No store, no creation UI, seed-only,**
one hardcoded structure (Three Act) for `shadows-of-elarion`; other
outline modes shown in mockups (Hero's Journey, Save the Cat) are not
built as distinct data structures yet.

```ts
export type BeatStatus = "completed" | "inProgress" | "planned" | "notStarted";
export type BeatColor = "green" | "gold" | "purple" | "blue" | "rose" | "gray";  // derived 1:1 from BeatStatus via a fixed map, not independently stored

export type Beat = {
  id: string;
  number: number;
  title: string;
  purpose: string;        // short line, shown on the board card
  description: string;    // longer craft note, detail-panel only
  chapterLabel: string;   // free-text label, e.g. "Chapter 7" — not a foreign key to ManuscriptChapter
  sceneCount: number;
  status: BeatStatus;
  color: BeatColor;
  pov: string;
  location: string;
  time: string;
  mood: string;
  characters: string[];   // free-text names, not Character.id references — no referential integrity today
  notes: string[];
};

export type Act = {
  id: string;
  label: string;
  shortLabel: string;
  color: "green" | "purple" | "blue";
  beats: Beat[];
};
```

Note the explicit lack of foreign keys today: `Beat.characters` is a plain
string array of names, not `Character.id` references, and
`Beat.chapterLabel` is a display string, not a `ManuscriptChapter.id`
reference. If the backend introduces real relational IDs here, the
frontend will need updating to resolve them, not just to fetch them.

### 4.7 Dashboard-only data (never gets its own resource yet)

Source: `src/lib/dashboard-data.ts`. Re-exports `projects`/`Project` from
`projects-data.ts` (so "Your Projects" is real Project data), but every
other export is standalone mock with **no reactive store and nothing in the
UI that ever writes to it**:

```ts
export const user = { name: string, quote: { text: string, attribution: string } };

export const continueWriting = {
  projectId: string, title: string, chapter: string, words: number, target: number,
};

export const todaysProgress = {
  words: number, target: number, streakDays: number, today: number,
  activeDays: number[],   // day-of-month values with ≥1 session, for the mini-calendar's active dots
};

export const weeklyStats = {
  wordsWritten: { value: number, trendPercent: number, sparkline: number[] },
  writingTime: { value: string, trendPercent: number },   // value is a display string, e.g. "8h 45m"
};

export const writingGoal = {
  current: number, target: number, daysActive: number, consistencyPercent: number, writingTime: string,
};

export type AiInsightTone = "warn" | "purple" | "success";
// aiInsights: { id: string, tone: AiInsightTone, text: string, linkLabel: string, linkHref: string }[]

export type ActivityKind = "wrote" | "character" | "world" | "session" | "note";
// activity: { id: string, kind: ActivityKind, text: string, context: string, time: string }[]
```

**Decision on record:** these stay mock for now. Each would need its own
new backend resource (writing-session time tracking, an activity-log table
fed by real app events, actual AI plot/dialogue analysis to produce
`aiInsights`, goal-tracking) that doesn't exist yet and isn't derivable
from Projects/Characters/Worldbuilding/Notes alone. Sequence: wire these up
in a later pass once the resources they depend on exist — not bundled into
the current Projects/Characters/etc. integration effort. "Projects",
"Characters", and "World Entries" counts on the Weekly Stats row ARE
computed live from real `Project`/`Character`/`WorldEntry` data via
`.reduce()` in-component — only `wordsWritten`/`writingTime` (with their
trend %s and sparkline) are the mock ones needing a new resource.

---

## 5. Manuscript editor — LIVE vs MOCK-ONLY at a glance

(Detailed field-level breakdown is in §4.5; this is the quick-reference
summary the backend team asked for.)

| Feature | State today |
| --- | --- |
| Prose editing (`contentEditable`, formatting commands) | Real, but **zero persistence** — resets on remount |
| Word/character counts | Computed client-side off a hardcoded baseline, resets on remount |
| "All changes saved" indicator | Decorative static text, never actually false |
| Comments (add/resolve/filter) | Real local state, seeded, resets on remount, author hardcoded to "Jessica" |
| Versions / Outline / AI side-panel tabs | Explicit honest placeholders — no fake data |
| Manuscript structure (Parts/Chapters/Scenes) | Static seed data, no create/reorder/delete UI |
| Active Collaborators | Fully static, not real presence |
| Share | Decorative, its own copy says there's no backend |
| Focus Mode (Normal/Typewriter/Zen) | Real, fully working client-only UI state — nothing to persist |

---

## 6. AI provider abstraction (the one piece of real network code)

App code never imports a vendor SDK directly — it depends on the
`AiProvider` contract:

```ts
// src/lib/ai/types.ts
export type AiRole = "user" | "assistant";
export interface AiMessage { role: AiRole; content: string; }
export interface GenerateParams {
  system?: string;
  messages: AiMessage[];   // must start with a "user" message
  maxTokens?: number;
  model?: string;
}
export interface GenerateResult { text: string; model: string; }
export interface AiProvider {
  readonly id: string;
  isConfigured(): boolean;
  generate(params: GenerateParams): Promise<GenerateResult>;
}
```

- `getAiProvider(id?)` (`src/lib/ai/index.ts`) resolves from a `registry`
  keyed by provider id, defaulting to `AI_PROVIDER` env or `"anthropic"`.
  Only one provider is registered today: `AnthropicProvider`
  (`src/lib/ai/providers/anthropic.ts`), which lazily instantiates an
  `@anthropic-ai/sdk` client from `ANTHROPIC_API_KEY`, defaults to model
  `claude-opus-5` (overridable via `AI_MODEL` env or per-call `model`).
- **The only server endpoint in the entire app**, `src/app/api/ai/route.ts`:
  ```
  POST /api/ai
  body: { system?: string, messages?: AiMessage[], prompt?: string, provider?: string, model?: string, maxTokens?: number }
  ```
  Accepts either `prompt` (wrapped into a single user message) or a full
  `messages` array. Returns `GenerateResult` JSON (`{ text, model }`) on
  success, `{ error: string }` with status `400`/`503`/`500` on failure.
  This route is currently unused by any page in the app — it exists as the
  abstraction's example/proof-of-concept endpoint, not wired to any UI
  button yet. **This is the shape any future "Ask AI" feature will build
  on** — when the AI-writing-context pipeline the user referenced gets
  built, it will most likely assemble `system`/`messages` from the entity
  data in §4 (Character, WorldEntry, Note, chapter body text) and POST here
  or to a similar route.
- Add a new provider: implement `AiProvider`, register it in `registry` in
  `src/lib/ai/index.ts`. Nothing else changes.
- Env vars: `AI_PROVIDER` (default `anthropic`), `AI_MODEL` (default
  `claude-opus-5`), `ANTHROPIC_API_KEY`. See `.env.example`.

---

## 7. Route map (what page needs what data)

```
/                                            Dashboard — Project[] (live) + dashboard-data.ts mock (§4.7)
/projects                                    Project[] (live)
/projects/new                                submits NewProjectInput
/projects/[id]                               Project detail chrome (8-tab nav)
/projects/[id]                (Overview tab) Project + deriveRecentChapters/deriveRecentActivity
/projects/[id]/analytics                     stub — <ComingSoon>, no data model
/projects/[id]/settings                      stub — <ComingSoon>, no data model
/projects/[id]/chapters                      ManuscriptPart[] + ChapterBody + CommentThread[] (§4.5/§5 — the big gap)
/projects/[id]/outlines                      Act[] / Beat[] (§4.6 — seed-only, no store)
/projects/[id]/characters                    Character[] (live) + selected Character detail
/projects/[id]/characters/all                Character[] (live), grid+pagination
/projects/[id]/characters/new                submits NewCharacterInput
/projects/[id]/world                         WorldCategoryMeta[] (live) + WorldEntry[] (seed-only) + WORLD_TIMELINE/WORLD_OVERVIEW/PINNED_WORLD_ITEMS (seed-only)
/projects/[id]/world/new-category            submits NewCategoryInput
/projects/[id]/notes                         Note[] (live)
/writing /outlines /characters /worldbuilding /notes   redirect-only pages → most-recently-active project's real workspace, no data of their own
/assistant /goals /analytics /settings /timeline /templates /help   stubs — <ComingSoon>, no data model
/api/ai                                      POST — see §6
```

---

## 8. Design system

`DESIGN_SYSTEM.md` has the full visual spec (colors, fonts, materials). Not
relevant to backend schema design; included here only so this file stays
the single entry point for the repo.

---

## 9. Git / workflow conventions

- Work on branch **`claude/production-repo-prep-js0ilc`** (the designated
  feature branch). Never push to another branch without explicit permission.
- Commit author must be `Claude <noreply@anthropic.com>` or GitHub marks
  commits "Unverified".
- Push == deploy. Every push to the working branch auto-deploys to
  word-architect-three.vercel.app.
- Do **not** put the raw model identifier in commits/PRs/code — chat only.

## 10. Working style expected in this repo

- Match mockups precisely; sweat subtle details (seams, edges, spacing,
  font pairing). Verify visually before declaring a UI task done.
- When integrating a real backend: convert one domain's store at a time
  (`create*`/`use*` functions) to real `fetch` calls, starting with
  Projects per the agreed sequencing, keeping each store's existing public
  hook signatures so UI components don't need to change — only the store
  internals plus whatever loading/error states get added.
