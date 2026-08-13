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
- **Formerly the single most important gap, now closed:** the manuscript
  editor's prose is a `contentEditable` DOM region — it now has real
  chapter-body save/load (debounced autosave, lazy load-on-open) backed by
  the real backend's `manuscript_chapters` resource. See §3.5's
  Manuscript/Chapters section and §5.

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
| Character | **Live** — `/codex` (`entryType: "character"`) | `character-store.ts` |
| Worldbuilding | Mock (next) | `worldbuilding-store.ts` |
| Notes | Mock (next) | `notes-store.ts` |
| Manuscript/Chapters | **Live** — `/manuscript/chapters` | `manuscript-store.ts` |
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

### Character (live)

`character-store.ts` now fetches/writes real `codex_entries` rows
(`entry_type: "character"`) instead of an in-memory array — second
domain wired, per the suggested order. **Signature change, not
optional:** `useCharacters()` used to take no arguments at all, which was
a real limitation of the old mock (every project showed the exact same
flat roster) rather than a deliberate design choice — real Codex data is
scoped by `bookId`, so it's now `useCharacters(bookId)`. Both call sites
(`characters/page.tsx`, `characters/all/page.tsx`) updated to pass the
route's project id. Two new hooks, `useCharactersLoadStatus()` /
`useCharactersError()`, follow the same pattern as Projects'.
`createCharacter()` is now `async` and takes `bookId` as its first
argument; `characters/new/page.tsx`'s submit handler awaits it with a
submitting/error state, same as `/projects/new`.

**Field mapping** (`mapEntryToCharacter` in `character-store.ts`) — nearly
every `Character` field now has a real column, thanks to the backend's
`014_character_expansion.sql` migration closing exactly the gap this
repo's own CLAUDE.md flagged as the biggest one. Two real shape
mismatches worth knowing about:
- **`role` ↔ `tier`**: frontend's `CharacterRole` is capitalized
  (`"Main"`), the backend's `tier` is lowercase (`"main"`) — mapped both
  ways via `TIER_TO_ROLE`/`ROLE_TO_TIER` lookup tables.
