"use client";

/**
 * Real backend-backed Banned Terms store — wraps the WordArchitect
 * backend's `/api/v1/banned-terms` (see the backend repo's
 * `src/routes/bannedTerms.ts` + `012_banned_terms.sql`). Lets a writer ban
 * an exact word/phrase for the current book straight from the manuscript
 * editor; every future `POST /generate-prose` for that book enforces every
 * banned term server-side automatically — nothing else to wire up once a
 * term is banned.
 *
 * Same `bookId`-scoped single-current-book pattern as `notes-store.ts`/
 * `character-store.ts` (not the Map-keyed pattern `manuscript-store.ts`
 * uses) — the banned-terms list is only ever shown for whichever project's
 * editor is currently open, never several at once.
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
    const res = await apiFetch<ListResponse>(`/banned-terms?bookId=${encodeURIComponent(bookId)}`);
    rows = res.terms;
    status = "loaded";
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : "Failed to load banned terms.";
  }
  emit();
}

/** Live banned-terms list for one project — fetched once, kept live via bans/unbans below. */
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
