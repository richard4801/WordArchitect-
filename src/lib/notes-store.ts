"use client";

/**
 * Real backend-backed Notes store — wraps the WordArchitect backend's
 * `notes` CRUD (`/api/v1/notes`, see the backend repo's `017_notes.sql`
 * migration and `src/routes/notes.ts`). Same shape as `character-store.ts`:
 * data is scoped by `bookId`, so `useNotes()` takes it as an argument.
 *
 * `Note.mine` has no backend column by design (the migration's own comment
 * explains why: it's relative to whoever's viewing, not an inherent
 * property of the note) — computed here as `note.user_id === getUserId()`.
 * `Note.date`/`dateRank` are likewise display-only, derived client-side
 * from `updated_at`, same pattern as Project's `updated`/`updatedRank`.
 */

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch, getUserId } from "@/lib/api-client";
import { logActivity } from "@/lib/activity-log-store";
import type { Note, NoteCategory } from "@/lib/notes-data";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

/** `notes` row exactly as the backend returns it — raw snake_case columns. */
type NoteRow = {
  id: string;
  user_id: string;
  book_id: string;
  title: string;
  excerpt: string;
  category: NoteCategory;
  pinned: boolean;
  comments: number;
  created_at: string;
  updated_at: string;
};

type NotesListResponse = { notes: NoteRow[] };
type NoteResponse = { note: NoteRow };

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function mapRowToNote(row: NoteRow, dateRank: number): Note {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    date: formatRelative(row.updated_at),
    dateRank,
    comments: row.comments,
    pinned: row.pinned,
    mine: row.user_id === getUserId(),
  };
}

let noteRows: NoteRow[] = [];
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
function getNoteRowsSnapshot() {
  return noteRows;
}
function getStatusSnapshot() {
  return status;
}
function getErrorSnapshot() {
  return error;
}

async function loadNotes(bookId: string): Promise<void> {
  currentBookId = bookId;
  status = "loading";
  error = null;
  emit();
  try {
    const res = await apiFetch<NotesListResponse>(`/notes?bookId=${encodeURIComponent(bookId)}`);
    noteRows = res.notes;
    status = "loaded";
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : "Failed to load notes.";
  }
  emit();
}

/** Live note list for one project — fetches on first use or when `bookId` changes. Already sorted pinned-first, most-recently-updated (server order); `dateRank` is assigned by that same order. */
export function useNotes(bookId: string | undefined): Note[] {
  useEffect(() => {
    if (bookId && bookId !== currentBookId) void loadNotes(bookId);
  }, [bookId]);
  const rows = useSyncExternalStore(subscribe, getNoteRowsSnapshot, getNoteRowsSnapshot);
  return rows.map((row, i) => mapRowToNote(row, i));
}

export function useNotesLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribe, getStatusSnapshot, getStatusSnapshot);
}
export function useNotesError(): string | null {
  return useSyncExternalStore(subscribe, getErrorSnapshot, getErrorSnapshot);
}

export async function togglePinned(id: string): Promise<void> {
  const current = noteRows.find((n) => n.id === id);
  if (!current) return;
  const res = await apiFetch<NoteResponse>(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ pinned: !current.pinned }),
  });
  noteRows = noteRows.map((n) => (n.id === id ? res.note : n));
  emit();
}

export type NewNoteInput = {
  title: string;
  excerpt: string;
  category: NoteCategory;
};

/** Create a real note and return its id. */
export async function createNote(bookId: string, input: NewNoteInput): Promise<string> {
  const res = await apiFetch<NoteResponse>("/notes", {
    method: "POST",
    body: JSON.stringify({
      userId: getUserId(),
      bookId,
      title: input.title.trim() || "Untitled Note",
      excerpt: input.excerpt.trim() || " ",
      category: input.category,
    }),
  });
  noteRows = [res.note, ...noteRows];
  status = "loaded";
  emit();
  logActivity("note", `Added note "${res.note.title}"`);
  return res.note.id;
}

/** Edit a real note's title/excerpt/category. */
export async function updateNote(id: string, input: NewNoteInput): Promise<void> {
  const res = await apiFetch<NoteResponse>(`/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title.trim() || "Untitled Note",
      excerpt: input.excerpt.trim() || " ",
      category: input.category,
    }),
  });
  noteRows = noteRows.map((n) => (n.id === id ? res.note : n));
  emit();
}

/** Delete a note for real. Optimistically removes it from the local cache on success. */
export async function deleteNote(id: string): Promise<void> {
  await apiFetch<void>(`/notes/${id}`, { method: "DELETE" });
  noteRows = noteRows.filter((n) => n.id !== id);
  emit();
}