- **`arc` ↔ `character_arc`**: the frontend's `CharacterArc` is a single
  object with four fixed keys (`beginning`/`middle`/`climax`/`end` — see
  `ArcTimeline` in `characters/page.tsx`); the backend stores a flexible
  array of `{ stage, description }` (any stage names, any count — see
  `CharacterArcStage` in the backend's `types/domain.ts`). `mapArc()`
  matches by stage name case-insensitively and falls back to `undefined`
  (same as "no arc set," so the tab shows its empty state) if nothing
  matches, rather than showing a timeline with blank entries. No creation
  UI writes `arc` today either way, so this only matters for reading
  arcs added via some other path (the MCP/Claude tool surface, most
  likely) — not exercised by anything in this repo yet.

**`age` is a real type mismatch, handled by conversion, not by matching
types:** frontend `Character.age` is `number`; backend `codex_entries.age`
is `VARCHAR(20)` (a string) — this was a deliberate backend choice, not
an oversight (an age doesn't have to be a clean integer forever — "Ageless,"
"~200," etc. are legitimate values a VARCHAR can hold that a NUMERIC
column can't). Mapped with `Number(row.age)` (falling back to `0` if
non-numeric) on read, `String(input.age)` on write.

**Relationships are a separate table/endpoint, not bundled into the list
fetch:** `codex_relationships` has its own CRUD (`GET/POST /codex/:id/
relationships`), so pulling every character's relationships into the bulk
`GET /codex?bookId=` list would mean N+1 requests for a list view that
doesn't even show them. Instead, `useCharacterRelationships(entryId)` is a
separate lazy hook that fetches only when a specific character is actually
open, and `characters/page.tsx` merges its result into the selected
character's `relationships` field right before passing it to
`CharacterDetail` — every other character in the list/grid keeps
`relationships: []` from the bulk mapping. `bond_type` on the backend is
freeform text (no CHECK constraint, unlike `strength`), so
`RelationshipBond` was relaxed from a fixed 7-value union to `string` —
`BOND_META` (the mockup's 7-bond color legend in `characters/_shared.tsx`)
now falls back to `DEFAULT_BOND_COLOR` for any bond text outside that set,
at every call site, rather than assuming every real bond will be one of
the mockup's original seven.

**Also found and fixed in the same pass — two real crash risks, unrelated
to this integration but caught while working in this file:** `findCharacter()`
(a lookup against the old static, now-empty `CHARACTERS` seed export) was
still being used to resolve "the other character in a relationship" —
always returning `undefined` against real backend data. Replaced with
lookups against the live, already-fetched character list, threaded down
as an `allCharacters` prop through `CharacterDetail` → `ProfileTabContent`
/ `RelationshipsGraph` → `RelationshipPreviewList`. Separately,
`useCharacterRelationships` has to be called before any early return in
`CharactersPageInner` (Rules of Hooks) — its dependency (`selectedBase`)
was reshuffled above the `if (!project)` guard to make that legal.

**Verified working** (same local-mock-server approach as Projects, for
the same reason — this sandbox can't reach the real backend directly):
create a project, create a character through the real form, confirm the
character list shows a correct empty state before creation and the real
character after, confirm the Relationships tab doesn't crash on a
character with zero relationships, and confirm the character survives a
hard reload (real persistence).

### Manuscript/Chapters (live)

`manuscript-store.ts` (new file — this domain previously had no store at
all, see §4.5/§5's original "biggest gap" writeup) now fetches/writes real
`manuscript_chapters` rows via `/manuscript/chapters`. Wired ahead of
Notes/Worldbuilding, out of the originally suggested order, because it was
the direct fix for two of three concrete production complaints (see below)
rather than a scheduled next-in-line integration.

**Deliberately NOT wired to `manuscript_parts` yet.** `part_id` is a
nullable FK on `manuscript_chapters`, so nothing requires Parts to exist.
Every real chapter for a book is grouped client-side under one synthetic
`ManuscriptPart` (`id: "manuscript", title: "Manuscript"`) so the existing
`ManuscriptPart[]`-shaped UI (`ManuscriptPanel` et al.) kept working
unchanged. Real Parts CRUD (`/manuscript/parts`) can be wired in a later
pass if/when the UI grows a way to create more than one part.

**Two independent pieces of state, on purpose:** the chapter *list*
(metadata only — id/number/title/complete, from `GET
/manuscript/chapters?bookId=`) loads once per book for the left-rail nav;
the chapter *body* (paragraphs, from `GET /manuscript/chapters/:id`) loads
lazily, one chapter at a time, only for whichever chapter is actually open
in the editor — fetching every chapter's full paragraph content just to
render a nav list would be wasteful for a long manuscript. Same lazy-fetch
shape as `useCharacterRelationships` from the Character integration.

**Response shape confirmed by reading `manuscriptChapters.ts` directly**
before writing any mapping code (continuing the discipline the Projects
bug forced): list responses are column-limited server-side
(`{chapters: [...]}`, no `paragraphs` field — the backend's own `.select()`
deliberately excludes it) vs. detail responses which include it
(`{chapter: {...}, scenes: [...]}`, full row via `.select("*")`). `POST`
requires `userId`/`bookId`/`number` (a positive integer, unique per book —
409 on collision); `PATCH /manuscript/chapters/:id` (the autosave
endpoint) accepts any subset of `partId`/`number`/`title`/`heading`/
`complete`/`paragraphs` and is cheap on the backend — it only ever writes
this one row, never touches embeddings/`manuscript_chunks`. A separate,
explicit `POST .../sync-to-memory` action exists for pushing a chapter into
AI-searchable memory but is **not wired to any UI yet** — deliberately out
of scope here, since "accept into manuscript memory" reads as a distinct
writer action from autosave-while-typing, not something to fire on every
debounced save.

**Chapter creation** (`createChapter(bookId)`, called from the editor's
"Create First Chapter" / "Add chapter" `+` button — previously *both* had
no handler at all, the single biggest documented gap in this repo):
auto-numbers to one past the current highest chapter number, and seeds a
single empty paragraph (`[{id, text: ""}]`) so the editor always has
somewhere to place the caret instead of an empty contentEditable with no
child nodes.

**Autosave — debounced, with a real correctness bug caught before
shipping.** The editor's `contentEditable` prose is serialized back into
`ChapterParagraph[]` via `serializeParagraphs()`, which reads
`data-paragraph-id`/`data-break`/`data-emphasis`/`data-commenter`
attributes now stamped onto each rendered `<p>` by `EditorParagraph`, plus
its `textContent` (with the inline `CommenterTag` label excluded via
`contentEditable={false}` + `data-commenter-tag="true"`). This is an
explicit **best-effort round-trip, not lossless**: plain text and
emphasis/break/commenter metadata survive a save/reload; rich inline
formatting applied via `execCommand` (bold/italic/links/color/etc.) does
NOT, since the backend's `ChapterParagraph` shape has no HTML field to
carry it. `scheduleSave()` debounces at 1200ms.

The bug: flushing a pending save on chapter switch via a `useEffect`
cleanup keyed on the chapter id is broken, because changing `EditorBody`'s
`key` prop remounts it — React repoints `editableRef.current` at the *new*
chapter's fresh DOM *before* the old effect's cleanup runs, so a
cleanup-based flush would silently read the wrong chapter's content and
save it under the old chapter's id. Fixed by making `flushPendingSave()` a
plain synchronous function called explicitly inside `selectChapter()` and
`handleCreateChapter()` *before* the state change that triggers the
switch, plus a separate `useEffect(() => () => flushPendingSave(), [])`
(empty deps) for true page-unmount, where the DOM hasn't been torn down
yet when cleanup fires.

**Fixed the three production complaints this integration was scoped
for:**
1. *Editor now has somewhere to go on a zero-chapter project.* The old
   dead-end (`chapters: page.tsx` threw/short-circuited to a message with
   no CTA when `manuscript.length === 0`) is replaced by
   `EmptyManuscriptState`, a real "Create First Chapter" button that calls
   `createChapter()` and lands the user directly in the editor on the new
   chapter — no more "Add chapter has no handler" dead end.
2. *Dashboard no longer blocks behind a loading screen that then blinks
   open.* (See the Dashboard note below — same fix, listed here since the
   two are related but not identical: this one is about chapters
   specifically making "has this project been written in" answerable for
   real.)
3. *"Resume Writing" no longer shown for projects with zero real writing.*
   `project.words`/`project.chapters` have no backend rollup yet (always
   `0`, per §3.5's Project section) so they can't answer "has this project
   been written in." `ContinueWritingCard` (`src/app/(app)/page.tsx`) now
   calls `useManuscript(project.id)` directly and checks
   `manuscript.some(part => part.chapters.length > 0)` as the authoritative
   signal — branches card heading/CTA label ("Continue Writing"/"Resume
   Writing" vs. "Start Writing") and hides the (previously always-fabricated
   0%) progress bar entirely until a chapter actually exists.

**Separately, the Dashboard's loading-flash complaint fixed on its own
terms:** the dedicated "Loading your projects…" screen (itself a fix from
an earlier pass) was the *new* problem reported — it blocked the whole
page then blinked open once data arrived. Removed that branch entirely;
the New User dashboard shell (an honest generic "start here" state, not a
fabricated claim about the user's data) is what a not-yet-loaded
`projects: []` renders as anyway via the existing fallthrough, so on a
fast load nothing changes and on a slow one (Render cold start) the page
shows a calm, already-open default that updates in place once real data
arrives, instead of a jarring blank/loading swap. The dedicated
`loadStatus === "error"` branch was kept as-is — silently pretending
nothing's wrong on a genuine failure would be worse than a brief
wrong-variant flash.

**Verified working** (same local-mock-server approach as Projects/
Character — this sandbox can't reach the real backend directly, and this
was the first integration in this pass where the mock also had to grow
`/manuscript/parts` and `/manuscript/chapters` handlers matching the real
envelope/snake-case shape): a project with zero chapters shows the
"Create First Chapter" CTA and it works, landing directly in the editor;
typing triggers a debounced autosave that reaches "All changes saved";
the typed content survives a hard reload (real persistence, not just
in-session state); the Dashboard shows no blocking loading screen on
initial nav; and the Continue Writing card correctly reads "Start
Writing" (no fabricated progress bar) before any chapter exists and
"Resume Writing" (with a real progress bar) once one is created.

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

**Live — backed by the real backend's `/codex` (`entryType: "character"`),
see §3.5 for the field mapping and integration notes.** Type still
defined in `src/lib/character-data.ts`; `src/lib/character-store.ts` now
fetches/writes real data instead of wrapping seed data.
`NewCharacterInput` below is unchanged (still what the New Character form
submits) — the EDITABLE-vs-SEED-ONLY framing that follows describes the
*old* mock's limitation and no longer fully applies now that nearly every
field has a real backend column; see §3.5 for exactly which two fields
(`role`/`arc`) need shape conversion and which one (`age`) is a real
type mismatch (`number` on the frontend, `VARCHAR` on the backend).

```ts
export type CharacterRole = "Main" | "Supporting" | "Minor" | "Extra";
// Backend's bond_type is freeform text (no CHECK constraint) — this is
// now `string`, not the fixed 7-value union the mockup's color legend
// happens to have art for (see BOND_META in characters/_shared.tsx).
export type RelationshipBond = string;

export type Relationship = {
  characterId: string;
  bond: RelationshipBond;
  description: string;
  strength: "Strong" | "Moderate" | "Tense" | "Weak";
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

### 4.5 Manuscript / Chapters

**Live — backed by the real backend's `/manuscript/chapters`, see §3.5's
Manuscript/Chapters section for the field mapping, the autosave/flush
design, and known limitations (no Parts CRUD yet, best-effort rich-text
round-trip).** Types are still defined in `src/lib/manuscript-data.ts`
(now just types + `findChapter()` + the `Commenter`/`COMMENTER_TONE`
constants — the old `genericManuscript()`/`genericChapterBody()`/
`getManuscript()`/`getChapterBody()` seed-data functions were deleted,
confirmed unused elsewhere); `src/lib/manuscript-store.ts` (new file)
fetches/writes real data.

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

Chapter list + body (paragraphs) are both real per-project data now — see
§3.5 for the exact fetch/save flow. What's still genuinely mock or
unbuilt, precisely:

1. **Word/character counts** — computed client-side from the open
   chapter's actual persisted body text (`bodyBaseline` in
   `chapters/page.tsx`), not a hardcoded baseline anymore, but still not
   server-computed — fine for now, would only matter at real scale.
2. **Comments** — still real local interactive state (add/resolve/
   unresolve/filter), seeded from `CHAPTER_18_COMMENTS` (now empty),
   resets on remount, authorship still hardcoded to `"Jessica"`. Needs a
   comments-on-chapter (or comments-on-paragraph, given the
   `commenter`-per-paragraph anchor) resource plus real auth to attribute
   authorship — not part of this integration pass.
3. **Manuscript structure beyond flat chapters (Parts, Scenes)** — no UI
   to create/reorder/delete a Part or a Scene today; the backend has real
   endpoints for both (`/manuscript/parts`, `/manuscript/chapters/:id/
   scenes`) but nothing in the frontend calls them yet. If the AI-writing
   pipeline needs real structure beyond a flat chapter list, this is the
   next lift.
4. **Version history** — explicitly an honest placeholder in the UI
   ("Version history isn't wired up yet.") — no data shape exists to design
   against yet; would need requirements gathering before schema design.
5. **`sync-to-memory`** — the backend has a real, separate
   `POST /manuscript/chapters/:id/sync-to-memory` endpoint for pushing a
   chapter into AI-searchable memory; not wired to any UI action yet
   (deliberately kept distinct from autosave — see §3.5).
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
| Prose editing (`contentEditable`, formatting commands) | Real, and now **real persistence** — debounced autosave to the backend, best-effort round-trip (plain text/emphasis/break/commenter survive; rich inline formatting like bold/links does not) |
| Chapter creation | Real — "Create First Chapter" / "Add chapter" both create a real chapter and land you in the editor |
| Word/character counts | Computed client-side from the open chapter's real persisted body text |
| "All changes saved" indicator | Real — reflects live `SaveStatus` ("Saving…" / "All changes saved" / "Couldn't save") |
| Comments (add/resolve/filter) | Real local state, seeded (now empty), resets on remount, author hardcoded to "Jessica" — not part of this integration pass |
| Versions / Outline / AI side-panel tabs | Explicit honest placeholders — no fake data |
| Manuscript structure (Chapters) | **Live** — flat chapter list/body persisted; Parts/Scenes have real backend endpoints but no UI yet (see §4.5) |
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
/projects/[id]/chapters                      ManuscriptPart[] (live) + ChapterBody (live) + CommentThread[] (mock) (§4.5/§5)
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
