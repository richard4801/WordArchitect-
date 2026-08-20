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
| Worldbuilding | **Live** — `/world-categories` + `/codex` | `worldbuilding-store.ts` |
| Notes | **Live** — `/notes` | `notes-store.ts` |
| Manuscript/Chapters | **Live** — `/manuscript/chapters` | `manuscript-store.ts` |
| Banned Terms | **Live** — `/banned-terms` | `banned-terms-store.ts` |
| AI Assistant Chat | **Live** — `/chat` + `/chat/sessions` | `chat-store.ts` |
| Outliner | Mock, deferred (backend is real, not yet wired here) | `/outline/beats` + `/manuscript/chapters/:id/beats` exist on the backend (`claude/ai-fiction-platform-backend-qnvkm5`, confirmed by reading `src/routes/outline.ts`) — next domain in line per the frontend handoff brief's suggested build order, not started yet |
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
5. **`sync-to-memory`** — the backend has a real, separate
   `POST /manuscript/chapters/:id/sync-to-memory` endpoint for pushing a
   chapter into AI-searchable memory; not wired to any UI action yet
   (deliberately kept distinct from autosave — see §3.5).
6. Collaborators/presence and Share are fully decorative/static — not a
   near-term backend priority per the current build.

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
  `propose_*` tool calls (write proposals — see the brief's Confirm/Reject
  section, not yet built) render distinctly with a "not actionable from
  here yet" note rather than silently doing nothing or crashing on an
  unrecognized shape — this phase only had to not break when a proposal
  shows up, not act on it.
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

### 4.8 Outliner (beats)

Source: `src/lib/outline-data.ts`. **No store, no creation UI, seed-only,**
one hardcoded structure (Three Act) for `shadows-of-elarion`; other
outline modes shown in mockups (Hero's Journey, Save the Cat) are not
built as distinct data structures yet. **The backend side is real and
live** — `GET /outline/beats?bookId=` (flat `parts`/`chapters`/`beats`,
group client-side), per-chapter `GET /manuscript/chapters/:id/beats`,
full beat CRUD, and `beatId`/`userSceneBeat` wiring into
`/generate-prose` — confirmed by reading `src/routes/outline.ts` on
`claude/ai-fiction-platform-backend-qnvkm5`. Frontend integration is next
in line per the handoff brief's suggested build order but hasn't started;
the type shapes below are still the old mock's, not yet reconciled with
the real `Beat` row shape (`chapter_id`, `order_index`, `outline_text`,
`status: BeatStatus`, `linked_to_manuscript` — four fixed statuses, not
this mock's `BeatStatus`/`BeatColor` union).

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
| Ban this selection (Ghost Editor) | **Live** — highlight text, ban it for the book via `/banned-terms`; enforced automatically server-side on every future generation (see §4.6) |

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
/projects/[id]                               Project detail chrome (9-tab nav), Edit Project modal (updateProject)
/projects/[id]                (Overview tab) Project + real ManuscriptPart[]/word counts (§5.6) + deriveRecentActivity
/projects/[id]/analytics                     stub — <ComingSoon>, no data model
/projects/[id]/settings                      stub — <ComingSoon>, no data model
/projects/[id]/chapters                      ManuscriptPart[] (live) + ChapterBody (live) + CommentThread[] (mock) (§4.5/§5) + BannedTermRow[] (live, §4.6) + ChatSessionRow[]/ChatMessage[] (live, AI tab, §4.7)
/projects/[id]/outlines                      Act[] / Beat[] (§4.8 — seed-only, no store)
/projects/[id]/assistant                     ChatSessionRow[]/ChatMessage[] (live, §4.7) — full-page AI Assistant workspace
/projects/[id]/characters                    Character[] (live) + selected Character detail, Edit/Delete via options menu
/projects/[id]/characters/all                Character[] (live), grid+pagination, Edit/Delete via options menu
/projects/[id]/characters/new                submits NewCharacterInput (shared CharacterForm, see §5.5)
/projects/[id]/characters/[characterId]/edit submits same shape via updateCharacter (shared CharacterForm, see §5.5)
/projects/[id]/world                         WorldCategoryMeta[] (live) + WorldEntry[] (live read, no in-app create — §3.5/§4.3) + WORLD_TIMELINE/WORLD_OVERVIEW/PINNED_WORLD_ITEMS (mock)
/projects/[id]/world/new-category            submits NewCategoryInput
/projects/[id]/notes                         Note[] (live)
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
