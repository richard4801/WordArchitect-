"use client";

/**
 * Real backend-backed Banned Terms store — wraps the WordArchitect
 * backend's `/api/v1/banned-terms` (see the backend repo's
 * `src/routes/bannedTerms.ts` + `012_banned_terms.sql`). Lets a writer ban
 * an exact word/phrase straight from the manuscript editor; every future
 * `POST /generate-prose` enforces every banned term server-side
 * automatically — nothing else to wire up once a term is banned.
 *
 * **Scope is per-ACCOUNT, not per-book** — confirmed by the backend team
 * directly: `GET /banned-terms` is looked up by `userId`, not `bookId`.
 * A term banned while editing one project is enforced on every one of that
 * writer's other projects too, not just the book it was banned from.
 * `book_id` still lives on every row (which book the term was first banned
 * from), but it's provenance, not a filter — nothing here scopes by it.
 * The fetch below still keys its single-current-book cache off `bookId`
 * (same call-site pattern as `notes-store.ts`/`character-store.ts`), but
 * that's purely "which project's editor is this panel open in," not a
 * data-scoping boundary — every fetch, whichever book triggered it,
 * returns this same writer's whole account-wide list.
 *
 * `banTerm()` doesn't need to distinguish the backend's 200 (already
 * banned, case-insensitively) vs 201 (newly banned) — both are `apiFetch`
 * successes with the same body shape, and both should read as "Banned." to
 * the writer, not an error.
 */

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch, getUserId } from "@/lib/api-client";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

/** `banned_terms` row exactly as the backend returns it — raw snake_case columns, flat (no envelope) on the POST response. */
export type BannedTermRow = {
  id: string;
  user_id: string;
  book_id: string;
  term: string;
  created_at: string;
};

type ListResponse = { terms: BannedTermRow[] };

let rows: BannedTermRow[] = [];
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
function getRowsSnapshot() {
  return rows;
}
function getStatusSnapshot() {
  return status;
}
function getErrorSnapshot() {
  return error;
}

async function loadBannedTerms(bookId: string): Promise<void> {
  currentBookId = bookId;
  status = "loading";
  error = null;
  emit();
  try {
    // userId, not bookId — this is this writer's whole account-wide banned
    // list (see this file's own top comment), not scoped to `bookId`.
    const res = await apiFetch<ListResponse>(`/banned-terms?userId=${encodeURIComponent(getUserId())}`);
    rows = res.terms;
    status = "loaded";
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : "Failed to load banned terms.";
  }
  emit();
}

/** Live banned-terms list for this writer's whole account — re-keyed per `bookId` only to track which project's editor is currently open, not to scope the data (see this file's own top comment). */
export function useBannedTerms(bookId: string | undefined): BannedTermRow[] {
  useEffect(() => {
    if (bookId && bookId !== currentBookId) void loadBannedTerms(bookId);
  }, [bookId]);
  return useSyncExternalStore(subscribe, getRowsSnapshot, getRowsSnapshot);
}

export function useBannedTermsLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribe, getStatusSnapshot, getStatusSnapshot);
}
export function useBannedTermsError(): string | null {
  return useSyncExternalStore(subscribe, getErrorSnapshot, getErrorSnapshot);
}

/**
 * Ban a term for real — send the selection exactly as-is, no manual
 * trim/lowercase (the backend trims, and matching is already
 * case-insensitive there). Folds the returned row into the local cache
 * whether it was a fresh ban or an already-banned term coming back, using
 * a case-insensitive match on `term` so re-banning the same word twice
 * (e.g. different casing) never duplicates the list entry client-side.
 */
export async function banTerm(bookId: string, term: string): Promise<BannedTermRow> {
  const row = await apiFetch<BannedTermRow>("/banned-terms", {
    method: "POST",
    body: JSON.stringify({ userId: getUserId(), bookId, term }),
  });
  const normalized = row.term.trim().toLowerCase();
  const alreadyListed = rows.some((r) => r.term.trim().toLowerCase() === normalized);
  if (!alreadyListed) {
    rows = [row, ...rows];
    status = "loaded";
    emit();
  }
  return row;
}

/** Unban a term for real. */
export async function unbanTerm(id: string): Promise<void> {
  await apiFetch<void>(`/banned-terms/${id}`, { method: "DELETE" });
  rows = rows.filter((r) => r.id !== id);
  emit();
}
