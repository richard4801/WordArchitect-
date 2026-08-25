"use client";

/**
 * Real backend-backed Manuscript/Chapters store — wraps the WordArchitect
 * backend's rich-editor persistence surface (`/api/v1/manuscript/chapters`,
 * see the backend repo's CLAUDE.md "Manuscript Chapters — rich-editor
 * persistence" section and `manuscript_chapters` schema). This is the gap
 * every earlier pass through this codebase flagged as the single biggest
 * one: the editor had real formatting but nothing to save to, and no way
 * to create a first chapter at all ("Add chapter" had no handler).
 *
 * Deliberately NOT wired to `manuscript_parts` yet — every real chapter is
 * grouped under one synthetic "Manuscript" part client-side
 * (`SYNTHETIC_PART_ID`) so the existing `ManuscriptPart[]`-shaped UI
 * (`ManuscriptPanel` et al.) keeps working unchanged. Parts are optional
 * grouping metadata on the backend (`part_id` nullable) — nothing here
 * requires them to exist.
 *
 * Three independent pieces of state, on purpose:
 * 1. The chapter LIST (metadata only — id/number/title/complete), keyed by
 *    bookId — used to be a single global cache assuming only one project's
 *    manuscript was ever in view at once (the editor). Once project cards
 *    on /projects and the Dashboard started showing real chapter counts
 *    too, multiple books' chapter lists need to stay live *simultaneously*
 *    without thrashing each other, hence the `Map<bookId, ...>` cache.
 * 2. The chapter BODY (paragraphs) for whichever single chapter is
 *    actually open in the editor, loaded lazily per chapter — fetching
 *    every chapter's full paragraph content just to render a nav list
 *    would be wasteful for a long manuscript. This one stays a true
 *    singleton on purpose: only one chapter is ever being edited at a time,
 *    regardless of which book it belongs to.
 * 3. Word counts (per book), also keyed by bookId — real word counts need
 *    every chapter's body text, not just the list, so this lazily fetches
 *    all of a book's chapter bodies in parallel and sums them. Separate
 *    from (2) so viewing a project's stats doesn't disturb whatever
 *    chapter is currently open in the editor.
 */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { apiFetch, getUserId } from "@/lib/api-client";
import type { ChapterParagraph, ManuscriptChapter, ManuscriptPart } from "@/lib/manuscript-data";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

const SYNTHETIC_PART_ID = "manuscript";

/** `manuscript_chapters` row exactly as the backend returns it — raw snake_case columns, no paragraphs (list endpoint only). */
type ManuscriptChapterRow = {
  id: string;
  user_id: string;
  book_id: string;
  part_id: string | null;
  number: number;
  title: string | null;
  heading: string | null;
  complete: boolean;
  synced_to_memory_at: string | null;
  /** Bumps only when a PATCH actually includes `paragraphs` — not on a title/heading/complete/part edit. Backfilled + NOT NULL by migration 021, but typed nullable defensively (see mapRowToChapter). */
  content_updated_at: string | null;
  created_at: string;
  updated_at: string;
};
/** Same row, plus `paragraphs` — only returned by `GET /manuscript/chapters/:id`. */
type ManuscriptChapterFullRow = ManuscriptChapterRow & { paragraphs: ChapterParagraph[] };

type ChaptersListResponse = { chapters: ManuscriptChapterRow[] };
type ChapterDetailResponse = { chapter: ManuscriptChapterFullRow; scenes: unknown[] };
type ChapterResponse = { chapter: ManuscriptChapterFullRow };

