"use client";

/**
 * Real backend-backed Outliner store — wraps `/api/v1/outline/beats` (the
 * whole-book Acts/Chapters/Beats board) and the per-chapter beat CRUD
 * endpoints (`/api/v1/manuscript/chapters/:chapterId/beats`,
 * `/api/v1/manuscript/beats/:id`), documented in the backend's
 * `src/routes/outline.ts` and `src/routes/manuscriptChapters.ts`
 * (`claude/ai-fiction-platform-backend-qnvkm5`).
 *
 * The backend has no "Act" concept at all — only Parts (optional,
 * `manuscript_parts`) -> Chapters (`manuscript_chapters`) -> Beats
 * (`chapter_beats`). The old mock's Act I/II/III columns have no real
 * analogue on the backend, so the board groups by real chapter instead
 * (see outlines/page.tsx) — the one structural concept that's actually
 * real and persisted.
 *
 * Two independent pieces of state, same split as manuscript-store.ts:
 * 1. The whole-book outline (parts + chapter metadata + every beat),
 *    keyed by bookId — for the Outliner board.
 * 2. A single chapter's beats, keyed by chapterId — for the editor's own
 *    "Outline" side-panel tab, so opening the editor doesn't have to fetch
 *    the whole book's beats just to show one chapter's.
 * A beat mutation (create/update/delete) patches whichever of these two
 * caches actually hold that beat/chapter, so the board and the editor tab
 * never drift out of sync with each other.
 */

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api-client";

export type BeatStatus = "not_started" | "planned" | "in_progress" | "completed";
export const VALID_BEAT_STATUSES: BeatStatus[] = ["not_started", "planned", "in_progress", "completed"];

