"use client";

/**
 * Real backend-backed Project store — wraps the WordArchitect backend's
 * Books CRUD (`/api/v1/books`, see the backend repo's CLAUDE.md
 * "Frontend Integration Reference" + "Projects/Books CRUD" sections).
 * `books.id` *is* the `bookId` every other domain (Character, Notes,
 * Worldbuilding, Manuscript) is scoped by, so this is deliberately the
 * first domain wired up — everything else depends on a real project
 * existing first.
 *
 * Same reactive-store shape as before (`useSyncExternalStore`, module-level
 * cache + listeners), but the cache is now populated by a real fetch
 * instead of static seed data, and `create*`/`update*` are real network
 * calls — so their signatures are now async. Two new hooks
 * (`useProjectsLoadStatus`, `useProjectsError`) carry the loading/error
 * state every UI consuming `useProjects()` should account for; existing
 * `useProjects()`/`useProject()` call sites keep working unchanged for the
 * common case (data arrives, no error), which is why so few pages needed
 * touching here.
 */

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch, getUserId } from "@/lib/api-client";
import { logActivity } from "@/lib/activity-log-store";
import type { Project, ProjectStatus } from "@/lib/projects-data";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

let projects: Project[] = [];
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

function getProjectsSnapshot() {
  return projects;
}
function getStatusSnapshot() {
  return status;
}
function getErrorSnapshot() {
  return error;
}

// ---------------------------------------------------------------------
// Backend <-> frontend mapping
// ---------------------------------------------------------------------

/**
 * Shape of a `books` row exactly as Supabase/Postgres returns it — raw
 * snake_case DB columns, NOT camelCase (`select("*")` in books.ts returns
 * the row as-is; only request *bodies* use camelCase, mapped to snake_case
 * server-side in `buildBookPayload`). See migration `013_books.sql`.
 */
type BookRow = {
  id: string;
  user_id: string;
  title: string;
  tagline?: string | null;
  genre?: string | null;
  subgenres?: string[] | null;
  pov?: string | null;
  tense?: string | null;
  target_words?: number | null;
  status?: string | null;
  cover_url?: string | null;
  created_at: string;
  updated_at: string;
};

/** `GET /books?userId=` response envelope. */
type BooksListResponse = { books: BookRow[] };
/** `GET/POST/PATCH /books[/:id]` single-row response envelope. */
type BookResponse = { book: BookRow };