function mapRowToChapter(row: ManuscriptChapterRow): ManuscriptChapter {
  return {
    id: row.id,
    number: row.number,
    title: row.title?.trim() || `Chapter ${row.number}`,
    complete: row.complete,
    syncedToMemoryAt: row.synced_to_memory_at,
    contentUpdatedAt: row.content_updated_at,
  };
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const listeners = new Set<() => void>();
// Bumped on every emit() — lets a hook that aggregates across several keys
// (useTotalWordCount, summing multiple books) detect "something in the
// store changed" via a single stable primitive, instead of trying to hand
// useSyncExternalStore a freshly-computed sum object each render (which
// would fail its reference-stability contract and thrash re-renders).
let version = 0;
function emit() {
  version++;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getVersion() {
  return version;
}

// ---------------------------------------------------------------------
// Chapter list (metadata) — keyed by bookId
// ---------------------------------------------------------------------

type ListEntry = { rows: ManuscriptChapterRow[]; status: LoadStatus; error: string | null };
const listCache = new Map<string, ListEntry>();

function getListEntry(bookId: string): ListEntry {
  let entry = listCache.get(bookId);
  if (!entry) {
    entry = { rows: [], status: "idle", error: null };
    listCache.set(bookId, entry);
  }
  return entry;
}

async function loadChapters(bookId: string): Promise<void> {
  const entry = getListEntry(bookId);
  entry.status = "loading";
  entry.error = null;
  emit();
  try {
    const res = await apiFetch<ChaptersListResponse>(
      `/manuscript/chapters?bookId=${encodeURIComponent(bookId)}`,
    );
    entry.rows = res.chapters;
    entry.status = "loaded";
  } catch (err) {
    entry.status = "error";
    entry.error = err instanceof Error ? err.message : "Failed to load chapters.";
  }
  emit();
}

export function refreshManuscript(bookId: string): void {
  void loadChapters(bookId);
}

export type SyncToMemoryResult =
  | { alreadySynced: false; chunkCount: number; syncedAt: string }
  | { alreadySynced: true; syncedAt: string };

/**
 * Push a chapter's current paragraphs into permanent, AI-searchable
 * manuscript memory (`POST /manuscript/chapters/:id/sync-to-memory`) —
 * a deliberate, writer-triggered action distinct from autosave (see the
 * backend's own migration comment: autosave only ever updates this row's
 * `paragraphs`, never touches embeddings/`manuscript_chunks`). Replaces
 * any of this chapter's previous chunks rather than appending, so
 * re-syncing an edited chapter can't leave stale duplicates behind.
 *
 * The backend itself now guards against a redundant resync: if nothing's
 * changed since the last sync (`content_updated_at <= synced_to_memory_at`),
 * it responds 200 `{ alreadySynced: true, syncedAt }` instead of
 * re-embedding — a quiet success, not an error, even though the UI should
 * normally never let this fire (see the disabled-button logic in
 * `chapters/page.tsx`'s `MoreMenu`).
 */
export async function syncChapterToMemory(chapterId: string): Promise<SyncToMemoryResult> {
  const res = await apiFetch<{ chunks?: unknown[]; syncedAt: string; alreadySynced?: true }>(
    `/manuscript/chapters/${chapterId}/sync-to-memory`,
    { method: "POST" },
  );
  for (const [bookId, entry] of listCache) {
    const idx = entry.rows.findIndex((r) => r.id === chapterId);
    if (idx === -1) continue;
    const rows = [...entry.rows];
    rows[idx] = { ...rows[idx], synced_to_memory_at: res.syncedAt };
    listCache.set(bookId, { ...entry, rows });
  }
  emit();
  if (res.alreadySynced) return { alreadySynced: true, syncedAt: res.syncedAt };
  return { alreadySynced: false, chunkCount: (res.chunks ?? []).length, syncedAt: res.syncedAt };
}

/**
 * Both useManuscript() and useManuscriptWordCount() need the chapter list
 * loaded, and both can fire in the same render for the same bookId (e.g. a
 * /projects row calling useChapterCount() then useManuscriptWordCount()).
 * A naive "if status is idle, call loadChapters()" check in each is racy:
 * the first caller flips status to "loading" synchronously (before its own
 * first await), so the second caller's idle check fails and it reads
 * `entry.rows` while still empty instead of waiting for the fetch already
 * in flight — silently producing a permanent 0. This dedups by tracking
 * the in-flight promise itself, so every caller for the same bookId awaits
 * the one real request, however many trigger it.
 */
const listLoadPromises = new Map<string, Promise<void>>();

function ensureChaptersLoaded(bookId: string): Promise<void> {
  const entry = getListEntry(bookId);
  if (entry.status === "loaded") return Promise.resolve();
  let promise = listLoadPromises.get(bookId);
  if (!promise) {
    promise = loadChapters(bookId).finally(() => listLoadPromises.delete(bookId));
    listLoadPromises.set(bookId, promise);
  }
  return promise;
}

const EMPTY_PARTS: ManuscriptPart[] = [];
const EMPTY_ROWS: ManuscriptChapterRow[] = [];

/** Live chapter structure for one book, wrapped in a single synthetic part — fetches on first use or when `bookId` changes. */
export function useManuscript(bookId: string | undefined): ManuscriptPart[] {
  useEffect(() => {
    if (bookId) void ensureChaptersLoaded(bookId);
  }, [bookId]);
  const rows = useSyncExternalStore(
    subscribe,
    () => (bookId ? getListEntry(bookId).rows : EMPTY_ROWS),
    () => (bookId ? getListEntry(bookId).rows : EMPTY_ROWS),
  );
  return useMemo(() => {
    if (!bookId || rows.length === 0) return EMPTY_PARTS;
    const sorted = [...rows].sort((a, b) => a.number - b.number);
    return [{ id: SYNTHETIC_PART_ID, title: "Manuscript", chapters: sorted.map(mapRowToChapter) }];
  }, [bookId, rows]);
}

/** Live chapter count for one book — cheaper than useManuscript() when only the count is needed. */
export function useChapterCount(bookId: string | undefined): number {
  const parts = useManuscript(bookId);
  return useMemo(() => parts.reduce((sum, p) => sum + p.chapters.length, 0), [parts]);
}

export function useManuscriptLoadStatus(bookId: string | undefined): LoadStatus {
  return useSyncExternalStore(
    subscribe,
    () => (bookId ? getListEntry(bookId).status : "idle"),
    () => (bookId ? getListEntry(bookId).status : "idle"),
  );
}
export function useManuscriptError(bookId: string | undefined): string | null {
  return useSyncExternalStore(
    subscribe,
    () => (bookId ? getListEntry(bookId).error : null),
    () => (bookId ? getListEntry(bookId).error : null),
  );
}

/**
 * Create a real chapter and return it. Auto-numbers to one past the
 * current highest chapter (the backend rejects a duplicate `number` per
 * book with 409), and seeds a single empty paragraph so the editor always
 * has something to place the caret in rather than an empty contentEditable
 * with no child nodes.
 */
export async function createChapter(bookId: string, input: { title?: string } = {}): Promise<ManuscriptChapter> {
  const entry = getListEntry(bookId);
  const nextNumber = entry.rows.length > 0 ? Math.max(...entry.rows.map((c) => c.number)) + 1 : 1;
  const res = await apiFetch<ChapterResponse>("/manuscript/chapters", {
    method: "POST",
    body: JSON.stringify({
      userId: getUserId(),
      bookId,
      number: nextNumber,
      title: input.title?.trim() || undefined,
      paragraphs: [{ id: crypto.randomUUID(), text: "" }],
    }),
  });
  entry.rows = [...entry.rows, res.chapter];
  entry.status = "loaded";
  emit();
  return mapRowToChapter(res.chapter);
}

/**
 * Delete a chapter for real (`DELETE /manuscript/chapters/:id`). Cascades
 * on the backend to that chapter's scene markers and Outliner beats, and
 * (as of the backend's own follow-up fix) also deletes that chapter's
 * `manuscript_chunks` rows (matched by `book_id` + the deleted chapter's
 * `number`, captured off the same `DELETE ... RETURNING` before the row is
 * gone) so AI memory doesn't outlive the chapter it came from. A failure
 * to clear those chunks surfaces as a real 502 from the backend even
 * though the chapter row itself is already deleted by that point — see
 * CLAUDE.md's "Known edge case" note: this function still throws on any
 * non-2xx response and doesn't update the local cache in that case, so a
 * chapter that's actually gone server-side could keep showing here until
 * a real refetch.
 */
export async function deleteChapter(chapterId: string): Promise<void> {
  await apiFetch<void>(`/manuscript/chapters/${chapterId}`, { method: "DELETE" });
  for (const [bookId, entry] of listCache) {
    if (!entry.rows.some((r) => r.id === chapterId)) continue;
    listCache.set(bookId, { ...entry, rows: entry.rows.filter((r) => r.id !== chapterId) });
    wordCountCache.delete(bookId);
  }
  if (bodyForChapterId === chapterId) {
    bodyForChapterId = null;
    bodyRow = null;
    bodyStatus = "idle";
  }
  emit();
}

// ---------------------------------------------------------------------
// Chapter body (lazy, one chapter at a time — a true singleton, see
// module comment above)
// ---------------------------------------------------------------------

let bodyForChapterId: string | null = null;
let bodyStatus: LoadStatus = "idle";
let bodyRow: ManuscriptChapterFullRow | null = null;

function getBodyStatusSnapshot() {
  return bodyStatus;
}
function getBodyRowSnapshot() {
  return bodyRow;
}

async function loadChapterBody(chapterId: string): Promise<void> {
  bodyForChapterId = chapterId;
  bodyStatus = "loading";
  emit();
  try {
    const res = await apiFetch<ChapterDetailResponse>(`/manuscript/chapters/${chapterId}`);
    bodyRow = res.chapter;
    bodyStatus = "loaded";
  } catch {
    bodyRow = null;
    bodyStatus = "error";
  }
  emit();
}

/** Live full content (paragraphs) for whichever chapter is currently open — fetched lazily, one at a time. */
export function useChapterBody(chapterId: string | undefined): {
  status: LoadStatus;
  row: ManuscriptChapterFullRow | null;
} {
  useEffect(() => {
    if (chapterId && chapterId !== bodyForChapterId) void loadChapterBody(chapterId);
  }, [chapterId]);
  const rowStatus = useSyncExternalStore(subscribe, getBodyStatusSnapshot, getBodyStatusSnapshot);
  const row = useSyncExternalStore(subscribe, getBodyRowSnapshot, getBodyRowSnapshot);
  return { status: rowStatus, row: row && row.id === chapterId ? row : null };
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
let saveStatus: SaveStatus = "idle";
function getSaveStatusSnapshot() {
  return saveStatus;
}
export function useChapterSaveStatus(): SaveStatus {
  return useSyncExternalStore(subscribe, getSaveStatusSnapshot, getSaveStatusSnapshot);
}

/**
 * The editor's autosave call — cheap on the backend (only ever writes this
 * one row, never touches manuscript_chunks/embeddings; see
 * `PATCH /manuscript/chapters/:id` in the backend's own routes). Callers
 * are expected to debounce; this function itself fires immediately.
 */
export async function saveChapterBody(chapterId: string, paragraphs: ChapterParagraph[]): Promise<void> {
  saveStatus = "saving";
  emit();
  try {
    const res = await apiFetch<ChapterResponse>(`/manuscript/chapters/${chapterId}`, {
      method: "PATCH",
      body: JSON.stringify({ paragraphs }),
    });
    if (bodyForChapterId === chapterId) bodyRow = res.chapter;
    const entry = listCache.get(res.chapter.book_id);
    if (entry) entry.rows = entry.rows.map((c) => (c.id === chapterId ? res.chapter : c));
    // A save changes this chapter's word count — drop any cached total for
    // its book so the next useManuscriptWordCount() call re-fetches it
    // instead of silently going stale.
    wordCountCache.delete(res.chapter.book_id);
    saveStatus = "saved";
  } catch {
    saveStatus = "error";
  }
  emit();
}

/**
 * Rename a chapter's title (the human label, e.g. "A Man" — distinct from
 * its fixed `number` and its `heading`, e.g. "CHAPTER 18"). A plain string
 * PATCH, not part of autosave — deliberately doesn't touch
 * `content_updated_at` (only a `paragraphs` PATCH does, per the backend's
 * own guard), so renaming a chapter never falsely flags it as needing a
 * memory resync. An empty string is valid — `mapRowToChapter()` already
 * falls back to "Chapter N" display when the stored title is blank, so
 * clearing it just resets to that default rather than needing special
 * handling here.
 */
export async function updateChapterTitle(chapterId: string, title: string): Promise<void> {
  const res = await apiFetch<ChapterResponse>(`/manuscript/chapters/${chapterId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  if (bodyForChapterId === chapterId) bodyRow = res.chapter;
  const entry = listCache.get(res.chapter.book_id);
  if (entry) entry.rows = entry.rows.map((c) => (c.id === chapterId ? res.chapter : c));
  emit();
}

// ---------------------------------------------------------------------
// Renumbering — closes gaps in a book's chapter numbering (e.g. chapters
// created directly against the backend, outside this app's own
// auto-increment "Add Chapter" flow, can leave gaps like 412, 416, 417…).
// ---------------------------------------------------------------------

export type RenumberMove = { chapterId: string; from: number; to: number; title: string; synced: boolean };

function computeRenumberMoves(rows: ManuscriptChapterRow[]): RenumberMove[] {
  const sorted = [...rows].sort((a, b) => a.number - b.number);
  const moves: RenumberMove[] = [];
  let expected = sorted[0]?.number ?? 1;
  for (const row of sorted) {
    if (row.number !== expected) {
      moves.push({
        chapterId: row.id,
        from: row.number,
        to: expected,
        title: row.title?.trim() || `Chapter ${row.number}`,
        synced: !!row.synced_to_memory_at,
      });
    }
    expected += 1;
  }
  return moves;
}

/**
 * Pure preview of what `renumberChaptersToCloseGaps()` would do — no
 * network calls. Assumes the chapter list is already loaded (every real
 * caller renders from `useManuscript()`, which guarantees this). Exposed
 * so the UI can decide whether to show a "chapters need renumbering"
 * banner and render the exact plan in a confirm dialog before executing
 * the same moves for real.
 */
export function planChapterRenumber(bookId: string): RenumberMove[] {
  return computeRenumberMoves(getListEntry(bookId).rows);
}

export type RenumberResult =
  | { kind: "no-gaps" }
  | { kind: "blocked"; blocking: RenumberMove[] }
  | { kind: "done"; moved: RenumberMove[] };

/**
 * Shifts every chapter after a gap down to close it, so numbering reads
 * sequentially again (e.g. 409,410,411,412,416,417… -> 409,410,411,412,
 * 413,414,415,416…). Each move is a plain `PATCH .../number` (an already-
 * supported field) processed in ascending order of its *old* number —
 * every target number is either a genuine gap or was just vacated by the
 * immediately preceding move in this same pass, so this can never collide
 * with the book's UNIQUE(book_id, number) constraint.
 *
 * Refuses to move any chapter that's ever been synced to AI memory
 * (`syncedToMemoryAt` set): its `manuscript_chunks` rows are keyed by the
 * chapter's *current* number, and this app has no coordinated way to
 * update those chunks' `chapter_number` alongside a renumber (no backend
 * endpoint for it, no direct database access) — silently moving a synced
 * chapter would leave its embedded memory permanently pointing at the
 * wrong chapter. If any move in the plan involves a synced chapter, the
 * whole renumber is refused (not just that one move) so the result is
 * always "fully sequential" or "untouched," never a partial state that
 * could reintroduce different gaps.
 */
export async function renumberChaptersToCloseGaps(bookId: string): Promise<RenumberResult> {
  const moves = planChapterRenumber(bookId);
  if (moves.length === 0) return { kind: "no-gaps" };

  const blocking = moves.filter((m) => m.synced);
  if (blocking.length > 0) return { kind: "blocked", blocking };

  const moved: RenumberMove[] = [];
  try {
    for (const move of moves) {
      const res = await apiFetch<ChapterResponse>(`/manuscript/chapters/${move.chapterId}`, {
        method: "PATCH",
        body: JSON.stringify({ number: move.to }),
      });
      const entry = getListEntry(bookId);
      entry.rows = entry.rows.map((c) => (c.id === move.chapterId ? res.chapter : c));
      if (bodyForChapterId === move.chapterId) bodyRow = res.chapter;
      emit();
      moved.push(move);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (moved.length > 0) {
      const done = moved.map((m) => `${m.from}→${m.to}`).join(", ");
      throw new Error(`Renumbered ${moved.length} of ${moves.length} chapters (${done}) before failing: ${message}`);
    }
    throw new Error(message);
  }
  return { kind: "done", moved };
}

// ---------------------------------------------------------------------
// Word counts (per book, lazy — fetches every chapter's body once, in
// parallel, then sums). Deliberately separate from the chapter-body
// singleton above so viewing a project's stats never disturbs whatever
// chapter is actually open in the editor.
// ---------------------------------------------------------------------

/** One chapter's full text, kept alongside its word count so the same all-bodies fetch can also back full-manuscript search — see useManuscriptSearchIndex(). */
export type IndexedChapterBody = { id: string; number: number; title: string; paragraphs: ChapterParagraph[] };

type WordCountEntry = {
  perChapter: Record<string, number>;
  total: number;
  status: LoadStatus;
  bodies: IndexedChapterBody[];
};
const wordCountCache = new Map<string, WordCountEntry>();

function getWordCountEntry(bookId: string): WordCountEntry {
  let entry = wordCountCache.get(bookId);
  if (!entry) {
    entry = { perChapter: {}, total: 0, status: "idle", bodies: [] };
    wordCountCache.set(bookId, entry);
  }
  return entry;
}

/**
 * Always replaces the cached entry with a new object rather than mutating
 * the existing one in place. useManuscriptWordCount() returns this whole
 * object as its useSyncExternalStore snapshot, and that hook decides
 * whether to re-render by comparing the previous and next snapshot with
 * `Object.is` — mutating fields on the same persisted object leaves the
 * reference unchanged, so React never notices the update even though
 * emit() fires. (getListEntry()'s `.rows` doesn't have this problem
 * because loadChapters() already reassigns it to a new array each time.)
 */
function setWordCountEntry(bookId: string, entry: WordCountEntry): void {
  wordCountCache.set(bookId, entry);
}

async function loadWordCount(bookId: string): Promise<void> {
  setWordCountEntry(bookId, { ...getWordCountEntry(bookId), status: "loading" });
  emit();
  try {
    await ensureChaptersLoaded(bookId);
    const listEntry = getListEntry(bookId);
    const bodies = await Promise.all(
      listEntry.rows.map((row) => apiFetch<ChapterDetailResponse>(`/manuscript/chapters/${row.id}`)),
    );
    const perChapter: Record<string, number> = {};
    const indexedBodies: IndexedChapterBody[] = [];
    let total = 0;
    for (const body of bodies) {
      const words = body.chapter.paragraphs.reduce((sum, p) => sum + countWords(p.text), 0);
      perChapter[body.chapter.id] = words;
      total += words;
      indexedBodies.push({
        id: body.chapter.id,
        number: body.chapter.number,
        title: body.chapter.title?.trim() || `Chapter ${body.chapter.number}`,
        paragraphs: body.chapter.paragraphs,
      });
    }
    setWordCountEntry(bookId, { perChapter, total, status: "loaded", bodies: indexedBodies });
  } catch {
    setWordCountEntry(bookId, { ...getWordCountEntry(bookId), status: "error" });
  }
  emit();
}

const EMPTY_WORD_COUNT: WordCountEntry = { perChapter: {}, total: 0, status: "idle", bodies: [] };

/** Live total word count for one book, computed from every chapter's real body text — fetched lazily, once per book. */
export function useManuscriptWordCount(bookId: string | undefined): WordCountEntry {
  useEffect(() => {
    if (bookId && getWordCountEntry(bookId).status === "idle") void loadWordCount(bookId);
  }, [bookId]);
  return useSyncExternalStore(
    subscribe,
    () => (bookId ? getWordCountEntry(bookId) : EMPTY_WORD_COUNT),
    () => (bookId ? getWordCountEntry(bookId) : EMPTY_WORD_COUNT),
  );
}

/** Live combined word count across several books at once — a real cross-project total (e.g. the /projects sidebar's "Word Count" card), not a per-project stat. */
export function useTotalWordCount(bookIds: string[]): { total: number; status: LoadStatus } {
  const key = bookIds.join(",");
  useEffect(() => {
    for (const id of bookIds) {
      if (getWordCountEntry(id).status === "idle") void loadWordCount(id);
    }
    // key is the intentional dep — bookIds itself is a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const storeVersion = useSyncExternalStore(subscribe, getVersion, getVersion);

  return useMemo(() => {
    let total = 0;
    let anyLoading = false;
    let anyLoaded = false;
    for (const id of bookIds) {
      const entry = getWordCountEntry(id);
      total += entry.total;
      if (entry.status === "loading") anyLoading = true;
      if (entry.status === "loaded") anyLoaded = true;
    }
    const status: LoadStatus = anyLoading ? "loading" : anyLoaded ? "loaded" : "idle";
    return { total, status };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storeVersion]);
}

// ---------------------------------------------------------------------
// Full-manuscript search — reuses the same all-chapter-bodies fetch
// useManuscriptWordCount() already does (real cost, already accepted at
// this app's target scale — see CLAUDE.md §5.6), rather than issuing a
// second round of per-chapter requests just to search. `enabled` gates
// the fetch on this being the search panel actually being open (or the
// word count cache already being warm from elsewhere, e.g. /projects or
// the Overview tab), so opening the editor alone never triggers it.
// ---------------------------------------------------------------------

const EMPTY_SEARCH_ROWS: IndexedChapterBody[] = [];

export function useManuscriptSearchIndex(
  bookId: string | undefined,
  enabled: boolean,
): { rows: IndexedChapterBody[]; status: LoadStatus } {
  useEffect(() => {
    if (bookId && enabled && getWordCountEntry(bookId).status === "idle") void loadWordCount(bookId);
  }, [bookId, enabled]);
  const entry = useSyncExternalStore(
    subscribe,
    () => (bookId ? getWordCountEntry(bookId) : EMPTY_WORD_COUNT),
    () => (bookId ? getWordCountEntry(bookId) : EMPTY_WORD_COUNT),
  );
  return useMemo(
    () => ({
      rows: entry.bodies.length ? [...entry.bodies].sort((a, b) => a.number - b.number) : EMPTY_SEARCH_ROWS,
      status: entry.status,
    }),
    [entry],
  );
}