export type OutlineBeat = {
  id: string;
  chapterId: string;
  orderIndex: number;
  title: string;
  outlineText: string;
  status: BeatStatus;
  linkedToManuscript: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OutlineChapter = {
  id: string;
  partId: string | null;
  number: number;
  title: string;
  heading: string | null;
  complete: boolean;
};

export type OutlinePart = {
  id: string;
  title: string;
  orderIndex: number;
};

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

/** `chapter_beats` row exactly as the backend returns it — raw snake_case columns. */
type BeatRow = {
  id: string;
  chapter_id: string;
  order_index: number;
  title: string;
  outline_text: string;
  status: BeatStatus;
  linked_to_manuscript: boolean;
  created_at: string;
  updated_at: string;
};
/** GET /outline/beats's own chapter projection — id/part_id/number/title/heading/complete only, no paragraphs. */
type ChapterMetaRow = {
  id: string;
  part_id: string | null;
  number: number;
  title: string | null;
  heading: string | null;
  complete: boolean;
};
type PartRow = { id: string; book_id: string; title: string; order_index: number; created_at: string };

type OutlineBeatsResponse = { parts: PartRow[]; chapters: ChapterMetaRow[]; beats: BeatRow[] };
type ChapterBeatsResponse = { beats: BeatRow[] };
type BeatResponse = { beat: BeatRow };

function mapBeat(row: BeatRow): OutlineBeat {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    orderIndex: row.order_index,
    title: row.title,
    outlineText: row.outline_text,
    status: row.status,
    linkedToManuscript: row.linked_to_manuscript,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapChapter(row: ChapterMetaRow): OutlineChapter {
  return {
    id: row.id,
    partId: row.part_id,
    number: row.number,
    title: row.title?.trim() || `Chapter ${row.number}`,
    heading: row.heading,
    complete: row.complete,
  };
}
function mapPart(row: PartRow): OutlinePart {
  return { id: row.id, title: row.title, orderIndex: row.order_index };
}

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// ---------------------------------------------------------------------
// Whole-book outline — keyed by bookId
// ---------------------------------------------------------------------

type BookEntry = {
  parts: OutlinePart[];
  chapters: OutlineChapter[];
  beats: OutlineBeat[];
  status: LoadStatus;
  error: string | null;
};
const bookCache = new Map<string, BookEntry>();

function getBookEntry(bookId: string): BookEntry {
  let entry = bookCache.get(bookId);
  if (!entry) {
    entry = { parts: [], chapters: [], beats: [], status: "idle", error: null };
    bookCache.set(bookId, entry);
  }
  return entry;
}

async function loadOutline(bookId: string): Promise<void> {
  bookCache.set(bookId, { ...getBookEntry(bookId), status: "loading", error: null });
  emit();
  try {
    const res = await apiFetch<OutlineBeatsResponse>(`/outline/beats?bookId=${encodeURIComponent(bookId)}`);
    bookCache.set(bookId, {
      parts: res.parts.map(mapPart),
      chapters: res.chapters.map(mapChapter),
      beats: res.beats.map(mapBeat),
      status: "loaded",
      error: null,
    });
  } catch (err) {
    bookCache.set(bookId, {
      ...getBookEntry(bookId),
      status: "error",
      error: err instanceof Error ? err.message : "Failed to load the outline.",
    });
  }
  emit();
}

export function refreshOutline(bookId: string): void {
  void loadOutline(bookId);
}

const EMPTY_BOOK_ENTRY: BookEntry = { parts: [], chapters: [], beats: [], status: "idle", error: null };

/** Live whole-book outline (parts/chapters/beats) — fetches on first use or when bookId changes. */
export function useOutline(bookId: string | undefined): BookEntry {
  useEffect(() => {
    if (bookId && getBookEntry(bookId).status === "idle") void loadOutline(bookId);
  }, [bookId]);
  return useSyncExternalStore(
    subscribe,
    () => (bookId ? getBookEntry(bookId) : EMPTY_BOOK_ENTRY),
    () => (bookId ? getBookEntry(bookId) : EMPTY_BOOK_ENTRY),
  );
}

// ---------------------------------------------------------------------
// Single chapter's beats — keyed by chapterId (editor's Outline tab)
// ---------------------------------------------------------------------

type ChapterEntry = { beats: OutlineBeat[]; status: LoadStatus; error: string | null };
const chapterCache = new Map<string, ChapterEntry>();

function getChapterEntry(chapterId: string): ChapterEntry {
  let entry = chapterCache.get(chapterId);
  if (!entry) {
    entry = { beats: [], status: "idle", error: null };
    chapterCache.set(chapterId, entry);
  }
  return entry;
}

async function loadChapterBeats(chapterId: string): Promise<void> {
  chapterCache.set(chapterId, { ...getChapterEntry(chapterId), status: "loading", error: null });
  emit();
  try {
    const res = await apiFetch<ChapterBeatsResponse>(`/manuscript/chapters/${chapterId}/beats`);
    chapterCache.set(chapterId, { beats: res.beats.map(mapBeat), status: "loaded", error: null });
  } catch (err) {
    chapterCache.set(chapterId, {
      ...getChapterEntry(chapterId),
      status: "error",
      error: err instanceof Error ? err.message : "Failed to load this chapter's beats.",
    });
  }
  emit();
}

const EMPTY_CHAPTER_ENTRY: ChapterEntry = { beats: [], status: "idle", error: null };

/** Live beats for one chapter — fetches lazily, on first use or when chapterId changes. Used by the editor's Outline tab. */
export function useChapterBeats(chapterId: string | undefined): ChapterEntry {
  useEffect(() => {
    if (chapterId && getChapterEntry(chapterId).status === "idle") void loadChapterBeats(chapterId);
  }, [chapterId]);
  return useSyncExternalStore(
    subscribe,
    () => (chapterId ? getChapterEntry(chapterId) : EMPTY_CHAPTER_ENTRY),
    () => (chapterId ? getChapterEntry(chapterId) : EMPTY_CHAPTER_ENTRY),
  );
}

// ---------------------------------------------------------------------
// Mutations — patch whichever cache(s) actually hold the affected beat
// ---------------------------------------------------------------------

function upsertBeatInCaches(beat: OutlineBeat): void {
  const chEntry = chapterCache.get(beat.chapterId);
  if (chEntry) {
    const exists = chEntry.beats.some((b) => b.id === beat.id);
    chapterCache.set(beat.chapterId, {
      ...chEntry,
      beats: exists ? chEntry.beats.map((b) => (b.id === beat.id ? beat : b)) : [...chEntry.beats, beat],
    });
  }
  for (const [bookId, entry] of bookCache) {
    const exists = entry.beats.some((b) => b.id === beat.id);
    const chapterInBook = entry.chapters.some((c) => c.id === beat.chapterId);
    if (!exists && !chapterInBook) continue;
    bookCache.set(bookId, {
      ...entry,
      beats: exists ? entry.beats.map((b) => (b.id === beat.id ? beat : b)) : [...entry.beats, beat],
    });
  }
}

function removeBeatFromCaches(beatId: string): void {
  for (const [chapterId, entry] of chapterCache) {
    if (entry.beats.some((b) => b.id === beatId)) {
      chapterCache.set(chapterId, { ...entry, beats: entry.beats.filter((b) => b.id !== beatId) });
    }
  }
  for (const [bookId, entry] of bookCache) {
    if (entry.beats.some((b) => b.id === beatId)) {
      bookCache.set(bookId, { ...entry, beats: entry.beats.filter((b) => b.id !== beatId) });
    }
  }
}

export type NewBeatInput = { title: string; outlineText?: string; orderIndex?: number; status?: BeatStatus };

/** Create a real beat under a chapter. Appends to the end of that chapter's known beats unless orderIndex is given. */
export async function createBeat(chapterId: string, input: NewBeatInput): Promise<OutlineBeat> {
  const existing = getChapterEntry(chapterId).beats;
  const orderIndex = input.orderIndex ?? existing.length;
  const res = await apiFetch<BeatResponse>(`/manuscript/chapters/${chapterId}/beats`, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      outlineText: input.outlineText ?? "",
      orderIndex,
      status: input.status ?? "not_started",
    }),
  });
  const beat = mapBeat(res.beat);
  upsertBeatInCaches(beat);
  emit();
  return beat;
}

export type BeatPatch = {
  title?: string;
  outlineText?: string;
  orderIndex?: number;
  status?: BeatStatus;
  linkedToManuscript?: boolean;
};

/** PATCH a beat's fields. Only the provided keys are sent — an omitted field is left unchanged server-side. */
export async function updateBeat(beatId: string, patch: BeatPatch): Promise<OutlineBeat> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.outlineText !== undefined) body.outlineText = patch.outlineText;
  if (patch.orderIndex !== undefined) body.orderIndex = patch.orderIndex;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.linkedToManuscript !== undefined) body.linkedToManuscript = patch.linkedToManuscript;

  const res = await apiFetch<BeatResponse>(`/manuscript/beats/${beatId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const beat = mapBeat(res.beat);
  upsertBeatInCaches(beat);
  emit();
  return beat;
}

export async function deleteBeat(beatId: string): Promise<void> {
  await apiFetch<void>(`/manuscript/beats/${beatId}`, { method: "DELETE" });
  removeBeatFromCaches(beatId);
  emit();
}