const VALID_STATUSES: ProjectStatus[] = ["active", "completed", "archived"];

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
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(days / 365);
  return `${years}y ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Maps a backend `books` row onto the frontend's `Project` shape. Fields
 * with no backend equivalent yet (real word count, session/streak
 * tracking, chapter detail) read honestly as `0`/absent rather than
 * fabricated — the same principle applied across the Dashboard's mock
 * widgets. `chapters` stays `0` here — the list endpoint doesn't include
 * the best-effort manuscript stats (`GET /books/:id` does, via a separate
 * `get_book_facts` lookup) — real chapter counts arrive once the
 * Manuscript domain is wired.
 */
function mapBookToProject(book: BookRow, updatedRank: number): Project {
  const projStatus = VALID_STATUSES.includes(book.status as ProjectStatus)
    ? (book.status as ProjectStatus)
    : "active";
  return {
    id: book.id,
    title: book.title,
    genre: [book.genre, ...(book.subgenres ?? [])].filter(Boolean).join(" · ") || "Fiction",
    logline: book.tagline?.trim() || "A new story, waiting to be written.",
    words: 0,
    target: book.target_words && book.target_words > 0 ? Math.round(book.target_words) : 50000,
    chapters: 0,
    sessions: 0,
    daysActive: 0,
    updated: formatRelative(book.updated_at),
    updatedRank,
    status: projStatus,
    created: formatDate(book.created_at),
    pov: book.pov ?? undefined,
    tense: book.tense ?? undefined,
    language: "English",
  };
}

function sortAndRank(books: BookRow[]): Project[] {
  const sorted = [...books].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
  return sorted.map((book, i) => mapBookToProject(book, i + 1));
}

// ---------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------

let hasStartedLoad = false;

async function loadProjects(): Promise<void> {
  status = "loading";
  error = null;
  emit();
  try {
    const res = await apiFetch<BooksListResponse>(`/books?userId=${encodeURIComponent(getUserId())}`);
    projects = sortAndRank(res.books);
    status = "loaded";
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : "Failed to load projects.";
  }
  emit();
}

/** Re-fetch from the backend — e.g. a manual "Retry" action after an error. */
export function refreshProjects(): void {
  void loadProjects();
}

/** Live project list — fetches from the backend on first use, then reactive. */
export function useProjects(): Project[] {
  useEffect(() => {
    if (!hasStartedLoad) {
      hasStartedLoad = true;
      void loadProjects();
    }
  }, []);
  return useSyncExternalStore(subscribe, getProjectsSnapshot, getProjectsSnapshot);
}

/** `"idle" | "loading" | "loaded" | "error"` — pair with `useProjects()` to render loading/error UI. */
export function useProjectsLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribe, getStatusSnapshot, getStatusSnapshot);
}

/** Error message from the last failed load/mutation, if any. */
export function useProjectsError(): string | null {
  return useSyncExternalStore(subscribe, getErrorSnapshot, getErrorSnapshot);
}

/** Live lookup of a single project by id, from the already-loaded list. */
export function useProject(id: string | undefined): Project | undefined {
  const list = useProjects();
  return list.find((p) => p.id === id);
}

// ---------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------

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

/**
 * Create a real project on the backend and return its id. Async now (a
 * real network call) — callers need `await`/loading state, unlike the old
 * synchronous in-memory version. Throws `ApiError` on failure; callers
 * should catch it and show the message rather than navigating away.
 */
export async function createProject(input: NewProjectInput): Promise<string> {
  const res = await apiFetch<BookResponse>("/books", {
    method: "POST",
    body: JSON.stringify({
      userId: getUserId(),
      title: input.title.trim(),
      tagline: input.tagline?.trim() || undefined,
      genre: input.genre || undefined,
      subgenres: input.subgenres,
      pov: input.pov || undefined,
      tense: input.tense || undefined,
      targetWords: input.targetWords && input.targetWords > 0 ? Math.round(input.targetWords) : undefined,
      status: "active",
    }),
  });
  // Optimistically fold the new book into the cache rather than
  // re-fetching the whole list — bump every existing project's rank so
  // the new one sorts first under "Recently Updated", same as before.
  const newProject = mapBookToProject(res.book, 0);
  projects = [newProject, ...projects.map((p) => ({ ...p, updatedRank: p.updatedRank + 1 }))];
  status = "loaded";
  emit();
  logActivity("project", `Created project "${newProject.title}"`);
  return res.book.id;
}

/**
 * Raise (or otherwise change) a project's target word count. Real PATCH
 * to the backend now; optimistically updates the local cache so the UI
 * reflects it immediately rather than waiting on a re-fetch.
 */
export async function updateProjectTarget(id: string, target: number): Promise<void> {
  if (!(target > 0)) return;
  const rounded = Math.round(target);
  await apiFetch<BookResponse>(`/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ targetWords: rounded }),
  });
  projects = projects.map((p) => (p.id === id ? { ...p, target: rounded } : p));
  emit();
}

export type UpdateProjectInput = {
  title?: string;
  tagline?: string;
  genre?: string;
  subgenres?: string[];
  pov?: string;
  tense?: string;
  targetWords?: number;
};

/**
 * Edit a project's own fields — title/tagline/genre/subgenres/pov/tense/
 * targetWords are all real PATCH-able columns on `books` (see
 * `buildBookPayload` in the backend's `books.ts`). Keeps the project's
 * existing `updatedRank` rather than re-sorting the list to the top, so an
 * edit doesn't jump the project around in "Recently Updated" order the way
 * a genuine content change (a new chapter, etc.) would.
 */
export async function updateProject(id: string, input: UpdateProjectInput): Promise<void> {
  const res = await apiFetch<BookResponse>(`/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title?.trim() || undefined,
      tagline: input.tagline?.trim() ?? undefined,
      genre: input.genre || undefined,
      subgenres: input.subgenres,
      pov: input.pov || undefined,
      tense: input.tense || undefined,
      targetWords: input.targetWords && input.targetWords > 0 ? Math.round(input.targetWords) : undefined,
    }),
  });
  const existingRank = projects.find((p) => p.id === id)?.updatedRank ?? 0;
  const updated = mapBookToProject(res.book, existingRank);
  projects = projects.map((p) => (p.id === id ? updated : p));
  emit();
}

/** Delete a project for real. Optimistically removes it from the local cache on success. */
export async function deleteProject(id: string): Promise<void> {
  await apiFetch<void>(`/books/${id}`, { method: "DELETE" });
  projects = projects.filter((p) => p.id !== id);
  emit();
}
