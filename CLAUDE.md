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
   this data has a real backend resource yet (see §4.9) — it now reads as
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

**Fourth pass — real activity tracking end-to-end, and a second, more
serious editor-crash root cause found underneath the first fix.** User
report: the editor's Daily Goal widget and the Dashboard's Today's
Progress never moved as you wrote; nothing on the Dashboard tracked real
activity; the `/projects` Word Count sidebar card (a cross-project
aggregate) wrongly showed a per-project-shaped Written/Remaining/Total
Goal breakdown; and, worst, the editor would crash outright while
writing, specifically when backspacing into the "Type / for commands"
placeholder.

- **Editor crash, actual root cause.** The placeholder was a real,
  permanently-rendered `<p data-placeholder>` *sibling* inside the same
  contentEditable region as the real paragraphs — always present, not
  conditional on the body being empty. Backspacing into it let the browser
  merge/delete that untracked node via native contentEditable editing,
  corrupting the DOM in a way React's next reconcile pass (after an
  autosave echo, see below) couldn't recover from — a
  `Failed to execute 'removeChild'` crash. Fixed by deleting the node
  entirely and replacing it with a CSS-only hint: `.editor-placeholder`
  (globals.css) pairs `content: "Type / for commands"` with `:empty::before`
  and is applied to every plain paragraph's own class list. Pseudo-element
  content isn't part of the DOM tree — it can't be focused, selected, or
  typed into, and disappears the instant the paragraph stops being
  `:empty`, so there's nothing left to accidentally delete.
- **A second, deeper crash underneath that one, still reachable after the
  placeholder fix:** backspacing a paragraph *fully* empty and continuing
  to backspace makes the browser delete the block element itself, not
  just its text — the last remaining `<p>` in the contentEditable region
  gets removed, leaving the root with zero element children. Any further
  typing at that point still has to land somewhere, so the browser inserts
  it as a bare text node directly under the root, with no `<p>` wrapper at
  all. That's invisible to `serializeParagraphs()` — it reads
  `root.children`, which (unlike `childNodes`) skips text nodes — so
  everything typed after that point silently never made it into what got
  saved, and (compounding via the bug below) could still trigger the
  `removeChild` crash once a stale autosave echoed back. Fixed with
  `normalizeEditableRoot()` in `chapters/page.tsx`, called at the top of
  every `handleInput`: if the contentEditable root has zero element
  children, it creates a fresh `<p>`, moves any stray child nodes into it,
  and restores the caret to the end of its content — restoring the "always
  at least one `<p>`" invariant *before* the next keystroke can land as an
  orphaned node, rather than trying to detect/repair the damage later.
- **The `removeChild` crash's other trigger, unrelated to the placeholder:**
  every successful autosave (`saveChapterBody` in `manuscript-store.ts`)
  echoes the server's saved paragraphs back into the reactive `bodyRow`
  cache, which flows into `ChaptersPage`'s `body` and then into
  `EditorBody`'s `body.paragraphs` prop — a *new* object on every save,
  even though the content is (usually) identical to what was just typed.
  If the user kept typing between a save firing and its response landing,
  that echo is stale relative to the live DOM; React would then try to
  reconcile `<EditorParagraph>` against text content the browser's native
  typing had already restructured out from under it — the same
  `removeChild` crash, with no placeholder involved at all. Fixed by
  making `EditorBody`'s rendered paragraph list captured once at mount
  (`useState(() => body.paragraphs)`) rather than read live from the
  `body` prop — effectively an uncontrolled `<textarea defaultValue>`
  pattern. Safe because `EditorBody` already remounts (`key={activeChapter.id}`)
  on every real chapter switch, and nothing else in this single-user
  editor ever mutates a chapter's content except the DOM itself.
- **Daily Goal (editor) and Today's Progress (Dashboard) now share one
  real source:** new `src/lib/daily-progress-store.ts`, same
  localStorage-backed-per-browser tradeoff as `writing-goal-store.ts` (no
  writing-session backend resource exists — see §4.9). Every autosave
  reports its chapter's post-save word count via
  `recordChapterWordCount(chapterId, words)`; only the *positive* delta
  versus that chapter's last-known count credits "today" (deleting text
  never subtracts — matches what a writer means by "words written," not
  "net change"). A chapter's baseline is seeded via `seedChapterBaseline()`
  the moment its body first loads, *before* any edits, so opening an
  existing chapter with real content never credits its whole word count as
  one day's work — only words actually added after that point count.
  Exposes `useTodaysWordsWritten`, `useWritingStreak`,
  `useActiveDaysThisMonth`, `useMonthWordsWritten`, `useWeeklyWordsWritten`
  — the manuscript editor's Daily Goal widget and the Dashboard's Today's
  Progress ring, Writing Goal card, and Weekly Stats "Words Written" tile
  all read from these now, so they can never drift out of sync with each
  other or with what was actually saved.
- **Both Daily Goal surfaces are now click-to-edit,** not just a separate
  "Edit" link: `EditWritingGoalModal` was extracted out of the Dashboard's
  `page.tsx` into a shared `src/components/edit-writing-goal-modal.tsx`
  (portaled to `<body>`, `onClick` stops propagation on its own root) so
  it can be opened from a card whose *entire* body is the click target
  (`role="button"`, matching the existing convention in
  `characters/all/page.tsx`) without the modal's own clicks bubbling back
  up and re-triggering the card. Wired to the Dashboard's Today's Progress
  card, the Dashboard's Writing Goal card, and the manuscript editor's
  Daily Goal sidebar widget.
- **Real Dashboard activity feed:** new `src/lib/activity-log-store.ts`,
  same per-browser localStorage tradeoff — there's no activity-log backend
  resource (§4.9). `logActivity(kind, text)` is called at the moment a
  real action actually succeeds: `createProject` (project-store.ts),
  `createCharacter` (character-store.ts), `createNote` (notes-store.ts),
  `createWorldCategory` (worldbuilding-store.ts), and a chapter autosave
  crediting a positive word delta (`chapters/page.tsx`, sharing the same
  delta `recordChapterWordCount` already computed). The Dashboard's
  `ActivityCard` now reads `useActivityLog()` instead of the old
  always-empty `dashboard-data.ts` mock; `dashboard-data.ts`'s `activity`/
  `ActivityKind`/`todaysProgress` exports were deleted (superseded), and
  `weeklyStats`/`writingGoal` were trimmed to just the one field
  (`writingTime`) that still has no real-data source at all.
- **`/projects` Word Count card simplified to an honest cross-project
  total:** it was rendering a per-project-shaped Written/Remaining/Total
  Goal ring despite being a sum across every project — summing per-project
  *targets* into one number doesn't correspond to anything a user is
  actually working toward. New `useTotalWordCount(bookIds)` in
  `manuscript-store.ts` sums real per-book word counts (each lazily
  fetched via the existing `loadWordCount`) across an arbitrary set of
  books at once — the store gained a module-level `version` counter
  (bumped in `emit()`) so this aggregating hook can detect "something
  changed" via one stable primitive instead of returning a freshly
  computed sum object from `useSyncExternalStore`'s `getSnapshot` (which
  would fail its reference-stability contract). The card itself now just
  shows the real total; `activeWordStats()` (projects-data.ts) and its
  `LegendRow`/`Ring` rendering were deleted as dead code.
