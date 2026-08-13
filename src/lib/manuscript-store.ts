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
 * Two independent pieces of state, on purpose:
 * 1. The chapter LIST (metadata only — id/number/title/complete) for the
 *    left-rail navigation, loaded once per book.
 * 2. The chapter BODY (paragraphs) for whichever single chapter is
 *    actually open in the editor, loaded lazily per chapter — fetching
 *    every chapter's full paragraph content just to render a nav list
 *    would be wasteful for a long manuscript.
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
  };
}

// ---------------------------------------------------------------------
// Chapter list (metadata)
// ---------------------------------------------------------------------

let chapterRows: ManuscriptChapterRow[] = [];
let currentBookId: string | null = null;
let status: LoadStatus = "idle";
let error: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getChapterRowsSnapshot() {
  return chapterRows;
}
function getStatusSnapshot() {
  return status;
}
function getErrorSnapshot() {
  return error;
}

async function loadChapters(bookId: string): Promise<void> {
  currentBookId = bookId;
  status = "loading";
  error = null;
  emit();
  try {
    const res = await apiFetch<ChaptersListResponse>(
      `/manuscript/chapters?bookId=${encodeURIComponent(bookId)}`,
    );
    chapterRows = res.chapters;
    status = "loaded";
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : "Failed to load chapters.";
  }
  emit();
}

export function refreshManuscript(bookId: string): void {
  void loadChapters(bookId);
}

/** Live chapter structure for one book, wrapped in a single synthetic part — fetches on first use or when `bookId` changes. */
export function useManuscript(bookId: string | undefined): ManuscriptPart[] {
  useEffect(() => {
    if (bookId && bookId !== currentBookId) void loadChapters(bookId);
  }, [bookId]);
  const rows = useSyncExternalStore(subscribe, getChapterRowsSnapshot, getChapterRowsSnapshot);
  return useMemo(() => {
    if (rows.length === 0) return [];
    const sorted = [...rows].sort((a, b) => a.number - b.number);
    return [{ id: SYNTHETIC_PART_ID, title: "Manuscript", chapters: sorted.map(mapRowToChapter) }];
  }, [rows]);
}

export function useManuscriptLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribe, getStatusSnapshot, getStatusSnapshot);
}
export function useManuscriptError(): string | null {
  return useSyncExternalStore(subscribe, getErrorSnapshot, getErrorSnapshot);
}

/**
 * Create a real chapter and return it. Auto-numbers to one past the
 * current highest chapter (the backend rejects a duplicate `number` per
 * book with 409), and seeds a single empty paragraph so the editor always
 * has something to place the caret in rather than an empty contentEditable
 * with no child nodes.
 */
export async function createChapter(bookId: string, input: { title?: string } = {}): Promise<ManuscriptChapter> {
  const nextNumber = chapterRows.length > 0 ? Math.max(...chapterRows.map((c) => c.number)) + 1 : 1;
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
  chapterRows = [...chapterRows, res.chapter];
  status = "loaded";
  emit();
  return mapRowToChapter(res.chapter);
}

// ---------------------------------------------------------------------
// Chapter body (lazy, one chapter at a time)
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
    chapterRows = chapterRows.map((c) => (c.id === chapterId ? res.chapter : c));
    saveStatus = "saved";
  } catch {
    saveStatus = "error";
  }
  emit();
}