- **Slash-command trigger shell** (explicitly scoped by the user to *only*
  the mechanism — "don't add anything to it, I'll route it to the backend
  later"): `getSlashTrigger()` in `chapters/page.tsx` detects "/" typed as
  the first character of an otherwise-empty paragraph (checked on every
  `input`/`mouseup`/`keyup`) and opens `SlashCommandMenu`, a portaled,
  fixed-positioned panel near the caret. It live-filters a static preview
  list (Heading 1/2, lists, image, table, scene break) by whatever's typed
  after the "/", but every row is inert — no `onClick`, muted styling, a
  "Soon" badge — so it reads unmistakably as a preview, not a menu that's
  silently broken. Closes on Escape, or a click outside both the menu and
  the editor (a `mousedown` listener while open; clicks *inside* the
  editor are already handled by the selection-change recompute). Escape's
  own `keyup` had to be special-cased out of the same handler that
  recomputes the trigger on every `keyup` — otherwise it would immediately
  reopen the menu it was just told to close, since the "/…" text under the
  caret hadn't changed.
- **Collaboration and comment persistence were explicitly deferred** —
  asked by the user directly, given the backend has no realtime
  infrastructure or comments table (confirmed by reading the backend repo)
  and this session has no push access to it anyway. "Active Collaborators"
  and Share remain the existing honest static placeholders; do not build
  real-time sync or persisted comments without the user raising it again.
- **Toolbar audited, not rebuilt** — already substantially real from an
  earlier pass (`document.execCommand`-backed bold/italic/underline/
  strike/color/highlight/link/image/table/lists, undo/redo). Verified via
  a scripted pass against a local mock backend: `Ctrl+B` and the toolbar's
  Bold button both genuinely apply/toggle `<b>`, text color and
  bulleted/numbered lists apply real DOM changes, Undo/Redo actually
  undo/redo. No changes needed here beyond the crash fixes above, which
  were the actual "editor breaks" complaint.

---

## 1. What this is

**WordArchitect** is a production web app: an AI-assisted studio for novelists
(projects, characters, worldbuilding, outlines, writing, with AI at the
writer's side). Tagline: **"Write. Craft. Conquer."**

- Product name is WordArchitect (the repo name).
- Live on Vercel: **word-architect-three.vercel.app** (auto-deploys on every
  push to the working branch).
- Built and polished: Dashboard, Projects, New Project, Project Overview tab,
  and six full workspaces — Writing (manuscript editor), Outliner,
  Characters, Worldbuilding, Notes, AI Assistant (chat — see §4.7).
- Still stubbed (`<ComingSoon>`, no data model at all yet): Project
  Analytics tab, Project Settings tab, and the top-level Timeline/
  Templates/Goals/Help nav destinations. (The top-level "AI Assistant" nav
  destination is real now — it redirects to the book-scoped assistant,
  same pattern as Writing/Characters/etc.)
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

This was true of every domain at the start of backend integration,
including the Outliner and the Manuscript editor's structure/body content
— both are now live, see §3.5 and §4.5/§4.8.

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
| Worldbuilding | **Live** — `/world-categories` + `/codex` | `worldbuilding-store.ts` |
| Notes | **Live** — `/notes` | `notes-store.ts` |
| Manuscript/Chapters | **Live** — `/manuscript/chapters` | `manuscript-store.ts` |
| Banned Terms | **Live** — `/banned-terms` | `banned-terms-store.ts` |
| AI Assistant Chat | **Live** — `/chat` + `/chat/sessions` | `chat-store.ts` |
| Outliner | **Live** — `/outline/beats` + `/manuscript/chapters/:id/beats` + `/manuscript/beats/:id` | `outline-store.ts` |
| Planning Engine | **Live** — `/agent-prompts` + `/planning/runs` | `planning-store.ts` |
| Dashboard-only stats | Mock, deferred | `dashboard-data.ts` (no backend resource exists for these — see §4.9) |

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
AI-searchable memory — **now wired to a real "Sync to AI Memory" button**,
see the writeup below — deliberately kept a distinct writer action from
autosave-while-typing, not something that fires on every debounced save.

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

### Notes (live)

`notes-store.ts` now fetches/writes real `notes` rows via `/notes`. Same
`bookId`-scoped signature pattern as Character: `useNotes(bookId)`,
`useNotesLoadStatus()`, `useNotesError()`. `createNote()` and
`togglePinned()` are both now `async` — the "New Note" modal and the
"Quick Notes" composer (`notes/page.tsx`) both await `createNote()` with a
submitting/error state, and the star-icon pin toggle fires
`void togglePinned(id)` without a dedicated loading state (a lightweight
single-field PATCH, same latency tolerance as Project's inline Target
Words field).

**Response shape confirmed by reading `notes.ts` directly**: `{notes:
[...]}` from the list endpoint (server-sorted pinned-first, then
`updated_at` descending — matches the frontend's desired "recent activity"
ordering exactly, so no client-side re-sort is needed beyond assigning
`dateRank`), `{note: {...}}` from get/create/patch.

**Field mapping** (`mapRowToNote` in `notes-store.ts`): `id`/`title`/
`excerpt`/`category`/`comments`/`pinned` map directly (the backend's
`category` CHECK constraint — `017_notes.sql` — uses the exact same
6-value set as the frontend's `NoteCategory` union, so no conversion
needed, unlike Character's `role`/`tier`). `date` and `dateRank` are
display-only derived fields with no backend column, same as Project's
`updated`/`updatedRank`: `date` is formatted client-side from
`updated_at` (`formatRelative()`, a local copy of the same helper
`project-store.ts` uses — not shared, since neither store exports it);
`dateRank` is assigned by index in the already-server-sorted list, so
lower rank = more recently updated/pinned, same effect as before.

**`mine` is deliberately not a stored column** — the migration's own
comment explains why: "mine" is relative to whoever's viewing, not an
inherent property of the note. The backend stores `user_id` (the author)
instead, and `mapRowToNote` computes `mine: row.user_id === getUserId()`
client-side, the same pattern `getUserId()` already exists for.

**`notes-data.ts` cleanup:** the old `NOTES` seed array and `findNote()`
helper (which only existed to look values up in that array) were deleted
— nothing else referenced them once the store stopped importing seed
data. Every other export (`NOTE_CATEGORY_META`, `sceneFor`, `pinnedNotes`,
`recentNotes`, `folderCount`, `notesInFolder`, the `Note`/`NoteCategory`/
`NoteFolderKey` types) is unchanged and still used as-is by `notes/
page.tsx` — these are pure functions over whatever `Note[]` they're given,
real or mock, so none of them needed touching.

**Verified working** (same local-mock-server approach as Project/
Character/Manuscript): a project with zero notes shows a correct empty
state (`0 notes`, "No pinned notes yet"); creating a note through the
"New Note" modal shows it in the grid and updates the count; pinning a
note moves it into the Pinned Notes rail; the note and its pinned state
both survive a hard reload (real persistence); and the Quick Notes
composer creates a second real note the same way.

### Worldbuilding (live)

`worldbuilding-store.ts` now fetches/writes real data via two backend
resources, not one — the backend has no dedicated `world_entries` table.

**Categories** are backed by `/world-categories`, a real table
(`world_categories`) keyed by `book_id` + `key`. **Entries are just
`codex_entries` rows whose `entry_type` isn't `"character"`** — the exact
same table Character uses (see `codex.ts`), scoped by whatever string the
category's `key` is. This is a real architectural discovery made by
reading `worldCategories.ts`/`codex.ts` directly (continuing the
established "read the route source, not the summary table" discipline):
a `WorldEntry` has no dedicated identity of its own on the backend at all.

**The fixed 8-category taxonomy is kept as a permanent client-side base
layer**, not replaced by the fetch. A brand-new project has zero rows in
`world_categories` and zero non-character `codex_entries`, so a naive
"just fetch categories" would show a completely empty taxonomy on every
new project — worse than the old mock. Instead `useWorldCategories(bookId)`
merges `WORLD_CATEGORIES` (Places/Nations/Cultures/History/Magic/
Factions/Religion/Items & Artifacts) with whatever the backend actually
returns, keyed by `key`, real data winning on collision. This is the same
"structure, not seed content" treatment CLAUDE.md already applies to the
Outliner's Act I/II/III containers — the 8 categories are the fixed
organizing taxonomy, not sample data to purge.

**The backend also merges in "derived" categories server-side**: if a
book has `codex_entries` using an `entry_type` with no matching
`world_categories` row yet (e.g. entries created directly through the
MCP tool surface before a matching category was ever explicitly created),
`GET /world-categories` synthesizes a display-only category for it
(`id: ""`, `is_derived: true`, a titleized name, no explicit color/icon —
`mapRowToCategoryMeta` falls back to a neutral gray + the generic
`DEFAULT_WORLD_ICON` for these). This means a category always exists to
group entries under, even before anyone explicitly creates one for it.

**Icon serialization**: `WorldCategoryMeta.Icon` is a React component
reference (can't cross the network); the backend's `world_categories.icon`
column is a plain nullable string, exactly the gap this repo's own
CLAUDE.md flagged before this pass ("backend should store an icon
identifier string instead"). `createWorldCategory()`'s `NewCategoryInput`
now takes `iconKey?: string` (the icon library's `name` field, e.g.
`"Castle"`) instead of an `Icon` component; a new `WORLD_ICON_REGISTRY`
(`worldbuilding-data.ts`) maps those same name strings back to components
on read, with `DEFAULT_WORLD_ICON` (`Layers`) as the fallback for a
missing/unrecognized icon string — same fallback the old mock used.

**Entries are still read-only from the app's own UI** — there is still no
"New Entry" form anywhere (unchanged, documented gap, see §4.3), so
nothing in the app itself writes a `codex_entries` row with a
non-character `entryType`. What changed is that the World hub now reads
real data instead of a permanently-empty seed array: `useWorldEntries(bookId)`
fetches `GET /codex?bookId=` (no `entryType` filter — the codex route only
supports equality, not "not equal," so all entries are fetched and
`entry_type !== "character"` is filtered client-side, mirroring exactly
what the backend's own `listWorldCategories` does server-side) and maps
each row to `WorldEntry`. This means entries created some other way — the
MCP tool surface's `create_codex_entry`, most plausibly — now actually
show up in Recent Entries, category counts, and category filtering,
instead of the hub being structurally incapable of ever showing a
non-zero entry count. Same class of fix as Character's `findCharacter`
bug from the Character integration pass: not new functionality, just
correctness once real data exists to read.

**`worldbuilding-data.ts` cleanup**: the old `WORLD_ENTRIES` seed export
was removed along with its use as a default parameter on `worldCounts()`/
`recentEntries()`/`findEntry()` — all three now take an explicit
`entries: WorldEntry[]` argument instead, since there's no longer a
module-level array to default to.

**Still mock, no backend resource for these at all**: `WORLD_TIMELINE`,
`WORLD_OVERVIEW`, and `PINNED_WORLD_ITEMS` remain static, empty exports —
same "decision on record, wire up in a later pass once the resource
exists" treatment as the Dashboard-only stats in §4.9. Nothing in this
pass invented a backend shape for a world timeline, an editable world
overview, or pinned-item notes, since none of those exist as tables today.

**Verified working** (same local-mock-server approach as every other
domain — extended with `/world-categories` handlers matching the real
envelope/snake-case shape and the server-side derived-category merge
logic): a project with zero custom categories still shows the full 8-item
base taxonomy; creating a category through the "New Category" form shows
it in the Categories grid and filter tabs and survives a hard reload;
and — the key correctness check — a `codex_entries` row created directly
against the mock backend (simulating an MCP-created entry, bypassing the
app's own UI entirely) correctly appears in the World hub's Recent
Entries table on the very next load, with no app changes needed to see it.

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
`projectStatusCounts()`, `primaryGenre()`, `topGenres()`,
`deriveRecentChapters()`, `deriveRecentActivity()` — these are pure
functions over the `Project[]` list; the backend does not need to
reproduce them as stored fields, just needs to serve the underlying data
they're computed from. (`activeWordStats()` was deleted — see the "Fourth
pass" changelog entry: it summed per-project `words`/`target`, which are
always `0` on the live backend anyway, into a per-project-shaped
Written/Remaining/Total Goal breakdown for what's actually a cross-project
card; `useTotalWordCount()` in `manuscript-store.ts` replaced it with a
real cross-project total.)

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

**Live — backed by the real backend's `/world-categories` (categories) and
`/codex` (entries — there's no dedicated entries table, see §3.5's
Worldbuilding section for why). Types are still defined in
`src/lib/worldbuilding-data.ts`; `src/lib/worldbuilding-store.ts` fetches/
writes real data.** The fixed 8 categories below stay a permanent
client-side base layer (merged with real backend categories), same
"structure, not content" treatment as before — see §3.5 for the merge
details and the entries-are-just-codex-rows discovery.

```ts
export type WorldCategoryKey = "places" | "nations" | "cultures" | "history" | "magic" | "factions" | "religion" | "items";

export type WorldCategoryMeta = {
  key: WorldCategoryKey;
  label: string;
  description: string;
  Icon: LucideIcon;   // a React component reference, not serializable as-is — resolved client-side via WORLD_ICON_REGISTRY/iconForKey() from the backend's plain string icon column (see NewCategoryInput note below and §3.5)
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
  iconKey?: string;   // icon library name (e.g. "Castle"), picked from a fixed 30-icon library in the form (ICON_LIBRARY) — real backend column now (world_categories.icon), see §3.5
};
```

`createWorldCategory(bookId, input)` is now `async` and calls the real
`POST /world-categories` — the backend derives `key` from `name` (or an
explicit `key`) server-side, the same slugify logic the old mock used
client-side; 409 on a colliding key for the same book. `description`
still defaults to `"A new worldbuilding category."` if blank. The 8 base
categories (Places/Nations/Cultures/History/Magic/Factions/Religion/Items
& Artifacts) remain fixed, now as a client-side merge layer rather than
the entire taxonomy (see §3.5).

**EDITABLE-vs-READ-ONLY:** categories are createable for real now (see
above); **individual `WorldEntry` records are still 100% read-only from
the app's own UI** — there is still no "New Entry" form anywhere, despite
the hub page's Recent Entries table and category filtering now reading
real `codex_entries` data (see §3.5) instead of a permanently-empty seed
array. `WORLD_TIMELINE` (still 0 events), `WORLD_OVERVIEW`, and
`PINNED_WORLD_ITEMS` remain static exports with no UI to edit them and no
backend resource at all. The entries gap is still the single biggest
EDITABLE gap for AI-context purposes: a worldbuilding "codex" the AI would
pull from has a real read path now, but the only write path into it is
outside this app (the MCP tool surface's `create_codex_entry`, most
likely) — there's still no in-app form for a writer to add one directly.

### 4.4 Notes

**Live — backed by the real backend's `/notes`, see §3.5's Notes section
for the field mapping and integration notes.** Types are still defined in
`src/lib/notes-data.ts` (now just types + the pure folder/sort/scene
helpers — the old 24-note seed array and `findNote()` were deleted, see
§3.5); `src/lib/notes-store.ts` fetches/writes real data.

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
`"Inspiration"`, `title` = first 40 chars of the text. Both now call the
real, `async` `createNote(bookId, input)`. `pinned` also toggles for real
via `togglePinned(id)` (the star icon on any note card, now an `async`
network call). `comments` and `mine` have real backend meaning now too
(see §3.5) rather than being seed-only — `comments` just has no UI that
increments it yet (no comment-adding feature exists), and `mine` is
computed live from the real `user_id` column instead of hardcoded seed
values.

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
5. **`sync-to-memory` — a real, disabled-until-edited "Sync to AI Memory"
   button, not a plain always-clickable "Resync."** `syncChapterToMemory(
   chapterId)` (`manuscript-store.ts`) calls `POST /manuscript/chapters/
   :id/sync-to-memory` for real. The backend added its own guard against
   redundant resyncs (`021_chapter_content_updated_at.sql` +
   `manuscriptChapters.ts`): a new `content_updated_at` column that bumps
   *only* when a `PATCH` actually includes `paragraphs` (a plain title/
   heading/complete/part edit does not move it — that distinction is
   exactly why this can't just reuse `updated_at`), compared against
   `synced_to_memory_at` to decide whether a resync would do anything.
   Calling it when nothing's changed responds `200 {alreadySynced: true,
   syncedAt}` — a real no-op, not a fresh 201 re-embed — while an actual
   sync still responds `201 {chunks, syncedAt}` (both flat, non-enveloped
   — a second exception to the usual `{chapter: {...}}` wrapping,
   alongside Banned Terms' flat `POST` response in §4.6). The frontend
   mirrors this guard client-side (`syncNeedFor()` in `chapters/page.tsx`)
   rather than leaning on the backend's safety net alone, so the button's
   own state always matches what a click would actually do:
   - `chapter.syncedToMemoryAt` is `null` (never synced) → active, plain
     styling, no pulse — nothing to compare against yet.
   - `chapter.contentUpdatedAt` is missing (only possible if migration 021
     hasn't backfilled a given row) → treated as needing sync rather than
     assumed up to date, per the same defensive fallback the backend team
     called out.
   - `contentUpdatedAt` after `syncedToMemoryAt` → a real edit landed
     since the last sync → active, with an `animate-pulse` gold treatment
     as the visual nudge.
   - otherwise → already up to date → **disabled**, not just discouraged.
   A separate `hasContent` check (the editor's own live word count > 0,
   already computed for the status bar) disables the button and shows
   "Nothing to sync yet." for an empty chapter, so the UI never has to
   round-trip a 400 just to learn that. The button's label is a constant
   "Sync to AI Memory" throughout — state is communicated via disabled/
   pulse, not by swapping the text to "Re-sync." A `title` tooltip notes
   that syncing doesn't retroactively touch anything already generated,
   only what future generations can recall. Lives in the editor's existing
   per-chapter "..." menu (`MoreMenu` in the TopBar) rather than adding new
   chrome; a real "Last synced Xh ago" caption shows once
   `chapter.syncedToMemoryAt` is set. `ManuscriptChapter` gained both
   `syncedToMemoryAt` and `contentUpdatedAt` (mapped from
   `synced_to_memory_at`/`content_updated_at`); confirming updates the
   chapter-list cache in place with a new row object (not a mutation, to
   satisfy `useSyncExternalStore`'s reference-equality contract) so the
   button/caption update live without a refetch. Shows a real inline
   result for every outcome — "Synced (N chunks)" on a real sync, "Already
   up to date." on the (normally unreachable, since the button's already
   disabled by then) `alreadySynced` case, or the backend's actual error —
   never a silent no-op; logs a `"wrote"` activity entry only on a real
   sync, not on the no-op.
6. Collaborators/presence and Share are fully decorative/static — not a
   near-term backend priority per the current build.

**Verified working** (Sync to AI Memory, against a local mock backend
extended to replicate the real guard logic exactly — `content_updated_at`
bumping only on a `paragraphs` PATCH, `sync-to-memory` responding
`200 {alreadySynced: true}` when nothing changed since the last sync):
an empty chapter shows the button disabled with "Nothing to sync yet.";
typing real content and letting autosave land enables it (no pulse — never
synced before); a real sync shows "Synced (N chunks)" and the button
correctly goes back to disabled with a "Last synced…" caption; editing the
chapter again re-enables the button with the pulse/glow treatment; a
second real sync succeeds the same way; and, confirmed directly against
the mock's guard logic (not reachable through the UI once the button's
properly disabled), calling `sync-to-memory` again with no further edit
returns the real `200 {alreadySynced: true}` no-op rather than a fresh
201. Zero console errors across the full pass.

**Search this manuscript — the sidebar's search icon, previously dead,
now a real full-text search over every chapter's actual saved content.**
User report: the highlighted search icon at the top of the left-rail
chapter nav had no `onClick` at all — the only search-shaped control in
the editor was the always-visible "Filter chapters…" input directly below
it, which only matches a chapter's `number`/`title` client-side, not its
prose. On a real ~400-chapter manuscript, finding "which chapter has the
line about the phoenix" meant opening chapters one at a time.

**No new backend endpoint was needed, or added.** The backend has no
`/search` route of any kind — confirmed by reading every file in
`src/routes/` on `claude/ai-fiction-platform-backend-qnvkm5` directly, not
inferred. What it does have (`src/services/rag.ts`) is a vector-embedding
similarity search over `manuscript_chunks`, but that's Hanami's own
internal "Deep Past" context-retrieval layer for prose *generation* — it's
scoped to whatever the current scene beat's embeddings are nearest to,
throws away anything below a similarity threshold, and is never exposed as
a general "find this exact phrase" tool. Building a real backend
full-text-search endpoint (and this app has no push access to that repo
anyway) would also duplicate a fetch this app already makes: **this
manuscript search is 100% client-side**, and deliberately reuses the exact
same all-chapters-bodies fetch `useManuscriptWordCount()` already does
(see §5.6) rather than issuing a second round of per-chapter requests.
`manuscript-store.ts`'s existing `wordCountCache` entry now also keeps
each chapter's real `paragraphs` (`IndexedChapterBody`) alongside its word
count — same fetch, no extra network cost — and a new
`useManuscriptSearchIndex(bookId, enabled)` reads from that same cache,
gated by an `enabled` flag so opening the editor alone never triggers the
fetch; it only fires once the search panel is actually opened (or reuses
whatever's already warm from `/projects`, the Overview tab, or the
Dashboard having already loaded this book's word count).

**UI** (`ManuscriptSearchModal` in `chapters/page.tsx`, portaled and
centered like `ConfirmDialog`): a plain case-insensitive substring search
(debounced 200ms) across every non-scene-break paragraph's real text,
returning up to 200 matches (`SEARCH_RESULT_LIMIT`) — each result shows
its chapter number/title and a ~120-character snippet with the matched
text `<mark>`-highlighted. Clicking a result calls `selectChapter()` (the
same function the nav list and "Add Chapter" already use — flushes any
pending autosave first, same as switching chapters any other way), then
scrolls the target paragraph into view and briefly flashes it
(`.wa-search-flash`, a CSS-only keyframe in `globals.css` — no DOM
mutation, so it carries none of the `removeChild` reconciliation risk the
"Type / for commands" placeholder fix earlier in this file had to work
around) once that chapter's body has actually loaded (`useChapterBody` is
lazy per-chapter, so the jump waits a render pass via `requestAnimationFrame`
rather than assuming the target paragraph's DOM node already exists).
Escape and a click on the overlay both close it, same convention as every
other portaled dialog in this app.

**Verified working** (against a local mock backend, three chapters with
distinct planted content): opening the panel shows a real "search across
every chapter's actual text" hint before typing, not an empty list;
searching a word that appears in two different chapters' prose ("phoenix")
returns exactly those two chapters' matches with the term highlighted;
searching a word confined to one chapter ("dragon") returns exactly one
result; searching a nonsense string shows a real "No matches" message
rather than an empty silent list; clicking a result closes the modal,
switches to the correct chapter, scrolls to and visibly flashes the exact
matched paragraph; Escape and click-outside both close the panel. Zero
console errors across the full pass.

**Editable chapter title, and a real "renumber to close gaps" fix.** Two
issues reported once a real ~400-chapter manuscript was in the app: every
chapter nav row and the editor's own heading read "Chapter N – Chapter N"
(the title had never been editable anywhere, so `mapRowToChapter()`'s own
`Chapter N` fallback was all that ever showed), and the chapter list
skipped several numbers (409, 410, 411, 412, then straight to 416) —
confirmed to be real, pre-existing gaps in `manuscript_chapters.number`
for that book, not a frontend rendering bug (there is no chapter-delete
feature anywhere in this app, so nothing here could have created them —
most likely from however that book's 400+ chapters were first created,
e.g. a bulk import or the MCP tool surface setting explicit numbers).

- **Editable title**: the editor's `<h1>{body.title}</h1>` (previously
  static) is now a real inline `<input>`, saved on blur via the new
  `updateChapterTitle(chapterId, title)` (`manuscript-store.ts`) — a plain
  `PATCH /manuscript/chapters/:id` with just `{title}`. Deliberately does
  **not** touch `content_updated_at` (only a `paragraphs` PATCH does),
  so renaming a chapter never falsely flags it as needing an AI-memory
  resync. This is the *same* title shown in the left-rail chapter list
  (`ChapterRow`'s "Chapter N – {title}") — one field, edited from the
  editor's own heading, not a second copy in the nav row; confirming a
  save updates the shared chapter-list cache in place so the nav row
  updates live with no separate edit affordance needed there.
- **Renumber to close gaps**: `ManuscriptPanel` (the left rail) computes
  `planChapterRenumber(bookId)` (`manuscript-store.ts`) on every render of
  the chapter list and shows a real warning banner ("Chapter numbers have
  a gap") whenever any chapter's number isn't exactly one more than the
  previous chapter's. Clicking "Renumber to close the gap" shows a
  `ConfirmDialog` naming the *exact* plan (e.g. "416→413, 417→414, …") —
  no vague "this will renumber things" — before `renumberChaptersToCloseGaps()`
  executes it as a sequence of plain `PATCH .../number` calls (an
  already-supported field), processed in ascending order of each
  chapter's *old* number so every target number is either a genuine gap
  or was just vacated one step earlier in the same pass — this can never
  collide with the backend's `UNIQUE(book_id, number)` constraint.
  **Refuses to move any chapter that's ever been synced to AI memory**
  (`syncedToMemoryAt` set): that chapter's `manuscript_chunks` rows are
  keyed by its *current* number, and this app has no coordinated way to
  update those chunks' `chapter_number` alongside a renumber — no backend
  endpoint for it, and no direct database access from this integration
  pass. If even one move in the computed plan involves a synced chapter,
  the *entire* renumber is refused (not just that one chapter) — the
  banner instead lists exactly which chapter(s) are blocking it by number
  and title, and says to ask the backend team to fix those specific
  chapters' AI-memory records directly, rather than silently leaving a
  synced chapter's embedded memory pointing at the wrong chapter number.
  A failure partway through the sequence (network error mid-loop, no
  transactional guarantee possible from the frontend alone) reports
  exactly how many of the planned moves actually completed before it
  throws, rather than leaving the writer guessing at partial state.

**Verified working** (against a local mock backend replicating the real
number-collision (`409`) and sync-guard behavior): a book with chapters
1,2,3,4,6,7 shows the gap banner; editing chapter 1's title in the editor
saves for real and the nav row updates live from "Chapter 1 – Chapter 1"
to "Chapter 1 – A Man" with no separate edit action needed in the list;
confirming the renumber plan actually shifts 6→5 and 7→6, the banner
disappears, and the real chapter numbers are independently verified
sequential via the API afterward; a second book with chapters 1,2,4 where
chapter 4 has already been synced to AI memory correctly refuses to
renumber, names chapter 4 specifically in the blocked message, and leaves
all three chapters' numbers untouched. Zero console errors across the
full pass.

**Live production bug, caught the day this shipped: the renumber confirm
dialog could trap the user with no way to confirm or cancel.** A real
~400-chapter manuscript's gap generated 326 individual moves; the confirm
description spelled out every one of them ("92→91, 93→92, 94→93…"), which
made the dialog's card taller than the viewport. `ConfirmDialog`
(`src/components/ui/confirm-dialog.tsx`) had no height cap and nothing
inside it scrolled, so the Cancel/Confirm row was pushed off-screen with
no way to reach it — not even Escape, which the component didn't handle
at all at the time. Fixed two ways, deliberately at two different layers
since either alone would have left the other's failure mode reachable:
1. **The actual cause**: `describeRenumberPlan()` (`chapters/page.tsx`)
   now summarizes a large plan into contiguous ranges sharing the same
   shift amount ("Chapters 93–419 → 92–418") instead of enumerating every
   move — the common case (a handful of moves) still lists them all
   explicitly; the threshold is a flat 8.
2. **The class of bug**: `ConfirmDialog` itself now caps its card at
   `85vh` with only the description area scrolling (title and the
   Cancel/Confirm row stay pinned via `flex flex-col` + `shrink-0`), and
   added Escape-to-cancel as a second way out that doesn't depend on the
   buttons being reachable at all — so no future caller passing a long
   description can reproduce the same stuck-modal failure, on this
   feature or any other one that reuses this shared component.

**Verified working** (against a local mock backend seeded with a 49-
chapter book with one early gap, closely mirroring the real production
shape — a gap early in the sequence with dozens of chapters needing to
shift): the confirm dialog's description reads as a short range summary,
not an enumerated list; both Cancel and Confirm are confirmed on-screen
and within the viewport's bounding box (not just present in the DOM);
Escape closes the dialog for real; and the actual renumber still executes
correctly end-to-end afterward, independently verified via the API to
have produced a fully sequential 1-N numbering. Zero console errors.

**Real-world case that came back the same day: a ~400-chapter book where
325 of the 326 chapters that would need to move were already synced to
AI memory — the safety guard correctly refused the renumber entirely,
exactly as designed.** This isn't a bug: fixing it for real needs
`manuscript_chunks.chapter_number` updated in lockstep with the chapter
renumber, which requires direct database access this integration pass
doesn't have (no backend push access, no Supabase credentials) — flagged
to the user as a real limitation, with the concrete fix (a one-time SQL
script realigning `manuscript_chunks`, using the exact same
collision-safe ascending-order logic already used for the chapter
`number` shifts) offered but not built, since the user chose to leave
that book's gap alone rather than have it fixed at the database level.

That case *did* surface a real UX problem worth fixing on its own,
though: with a gap this large, the persistent gap-detected banner would
otherwise show a loud warning box on every single visit to a book whose
gap the writer has already decided to live with, and the blocked-state
message listed all 325 blocking chapters with no cap — a long, low-value
scroll of near-identical "Chapter N – Chapter N" lines (itself just
reflecting that none of those chapters had a real title set yet — see the
editable-title fix above). Fixed by making the *idle* gap notice a plain,
low-key single-line text row (an icon + one sentence + "Renumber", no
colored box) rather than a standing alert, and capping the blocked list
to the first 6 chapters plus a "…and N more" line, with a "Dismiss"
action on both the blocked and error states so a result the writer has
already read doesn't have to keep occupying sidebar space.

**Verified working** (against a local mock backend with 24 of 29
chapters synced, mirroring the "almost everything is blocked" shape):
the idle notice renders as a short single-line row (confirmed under 40px
tall, not the original alert box); triggering the renumber against this
data shows the blocked message with exactly 6 listed chapters and an
"…and N more" line for the rest; Dismiss returns the sidebar to the
compact one-line notice. Zero console errors.

### 4.6 Banned Terms

**Live — backed by the real backend's `/banned-terms` (see the backend
repo's `src/routes/bannedTerms.ts` + `012_banned_terms.sql`).** The
"Ghost Editor" feature: a writer highlights any word/phrase/sentence
directly in the manuscript editor's prose and bans it for the current
book, no separate settings screen involved. Once a term is banned,
`POST /generate-prose` enforces every banned term for that book
automatically on the backend — nothing else in the frontend needs to call
or configure anything for enforcement itself. Confirmed by reading the
backend's own migration comment: there's no cheap generation-time
suppression mechanism (`logit_bias` doesn't work against the model this
app uses, and word-level token suppression isn't safe since most words
share subword tokens with unrelated vocabulary) — every ban is enforced by
detecting it in already-generated text and regenerating the offending
paragraph, which is also why banning at least one term costs a book its
live token-by-token streaming during generation (the prose only appears
once generation and any needed regeneration passes are done) — a
deliberate tradeoff surfaced to the writer directly in the Banned Words
panel's own copy, not hidden.

```ts
// `banned_terms` row exactly as the backend returns it.
export type BannedTermRow = {
  id: string;
  user_id: string;
  book_id: string;
  term: string;
  created_at: string;
};
```

`src/lib/banned-terms-store.ts` follows the same `bookId`-scoped
single-current-book pattern as `notes-store.ts`/`character-store.ts` (not
manuscript-store.ts's Map-keyed pattern) — the list is only ever shown for
whichever project's editor is currently open. `banTerm(bookId, term)`
sends the selection exactly as-is (no client-side trim/lowercase — the
backend trims, and matching is already case-insensitive there); the
backend can respond 200 (already banned, case-insensitively) or 201
(freshly banned), and both are treated identically in the UI — `apiFetch`
doesn't even surface the status code to the caller, so there was nothing
to branch on. **Response shape is flat, not envelope-wrapped**, confirmed
by reading `bannedTerms.ts` directly: `POST`/nothing-else returns the row
itself (`{id, user_id, book_id, term, created_at}`), unlike every other
domain's `{thing: {...}}` wrapping — the one exception found so far in
this codebase's backend integration, worth remembering before assuming
the wrapping convention holds universally. `GET /banned-terms?bookId=`
does use the usual envelope (`{terms: [...]}`). `DELETE /banned-terms/:id`
returns `204`.

**Editor UI** (`chapters/page.tsx`):
- **`SelectionBubbleMenu`** — a small floating "Ban this" button that
  appears above any real (non-collapsed, non-whitespace) selection inside
  the chapter body, positioned off a measured selection rect and portaled
  to `<body>`. Tracked via `document`'s `selectionchange` event, not
  `onMouseUp`/`onKeyUp` — a real bug was caught and fixed here: those
  fire *before* the browser has necessarily finished collapsing the
  selection for a given click (reproduced directly: a plain click landing
  where a large selection was already active could still read that old,
  non-collapsed selection at `mouseup` time, reopening the bubble a beat
  after it should have closed). `selectionchange` only ever fires once
  the selection has actually settled, which is what this specifically
  needs; the formatting toolbar's own unrelated `savedRangeRef`
  bookkeeping still uses `onMouseUp`/`onKeyUp`, since staleness by a
  frame or two doesn't matter for that lower-stakes purpose.
- **Long-selection confirmation**: a selection over 8 words routes through
  the shared `ConfirmDialog` ("Ban this whole selection?") before actually
  banning — everything technically still works for a selection that long
  (the backend bans the exact string either way), but it's unusual enough
  to be a likely misclick, so a quick confirm catches it. A second real
  bug was caught and fixed here too: the bubble's own "click outside
  closes it" listener didn't know about the separately-portaled
  `ConfirmDialog`, so clicking its "Ban It" button (a click outside both
  the bubble and the editor, from that listener's point of view) closed
  the bubble the instant it was clicked — banning still succeeded, but the
  "Banned" feedback never had a bubble left to show up in. Fixed by
  suspending that listener entirely while the confirm dialog is open.
- **A real "Ban" tab, not a floating popup** (`BannedWordsTab`) — lists
  every banned term for the book with a per-term unban (×) button, and is
  where the streaming-tradeoff note lives (the ban-from-selection flow
  doesn't need its own explanation since it's a one-line action; the tab a
  writer would open to review what's banned is the right place for the
  consequence). This is a second-pass fix: the first version opened this
  from a dedicated Ban-icon button in the editor's `TopBar`
  (badge showing the live count) as a portaled floating panel. User
  feedback caught that this was redundant — `PANEL_TABS` already has a
  visible Comments/Versions/Outline/AI tab bar right next to it doing the
  same "switch what the right rail shows" job, and `TopBar` even had
  *separate* Comments/Version-history icon buttons duplicating those two
  tabs specifically. Fixed by adding `"Ban"` as a fifth entry in
  `PANEL_TABS` (badge now lives on the tab label itself) and deleting all
  three of `TopBar`'s Comments/Versions/Banned-words icon buttons outright
  — `FocusModeTabStrip` (the icon-only strip that already existed
  specifically for "the tab bar is hidden, focus mode is active") was
  already the correct place for icon-shortcut access to all five tabs,
  and having `TopBar` *also* offer icon shortcuts to the same three tabs
  meant every reachable app state showed the same action twice.
- Bans and unbans both call `logActivity("banned", ...)`/read into the
  Dashboard's real activity feed (`activity-log-store.ts`) the same way
  every other real action does — `ActivityKind` gained a `"banned"` member
  for this.

**Verified working** (same local-mock-server approach as every other
domain in this file, extended with `/banned-terms` GET/POST/DELETE
handlers matching the real envelope/flat-body shapes and the
case-insensitive dedup behavior): select a word, confirm the bubble
appears and banning shows "Banned" then auto-dismisses; the Ban tab's
badge and content both reflect the real count and survive switching to
another tab and back; `TopBar`'s Comments/Versions/Banned-words icon
buttons are confirmed gone; `FocusModeTabStrip` shows all five tabs
(including Ban) and clicking one correctly exits focus mode straight into
that tab; a selection over 8 words routes through the confirm dialog and
still shows "Banned" feedback after
confirming; a plain click with no drag shows no bubble; banning the same
word in different casing three times still lists only one panel entry;
unbanning removes it from the panel and drops the badge count. Zero
console errors across the full pass.

### 4.7 AI Assistant Chat

**Live — backed by the real backend's `/chat` (+ session management) on
`claude/ai-fiction-platform-backend-qnvkm5` (see the backend repo's
`src/routes/chat.ts` and `src/services/chatAssistant.ts`).** A
persona-based discussion/brainstorming assistant with real read-only
access to a book's Codex, manuscript, worldbuilding, and notes via tool
calls — separate from Hanami prose generation (`/generate-prose`) and
explicitly **not** for writing manuscript prose. Not streamed: a turn can
involve several tool round-trips before Claude produces a final answer,
so the frontend shows a typing indicator, not partial tokens.

```ts
export type ChatPersona =
  "general" | "story_assistant" | "character_coach" |
  "worldbuilding_guide" | "writing_editor" | "brainstormer";

// chat_sessions row
export type ChatSessionRow = {
  id: string; user_id: string; book_id: string; persona: ChatPersona;
  title: string | null; created_at: string; updated_at: string;
};

// chat_messages row
export type ChatMessage = {
  id: string; session_id: string; role: "user" | "assistant"; content: string;
  tool_calls: { tool: string; input: Record<string, unknown> }[] | null;
  created_at: string;
};
```

**A conversation is locked to the persona it was created with — enforced
server-side, not just a frontend convention.** Confirmed by reading
`chat.ts` directly: `POST /chat` only reads `persona` from the request
body when `sessionId` is omitted; resuming an existing session always
uses that session's own stored `persona`, silently ignoring anything else
sent. `src/lib/chat-store.ts` never offers a "change persona" affordance
once a session actually exists (`ChatPanel`'s "Change persona" link only
shows pre-send, before the backend has created a session row at all).

**Response shapes, confirmed by reading the route source (not just the
handoff brief) before wiring this domain — continuing the discipline this
file has followed since the Projects integration bug:** `POST /chat` →
`{ sessionId, message }`, where `message` is the flat `chat_messages` row
(no further envelope). `GET /chat/sessions?bookId=&userId=` →
`{ sessions: [...] }` (envelope, server-sorted by `updated_at` descending).
`GET /chat/sessions/:id` → `{ session, messages }`. `PATCH
/chat/sessions/:id` → `{ session: {...} }` — an envelope, unlike `POST
/chat`'s flat `message` — worth remembering that this domain has *two*
different response shapes for its own two endpoints, not one consistent
convention. `DELETE /chat/sessions/:id` → `204`, cascades to messages
server-side.

**Store shape** (`chat-store.ts`): same `bookId`-scoped single-current-book
pattern as `notes-store.ts`/`character-store.ts`/`banned-terms-store.ts`
for the Recent Conversations *list* (`useChatSessions(bookId)`) — only one
project's conversations are ever shown at once. The currently *open*
conversation's message thread is separate, smaller state
(`useActiveChat()`), same split `manuscript-store.ts` already uses between
the chapter list and whichever single chapter body is open.
`sendChatMessage(bookId, text, persona?)` optimistically appends the
user's own message immediately (a temporary `pending-` id, replaced once
the real save-id comes back), and folds the resolved session into the
Recent Conversations cache in place — bumped to the front — rather than
re-fetching the whole list after every message.

**UI** (`src/components/chat-panel.tsx`, one component, two layouts
sharing the same store calls):
- **`layout="full"`** — the dedicated `/projects/[id]/assistant` workspace:
  a permanent Recent Conversations rail beside the thread. Built as a
  standalone full-bleed route (`assistant/page.tsx`), a sibling of
  `chapters`/`characters`/`world`/`notes`, **not** a page inside
  `(tabs)/layout.tsx` — those routes each render their own header and
  don't share that layout's chrome either (its `TABS` array is a
  cross-navigation list, not a live tab strip every project page renders);
  `(tabs)/layout.tsx`'s `TABS` gained an `"assistant"` entry so its own tab
  bar (visible on Overview/Analytics/Settings) can jump here.
- **`layout="compact"`** — the manuscript editor's existing "AI" side-panel
  tab (previously an honest placeholder, "Ask the AI Assistant about this
  chapter here" — now real). The Recent Conversations rail collapses into
  a dropdown behind a header button to fit the ~360px panel width, reusing
  the exact same `ConversationRow` component as the full layout.
- **Persona picker**: shown whenever no persona is chosen yet and no
  session is open — six cards (icon + label + focus line from the brief's
  own table), plus "Talk through your story — for writing actual prose,
  use Generate," matching the brief's explicit empty-state note.
- **Tool-call transparency**: `ToolCallSummary` collapses read tool calls
  into one line ("Looked up: 2 Codex entries, manuscript search" — counted
  and pluralized by tool name), expandable to raw `tool(input)` per call.
  `propose_*` tool calls render as a real `ProposalCard` — see "Confirm/
  Reject cards" below.
- **Markdown**: `src/lib/simple-markdown.tsx`, a small dependency-free
  renderer (bold/italic/inline code/links, bulleted/numbered lists,
  headers) — this app has no markdown library installed
  (`package.json` is deliberately minimal); assistant replies only ever
  need this common subset. Renders to real React elements, never
  `dangerouslySetInnerHTML`.
- **Nav**: the top-level `/assistant` nav destination redirects to the
  most-recently-active project's `/projects/[id]/assistant`, same
  "lowest `updatedRank` wins" convention as `/writing`/`/characters`/etc.

**Verified working** (same local-mock-server approach as every other
domain, extended with `/chat` + `/chat/sessions` handlers matching the
real envelope/flat-body shapes, including a simulated tool-call reply for
messages mentioning "character"/"world"/"note"/"manuscript"/"chapter"):
full layout — persona picker on a fresh visit, picking a persona shows the
empty-thread hint, sending a message shows the typing indicator then the
reply with a tool-call summary, the conversation appears in the rail,
starting a new conversation returns to the picker, resuming an old one
from the rail restores its messages, rename and delete (with confirm
dialog) both work. Compact layout — same picker/send/reply flow inside
the chapter editor's AI tab, plus the dropdown toggle showing the same
conversation. `/assistant` correctly redirects to the active project's
assistant page. Zero console errors across the full pass.

**Confirm/Reject cards — `propose_*` proposals are now real, not inert.**
Backed by the backend's "Add confirm-gated write tools to the Chat
Assistant" pass (`claude/ai-fiction-platform-backend-qnvkm5`): five
`propose_*` tools (`propose_create_codex_entry`,
`propose_update_codex_entry`, `propose_create_world_category`,
`propose_create_note`, `propose_save_manuscript_scene`) mirror the MCP
server's write-tool set but never touch Supabase when Claude calls them —
each one just validates its shape and logs an acknowledgment into
`chat_messages.tool_calls`, the same transparency record every tool call
already gets (confirmed by reading `chatAssistant.ts`'s `proposalAck()`
directly). **The tool call's `input` *is* the exact request body the
corresponding real CRUD endpoint accepts** — confirmed by reading
`codex.ts`/`worldCategories.ts`/`notes.ts`/the new `POST /manuscript/
save-scene` route directly, not just the tool schemas — so nothing needed
mapping field-by-field; a confirm just forwards `input` (plus `userId`/
`bookId`) straight to that endpoint.

`src/lib/chat-proposals.ts` (new) — `confirmProposal(tool, bookId, input)`
dispatches by tool name:
- `propose_create_codex_entry` / `propose_update_codex_entry` → raw
  `apiFetch` to `POST`/`PATCH /api/v1/codex(/:id)` (the `fields` passthrough
  object is spread directly into the body — same "don't duplicate Codex's
  field list" reasoning the backend's own comment gives for keeping that
  schema loose). Refreshes `character-store.ts` (`refreshCharacters`, an
  existing export) if `entryType === "character"`, otherwise
  `worldbuilding-store.ts` (`refreshWorld`, added by this pass — that
  store previously had no way to invalidate its cache from outside itself)
  — an update doesn't know which it is without a lookup, so it refreshes
  both, harmless either way.
- `propose_create_world_category` → calls `createWorldCategory()`
  directly (existing store function, same shape) — `NewCategoryInput.color`
  had to be widened from required to optional first, since the proposal
  schema doesn't require a color and the backend already accepts a missing
  one (defaults to `FALLBACK_COLOR` on read).
- `propose_create_note` → calls `createNote()` directly (existing store
  function, same shape), then `togglePinned()` if the proposal set
  `pinned: true` (creation itself has no `pinned` field on the backend).
- `propose_save_manuscript_scene` → raw `apiFetch` to the new `POST
  /api/v1/manuscript/save-scene` (no existing store wraps this endpoint —
  it's not the same as autosave). Calls `refreshManuscript()` after, so a
  brand-new chapter it created shows up in the chapter list; the *body*
  cache for an already-open chapter isn't invalidated (no cross-store hook
  for that today), so the confirmed summary says "Reopen the chapter in
  the editor to see it" rather than implying it updates live.
Every branch also calls `logActivity()` (`"character"`, `"world"`, or
`"wrote"`) so a confirmed proposal shows up in the Dashboard's real
activity feed exactly like the same action taken through its own form
would.

**UI** (`chat-panel.tsx`): `ProposalCard` replaces the old inert "not
actionable from here yet" note. Per-card local state
(`pending`/`confirming`/`confirmed`/`rejected`/`error`) — Reject is purely
a client-side transition (nothing was ever written, so there's nothing to
undo); Confirm calls `confirmProposal()` and shows a short real summary
("Created \"Kestrel Vane\".") on success or an inline error on failure,
never a silent no-op. `describeProposal()` renders the proposal's key
fields (name/entryType/description for a Codex entry, a 140-char preview
for a manuscript scene, etc.) rather than raw JSON, so the writer can
actually read what they're confirming — the full raw call is still
available via the existing expandable tool-call log for anyone who wants
it. State is local to the card and resets on remount (switching
conversations) — same "no persisted confirm/reject state" scope as the
rest of this panel; the message's own `tool_calls` log stays the
permanent record of what was proposed.

**Verified working** (same local-mock-server approach, extended with
`POST /codex`, `PATCH /codex/:id`, `POST /world-categories`, `POST`/
`PATCH /notes`, and `POST /manuscript/save-scene` handlers matching the
real shapes, plus trigger phrases in the simulated chat reply for each
proposal type): all four proposal types render a real Confirm/Reject
card with the correct preview text; confirming each one calls the real
endpoint and the created row is independently verifiable via a direct API
call (a codex entry, a world category, a note, and a chapter's paragraphs
via `GET /manuscript/chapters/:id` — the list endpoint's own
paragraphs-stripped response confirms the "no envelope leakage" shape
along the way); confirming shows the real success summary, not a
canned string; rejecting a proposal shows "Rejected — nothing was saved"
and confirmed independently that no row was created for it. Zero console
errors across the full pass.

### 4.8 Outliner (beats)

**Live — backed by the real backend's `/outline/beats` (whole-book board)
and `/manuscript/chapters/:id/beats` + `/manuscript/beats/:id` (per-chapter
CRUD), on `claude/ai-fiction-platform-backend-qnvkm5` (see the backend
repo's `src/routes/outline.ts` and the Beats section of
`src/routes/manuscriptChapters.ts`).** The old mock's `outline-data.ts`
(`THREE_ACT_STRUCTURE`, `Act`, `Beat`, `BeatColor`) is gone — replaced by
`src/lib/outline-store.ts` and real `chapter_beats` rows.

**The backend has no "Act" concept at all** — only Parts (optional,
`manuscript_parts`) → Chapters (`manuscript_chapters`) → Beats
(`chapter_beats`). This is a real architectural discovery, not a detail
that could be papered over: the old mock's entire board was three fixed
Act I/II/III columns, and nothing on the backend corresponds to that
grouping. The board (`outlines/page.tsx`) now groups by real chapter
instead — the "Group: Chapters / Status" toggle replaces the old
"Group: Acts / Status" one, and the copy under the page title says so
explicitly ("Beats are grouped by real chapter — the classic Act I/II/III
framing is a planning lens you apply yourself, not a stored structure").

```ts
export type BeatStatus = "not_started" | "planned" | "in_progress" | "completed";

// chapter_beats row, mapped from snake_case
export type OutlineBeat = {
  id: string;
  chapterId: string;
  orderIndex: number;
  title: string;
  outlineText: string;      // what /generate-prose pulls as sceneBeat when generating from a beat — not built into this frontend pass
  status: BeatStatus;
  linkedToManuscript: boolean;  // true once generated/accepted prose for this beat has been written into the chapter — read-only here, nothing in this app's UI sets it
  createdAt: string;
  updatedAt: string;
};

// GET /outline/beats's own chapter projection — id/part_id/number/title/heading/complete only, no paragraphs
export type OutlineChapter = { id: string; partId: string | null; number: number; title: string; heading: string | null; complete: boolean };
export type OutlinePart = { id: string; title: string; orderIndex: number };
```

**Also gone: the old mock's rich per-beat fields with no backend
column** — `purpose`, `description`, `sceneCount`, `color`, `pov`,
`location`, `time`, `mood`, `characters`, `notes` all had no real analogue
(`chapter_beats` only has `title`/`outline_text`/`status`/
`linked_to_manuscript`/`order_index`) and were dropped rather than kept as
inert UI, matching this repo's established "no fabricated fields" rule.
The detail panel is correspondingly simpler than the old mock's: an
editable title, an editable Outline Text (what the mock called
"purpose"+"description" combined into the one real field the backend
actually stores), a real Status dropdown, a real "Linked to Manuscript"
badge (shown only when true, read-only), a link to the chapter in the
editor, and Delete. The old mock's per-beat Color Label picker,
Duplicate action, and the Scenes/Notes/Links detail tabs are gone with
them — none had a real backend field to persist to.

**Two independent caches in `outline-store.ts`, same split pattern as
`manuscript-store.ts`/`chat-store.ts`:**
1. The whole-book outline (`useOutline(bookId)`, keyed by `bookId`) —
   parts + chapter metadata + every beat in one `GET /outline/beats?bookId=`
   call, for the board.
2. A single chapter's beats (`useChapterBeats(chapterId)`, keyed by
   `chapterId`) — `GET /manuscript/chapters/:id/beats`, for the editor's
   own Outline side-panel tab, so opening the editor never has to fetch
   the whole book's beats just to show one chapter's.

A beat mutation (`createBeat`/`updateBeat`/`deleteBeat`) patches whichever
of these two caches actually holds the affected beat/chapter, so the board
and the editor tab never drift out of sync with each other without a
manual refetch.

**Editor integration** (`chapters/page.tsx`): the "Outline" side-panel tab
— previously an honest placeholder ("A live outline of this chapter's
beats will live here") — is now `OutlineTab`, a real read-only list of the
open chapter's beats (title, status badge, an outline-text excerpt, a
"Linked to Manuscript" indicator where true) plus an "Open in Outliner"
link to the full board. Deliberately read-only: editing a beat happens on
the board, not here — this tab is a quick reference while writing, not a
second place to edit the same row. `CommentsPanel` gained a `chapterId`
prop (the editor's own `activeChapter?.id`) threaded down to it.

**Verified working** (same local-mock-server approach as every other
domain, extended with `/outline/beats`, `/manuscript/chapters/:id/beats`,
and `/manuscript/beats/:id` handlers matching the real envelope/
snake-case shapes): a project with real chapters shows one board column
per chapter (no "No chapters yet" false positive); Add Beat creates a
real beat and opens its detail panel; editing the title and outline text
both save on blur and the change survives a hard reload; changing status
via the dropdown updates the real row and the Outline Progress ring
recomputes live (confirmed going from "0 of 1" to "1 of 1" after marking
the one beat Completed); Delete removes it from the board for real;
grouping by Status works; a beat created directly against the mock
backend (simulating an editor-tab or MCP-created beat) correctly shows up
in the chapter editor's Outline tab with its real title/outline
text/status, and its "Open in Outliner" link is present. Zero console
errors across the full pass.

### 4.9 Dashboard-only data — mostly real now, via localStorage, not a backend resource

Source: `src/lib/dashboard-data.ts` re-exports `projects`/`Project` from
`projects-data.ts` (so "Your Projects" is real Project data) and still
holds `user` (hardcoded display name/quote — no auth to source a real one
from) and `aiInsights` (empty; no real AI plot/pacing analysis runs yet).
Everything else that used to live here as always-zero mock — Today's
Progress, Writing Goal, Weekly Stats' "Words Written", Recent Activity —
is **real now**, just not backend-synced: see the "Fourth pass" changelog
entry above for the full story. Two new per-browser localStorage-backed
stores, same tradeoff `writing-goal-store.ts` already established (real
and user-generated, just not synced across devices, since no
writing-session or activity-log backend resource exists):

- **`src/lib/daily-progress-store.ts`** — `useTodaysWordsWritten()`,
  `useWritingStreak()`, `useActiveDaysThisMonth()`,
  `useMonthWordsWritten()`, `useWeeklyWordsWritten()`. Fed by
  `recordChapterWordCount(chapterId, words)`, called from every successful
  chapter autosave (`chapters/page.tsx`) with that chapter's real post-save
  word count; only a positive delta versus the chapter's last-known count
  credits "today" (matches "words written," not "net change"). This is
  the single source both the manuscript editor's Daily Goal widget and the
  Dashboard's Today's Progress / Writing Goal / Weekly Stats cards read
  from — they can't drift apart.
- **`src/lib/activity-log-store.ts`** — `useActivityLog()`, fed by
  `logActivity(kind, text)` calls placed at the exact moment a real action
  succeeds: project/character/note/world-category creation, and a chapter
  autosave crediting a positive word delta. `ActivityKind` here is
  `"wrote" | "character" | "world" | "note" | "project"` (the old mock's
  `"session"` kind is gone — nothing ever produced it for real).

`aiInsights` stays genuinely mock (`AiInsightTone = "warn" | "purple" |
"success"`) — no real AI plot/dialogue analysis pipeline exists to feed
it, and building one is out of scope here. "Projects", "Characters", and
"World Entries" counts on the Weekly Stats row are computed live from real
`Project`/`Character`/`WorldEntry` data via `.reduce()` in-component, same
as before. `weeklyStats.writingTime` (a display string like `"0h 0m"`) is
the one field left with no real-data source of any kind, not even a
localStorage-derivable proxy — there's no session-time tracking anywhere
in the app.

### 4.10 Planning Engine

**Live — backed by the real backend's `/agent-prompts` and `/planning/runs`
on `claude/ai-fiction-platform-backend-qnvkm5` (see the backend repo's
`src/routes/agentPrompts.ts` / `src/routes/planning.ts` and
`src/services/planningEngine.ts`).** Types/metadata in
`src/lib/planning-data.ts`; `src/lib/planning-store.ts` fetches/writes
real data — no mock/seed predecessor existed for this domain, it shipped
live from the start.

**The paragraphs immediately below (through the "Restructure the Scrutiny
Panel" entry) describe the ORIGINAL flat 3-stage model
(`stage_1_summary` → `stage_2_acts` → `stage_3_beats`, one Generator call
per whole-book stage) — kept for historical trail, but superseded by the
Act → Part → Beats hierarchy rebuild documented in the "Full rebuild"
entry near the end of this section. Read that entry (and its own
"Corrections vs. the design mock" list) for how the pipeline actually
works today; treat everything about `stage_2_acts`/`stage_3_beats`,
`logic_critic`/`suspense_critic`'s original 2-critic panel shape, and the
one-card-per-run `awaiting_entity_review` flow below as describing a
predecessor version, not current behavior.** A pre-writing pipeline —
Stage 1 Core Summary -> Stage 2 Act Outlines -> Stage 3 Chapter Beats —
each stage written by a Generator agent, reviewed by two parallel Critics
(Logic, Suspense), synthesized by an Arbitrator, and gated on the
writer's explicit approval before advancing. This never writes manuscript
prose — Generate/Hanami drafting is completely untouched; this is purely
the pre-writing/planning phase.

**Every agent's behavior is a database row someone authors and saves —
the backend contains zero prompt content of its own.** A run can't do
anything until at minimum `arbitrator_chat`/`arbitrator_directive` exist
at stage `intake` (for the pre-Stage-1 conversation, see below) and
`generator`/`logic_critic`/`suspense_critic`/`arbitrator_panel` exist at
`stage_1_summary`. Seven roles total (`generator`, `logic_critic`,
`suspense_critic`, `arbitrator_panel`, `arbitrator_chat`,
`arbitrator_directive`, `entity_extractor`) × five stages
(`stage_1_summary`, `stage_2_acts`, `stage_3_beats`, `intake`, or `all`
for a role whose behavior doesn't need to vary by stage).
`entity_extractor` is the one role that only ever needs a single `all`
version — the backend hardcodes stage `"all"` when looking it up (see
`extractEntities()` in `planningEngine.ts`), never the run's actual
`current_stage`. `arbitrator_chat`/`arbitrator_directive` are different:
they're genuinely looked up at **two distinct moments** — stage `intake`
for the pre-Stage-1 conversation, and the run's real current stage
(falling back to `all`) for a mid-pipeline rejection interview — confirmed
by reading `intakeChatTurn()`/`finalizeIntake()` vs.
`chatTurn()`/`finalizeDirective()` directly, since each moment passes
different placeholders (see below). `SINGLE_STAGE_ROLES` and
`DUAL_MOMENT_ROLES` in `planning-data.ts` drive the UI hint text
(`roleStageGuidance()`) for this — not enforced, since `"all"` is always
technically a valid stage for any role. `POST /agent-prompts` saves a
**new version and activates it immediately**, deactivating whatever was
previously active for that exact role+stage — the only "save" action, no
separate draft/publish step. `PATCH /agent-prompts/:id` edits a version's
content in place, or reactivates an older one via `isActive: true`.
`DELETE` refuses with a real `409` if the version is currently active for
its role+stage — surfaced in the UI as "activate a different one first"
rather than a generic error, since `ApiError.status` from `api-client.ts`
carries the real HTTP status for exactly this kind of branch.

**Authorship tracking (`authored_by: "writer" | "claude"`) is real on the
database side but not on the backend's own TypeScript layer** — confirmed
by reading `types/domain.ts`'s `AgentPrompt` interface and both
`routes/agentPrompts.ts` and `services/agentPrompts.ts` directly: none of
them declare or touch this field at all. The column exists in Postgres
(added directly via SQL, not a code change), and `listAgentPrompts()`/
`getActivePrompt()` both do a plain `select("*")`, so `GET /agent-prompts`
genuinely returns it in the raw JSON regardless of the TS interface
missing it — `mapPromptRow()` in `planning-store.ts` reads
`row.authored_by ?? "writer"` defensively rather than assuming it's
always present. The frontend **never sends `authoredBy` on a save** — the
POST route doesn't parse it into the insert payload either, so it would
be silently ignored anyway; every version the writer saves through this
UI just gets whatever the column's own DB-level default is (`"writer"`),
which is exactly the intended behavior with zero code needed for it.

**The edit-over-a-Claude-prompt warning is a real confirm gate, not just
a badge**, per an explicit request: every prompt this app's book started
with was authored by an AI session getting the pipeline working, not the
writer, and the writer wanted a hard stop before accidentally overwriting
one, not just a color-coded label. `PromptDraftEditor` captures
`loadedFromClaude = (active?.authoredBy ?? "writer") === "claude"` once,
at mount (fixed for that keyed instance's lifetime, like every other
seed-from-`active` field in this component). If true: an inline warning
renders above the form ("This prompt was written by Claude and tuned to
work reliably. Editing it may reduce reliability."), and clicking **Save**
routes through a `ConfirmDialog` ("Overwrite a Claude-authored prompt?")
before `saveAgentPromptVersion()` is ever called — cancel and nothing is
sent. A version already marked `"writer"` (the writer's own prompt, or
their own earlier edit) saves immediately with no confirm, same as before
this feature existed. Version history rows show a small `AuthorBadge`
("🤖 Claude" / "✍️ Writer" — `Bot`/`PenLine` icons) so this is visible
without opening a version at all.

**Response shapes confirmed by reading the route source directly**
(continuing this repo's established discipline): `GET /agent-prompts` ->
`{prompts: [...]}`; `POST`/`PATCH` -> `{prompt: {...}}`; `DELETE` -> `204`.
`POST /planning/runs` -> `{run}` (201); every step endpoint
(`generate`/`critique`/`arbitrate`/`approve`/`reject`/`chat`/
`finalize-directive`/`entities/confirm`/`intake-chat`/`intake-finalize`) ->
`{run}` (200) with the run's *entire* updated state, not a delta —
`planning-store.ts` just replaces its single in-memory `activeRun`
wholesale on every call rather than patching fields, same
singleton-replacement pattern `manuscript-store.ts` already uses for the
one open chapter's body.

**A run starts in an intake conversation, not Stage 1** — `POST
/planning/runs` creates the row at `status: "intake_active"`, confirmed by
reading `createPlanningRun()` directly (it doesn't touch `current_stage`
at all on insert). The "Start Planning" entry point (`StartPlanningCard`)
opens this conversation, not a form and not a Generate button:
`IntakeChat` is a chat UI over `run.intakeChatHistory` — a genuinely
separate thread from `run.chatHistory` (rejection interviews), confirmed
in `domain.ts`'s own comment on why the two are kept apart ("a rejection
at stage_2_acts shouldn't dredge up the original intake conversation, and
vice versa"). `sendIntakeChatTurn(runId, message, document?)` posts to
`/planning/runs/:id/intake-chat`; pasting a URL directly in `message` is
enough for the backend's own server-side `web_fetch` tool to read it, no
client-side scraping. An optional attached file is converted to base64
via `FileReader.readAsDataURL()` (stripping the `data:...;base64,`
prefix) and sent as `documentBase64`/`documentMediaType` — read for that
one call only, never persisted, so there's no asset-management UI here,
just a file picker feeding straight into the next send.
`finalizeIntakeConversation(runId)` (a "Start Planning" button inside the
chat, enabled once at least one message exists) posts to
`/planning/runs/:id/intake-finalize`, which compiles the conversation into
`final_delta_directive` and flips `status` to `"generating"` — the same
field a rejection's `finalize-directive` populates, confirmed by reading
`finalizeIntake()`: the Generator doesn't need to know whether direction
came from an initial brief or a correction, only that it exists.

**Neither `finalize-directive` nor `intake-finalize` auto-chains into the
next Generate call** — a deliberate choice, not an oversight. Each of
Generate/Critique/Arbitrate can individually take 60-180+ seconds
(adaptive-thinking Claude over a full book's Codex context), so silently
kicking off a multi-minute Stage 1 (or regeneration) call behind the same
click that just finished an interview would spring an unrequested wait on
the writer. Both land back on the plain `"generating"` card with its own
explicit "Generate"/"Continue" button instead — the same one shown after
Stage 1/2 approval, so there's exactly one visual pattern for "your next
click starts a real model call," not two. `runPipelineForward()`'s own
Generate→Critique→Arbitrate auto-chain is unaffected by this and still
fires from one click, per the feature doc's explicit recommendation —
that chain can still take several minutes total, which is what the
long-running-call UI below is for.

**Every long-running call gets an elapsed-time indicator, not just a
spinner** — `useElapsedSeconds(active)` in `planning/page.tsx` ticks once
a second while `active`, rendered via a shared `LongRunningNote`
("Working…" under 8s, then "Still working — Ns so far. This step can take
a couple of minutes; that's normal, not stuck."). Wired to every one of
these: the Generate/Critique/Arbitrate auto-chain, a rejection-interview
chat send, "Finalize & Regenerate", an intake-chat send, and
"Start Planning" (intake-finalize) — every one of them is a real call to
Claude and can genuinely take 1-3 minutes, and a bare spinner starts
reading as "broken" long before that resolves. Implemented as a plain
`setInterval` inside a `useEffect`, with the tick's `setSeconds()` call
kept strictly inside the interval's own callback (never synchronously in
the effect body) — the shape the React Compiler's
`react-hooks/set-state-in-effect` lint rule requires; an earlier draft
that reset the counter to `0` synchronously on the inactive branch failed
that same lint rule and was reworked into this version.

**"Discard this plan" — initially skipped, now real.** The first pass
through this feature found `DELETE /planning/runs/:id` documented but not
implemented on the backend commit at the time (no route, no service
function) and deliberately left it unbuilt rather than ship a button that
would 404. The backend has since shipped it (`deletePlanningRun()` in
`planningEngine.ts` — a plain `DELETE FROM planning_runs WHERE id = ...`,
`204` on success, `404` if the run doesn't exist); `deletePlanningRun()`
in `planning-store.ts` now wraps it and a small "Discard this plan" text
link (shown during intake and the main stage view alike, gated behind a
real `ConfirmDialog`) calls it. Confirmed by reading the backend's own
comment on the route: this only clears the run's own bookkeeping row
(intake/chat history, stage artifacts, panel reviews) — it does **not**
cascade to anything already materialized from a prior Stage 3 approval, so
the confirm copy says so explicitly rather than implying a full undo.

**One function drives Generate/Critique/Arbitrate, not three separate
buttons** — `runPipelineForward()` inspects the run's own `status` (and,
on a `failed` run, whether this stage already has an artifact / panel
reviews, since `status` alone doesn't say which of the three sub-steps
blew up) to figure out which endpoint is still outstanding, then loops
until it hits a human gate (`awaiting_user_review`) or a real error
(`failed`). This backs a single "Generate"/"Retry" button per the
backend doc's own suggestion that auto-chaining beats three manual
clicks; each underlying call is still one bounded request, so nothing
risks a client-side timeout regardless of how long an individual step
takes. The same function serves the very first click on a fresh stage
and a "Retry" after failure, since both just resolve to "call whichever
step this run's state says is next."

**A run's `id` is the only client-side state that needs to survive a
refresh** — persisted in `planning/page.tsx`'s own `?run=` URL param
(`router.replace`, no full navigation) and resumed via
`GET /planning/runs/:id` on mount. The active-run store is a true
singleton (only one run is ever being driven at a time), guarded against
a stale run left over from a different project after an SPA navigation
by checking `run.bookId === bookId` before treating it as valid — same
"check the id still matches" discipline the manuscript editor's
chapter-body singleton already applies.

**Stage 3 approval has real side effects beyond advancing the run:**
`approveStage` on the backend materializes the approved JSON beats into
real `chapter_beats` rows (the existing Outliner) and immediately kicks
off entity extraction — status becomes `awaiting_entity_review`, not
`done`. The frontend calls `refreshOutline(bookId)` (an existing export
from `outline-store.ts`) right after a Stage-3 approve succeeds, so the
Outliner board shows the new beats without the writer needing a manual
page reload — this was an explicit requirement from the feature doc, not
incidental.

**The entity batch-review screen** (`awaiting_entity_review`) lists every
candidate from `run.extractedEntities`, grouped by type (Characters vs.
World Categories, from `codex_entry`/`world_category`), all
default-checked. "Confirm Selected" sends only the checked indexes to
`POST .../entities/confirm` — everything else is discarded server-side;
the frontend never writes to Codex/World Categories directly for this
flow, matching the doc's explicit "what NOT to build" list.

**`panel_reviews`/`arbitrator_synthesis` have no fixed schema** — they're
whatever shape the writer's own prompts ask the model to return, not a
schema this backend enforces. Rendered defensively via a small
`JsonBlock` helper: a plain string renders as-is, anything else via
`JSON.stringify(value, null, 2)` in a `<pre>` — no assumption about a
particular field (a "score," a "verdict") being present.

**Prompt Editor form state resets via remounting, not an effect** — the
draft's System Prompt / User Prompt Template / Model / Effort fields are
owned by a `PromptDraftEditor` child component keyed by
`` `${role}:${stage}:${active?.id ?? "new"}` `` at its call site, so
switching role/stage/version fully remounts it with fresh `useState`
initializers seeded from the newly-selected active version — the same
"reset via `key`" shape `EditorBody`'s `key={activeChapter.id}` already
uses in the manuscript editor, and the one the React Compiler's
`react-hooks/set-state-in-effect` lint rule pushed this toward instead of
a `useEffect` that re-syncs local state to a prop on every change.

**UI** (`src/app/(app)/projects/[id]/planning/page.tsx`, a new full-bleed
workspace — added to `(app)/layout.tsx`'s `isFullBleedWorkspace` regex and
`(tabs)/layout.tsx`'s `TABS` list, same pattern as Outliner/Assistant):
one route, two views toggled by a segmented control in its own header —
**Pipeline** (the intake chat until `intake_active` clears, then a 3-step
stage stepper and the current stage's artifact/review gate/rejection
chat/entity review depending on `status`) and **Prompts** (role+stage
selectors, the draft form, a placeholder-token reference strip driven by
`placeholdersFor(role, stage)` — a function, not a flat table, since
`arbitrator_chat`/`arbitrator_directive` genuinely take different
placeholders at `intake` vs. any other stage, confirmed by reading the
backend source rather than trusting the feature doc's own placeholder
table, which additionally omitted that `entity_extractor` also receives
`{{CURRENT_ARTIFACT}}` — confirmed via `extractEntities()` — not just
`{{BOOK_CONTEXT}}` as documented; an output-shape hint banner for the two
role/stage combinations whose output gets parsed as JSON —
`generator`/`stage_3_beats` and `entity_extractor` — and a version history
list with authorship badges and Activate/Delete via the existing
`OptionsMenu` component).

**Two small, real, pre-existing bugs fixed in the same pass** (found while
wiring this feature's own full-bleed layout, not part of the feature
itself): `(app)/layout.tsx`'s `isFullBleedWorkspace` regex was missing
`assistant` even though `assistant/page.tsx`'s own comment and layout (its
own `h-dvh` + header, no standard chrome) both assumed it — without this
fix, the AI Assistant page would have rendered with the standard app
header/padding stacked on top of its own header. Separately,
`sidebar.tsx`'s `FULL_BLEED_WORKSPACES` map (which forces the correct
top-level nav item active for a full-bleed workspace whose own path is
under `/projects/[id]/...`) was also missing an `assistant` entry, so
being on a project's Assistant page never highlighted the top-level "AI
Assistant" nav item. Both fixed alongside adding the analogous `planning`
entries for this feature.

**The intake and rejection chats were rebuilt to match the AI Assistant's
real chat UI, not a scaled-down one-off** — the first version used a
plain `<input>`, flat-colored bubbles, and a text "Reading…" line for the
waiting state, which read as a placeholder next to the rest of the app.
Both now share `ChatBubble` (gold, right-aligned for the writer; `card-2`,
left-aligned and markdown-rendered via `renderMarkdown()` for the
assistant — identical to `MessageBubble` in `chat-panel.tsx`) and
`ChatTypingIndicator` (the same three-dot bounce), and both use the same
header/scroll-region/composer sectioning as `ChatPanel`: a bordered
header, an auto-scrolling message list (`scrollRef` + a `useEffect` that
scrolls to bottom on new messages or while sending), and a bordered
composer with an auto-growing `<textarea>` (Enter to send, Shift+Enter
for a newline) instead of a single-line `<input>`. `IntakeChat` sits in a
genuinely `flex h-full` ancestor chain (the page's own `flex h-dvh
flex-col` shell), so it fills real available height the way `ChatPanel`
does; `ChatInterview` doesn't (`RunStatusPanel` renders inside a plain
`space-y-6` block, not a fixed-height flex column), so it uses a bounded
`max-h-[28rem]` scroll region instead of `flex-1` — matching each
component's own layout context rather than copying `flex-1` somewhere
it wouldn't actually stretch.

**A real bug surfaced while rebuilding `IntakeChat`'s send handler**: the
original `try { readFile; onSend } catch { setAttachError("Couldn't read
that file…") }` blamed every failure on the file reader, including a
genuine send failure (e.g. the backend's "no active prompt" 502) — visibly
wrong copy on a real error. Fixed by reading the file in its own `try`
block (only that failure sets `attachError`) and letting a real `onSend`
failure propagate to the caller's existing `actionError` banner instead of
being swallowed and mislabeled.

**Live production bug: switching Role in the Prompt Editor made every
role but Generator look like it had no prompt at all.** Reported against
real production data (11 active rows: Generator at each of the three real
stages, `logic_critic`/`suspense_critic`/`arbitrator_panel`/
`entity_extractor` each at `"all"`, `arbitrator_chat`/`arbitrator_directive`
each at both `"intake"` and `"all"` — confirmed independently via a direct
`GET /agent-prompts` call, ruling out a fetch/response problem before
looking at the frontend at all). Root cause: `role` and `stage` were two
independent `useState`s with nothing coupling them — switching the Role
dropdown left `stage` wherever it already was, almost always the
component's initial default of `"stage_1_summary"`, which only Generator
actually has a prompt at. `versions = prompts.filter(p => p.agentRole ===
role && p.stage === stage)` then correctly found nothing for that
role+stage pair, which was indistinguishable in the UI from "this role's
prompt doesn't exist" even though the fetch had returned all 11 rows
correctly the whole time. Fixed with `pickDefaultStageForRole(role,
prompts)`: the Role dropdown's `onChange` now also sets `stage` to
wherever that role's own active prompt actually lives (prefers `"all"`,
then `"intake"`, then the first real stage with data) instead of leaving
Stage untouched across a Role switch. `"All Stages"`/`"Intake"` remain
freely switchable by hand afterward for the two dual-moment roles — this
only fixes the automatic default a Role switch lands on.

**Verified working** (against a local mock backend extended with
`/agent-prompts` and `/planning/runs` handlers replicating the real
envelope shapes, the per-role/stage active-version-deactivation behavior,
the 409-on-delete-active conflict, the "no active prompt for X/Y"
failure-with-`last_error` behavior, `authored_by`, and the intake-chat/
intake-finalize endpoints): starting a run lands on the intake chat, not
a Generate button, with "Start Planning" correctly disabled until at
least one message exists; sending an intake message shows the reply and
enables "Start Planning"; finalizing intake lands on the Stage 1
`"generating"` card (confirmed it does **not** auto-chain into Generate);
clicking Generate auto-chains through critique and arbitration to the
review gate, showing the real artifact — including the intake-derived
directive folded into it — and both critics' reviews and the arbitrator's
synthesis; rejecting opens the rejection interview (a separate thread
from intake), sending a message shows both the user's line and a reply,
and "Finalize & Regenerate" compiles a directive and lands back on the
`"generating"` card rather than auto-chaining (confirmed a second,
explicit "Generate" click is what actually reaches the revised review
gate, with the regenerated artifact reflecting the directive); approving
advances through all three stages in sequence; Stage 3's approval reaches
the entity review screen with entities correctly grouped by type,
unchecking one and confirming sends exactly the remaining index, and the
run reports `done`; the `done` state survives a hard reload via the
`?run=` URL param. Separately for the Prompt Editor: a `"claude"`-authored
active version shows the Claude badge in version history and the inline
edit warning; saving over it shows the real confirm dialog first, and
only proceeds on confirm; the resulting new version shows the Writer
badge and no warning; a second edit of that writer-authored version saves
immediately with no confirm dialog; reactivating an older version
repopulates the draft form with its content; deleting the active version
shows the real 409 conflict message; deleting an inactive version
succeeds; the dual-moment guidance text renders correctly for
`arbitrator_chat`. Zero console errors across the full pass. Separately,
once the backend shipped `DELETE /planning/runs/:id`: "Discard this plan"
shows during intake and mid-pipeline alike, Cancel on the confirm dialog
leaves the run untouched (checked directly against the mock's own state),
and confirming actually deletes the run server-side and drops the UI back
to the "Start Planning" card with the `?run=` param cleared from the URL.

**"Copy prompts from another project" — closes the empty-book gap using
the backend's new `POST /agent-prompts/clone`.** Prompts are scoped per
`book_id`, so a brand-new book starts with zero rows and nothing for any
Planning Engine step to run — this is the one-time "reuse my other
project's setup instead of writing all seven roles from scratch" action.
Confirmed by reading `clonePromptsFromBook()` directly: it copies every
*active* prompt from the source book into the destination via the normal
`createAgentPrompt()` versioning path (so it's safe to call even if the
destination already has some prompts — those just move into version
history rather than blocking the clone) and preserves whatever
`authored_by` the source had, so cloning from a Claude-authored book
keeps the copies marked `"claude"` and subject to the same edit-warning
behavior. `clonePromptsFromBook(fromBookId, toBookId)` in
`planning-store.ts` wraps `POST /agent-prompts/clone` and refetches the
destination's prompt list on success — no manual cache surgery, same
"just refetch, the list is small" approach every other prompt mutation
already uses.

**UI** (`ClonePromptsCard` in `planning/page.tsx`): shown above the
normal role/stage editor whenever `GET /agent-prompts?bookId=` has
resolved to zero rows (`listStatus === "loaded" && prompts.length === 0`
— gated on *loaded*, not just an empty array, so it doesn't flash before
the fetch has actually finished) — not a hard gate, since the ordinary
editor stays fully usable underneath it and a dismiss (×) button hides
the card for writers who want to start from scratch instead. The book
picker is built from `useProjects()` (the same store every other
project-picker in this app already reads, so no new fetch), filtered to
exclude the current book; same-titled projects (a real possibility —
"Untitled Project" is a common one early on) are disambiguated with a
short id suffix so a duplicate name can't cause cloning from the wrong
source. Disappears on its own once cloning succeeds — `prompts.length`
naturally goes from 0 to a real number and the `isEmptyBook` check flips
false, no separate "done" callback needed. The `404` case (source book
has nothing active to clone) surfaces as "That project has no prompts set
up yet either." rather than a generic error, per the endpoint's own
documented meaning for that status.

**Verified working** (against a local mock backend extended with
`POST /agent-prompts/clone` matching the real request/response/error
shapes): the clone card appears only for a genuinely empty book, with the
ordinary role/stage editor still fully usable alongside it; the book
picker correctly disambiguates two same-titled other projects by
appending their id; confirming a clone actually creates all 11 rows
server-side (checked directly via the mock's own state) and the card
disappears the moment the list updates; the newly-cloned Generator and
Logic Critic prompts both show their real copied content immediately
(Logic Critic via the same `pickDefaultStageForRole` fix above, landing
on the copy's real stage with no manual adjustment) and both carry the
cloned `"claude"` authorship badge and edit warning; Dismiss hides the
card without cloning anything. Zero console errors across the full pass.

**Live production bug: pipeline text was showing raw markdown/JSON syntax
instead of readable prose.** User report, with a production screenshot: the
Stage artifact, both critics' reviews, and the Arbitrator Synthesis card were
all showing literal `###`/`**` markdown syntax and literal `{`/`}`/`"key":`
JSON syntax instead of formatted, readable text — a direct consequence of
two pre-existing choices that made sense in isolation but never got a real
rendering pass: `ReviewGate` printed the Stage artifact string verbatim into
a `<pre>` (fine for Stage 1/2's plain-text placeholder content in every prior
test, but real Generator prose uses markdown headers/emphasis, and a Stage 3
artifact is JSON to begin with), and `JsonBlock` — used for both critic
reviews and the arbitrator synthesis, deliberately schema-agnostic since
`panel_reviews`/`arbitrator_synthesis` have no fixed shape (whatever the
writer's own prompts ask the model to return) — rendered anything that
wasn't a bare string via `JSON.stringify(value, null, 2)` in a `<pre>`,
which is exactly literal JSON syntax by definition.

Fixed both without giving up the "any shape works" property either needed:
- **`ArtifactContent`** (`planning/page.tsx`) replaces `ReviewGate`'s raw
  `<pre>{artifact}</pre>`: if the artifact string starts with `{`/`[`, it's
  tried as JSON first (real for `stage_3_beats`) and handed to the new
  `StructuredValue` renderer below; otherwise (Stage 1/2's plain prose) it
  goes through the app's existing `renderMarkdown()` — the same
  dependency-free renderer `chat-panel.tsx`'s `MessageBubble` already uses
  for AI Assistant replies, so `###` headers, `**bold**`, `*italic*`, and
  lists in a Generator's real output now render as real `<h3>`/`<strong>`/
  `<ul>` elements instead of showing the markup characters themselves.
- **`StructuredValue`** (new) is a small recursive renderer that walks an
  arbitrary JSON value and produces labeled sections instead of literal
  syntax: a string leaf goes through `renderMarkdown()` (so a model that put
  `**word**` inside a JSON field's value also comes out readable, not just
  top-level prose); an array of primitives becomes a bullet list, an array
  of objects becomes a stack of bordered sub-sections (one per item,
  recursing); an object becomes one labeled block per key (`fieldLabel()`
  title-cases and splits both `snake_case` and `camelCase` keys — e.g.
  `chapterNumber` → "Chapter Number", `outlineText` → "Outline Text" — so a
  raw JSON key never surfaces as-is); `null`/`undefined`/empty-string values
  are dropped rather than shown as blank sections. `JsonBlock` (still the
  entry point `ReviewCard`/`ArtifactContent` call for anything that isn't a
  bare markdown string) now just wraps `StructuredValue` instead of
  `JSON.stringify()` — same call sites, same "no fixed schema" guarantee,
  zero visible braces/brackets/quotes either way.
- One real lint catch along the way: an early draft did
  `try { return <StructuredValue value={JSON.parse(trimmed)} /> } catch {…}`
  directly, which the React Compiler's `react-hooks/error-boundaries` rule
  correctly flags (JSX construction inside a `try` doesn't actually catch
  rendering errors, only the `JSON.parse` itself, and rendering errors need
  a real error boundary) — fixed by moving `JSON.parse` alone into the
  `try` and only branching on a plain `isJson` boolean afterward, so the
  `<StructuredValue>` JSX is constructed outside any `try` block.

**Verified working** (against a local mock backend extended with
markdown-and-emphasis-bearing simulated Generator/Critic/Arbitrator content
for Stage 1 and Stage 3 specifically to exercise this fix, since the mock's
prior plain-text placeholders never would have caught this class of bug):
drove a run through intake → Stage 1 → Stage 2 → Stage 3 to the review gate
each time and confirmed via both a full-page text scan and a screenshot —
no literal `###`, `**`, or JSON-syntax characters (`{"`, `":`) appear
anywhere on the page at any stage; the Stage 1 artifact's `###`/`##`
headers render as real headings, its bullet list as a real `<ul>`, and its
`**bold**`/`*italic*` spans as real `<strong>`/`<em>`; the Stage 3 JSON
artifact renders as labeled "Chapter Number"/"Title"/"Beats"/"Outline Text"
sections with a bolded word inside a beat's outline text still rendering as
`<strong>`, not literal asterisks; both critics' reviews render their
`score`/`notes`/`strengths` as labeled sections with real bullet lists (not
a `JSON.stringify()` dump); the Arbitrator Synthesis card renders its
`verdict`/`summary`/`recommendations` the same way. Zero console errors
across the full pass.

**Live production bug: closing the browser made an in-progress plan look
completely gone.** User report: they closed the tab mid-pipeline and came
back to find their run vanished — no history, nothing. Root cause, confirmed
by reading the backend's `src/routes/planning.ts` directly: there is no
`GET /planning/runs?bookId=` (or any other list-by-book) endpoint — the
only way to load a run is `GET /planning/runs/:id`, by its own id. The
frontend's only record of that id was the page's own `?run=` URL query
param (`planning/page.tsx`'s `runIdParam`), and the very first check in
`PipelineView` was `if (!runIdParam && !run) return <StartPlanningCard />`
— so the instant that query string was lost (closing the browser and
reopening via history/a bookmark/the project's own Planning nav link,
none of which carry `?run=`, rather than hitting the back button), the
page had no way left to ask "does this book actually have a run" and fell
straight through to the brand-new-user empty state. The run row itself —
intake history, stage artifacts, everything — was never touched.

Fixed with a per-browser localStorage fallback, the same tradeoff class
`getUserId()`/`writing-goal-store.ts` already use for "real data, just not
synced across devices, because there's no backend resource to ask instead":
`planning-store.ts`'s `setActiveRun()` (the single function every run
mutation already funnels through) now also calls `storeRunId(bookId, run.id)`
on every successful load/step, keyed `wa-planning-run:<bookId>`; a new
exported `getStoredRunId(bookId)` reads it back, and `deletePlanningRun()`
clears it for a discarded run so a fresh "Start Planning" is what actually
shows afterward. `PipelineView` now resolves `effectiveRunId =
runIdParam ?? fallbackRunId`, where `fallbackRunId` is populated from
`getStoredRunId(bookId)` whenever the URL itself has no `?run=` — and once
found, `onRunIdChange(stored)` writes it straight back into the URL, so
the very next reload resumes through the query param directly again, same
as before this fix existed. The empty-state guard now branches on
`effectiveRunId`, not the raw `runIdParam`, so a genuinely run-less book
still correctly falls through to `StartPlanningCard`.

Two things this needed to get right, both because a client-only browser
API (`localStorage`) can't be read synchronously during a "use client"
component's render without risking a server/first-hydration-render
mismatch: the actual `getStoredRunId()` read happens inside a `useEffect`,
never in the render body, and a `storageChecked` flag gates the empty
state so the very first paint (before that effect has run) shows nothing
rather than a wrong, briefly-flashed "Start Planning" card. And the
`setStorageChecked`/`setFallbackRunId` calls inside that effect are
deferred into a `window.setTimeout(..., 0)` callback rather than called
synchronously in the effect body — the same "subscribe, then setState in a
callback" shape `useElapsedSeconds` earlier in this file already
established was required to satisfy the React Compiler's
`react-hooks/set-state-in-effect` lint rule.

**Real limitation, flagged rather than papered over:** this only fixes
resuming on the *same browser* the run was started on. Clearing site data,
switching browsers, or opening the project on a different device still
can't recover an in-progress run — the actual, fully correct fix is a
backend `GET /planning/runs?bookId=` (returning the book's most recent/
active run, mirroring the list-by-book pattern every other domain in this
app already follows), which this integration pass has no push access to
add. Worth requesting from the backend team the same way `DELETE
/planning/runs/:id` and `POST /agent-prompts/clone` were previously
requested and then wired up once they shipped.

**Verified working** (against a local mock backend and a real two-context
Playwright reproduction of the exact failure mode — seeding a fresh
browser context's `localStorage` with a run id from an earlier session,
then navigating to the bare `/projects/:id/planning` URL with no `?run=`
param at all, matching "closed the tab, came back via nav/bookmark"
precisely): starting a run and sending an intake message correctly writes
the run id to `localStorage`; a fresh navigation with no `?run=` param and
that stored id present resumes the exact same intake conversation
(confirmed the earlier message's real text is visible, not a blank
conversation) and rewrites the URL to carry `?run=` again; a book that has
never had a run started still correctly shows "Start Planning," confirming
the fallback doesn't manufacture a run out of nowhere. Zero console
errors, including through the hydration-sensitive first-paint path.

**Backend change: the Scrutiny Panel went from 2 critics to 3, plus a
real bug found in the same pass — Arbitrate could run against a draft
that was never actually critiqued.** The backend split `logic_critic`/
`suspense_critic` into three non-overlapping critics — `continuity_critic`
(same scope as the old Logic Critic), `pacing_critic` (new — chapter-to-
plot ratio, decompression, cliffhanger cadence), `craft_critic` (the old
Suspense Critic, minus escalation/cadence which moved to Pacing) — and
`logic_critic`/`suspense_critic` are no longer valid `agentRole` values;
`POST /agent-prompts` now rejects them with a 400. Confirmed by reading
the backend's `src/types/domain.ts` directly: `panel_reviews` is now
`Partial<Record<AgentRole, unknown>>`, an open map keyed by critic role,
not a fixed `{logic_critic, suspense_critic}` shape — matches this file's
own prior "no fixed schema" framing for `panel_reviews`, just formalized.
Each issue inside a critic's own `issues` array also gained a `status:
"new" | "unresolved" | "resolved"` field: critics now see their own prior
review via a new `{{PREVIOUS_CRITIQUE}}` placeholder on a revision pass
(and the Arbitrator sees its own prior synthesis via `{{PREVIOUS_SYNTHESIS}}`)
and mark each previously-raised issue resolved/unresolved before looking
for anything new.

Three hardcoded frontend spots needed updating, all in `planning-data.ts`/
`planning/page.tsx`:
1. **`AgentRole`/`AGENT_ROLES`/`AGENT_ROLE_META`** — swapped in the 3 new
   roles with real labels/descriptions. The Prompt Editor's Role dropdown
   is also now defensive against this exact class of change happening
   again: `roleOptions` is `AGENT_ROLES` plus any role actually present in
   the book's own fetched prompts that isn't in that fixed list (a role
   added server-side, or written some other way — the MCP tool surface,
   most plausibly — before this file catches up), and a new `roleLabel()`
   (`planning-data.ts`) falls back to a derived title-cased label (splits
   both `snake_case` and `camelCase`, same logic `fieldLabel()` already
   uses for JSON keys elsewhere in this file) instead of crashing or
   silently hiding an unrecognized role. `placeholdersFor()`'s switch
   gained a `default: return []` for the same reason — an unrecognized
   role selected via that fallback path shouldn't throw.
2. **Critique results display, made genuinely data-driven, not just
   relabeled.** `ReviewGate`'s two hardcoded `<ReviewCard title="Logic
   Critic" .../>` / `"Suspense Critic"` cards are gone — it now maps over
   `Object.entries(run.panelReviews)` and renders one card per key
   actually present, titled via `roleLabel(role)`. This means the panel's
   composition can change again (add/remove/rename a critic) without
   another frontend change to *this* display, only to `AGENT_ROLE_META`/
   `CRITIC_ROLES` for the Prompt Editor's own labels — the whole point of
   the backend's own `CRITIC_ROLES` being "a plain array, not hardcoded
   call sites" carried through to this side too. The grid is
   `sm:grid-cols-2 lg:grid-cols-3` now (was a fixed 2-column grid, which
   would have wrapped a 3rd card alone onto its own row). Each issue's new
   `status` field gets a small colored `IssueStatusBadge` (gold "New",
   red "Unresolved", green "Resolved") inside `StructuredValue`'s object-
   rendering branch — special-cased by key name (`status`) and value
   (one of the three known strings) rather than a generic labeled text
   block like every other field, since this is literally showing whether
   the critic's own prior complaint got fixed.
3. **Real bug, found and fixed in the same pass: a `failed` run's retry
   heuristic could send Arbitrate a draft that was never actually
   critiqued.** `nextForwardStep`'s `"failed"` branch used to infer
   "critique already succeeded" purely from `run.panelReviews` being
   non-null — but the backend's critique step only ever *writes*
   `panel_reviews` on success (confirmed by reading `runCritique()`
   directly: a failure calls `markFailed()`, which persists `status:
   "failed"` and `last_error` only, leaving `panel_reviews` exactly as it
   was before that attempt). On a revision cycle — reject a stage,
   compile a directive, regenerate a new artifact, and have *that*
   critique call fail — `panel_reviews` still holds the *previous*
   artifact's real critique from before the rejection, which is non-null,
   so the old heuristic wrongly concluded "already critiqued" and jumped
   straight to Arbitrate on a draft nothing had actually reviewed. This
   reproduced precisely once the local `run.status` reflected the real
   server-side `"failed"` state (e.g. after a reload) rather than a stale
   in-memory status left over from the last *successful* call.

   Fixed by never trusting `panelReviews`/`stageArtifacts` presence as a
   freshness signal at all: a new module-level `lastCritiqueSuccess`
   marker in `planning-store.ts` (`{runId, stage, artifact}`) is set only
   inside `callCritique`'s own success path, for the exact artifact text
   just reviewed, and cleared on `loadPlanningRun` (a reload can't vouch
   for what happened in some earlier session) and inside `callGenerate`
   (a new artifact invalidates any prior critique-success marker for this
   stage). `nextForwardStep`'s `"failed"` branch now only returns
   `"arbitrate"` when `critiqueSucceededForCurrentArtifact(run)` confirms
   the marker matches this exact run, stage, and artifact text —
   otherwise it retries Critique first, every time. Normal (non-`"failed"`)
   flow is untouched: the `"critiquing"`/`"awaiting_arbitration"` branches
   already always call Critique/Arbitrate unconditionally, since those
   statuses are themselves only ever set by a genuinely successful prior
   step.

**Verified working** (mock backend extended to reject `logic_critic`/
`suspense_critic` with a 400 matching the real `VALID_AGENT_ROLES` check,
and to reproduce the exact bug scenario — a stage critiqued successfully,
then rejected, regenerated, and its *next* critique call forced to fail
the same way the real backend's `markFailed()` does, i.e. leaving
`panel_reviews` untouched): the Role dropdown lists all three new critic
labels and neither old one; `POST /agent-prompts` with the old role names
is confirmed rejected with 400; the Critique results panel renders 3 cards
titled "Continuity Critic"/"Pacing & Chapter-Economy Critic"/"Craft &
Suspense Critic" with real issue-status badges, no literal JSON syntax;
and — the core fix — loading a run whose server-side status is genuinely
`"failed"` with stale (pre-rejection) `panel_reviews` still present, then
clicking Retry, was confirmed via network-request interception to call
`/critique` first and only `/arbitrate` after it succeeds (never the
reverse), with `panel_reviews` genuinely refreshed for the new artifact
afterward. Zero console errors.

**Also discovered in the same pass, not yet acted on:** the backend has
since shipped `GET /planning/runs?bookId=` (commit `ca23eac` on the
backend repo) — exactly the list-by-book endpoint this file flagged as
the correct, complete fix for the "closed the browser, run looked gone"
bug above (the `localStorage` fallback only resumes on the same browser).
Wiring it in would let a fresh page load resolve a book's run without any
client-side fallback at all, and would work across browsers/devices too.
Not wired up in this pass — flagged for the next one.

**Full rebuild: the backend replaced the flat 3-stage model with a
strict Act → Part → Beats hierarchy, and the frontend was rebuilt from
scratch against it, using a design mock for layout/visual design only.**
The backend commit (`49114b8`, "Replace flat Stage 2/3 planning with a
strict Act -> Part -> Beats hierarchy") confirmed live that a single call
planning an entire book's Act structure — or Chapter Beats — at once
produces real internal contradictions (a heist book's own stated numbers
disagreeing with each other by arc 4-5, caught by the Continuity Critic).
The fix: 3 fixed Acts, each with 3 fixed Parts (9 Parts total, always —
never model-decided), each Part planned in two passes — an outline that
commits to a real chapter range, then one or more Beats chunks (15
chapters per call, `PART_BEATS_CHAPTER_WINDOW` in the backend's
`planningEngine.ts`) — before the next Part unlocks. Every unit (Stage 1
Summary, each Act Summary, each Part Outline, each Part's Beats chunks)
goes through the identical generate → critique → arbitrate → approve
cycle. New backend endpoints in the same pass: `GET /planning/runs?bookId=`
(the list-by-book endpoint flagged as missing above — now wired in, see
below), `POST .../unapprove` (undo a just-made approval), `POST
.../discard-stage` (trash the current draft outright, unlike unapprove).
A `ledger_extractor` agent role was added too — runs automatically after
each Part's Beats are approved, extracting hard facts into a new
Continuity Ledger, reconciled against real drafted chapters where they
exist (`manuscript_chapters.paragraphs`, not the separate opt-in
`manuscript_chunks` RAG index) and falling back to what the Beats claimed
where they don't.

**A design mock existed for this rebuild's visual layout — deliberately
NOT trusted for its data shapes.** The user's own instructions were
explicit that the mock was built before the real API existed and invented
several fields; every correction below was verified against the actual
backend source (`src/services/planningEngine.ts`, `src/types/domain.ts`,
`src/routes/planning.ts`) before being applied, continuing this file's
established discipline of reading real route/service code rather than
trusting a summary — a real discrepancy caught in the process:
`domain.ts`'s own inline comment claimed a Part's Beats chunks "accumulate
JSON... rather than being overwritten per chunk" under one key, which is
simply wrong — `unitKey()` in `planningEngine.ts` gives each chunk its
own key (`act_1_part_2_beats_chunk_1`, `..._chunk_2`, etc., confirmed by
reading the function directly), matching the backend's own CLAUDE.md
table, not its domain-type comment. **Corrections vs. the mock, applied
while building rather than after:**
1. **Intake is a real multi-turn conversation, not a form.** The mock
   showed a static premise/themes/ending/constraints form with one "Start
   Planning" button that would have skipped straight to `intake-finalize`
   with no round trip. `IntakeChat` (carried over from the pre-rebuild
   version, since it was already built correctly) is a real chat thread —
   every message is its own `intake-chat` call, the Arbitrator can ask
   follow-ups, and `intake-finalize` is a separate explicit action only
   enabled once at least one message exists.
2. **A unit is never shown as both "Approved" and offering Approve/Reject
   at once.** `UnitDetail` is only ever rendered for the run's CURRENT
   unit (via `currentUnitKey()`) — never a historical one — so this
   inconsistency is impossible by construction rather than needing extra
   state to prevent it. Browsing a past unit read-only wasn't built; the
   Pipeline Map shows every unit's locked/current/approved state visually,
   but only the current one is clickable ("Open Unit").
3. **A Part's Outline and its Beats chunk(s) are separate gated units,**
   each with its own full cycle — never merged into one screen/action.
   `UnitDetail` is one reusable component keyed by
   `current_stage`/`current_act`/`current_part`/`current_beat_chunk`
   (mirrored client-side via `UnitPosition`/`unitKeyForPosition` in
   `planning-data.ts`, which exactly reproduce the backend's own
   `unitKey()`/`nextPosition()`/`previousPosition()` — confirmed against
   the source, not re-derived from guesswork), so a Part with, say, 2
   Beats chunks shows as 2 distinct review gates in sequence on the
   Pipeline Map, not one.
4. **Continuity Ledger has no "Type" column and no three-state Status.**
   The real `ContinuityLedgerEntry` is only `{ fact, sourcedFrom:
   "plan"|"manuscript", unit }`. `ledgerBadgeLabel()` derives a two-state
   badge directly from `sourcedFrom` ("Established" for `"manuscript"`,
   "Planned" — not "Tentative" — for `"plan"`); no category column, no
   grouping by type (nothing in the data to group by). A client-side
   text search (over `fact`/`unit`, both real fields) and a plain
   Blob-download "Export Ledger" were added since they don't require
   fabricating anything.
5. **Entity Review has no Confidence % or Source-unit column.** The real
   `entity_extractor` contract is `[{type, name, entryType, description}]`
   — no confidence score (extraction isn't a per-item probability the
   backend computes), and no per-candidate source unit (extraction scans
   every approved Beats chunk *concatenated together* in one call, so
   there's no way to attribute a candidate to one specific chunk).
   Grouping/filtering is by `entryType` only (real data). Extraction is
   on-demand — a plain "Scan for New Entities" button, callable whenever,
   never tied to any approve click or to `run.status` (confirmed reading
   `extractEntities()`/`confirmEntities()` directly: neither ever touches
   `status`, deliberately — a side action independent of the run's actual
   pipeline position, so an extraction error can never make the real
   pipeline position look "failed"). This is also why entity action
   loading/error state (`useEntityActionStatus`/`useEntityActionError` in
   `planning-store.ts`) is a completely separate store slice from the main
   `runStatus`/`runError` — the same separation-of-concerns the store
   already used for planning-run vs. agent-prompt state.
6. **No "Clear All History" action on the rejection interview**, and no
   per-unit grouping with a "Rejected N times" count either — both were
   in the mock's screen design but don't correspond to real data.
   `chat_history` is one flat array of `{role, content}` covering the
   WHOLE run's rejection interviews, concatenated, with no per-turn unit
   tag to group by, and deliberately never reset (confirmed reading
   `rejectStage()`/`chatTurn()`: the Arbitrator is meant to be one
   continuous point of contact for the run, not a fresh stranger at every
   rejection). `RejectionInterview` renders it as one continuous thread —
   render it all, never sliced to "this unit only" — with no clear-history
   affordance of any kind, since there's no endpoint for it and it would
   erase real, deliberate cross-run memory.
7. **Progress ("N / M units approved") isn't a fixed constant.** A Part's
   Beats-chunk count depends on its own committed chapter range, which
   isn't knowable until that Part's outline is approved.
   `computePlanningProgress()` (`planning-data.ts`) counts 13 guaranteed
   units (1 Stage-1 Summary + 3 Act Summaries + 9 Part Outlines) plus real
   chunk counts for every Part whose outline is approved so far, plus a
   1-chunk placeholder for Parts not yet outlined, walking the exact same
   `nextPlanningPosition()` sequence the Pipeline Map uses for its
   locked/current/approved states — so the two can never disagree with
   each other. The Pipeline Map shows a trailing "+" and an explanatory
   note whenever `totalIsFinal` is false, rather than presenting a number
   that will later silently change as if it were exact.
8. **Run List is scoped to one book.** `GET /planning/runs?bookId=` only
   ever returns one book's own runs (most-recently-updated first) — the
   mock's cross-book dashboard doesn't correspond to any real endpoint.
   `RunListView` shows this book's run history (in practice usually one
   active run, occasionally past done/discarded ones), with per-run
   "Resume"/"Open" and a delete option. A true cross-book "all my active
   plans" view would need a new backend endpoint — flagged, not built.
9. **Stage 1 is its own node on the Pipeline Map**, not folded into "Act
   1" — it's a real gated unit with its own full cycle, approved before
   Act 1 unlocks.

**The store's `lastCritiqueSuccess` staleness-guard (see the "Real bug"
entry above) had to be re-keyed for the hierarchy.** Under the flat
model, `current_stage` alone was specific enough to identify "which unit
is this." Under Act/Part/Beats, many different units share the same
`current_stage` (`"part_outline"` for every one of 9 Parts,
`"part_beats"` for every one of their chunks) — stage alone can no longer
disambiguate "did critique succeed for THIS ONE." `nextForwardStep`'s
`failed` branch and the success marker itself now key on
`currentUnitKey(run)` (the exact same string `stageArtifacts`/
`stagePanelHistory` use), not `run.currentStage` — otherwise a stale
success marker from, say, Act 1 Part 1's Beats could have falsely
validated Act 2 Part 3's Beats critique, since both units share
`current_stage: "part_beats"`.

**`GET /planning/runs?bookId=` is now actually wired in** (superseding
the localStorage-fallback entry above): `useBookPlanningRuns(bookId)` in
`planning-store.ts` is a new bookId-scoped store slice (same pattern as
`notes-store.ts`), and `PlanningPageInner` resolves
`targetRunId = runIdParam ?? runs[0]?.id ?? null` — the explicit `?run=`
URL param if present, else the book's own most-recently-updated run from
the real endpoint, else genuinely none (shows "Start Planning"). The
`?run=` param is still written on every action (via `router.replace`) so
a reload or a shared link still resumes through it directly, but nothing
about resuming a run depends on that param surviving anymore — the
`localStorage` fallback (`getStoredRunId`/`storeRunId`) was removed
entirely, since the real endpoint makes it unnecessary and strictly
better (works across browsers/devices, which the fallback never could).

**Verified working** (against a new mock backend built to faithfully
reproduce the real Act/Part/Beats state machine — `unitKey`/
`nextPosition`/`previousPosition`/`chunksNeededForRange` ported directly
from the backend source, not re-derived): drove a run through intake →
Stage 1 approve → Act 1 Summary approve → Part 1 Outline approve
(recording a real `startChapter`/`endChapter` range spanning 2 Beats
chunks under the 15-chapter window) → both Beats chunks approved
individually, confirming the run correctly stayed on `part_beats` chunk 2
after chunk 1's approval (not skipping ahead to Part 2) and that the
Continuity Ledger gained one entry per approved chunk; the Pipeline Map
correctly showed Stage 1/Act 1 Summary/Part 1 (both units) as approved,
Part 2 as "Up Next," and Parts/Acts beyond as locked; Unit Review for a
freshly-generated Part Outline rendered its JSON artifact as labeled
"Start Chapter"/"End Chapter"/"Outline" sections (no raw braces) plus all
3 correctly-labeled critic cards and a real Arbitrator Verdict section;
clicking "Undo last approval" right after an Approve (the one moment it's
legitimately offered — the newly-current unit has no artifact yet)
correctly reopened the previous unit's interview with its real historical
critique restored from `stage_panel_history`, and confirmed the button
correctly does NOT appear mid a reject → regenerate cycle on the same
unit (whose own stale artifact is still present until the next Generate
overwrites it); the Rejection Interview showed the full conversation with
no clear-history control anywhere; finalize-directive landed on a plain
Generate card with no auto-chain; the Continuity Ledger screen showed
"Planned" (never "Tentative") badges with no Type column; Entity Review's
scan button populated real candidates with no confidence/source columns,
and confirming cleared them; the Run List showed exactly this book's own
run, marked Active; and the Prompt Editor's Role dropdown listed "Ledger
Extractor" alongside the other 8 roles. Zero console errors across the
full pass.

**Second pass on the same rebuild: visual fidelity to the design mock,
not just correct data.** User feedback on the first pass, directly: the
UI "looks nothing like" the mock. Fair — the first pass got every data
correction right but rendered them inside the app's plainest generic
`card` boxes with default spacing, never actually matching the mock's
layout/spacing/color/component-shape the way the brief asked for. Fixed
per screen, real data unchanged throughout:
- **Sidebar** — a branded icon (`Sparkles` in a gold tile) + "Planning
  Engine" label header, an icon per nav item (`GitBranch`/`ListChecks`/
  `BookOpen`/`Users`/`Cog`), and a book-identity footer card, instead of a
  plain text-only nav list.
- **Pipeline Map** — a real progress card (percentage + bar + the
  not-final note), a Locked/Current/Approved dot legend, and each Part
  card now shows a genuine per-unit dot row (one dot for the outline, one
  per real/placeholder beats chunk, colored by state) above the existing
  text status lines, plus a connecting line between Act cards. "Up Next"
  vs. "In Progress" is now a real distinction (`partIsFresh`): "Up Next"
  only when the part's outline has zero artifact yet, matching the mock's
  own example (a fresh Part reading "0/3 approved").
- **Unit Review** — the header now carries a real `RunStatusBadge`
  (colored per `run.status`, e.g. gold "Generating," info "Awaiting Your
  Review," warn "Rejection Interview"); the Context panel became a real
  custom collapsible (chevron rotates, no native disclosure triangle)
  instead of a bare `<details>`; `ReviewGate` is now a genuine two-column
  layout (wide artifact + a narrower Critics/Verdict rail, matching the
  mock's proportions) instead of a full-width stack — each critic card
  gets a colored identity dot (cycling gold/info/purple, so a future 4th
  critic still gets a distinct color with no code change) and a real
  "N/10" score badge pulled from the critic's own `score` field; the
  Arbitrator Verdict card gained the mock's circular icon treatment
  (green thumbs-up circle for `recommendation: "approve"`, amber
  thumbs-down otherwise) with the recommendation deduplicated out of the
  body text below it.
- **Rejection Interview** — a colored icon avatar and a real "In
  Interview" status pill in the header, taller panel (matching the mock's
  proportion, not a cramped 32rem cap) — the flat, ungrouped
  `chat_history` itself is unchanged (still the correct call per the
  no-fabricated-structure correction above).
- **Continuity Ledger** — rebuilt from a card-list into an actual
  `<table>` (#, Fact, Status, Introduced In columns) with real pagination
  once entries exceed one page, matching the mock's tabular density —
  still exactly the real two-state badge and no Type column.
- **Entity Review** — the pill-style type filter became underlined tabs
  (gold active-tab border, matching the mock's Characters/Places/Lore
  tab strip) and the row list became a real `<table>` (checkbox/Entity/
  Type columns) — still no confidence or source column, since neither
  exists in the real data.
- **Run List** — each row's icon became a proper square cover-tile, and
  the active run's action button is now the filled gold "Resume" the mock
  uses (every other row keeps the plain outline "Open"), instead of every
  row sharing one outline button style regardless of active state.

**Verified working**: re-ran the exact same Playwright pass above against
the redesigned components — every prior assertion (state machine
transitions, no raw JSON, no fabricated fields, correct badges) still
passed unchanged, confirming this was a presentation-layer pass only, no
regression to the verified data/store logic. Screenshots of the Pipeline
Map, Unit Review, Continuity Ledger, and Entity Review compared side by
side with the design mock to confirm the layout/spacing/color/component-
shape correspondence the brief originally asked for. Zero console errors.

**The Contract Pipeline — a second, shorter track, reusing almost
everything already built.** Backend commits `f202121`/`67d2e73` added
`pipeline_type: "full" | "contract"` on `planning_runs`, a fast 3-unit
track (`stage_1_summary → codex_documentation → hook_chapters_outline →
done`) mirroring how serialized-fiction platforms judge a book: on
roughly its first five chapters' hook strength and early pacing, not the
whole book. Confirmed by reading `planningEngine.ts`/`routes/planning.ts`/
`routes/platformCraftNotes.ts` directly before building anything, same
discipline as every other pass in this file.

- **Same intake, same `UnitDetail`/`ReviewGate`, same approve/reject/
  discard/unapprove actions, same 3-critic panel** — `nextPosition`
  branches only once, at `stage_1_summary`, on `pipelineType`; everywhere
  else the stage name alone disambiguates (`codex_documentation`/
  `hook_chapters_outline` only ever exist on a "contract" run). Mirrored
  exactly in `nextPlanningPosition()`/`unitKeyForPosition()`
  (`planning-data.ts`) with a `pipelineType` parameter (default `"full"`
  for every existing call site), so this needed zero new components —
  `UnitDetail`/`ReviewGate` render the two new stages with no changes at
  all beyond the artifact renderer already being schema-agnostic
  (`StructuredValue`).
- **`codex_documentation` writes directly into the real Codex on
  approve** — not a proposal like on-demand entity extraction. JSON
  contract `{"entries": [{"name", "entryType", "description", ...}]}`,
  materialized by the backend's `materializeCodexDocumentation` the same
  non-proposal way `materializeBeats` commits an approved beats chunk.
  `ReviewGate` shows an explicit info note above Approve/Reject
  ("Approving writes these entries directly into your Codex — not a
  proposal you review again later.") specifically for this unit, since
  every other unit's approve is "lock this plan," not "write real rows
  right now." Approving refreshes both `character-store.ts` and
  `worldbuilding-store.ts` (an entry's `entryType` isn't known client-side
  without a lookup — harmless to refresh both).
- **`hook_chapters_outline` is fixed to chapters 1-5** and reuses
  `part_beats`'s exact JSON contract and `materializeBeats`/
  `appendLedgerFacts` unchanged — approving it creates real
  `manuscript_chapters`/`chapter_beats` rows, same as an approved Part
  Beats chunk on the full pipeline. `ReviewGate` shows the matching
  consequence note ("Approving creates chapters 1-5 in your Manuscript
  with these planned beats..."). Approving refreshes both
  `outline-store.ts` and `manuscript-store.ts`.
- **Pipeline Map gets a real contract-specific layout**, not the Act/Part
  grid — `PipelineMap` branches on `run.pipelineType`: three flat
  `UnitRow`s (Stage 1, Codex Documentation, Hook Chapters Outline) inside
  one card, with a link to Platform Craft Notes and, once `status ===
  "done"`, a "Promote to Full Plan" button instead of "Open Unit." Total
  unit count for `computePlanningProgress()` falls out of the same
  `nextPlanningPosition()` walk used for the full hierarchy — a contract
  run's `totalIsFinal` is always `true` (it never touches `part_beats`,
  the one branch that can grow the count), so no special-casing was
  needed there at all.
- **Pipeline-type choice lives on `StartPlanningCard`** — two selectable
  cards ("Plan the full book" / "Plan first 5 chapters for a contract
  submission", labels/descriptions from `PIPELINE_TYPE_META`) instead of
  a single "Start Planning" button; `startPlanningRun(bookId,
  pipelineType?)` passes it straight through to `POST /planning/runs`
  (server defaults to `"full"` when omitted, so every pre-existing call
  site needed no changes). Run List's header also grew a second "New
  Contract Run" button alongside "New Full Run" for starting another run
  on a book that already has one.
- **Platform Craft Notes** — a new per-BOOK (not per-run) reference doc
  feeding `{{PLATFORM_TRENDS}}` into the Contract Pipeline's Generator/
  Critics, real backend resource (`platform_craft_notes`, one row per
  book) via three endpoints confirmed by reading `platformCraftNotes.ts`/
  `routes/platformCraftNotes.ts` directly: `GET` (current saved notes, or
  an honest empty stub), `PATCH` (the *only* save path), and `POST
  /research` (an on-demand, billed Claude + web-search/fetch pass —
  `platform_researcher`, stage `"all"`, added to `AGENT_ROLES` and the
  Prompt Editor's role list) that returns a **draft only**. New
  `PlatformCraftNotesView` (a `platform-notes` entry in the sidebar
  nav, reachable without a run in progress since it's book-scoped, plus a
  direct link from the Contract Pipeline's own Pipeline Map): a plain
  `<textarea>` over the saved content, a "Run Research Pass" button that
  fills the textarea with the returned draft and shows an explicit
  "nothing is saved yet" banner, and a Save/Discard pair that only appear
  once something's actually been edited. `savePlatformCraftNotes()`
  (`planning-store.ts`) is the only function that ever calls `PATCH` —
  `researchPlatformCraftNotes()` returns the string and touches no cache
  at all, so a research pass can never silently overwrite what's saved
  without the writer clicking Save first.
- **"Promote to Full Plan"** — `POST /planning/runs/:id/promote-to-full`
  (409 unless the source run is a completed `"contract"` run), wrapped by
  `promoteContractRunToFull()`, which sets the new run as active and
  refreshes the book's run list. The backend pre-seeds the new "full" run
  with Part 1 of Act 1 already covered (`part_chapter_ranges["1-1"]:
  {startChapter: 1, endChapter: 5}`, `stage_artifacts` seeded with a
  display-only Part 1 outline placeholder and the contract run's real
  `hook_chapters_outline` JSON as Part 1's beats) — confirmed by reading
  `promoteContractRunToFull()` directly, not assumed from the route
  comment alone. `nextPlanningPosition()`'s `act_summary` branch mirrors
  the backend's own "skip Part 1" special case exactly (checks
  `partChapterRanges["1-1"]` before deciding whether Part 1 or Part 2 is
  next), so the promoted run's Pipeline Map correctly shows Part 1 as
  already approved without any extra client-side bookkeeping. **The
  original contract run is left completely untouched** — a new row, not a
  mutation — confirmed in the Run List: both runs stay visible, tagged
  "Contract"/"Full," and the contract run's own "Promote to Full Plan"
  shortcut is still offered even after a promotion already happened
  (the backend doesn't track "already promoted" as a distinct state, so
  neither does this UI — promoting again just creates another new "full"
  run, which is the correct, unsurprising behavior given what the
  endpoint actually does).
- **"Branch"** — `POST /planning/runs/:id/branch` (`{userId,
  pipelineType}`, 409 if the source run has no approved Stage 1 Summary
  yet), wrapped by `branchPlanningRun()`. A secondary/power-user
  affordance in the Run List's per-run "..." menu ("Branch → new Full
  Plan" / "Branch → new Contract Plan", shown whenever
  `run.stageArtifacts.stage_1_summary` exists) for reusing an already-
  approved Stage 1 Summary to start a fresh run of either pipeline type
  without re-running intake or paying for a duplicate Stage 1 generation.
- **`RealPlanningStage`/`PlanningStage` gained the two new stages**, and
  `PlanningRun` gained exactly one field, `pipelineType`, mirroring the
  backend's own single-field addition — every other type in
  `planning-data.ts` needed no changes, confirming the "reuse almost
  everything" framing was accurate, not just a wish.

**Verified working** (against a from-scratch extension of the existing
mock backend — pipelineType-aware `nextPosition`/`previousPosition`,
`codex_documentation`/`hook_chapters_outline` generate/approve including
real mock `codex_entries`/`manuscript_chapters` materialization,
`promote-to-full`, `branch`, and the three `platform-craft-notes`
endpoints, all mirroring the real backend's request/response/error
shapes): a fresh book's Start Planning card offers both pipeline types;
choosing Contract lands on the same intake chat, and finalizing intake
opens Stage 1 exactly like a full run; approving Stage 1 moves a contract
run to `codex_documentation` (confirmed NOT `act_summary`); the Codex
Documentation review gate shows the real consequence note and its JSON
artifact renders as readable entries with no raw braces; approving it
writes real `codex_entries` (confirmed independently via `GET /codex`);
the Hook Chapters Outline review gate shows its own consequence note;
approving it creates 5 real chapters (confirmed via `GET
/manuscript/chapters`) and the run reaches `status: "done"`; the Pipeline
Map's contract-specific flat layout renders correctly with no Act/Part
grid; the done state shows "Promote to Full Plan"; Platform Craft
Notes' empty state, research draft (confirmed NOT auto-saved), and
explicit Save all work, with a real "Last saved" timestamp after;
Promote to Full creates a real new "full" run seeded with Part 1 already
covered, confirmed to skip straight to Part 2's outline once Act 1's
Summary is approved; the original contract run is confirmed untouched
(`status: "done"`, `pipeline_type: "contract"`) after promotion; Branch
correctly reuses a run's Stage 1 Summary and correctly 409s against a run
with no summary yet; Promote correctly 409s against a non-contract or
non-done run; and the Run List tags both runs by pipeline type. Re-ran
the full pre-existing Act/Part/Beats Playwright pass unchanged afterward
to confirm zero regression to the "full" pipeline. Zero console errors
across the full pass.

**Live bug: Platform Craft Notes treated every research response as a
draft ready to review.** The backend changed the research pass from a
synchronous `{draft: "..."}` response into a detached background job
(commit `98e9ae6`, "Make Platform Craft Notes research survive closing
the tab") — `POST /platform-craft-notes/research` now returns almost
immediately with the row's `draftStatus` already `"running"`, and the
real Claude + web_search/web_fetch call keeps going server-side,
independent of the tab, landing its result on the same row
(`draftContent` on success, `draftError` on failure) for a later `GET` to
pick up — the same "poll while running" pattern the Planning Engine's own
run already uses. The frontend hadn't caught up: `researchPlatformCraftNotes()`
still awaited the POST as if it returned the finished draft, so clicking
"Run Research Pass" immediately flipped into the "fresh draft — Save or
Discard" banner with the textarea bound to `content` (the last actually
*saved* notes, still empty on a first run) instead of where the result
would eventually land — showing a real draft as available before any
research had actually happened.

Fixed by driving the whole panel off `draftStatus` (`PlatformCraftNotes`
gained `draftStatus`/`draftContent`/`draftError`/`draftUpdatedAt`,
mirroring the backend's row exactly), four states:
- **`idle`** — nothing in flight; the textarea is bound to `content`,
  editable, with a normal Save (`PATCH`) and "Run Research Pass" enabled.
- **`running`** — a job is in progress; a loading state ("Researching
  current hook/platform trends…"), no editable textarea, "Run Research
  Pass" disabled (a second click would just return the same in-flight
  state anyway per the backend's own duplicate-job guard, so disabling is
  purely to avoid a pointless click, not to prevent a real error).
  `usePlatformCraftNotesPolling(bookId, draftStatus === "running")`
  (`planning-store.ts`) polls the cheap/free `GET` every 7s until the
  status changes — the sanctioned "subscribe, then act in a callback"
  effect shape, same as `useElapsedSeconds` elsewhere in this file.
- **`ready`** — a completed draft is waiting; THIS is the only state that
  shows the "fresh draft — review it" banner, textarea now bound to
  `draftContent` (not `content`). Save (`PATCH` with the textarea's
  current value — accepting it into `content` and resetting
  `draftStatus` to `"idle"` server-side) or Discard (`POST
  /platform-craft-notes/research/discard` — clears the draft, leaves
  `content` untouched).
- **`failed`** — shows `draftError` plainly plus a "Try Again" action
  that just calls `startPlatformCraftNotesResearch()` again.

`startPlatformCraftNotesResearch()` replaces the old
`researchPlatformCraftNotes()` — it returns the *row* (reflecting
`draftStatus: "running"`), never a draft string, and the caller is
expected to poll rather than await a result. New
`PlatformNotesEditor` child component owns the editable textarea/Save/
Discard for whichever "source" is currently showing (`content` on idle,
`draftContent` on ready), keyed by the parent on
`` `${draftStatus}:${...UpdatedAt}` `` so switching between idle/ready (or
a fresh save/discard) remounts it with a freshly-seeded `useState`
initializer — the same "reset via remount" shape this file already uses
for `PromptDraftEditor`/`EntityReviewView`, instead of an effect
re-syncing local state to a prop.

**Verified working** (mock backend extended to model the same detached-
job shape — `POST /research` returns 202 with `draft_status: "running"`
immediately, then resolves to `"ready"`/`"failed"` via a real `setTimeout`
independent of the response already having been sent, plus a
`POST /platform-craft-notes/research/discard` endpoint and a
`/__test__/force-research-failure` hook): idle shows the empty-state
placeholder and a working Save with a real "Last saved" caption; clicking
Run Research Pass immediately shows the running/loading state, NOT the
ready banner; once the job resolves (confirmed via polling, not an
instant response) the ready banner appears with the textarea genuinely
bound to `draftContent`; Discard clears the draft and restores the
untouched saved `content`; Save on a ready draft accepts the (optionally
edited) text into `content` and returns to idle; a forced failure shows
"Research failed: {draftError}" with a working Try Again that restarts
the job. Re-ran the full Contract Pipeline and Act/Part/Beats Playwright
passes afterward to confirm no regression elsewhere. Zero console errors
across the full pass.

**Navigation restructure: the two pipelines are now two separate
sections, each with its own menu, plus a real global entry point.** User
report: both pipelines shared one mixed workspace and one sidebar menu
(Pipeline Map/Run List/Continuity Ledger/Entity Review/Platform Craft
Notes/Settings) regardless of which type of run was actually open —
Platform Craft Notes showed even for a Main-pipeline run, where it means
nothing. There was also no way into the Planning Engine without already
being inside a project; the only entry point was the "Planning" tab on a
project's own page.

- **`PlanningWorkspace(bookId, pipelineType)`** (`PlanningWorkspace.tsx`,
  new file) is the old mixed workspace's entire component tree, now
  parameterized by `pipelineType` instead of driving everything off
  whichever run happened to be `?run=`-active. `navItemsFor(pipelineType)`
  builds the sidebar menu per section — Platform Craft Notes is appended
  only for `"contract"`, the one item that isn't shared. `useBookPlanningRuns(bookId)`
  is filtered to `r.pipelineType === pipelineType` before anything else
  reads it, so a Main section's Run List can never show a Contract run or
  vice versa — each section's Run List header reads "Main Pipeline Runs"
  / "Contract Pipeline Runs" accordingly, and the old dual "New Full Run"/
  "New Contract Run" buttons collapsed into a single "New Run" (the type
  is already fixed by which section you're in). `StartPlanningCard` lost
  its inline Main/Contract picker for the same reason — the type is fixed
  by the route now, so it just shows that one type's description and a
  single Start Planning button.
- **Two real routes per book**: `/projects/[id]/planning/main` and
  `/projects/[id]/planning/contract` (new `main/page.tsx` /
  `contract/page.tsx`, both thin wrappers rendering `<PlanningWorkspace
  bookId={id} pipelineType="full"|"contract" />`). `/projects/[id]/planning`
  itself is no longer the workspace — it's now just the Main/Contract fork
  (`PlanningChooserPage`, rewritten), book already known from the URL so
  it skips straight to the two-card choice. Both pages share one
  `PipelineTypeChooser` component (`src/components/pipeline-type-chooser.tsx`)
  so the fork always looks and reads identically wherever it appears.
- **A run created by Promote-to-Full or Branch can genuinely belong to
  the OTHER section** — e.g. promoting a Contract run produces a `"full"`
  run, which has no business in the Contract section's own menu.
  `PlanningWorkspaceInner`'s `goToRun(run)` checks `run.pipelineType`
  against the current section: same type just updates `?run=` in place
  (`router.replace`, unchanged behavior); a different type does a real
  cross-section navigation (`router.push` to the other section's own
  route) instead of trying to render a foreign-type run in the wrong
  workspace. Threaded through as the one `onOpenRun` callback both
  `RunListView` (open/resume, and its own Promote/Branch handlers) and
  `PipelineView` (the Pipeline Map's own Promote-to-Full button) call —
  neither has to know or care whether the run it just got back is
  same-section or not.
- **New global entry point**: `/planning` (new `src/app/(app)/planning/page.tsx`)
  — a "Planning" item now exists in the top-level sidebar (`nav.ts`) for
  the first time; there was previously no way into the Planning Engine
  without already being inside a project. Two steps on one page: pick
  Main or Contract (the same shared `PipelineTypeChooser`), then pick
  which book from `useProjects()` — selecting one navigates straight into
  that book's own section. `sidebar.tsx`'s `FULL_BLEED_WORKSPACES` map
  gained a `/projects/[^/]+/planning` → `/planning` entry (mirroring the
  existing Writing/Outliner/Characters/etc. entries) so being anywhere
  under a project's planning routes correctly lights up the top-level
  "Planning" nav item instead of "Projects".
- **"Switch Pipeline"** — a new link in each section's own sidebar,
  alongside the existing "Back to Project", that returns to the
  book-scoped chooser (`/projects/[id]/planning`) rather than requiring a
  full back-out through the project page.

**Verified working** (mock backend extended with no new endpoints — this
is a pure frontend routing/IA change over the existing `GET /planning/runs?bookId=`,
filtered client-side): the top-level sidebar's "Planning" item navigates
to `/planning` and is confirmed active (`aria-current`) while anywhere
under a project's planning routes; `/planning` shows the Main/Contract
choice before any book is picked, then a real book list after; picking a
book lands directly in that book's own section; the book-scoped chooser
at `/projects/[id]/planning` shows the same fork with no book list (book
already known); Contract section's own sidebar menu includes Platform
Craft Notes, Main section's does not; "Switch Pipeline" returns to the
book-scoped chooser; Start Planning shows no type picker in either
section, just that section's own fixed type and a single button; the
full Contract Pipeline flow (intake → Stage 1 → Codex Documentation →
Hook Chapters → done) still works end-to-end inside `/planning/contract`;
Promote-to-Full genuinely navigates the browser from `/planning/contract`
to `/planning/main` with the new run open, while Contract's own Run List
still shows the original (now-promoted) contract run with its own
Promote shortcut still offered, and Main's Run List shows only the new
run, correctly scoped. Re-ran the full pre-existing Act/Part/Beats
Playwright pass and the Platform Craft Notes async-job pass afterward to
confirm zero regression to either. Zero console errors across the full
pass (one pre-existing, unrelated hydration-mismatch warning from the
global `ThemeToggle` component was observed on ordinary page loads
throughout this session's testing — present before this change, not
caused by it, not fixed here).

**Live bug: Platform Craft Notes got stuck showing "Researching…"
forever if you navigated away from the panel while a research job was
running and came back after it had already finished server-side.** User
report, independently confirmed against the real backend that the job
genuinely did resolve (`draftStatus: "ready"` with real `draftContent`)
while the UI stayed stuck. Root cause was in `usePlatformCraftNotes`
(`planning-store.ts`): its mount effect only fetched fresh data the
*first* time a given `bookId` was seen —
`if (bookId && bookId !== platformNotesBookId) void loadPlatformCraftNotes(bookId)`
— guarded by a module-level `platformNotesBookId` singleton that, once
set, never let a later mount for the *same* book trigger another fetch.
Combined with `usePlatformCraftNotesPolling`'s interval being torn down
whenever `PlatformCraftNotesView` unmounts (switching to another nav
item inside the same Planning workspace unmounts it, since only one view
renders at a time), the sequence was: start research → navigate away
(interval dies) → job finishes server-side with nobody polling to notice
→ navigate back → remount skips the fetch (same `bookId` already
"seen") → renders off the stale cached `draftStatus: "running"` → the
*newly*-started polling interval (correctly restarted, since stale
`draftStatus` was still `"running"`) would still eventually catch up
within one more 7s tick, but that's not what "always do a fresh GET on
mount" requires, and in practice reports came in as "stuck."

Fixed by removing the guard entirely: `usePlatformCraftNotes`'s effect
now unconditionally re-fetches on every mount (`if (bookId) void
loadPlatformCraftNotes(bookId)`), so every time the panel becomes
visible — including navigating away and back within the same
session — the very first thing that happens is a real `GET
/platform-craft-notes`, not a decision based on whether this `bookId`
was already cached. `usePlatformCraftNotesPolling` itself was already
correct (a genuine repeating `setInterval`, not a one-shot follow-up —
ruled out as the bug) and needed no changes: once the fresh mount-time
GET resolves, `draftStatus` updates reactively and the polling hook's
`active` flag (`draftStatus === "running"`) recomputes correctly from
real data — polling starts if still running, or never starts at all if
the fresh GET already shows `"ready"`/`"failed"`. The now-write-only
`platformNotesBookId` singleton (nothing reads it anymore) was deleted
outright rather than left as dead state.

**Verified working** (mock backend already modeled the real detached-job
shape from the prior pass — `setTimeout`-resolved, independent of
whether a client is still listening): reproduced the exact reported
scenario end-to-end — click "Run Research Pass," navigate to Run List
(unmounting the panel, killing its polling interval) within 300ms of
starting the job, wait 32 real seconds away, independently confirm via a
direct API call that the job finished server-side while away
(`draftStatus: "ready"`, real `draftContent`), then navigate back to
Platform Craft Notes and confirm — with no additional wait — that the
finished draft banner and populated textarea appear immediately, not a
stuck "Researching…" spinner. Re-ran the full existing Platform Craft
Notes state-machine pass (idle/running/ready/failed, Save/Discard/Try
Again) and the full Contract Pipeline pass afterward to confirm zero
regression. Zero console errors across the full pass.

**Platform Craft Notes' editor gained a real Edit/Preview toggle, so
saved markdown no longer reads as raw `##`/`**`/`*` clutter.** Prior to
this, `PlatformNotesEditor` was a single always-visible `<textarea>` —
correct as an editable field for *writing* markdown, but a bad reading
experience once a research draft (which the backend genuinely returns as
markdown — headers, bold, italics) landed in it: the panel showed the
literal syntax characters instead of formatted text, whether reviewing a
fresh research draft or reopening previously-saved notes.

Fixed with a small local `mode: "edit" | "preview"` toggle (two tab
buttons, `PenLine`/`Eye` icons) rather than replacing the textarea
outright — the field still needs to stay a plain markdown source a writer
can type into, per the explicit "edit as raw text" decision. **Edit**
shows the original raw `<textarea>` unchanged; **Preview** renders the
same string through `renderMarkdown()` (the app's existing dependency-free
markdown renderer already used by `ArtifactContent` and the AI Assistant's
`ChatBubble` — no new dependency, same "no `dangerouslySetInnerHTML`"
discipline) inside a read-only `<div>`. Defaults to **Preview** whenever
there's real content to show (`initialValue.trim()` non-empty) so a
research draft or previously-saved notes open already readable, with
nothing jarring flashed first; defaults to **Edit** on a genuinely empty
document, since there's nothing to preview yet. The toggle is local
`PlatformNotesEditor` state, so it resets to that same default logic every
time the component remounts — which it already does on every real state
transition (idle ↔ ready ↔ after-save), via its existing `key` on
`` `${draftStatus}:${...UpdatedAt}` `` — so switching from a stale draft to
a freshly-saved one, or discarding a draft back to the saved content,
always re-evaluates the default rather than carrying over a stale toggle
choice from a different piece of content.

**Verified working** (against the same local mock backend, extended with
bold/italic markdown in the mock's own research draft text specifically
to exercise this): a fresh empty document opens in Edit mode (nothing to
preview); running research and letting the draft resolve to "ready" opens
in Preview mode by default with a real rendered `<h2>` heading, `<strong>`
bold, and `<em>` italic — confirmed no literal `##` or `**word**`/`*word*`
text appears anywhere on the page; switching to Edit shows the exact raw
markdown source (confirmed `##`/`**`/`*` characters are present there,
since that's the actual editable field); switching back to Preview
manually works; saving a reviewed draft lands back in Preview mode with no
raw markdown visible. Re-ran the full pre-existing Platform Craft Notes
state-machine pass (idle/running/ready/failed, Save/Discard/Try Again,
updated to toggle into Edit mode before each textarea interaction — a test
change only, not an app behavior change) and the full Contract Pipeline
and Act/Part/Beats Playwright passes afterward to confirm zero regression.
`tsc --noEmit`, `eslint`, and `npm run build` all clean. Zero console
errors across the full pass.

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
| Versions side-panel tab | Explicit honest placeholder — no fake data |
| Outline side-panel tab | **Live** — read-only list of the open chapter's real beats via `/manuscript/chapters/:id/beats`, links to the full Outliner board (§4.8) |
| AI side-panel tab | **Live** — the AI Assistant chat panel, compact layout (§4.7), including real Confirm/Reject proposal cards |
| Manuscript structure (Chapters) | **Live** — flat chapter list/body persisted; Parts/Scenes have real backend endpoints but no UI yet (see §4.5) |
| Active Collaborators | Fully static, not real presence |
| Share | Decorative, its own copy says there's no backend |
| Focus Mode (Normal/Typewriter/Zen) | Real, fully working client-only UI state — nothing to persist |
| Ban this selection (Ghost Editor) | **Live** — highlight text, ban it for the book via `/banned-terms`; enforced automatically server-side on every future generation (see §4.6) |
| Sync to AI Memory | **Live** — "..." menu action in the editor's TopBar, `POST /manuscript/chapters/:id/sync-to-memory` (§4.5) |
| Search this manuscript (sidebar search icon) | **Live, client-side** — real full-text search across every chapter's actual saved paragraphs, not just chapter titles/numbers (that's the separate, always-visible "Filter chapters…" input, unchanged). No backend search endpoint exists (or is needed) for this — see below. |

---

## 5.5. "..." (options) menus — real actions, not just delete

Every `MoreHorizontal` ("...") button across the app used to render with no
`onClick` at all — a card's options menu that did nothing when clicked.
All of them now open a real `OptionsMenu` (`src/components/ui/
options-menu.tsx`, a themed dropdown of `{label, Icon, onClick, danger}`
items, portaled to `document.body` the same way `DropdownSelect` is — see
that file's own comment for why: a `.card`/`.card-2` ancestor's own
stacking context can otherwise trap a panel behind a later sibling card).
Destructive actions confirm first through `ConfirmDialog`
(`src/components/ui/confirm-dialog.tsx`), also portaled, so a click inside
it can never bubble to an ancestor's own click handler (relevant for cards
like `CharacterCard` in `characters/all/page.tsx`, whose entire body
navigates on click).

**Delete is wired everywhere a "..." menu exists**, each going through a
new `delete*` function added to that domain's store (`deleteProject`,
`deleteCharacter`, `deleteNote`, `deleteWorldEntry`) — a real `DELETE`
call, filtering the deleted row out of the local cache on success:
- `/projects` (project card) and the project detail header — delete the
  whole project; the header's version redirects to `/projects` after.
- Characters workspace detail panel and the "All Characters" grid card —
  delete the character.
- Notes hub note cards — delete the note.
- Worldbuilding hub's Recent Entries table rows — delete the entry (via
  the same `/codex/:id` endpoint Character uses, see §3.5's Worldbuilding
  section for why a world entry has no endpoint of its own).

**Chapter delete, added in a later pass** (the one domain this first pass
didn't cover — no chapter-delete feature existed anywhere in the app
until a user directly asked for one on a real 400+ chapter manuscript).
`deleteChapter(chapterId)` (`manuscript-store.ts`) calls the real `DELETE
/manuscript/chapters/:id`, which cascades on the backend to that
chapter's scene markers and Outliner beats. **Originally shipped without
touching `manuscript_chunks`** (a chapter already synced to AI memory
stayed retrievable there even after its editor row was gone) — the
backend team closed that gap in a follow-up (`4dc1d41`, backend repo):
the route now captures the deleted row's `book_id`/`number` off the same
`DELETE ... RETURNING` it already did, then deletes matching
`manuscript_chunks` rows (the table has no `chapter_id` column — it's
keyed by `book_id` + `chapter_number`, same pairing `sync-to-memory`
already uses to find a chapter's chunks). A chunk-delete failure doesn't
fail silently either: the chapter row is already gone by that point, so
the route returns a real 502 saying memory couldn't be fully cleared,
rather than a generic success. The frontend's delete confirm copy
(`ChapterRow`'s and `MoreMenu`'s `ConfirmDialog`) originally branched on
`chapter.syncedToMemoryAt` to warn that AI memory would survive the
delete — removed once the backend fix shipped, since that warning would
now be actively wrong; both call sites show the same plain "will be
permanently deleted" copy regardless of sync state. Two entry points,
both going through the same `deleteChapter()`: a hover-revealed
`OptionsMenu` on each `ChapterRow` in the left-rail chapter list (delete
any chapter without opening it first — the case that actually matters on
a long manuscript), and a "Delete Chapter" item in the editor's own
per-chapter "..." menu (`MoreMenu`, alongside Sync to AI Memory) for the
currently-open chapter. Deleting the currently-open chapter clears the
pending autosave timeout rather than flushing it (flushing would PATCH a
chapter that's about to not exist) and clears the editor's selection so
it falls back to whatever chapter is now first, same as the existing
"just deleted the active item" pattern every other domain's delete
already uses.

**Known edge case, not yet handled**: if the backend's chunk cleanup
fails (that 502), the chapter row is genuinely already deleted, but the
frontend's `deleteChapter()` throws on any non-2xx response and never
updates the local chapter-list cache — so the deleted chapter would keep
showing in the UI until the next real refetch, even though it's actually
gone. Not fixed here since it depends on a rare, hard-to-provoke
partial-failure path; worth a real fix (e.g. distinguishing this specific
502 from a genuine delete failure and still clearing the cache) if it
ever shows up in practice.

**A second, unrelated bug found while testing chapter delete on a cold
page load**: the manuscript nav's "Manuscript" part rendered permanently
collapsed on a fresh navigation straight to `/chapters` (not a warm SPA
transition from another page where the chapter list was already cached).
Root cause: `ManuscriptPanel`'s `expanded` state was a `useState` lazy
initializer computed once from the `manuscript` prop — which is still
`[]` at the very first render, before the async chapter-list fetch has
resolved, since a lazy initializer only ever runs on mount and never
re-evaluates once real data arrives. Fixed with a `useEffect` (guarded by
an `autoExpandedRef` set of part ids already auto-expanded once) that
expands each part exactly once the first time it actually appears in
`manuscript`, without re-forcing a part back open if the writer
deliberately collapses it afterward.

**Verified working** (against a local mock backend with `DELETE
/manuscript/chapters/:id`, extended to match the real cascade/response
shape at the time): a fresh page load auto-expands the chapter list for
real (the cold-load bug, confirmed fixed); deleting a never-synced
chapter via the nav row's hover options menu shows the confirm copy, and
the chapter is gone from both the UI and a direct API check afterward;
deleting the now-open chapter via the editor's own "..." menu works the
same way; and deleting the last remaining chapter correctly falls back to
the existing "Start your manuscript" empty state. Zero console errors
across the full pass. (This pass predates the backend's `manuscript_chunks`
cleanup fix above and the resulting removal of the AI-memory caveat
copy — that later change was a straightforward text-only edit on the two
`ConfirmDialog` call sites, not independently re-verified end-to-end
against the new backend behavior.)

**One real layout bug found and fixed while wiring this up**:
`OptionsMenu`'s first draft wrapped its trigger button in its own
`position: relative` div for measurement purposes. Several call sites
position the trigger itself with `absolute` classes (e.g. a note card's
"..." at `absolute right-2 top-11`, meant to be positioned relative to the
card's own cover-image container) — but `position: absolute` resolves
against the *nearest* positioned ancestor, and that div became a closer,
unintended one. The button rendered detached from its intended anchor and
was clipped out of its intended container's `overflow: hidden` bounds
entirely, making it unclickable (confirmed via Playwright: `elementFromPoint`
at the button's real screen position resolved to the page's own scroll
container, not the button). Fixed by putting the measurement ref directly
on the `<button>` itself with no wrapping div, so a caller's own
positioning classes resolve against whatever ancestor was actually
intended.

**Verified working** (same local-mock-server approach as every backend
integration in this file, extended with `DELETE /books/:id` and
`DELETE /codex/:id` handlers): create-then-delete round trips for a
project (both entry points), a character (both the detail panel and the
grid card), a note, and a world entry (created directly against the mock
to simulate an MCP-created entry) — each confirms the item disappears
from its list and, for the project header's delete, that it redirects to
`/projects`. Zero console errors in any pass.

**Second pass: every menu now has Edit too, not just Delete.** The first
pass above shipped every "..." menu with only a Delete action — a real
improvement over doing nothing, but "the ... menu should allow more than
delete" was the very next piece of feedback, and there was already
UI expecting this: the project detail sidebar's "Edit Details" button and
the Dashboard's "Writing Goal" card's "Edit" button both existed and were
already wired to nothing (`<button>` with no `onClick`) before this pass.

- **`updateProject()`** (`project-store.ts`) — PATCH title/tagline/genre/
  subgenres/pov/tense/targetWords (every field `buildBookPayload` accepts
  on PATCH, confirmed in the backend's `books.ts`), keeping the project's
  existing `updatedRank` rather than re-sorting the list. A new
  `EditProjectModal` (`src/components/edit-project-modal.tsx`, portaled)
  reuses the exact same `PRIMARY_GENRES`/`SUBGENRE_OPTIONS`/`POV_OPTIONS`/
  `TENSE_OPTIONS` vocabulary as `/projects/new` (now exported from that
  page for reuse) — wired from the `/projects` list's "Edit Project" menu
  item, the project detail header's "Edit Project" menu item, and the
  sidebar's previously-dead "Edit Details" button (all three open the same
  modal).
- **`updateCharacter()`** (`character-store.ts`) — same field set as
  `createCharacter`, but sends `null` (not `undefined`) for any field the
  user cleared, since PATCH treats an omitted key as "leave unchanged"
  while an explicit `null` clears it. The New Character form
  (`characters/new/page.tsx`) was refactored into a shared, exported
  `CharacterForm({ character? })` component: with no `character` it's the
  original creation flow; passed one, every field pre-fills and submit
  calls `updateCharacter()` instead. A new route,
  `characters/[characterId]/edit/page.tsx`, looks the character up via
  `useCharacter(bookId, characterId)` and renders `CharacterForm` in edit
  mode — wired from "Edit Character" in both the Characters workspace
  detail panel and the "All Characters" grid card's options menu.
- **`updateNote()`** (`notes-store.ts`) — PATCH title/excerpt/category.
  `NewNoteModal` (`notes/page.tsx`) now takes an optional `note` prop that
  switches it into edit mode the same way `CharacterForm` does — wired
  from "Edit Note" in the note card options menu.
- **`updateWorldEntry()`** (`worldbuilding-store.ts`) — PATCH name/
  description/entryType via the same `/codex/:id` endpoint
  `deleteWorldEntry` already used (a world entry is still just a
  `codex_entries` row, see §3.5). Since there was never a "New Entry" form
  to extend (still true — see §4.3), a new small, purpose-built
  `EditWorldEntryModal` (in `world/page.tsx`, portaled) covers name/
  category/summary — wired from "Edit Entry" in the Worldbuilding hub's
  Recent Entries row options menu.

## 5.6. Real chapter/word counts, and a settable writing goal

Three more concrete complaints, all about numbers that read as fabricated
or permanently zero even once real data existed: a populated project's
chapter count still read "no chapters" in places, word counts never moved
off zero anywhere outside the editor itself, and the Dashboard's daily/
monthly writing goals were hardcoded constants with no way to change them.

**Chapter count** is cheap — `manuscript-store.ts` already fetches the
real chapter list — so a new `useChapterCount(bookId)` (just
`useManuscript(bookId)` summed) is wired into every place `project.chapters`
used to render a permanent `0`: the `/projects` list cards, the project
Overview tab, and the Dashboard's project cards.

**Word count is expensive** — the chapter *list* endpoint deliberately
excludes `paragraphs` (see §3.5), so a real total needs every chapter's
full body. A new `useManuscriptWordCount(bookId)` in `manuscript-store.ts`
lazily fetches every chapter's body in parallel (once per book, cached)
and sums real word counts, exposing both a `total` and a `perChapter` map
so the Overview tab's "Recent Chapters" list can show each chapter's own
real count instead of `project.words / project.chapters` divided evenly
across the average (the old mock's `deriveRecentChapters` fallback
formula). Wired into the same three places as chapter count, plus the
Dashboard's "Continue Writing" card. This is a real per-visible-project
fetch cost (accepted deliberately, at the personal-project-count scale
this app targets — not something to reproduce at a larger scale without
revisiting).

**`manuscript-store.ts`'s chapter-list cache had to become keyed by
`bookId`** (a `Map`, not module-level scalars) as part of this — it was
built assuming only one project's manuscript was ever in view at once (the
editor, or the Dashboard's single "most recent" project), which broke the
moment `/projects` needed several different books' chapter lists live
simultaneously (the previous single global cache would thrash, showing
one project's count on another's card). `useManuscript()`,
`useManuscriptLoadStatus()`, and `useManuscriptError()` all now key off
`bookId` for the same reason.

**Two real bugs found and fixed while wiring word counts up, neither
hypothetical — both reproduced and confirmed fixed against the local
mock:**
1. **A race condition that silently produced a permanent 0.** Calling
   `useChapterCount(bookId)` and `useManuscriptWordCount(bookId)` in the
   same component render for the same book (exactly what the `/projects`
   row does) meant both hooks' effects fired in the same commit, and
   `loadChapters()` flips its cache entry's `status` to `"loading"`
   *synchronously* before its first `await` — so by the time the second
   hook's effect checked `status === "idle"` to decide whether to await
   the list, it was already `"loading"`, not `"idle"` or `"error"`, so it
   skipped waiting and read `entry.rows` while still empty. Fixed with a
   shared in-flight-promise map (`ensureChaptersLoaded()`) so every caller
   for the same `bookId` awaits the one real request, however many
   triggered it, instead of each doing its own racy status check.
2. **A `useSyncExternalStore` snapshot that never changed reference.**
   Word count's cache entry was a single object mutated in place
   (`entry.total = total; entry.status = "loaded";`) and returned whole as
   the hook's snapshot — but `useSyncExternalStore` decides whether to
   re-render via `Object.is` on the snapshot value, and a mutated-in-place
   object keeps the same reference, so React never noticed the update even
   though `emit()` fired. Fixed by replacing the cache entry with a new
   object on every state transition instead of mutating fields on the
   persisted one (`setWordCountEntry()`) — the same class of bug
   `getListEntry().rows` never had, since `loadChapters()` already
   reassigns `.rows` to a new array each time rather than mutating it.

**A third bug, found only because fixing the above finally let real
content reach a save call: the editor's permanent "Type / for commands"
slash-command hint was bleeding into saved chapter content.** It renders
as a real, unprotected sibling `<p>` inside the same contentEditable
region as the actual paragraphs (`chapters/page.tsx`), with no exclusion
in `serializeParagraphs()` — so it always contributed to whatever got
saved. Fixed by tagging it `data-placeholder="true"` and filtering
`serializeParagraphs()`'s DOM walk on that attribute. Trying
`contentEditable={false}` on the hint first (to also stop the browser from
letting the user type into it) turned out to be the wrong fix and was
reverted — it broke typing into a fresh empty chapter entirely, because a
brand-new chapter's seed paragraph is a genuinely empty `<p></p>`, which
browsers collapse to **zero height** with no content to anchor a line box
to; with the hint non-editable, every click aimed at "the empty line" (the
only visible line) landed in the *next* line down, i.e. the hint itself,
and typing was silently lost once the hint got excluded from serialization.
The real fix was giving the plain-paragraph branch of `EditorParagraph` a
`min-h-[1.85em]` (matching the container's own `leading-[1.85]`) so an
empty paragraph still occupies a real, clickable line — confirmed
necessary by reproducing the zero-height bounding box directly (Playwright
`boundingBox()` on a fresh empty paragraph: `height: 0`) before the fix
and a real one after (`height: 31.4375`, matching one line at the
zoomed font size). A `{paragraph.text || <br />}` alternative was tried
and also reverted: it fixed the click target but introduced a *second*
regression — once autosave round-trips and the component re-renders with
fresh server data, React's reconciler tries to remove the `<br/>` element
it still thinks is there to replace it with a text node, but the browser's
own contentEditable typing had already replaced that `<br/>` outside
React's knowledge, throwing `Failed to execute 'removeChild': the node to
be removed is not a child of this node.` The CSS-only `min-h` fix touches
no DOM children at all, so it carries none of that reconciliation risk.

**Writing goals are deliberately NOT backed by the real backend** — there
is no writing-session/goal-tracking table (see §4.9), so a new
`src/lib/writing-goal-store.ts` persists `dailyTarget`/`monthlyTarget` to
`localStorage` instead: a real, user-settable value (the actual
complaint — the old `todaysProgress.target: 2000` / `writingGoal.target:
50000` in `dashboard-data.ts` were permanent hardcoded constants with no
way to ever change them), just not a synced one, the same "single stable
value per browser install" tradeoff `getUserId()` already makes for
identity. The Dashboard's "Writing Goal" card's pre-existing, previously-
dead "Edit" button now opens a small modal (`EditWritingGoalModal`)
covering both targets; "Today's Progress" reads the same `dailyTarget`
reactively. `todaysProgress.current`/`writingGoal.current`/`daysActive`/
`consistencyPercent`/`writingTime` stay honestly zeroed mock data, same
as before — there's still no session-tracking backend to compute *actual*
progress against the goal, only the goal number itself is now real.

**Verified working** (same local-mock-server approach, extended with
`PATCH /codex/:id` — previously only had DELETE — and a fuller
`PATCH /books/:id` covering tagline/genre/subgenres/pov/tense): create a
project with a chapter, type real content, confirm the exact real word
count (not a placeholder-polluted one) appears on the `/projects` list
card and the project detail Overview tab; edit a project's title from
both the list and detail-header entry points and from the sidebar's "Edit
Details" button; edit a character and confirm the edit form pre-fills
from the existing character; edit a note and a world entry; set both
writing goals and confirm the new values persist across a hard reload.
Zero console errors in the full pass, including through the autosave →
re-render cycle that originally surfaced the `removeChild` regression.

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
/                                            Dashboard — Project[] (live) + dashboard-data.ts mock (§4.9)
/projects                                    Project[] (live)
/projects/new                                submits NewProjectInput
/projects/[id]                               Project detail chrome (10-tab nav), Edit Project modal (updateProject)
/projects/[id]                (Overview tab) Project + real ManuscriptPart[]/word counts (§5.6) + deriveRecentActivity
/projects/[id]/analytics                     stub — <ComingSoon>, no data model
/projects/[id]/settings                      stub — <ComingSoon>, no data model
/projects/[id]/chapters                      ManuscriptPart[] (live) + ChapterBody (live) + CommentThread[] (mock) (§4.5/§5) + BannedTermRow[] (live, §4.6) + ChatSessionRow[]/ChatMessage[] (live, AI tab, §4.7) + OutlineBeat[] (live read-only, Outline tab, §4.8)
/projects/[id]/outlines                      OutlinePart[]/OutlineChapter[]/OutlineBeat[] (live, §4.8)
/projects/[id]/planning                      book-scoped Main/Contract chooser (PipelineTypeChooser) — no workspace of its own, just picks which section below
/projects/[id]/planning/main                 AgentPrompt[]/PlanningRun (live, §4.10, pipelineType "full") — full-bleed Main Pipeline workspace (Pipeline Map, Run List, Continuity Ledger, Entity Review, Settings/Prompt Editor)
/projects/[id]/planning/contract             AgentPrompt[]/PlanningRun (live, §4.10, pipelineType "contract") — full-bleed Contract Pipeline workspace, same menu as Main plus Platform Craft Notes
/projects/[id]/assistant                     ChatSessionRow[]/ChatMessage[] (live, §4.7) — full-page AI Assistant workspace
/projects/[id]/characters                    Character[] (live) + selected Character detail, Edit/Delete via options menu
/projects/[id]/characters/all                Character[] (live), grid+pagination, Edit/Delete via options menu
/projects/[id]/characters/new                submits NewCharacterInput (shared CharacterForm, see §5.5)
/projects/[id]/characters/[characterId]/edit submits same shape via updateCharacter (shared CharacterForm, see §5.5)
/projects/[id]/world                         WorldCategoryMeta[] (live) + WorldEntry[] (live read, no in-app create — §3.5/§4.3) + WORLD_TIMELINE/WORLD_OVERVIEW/PINNED_WORLD_ITEMS (mock)
/projects/[id]/world/new-category            submits NewCategoryInput
/projects/[id]/notes                         Note[] (live)
/planning                                    global entry point — Main/Contract chooser, then a real book picker (useProjects()) → navigates into that book's /projects/[id]/planning/main|contract
/writing /outlines /characters /worldbuilding /notes /assistant   redirect-only pages → most-recently-active project's real workspace, no data of their own
/goals /analytics /settings /timeline /templates /help   stubs — <ComingSoon>, no data model
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
