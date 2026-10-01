"use client";

/**
 * Book-to-book relationship links (sequel/translation), backed by the real
 * backend's `/book-links` (see its own `030_book_links.sql` + `bookLinks.ts`
 * — read directly before building this, continuing this codebase's own
 * discipline). One generic table serves both known relationship types:
 * `link_type` is open-ended text ("sequel_of" | "translation_of" today),
 * `language` only meaningful for `translation_of`. Direction convention:
 * `from_book_id` is the derived book (the sequel/translation), `to_book_id`
 * is what it relates to (the original) — this store's `bookId` argument is
 * always the *derived* book, i.e. whichever project's Settings tab is open.
 *
 * `UNIQUE(from_book_id, link_type)` on the backend means a book can have at
 * most ONE outgoing link per type — no PATCH endpoint exists, so "change"
 * is delete-the-existing-link-then-create, exactly as the backend's own
 * 409 error text instructs ("delete the existing one first if you want to
 * change it").
 *
 * Same "single current book" reactive-store pattern as
 * `banned-terms-store.ts`/`notes-store.ts` — only one project's own links
 * are ever shown at once (its Settings tab).
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api-client";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

export type BookLinkRow = {
  id: string;
  from_book_id: string;
  to_book_id: string;
  link_type: string;
  language: string | null;
  created_at: string;
};

export type BookLinksData = { outgoing: BookLinkRow[]; incoming: BookLinkRow[] };

const EMPTY_DATA: BookLinksData = { outgoing: [], incoming: [] };

let currentBookId: string | null = null;
let data: BookLinksData = EMPTY_DATA;
let status: LoadStatus = "idle";
let error: string | null = null;

const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

async function loadBookLinks(bookId: string): Promise<void> {
  currentBookId = bookId;
  status = "loading";
  error = null;
  emit();
  try {
    const res = await apiFetch<BookLinksData>(`/book-links?bookId=${encodeURIComponent(bookId)}`);
    if (currentBookId !== bookId) return; // a different project's Settings tab opened meanwhile
    data = { outgoing: res.outgoing ?? [], incoming: res.incoming ?? [] };
    status = "loaded";
  } catch (err) {
    if (currentBookId !== bookId) return;
    status = "error";
    error = err instanceof Error ? err.message : "Couldn't load this project's book links.";
  }
  emit();
}

export function refreshBookLinks(bookId: string): void {
  void loadBookLinks(bookId);
}

function snapshotFor(bookId: string | undefined): BookLinksData {
  return bookId && currentBookId === bookId ? data : EMPTY_DATA;
}

export function useBookLinks(bookId: string | undefined): BookLinksData {
  useEffect(() => {
    if (bookId && currentBookId !== bookId) void loadBookLinks(bookId);
  }, [bookId]);
  return useSyncExternalStore(
    subscribe,
    () => snapshotFor(bookId),
    () => snapshotFor(bookId),
  );
}

export function useBookLinksLoadStatus(bookId: string | undefined): LoadStatus {
  return useSyncExternalStore(
    subscribe,
    () => (bookId && currentBookId === bookId ? status : "idle"),
    () => (bookId && currentBookId === bookId ? status : "idle"),
  );
}

export function useBookLinksError(bookId: string | undefined): string | null {
  return useSyncExternalStore(
    subscribe,
    () => (bookId && currentBookId === bookId ? error : null),
    () => (bookId && currentBookId === bookId ? error : null),
  );
}

export type NewBookLinkInput = {
  fromBookId: string;
  toBookId: string;
  linkType: string;
  language?: string | null;
};

export async function createBookLink(input: NewBookLinkInput): Promise<BookLinkRow> {
  const res = await apiFetch<{ link: BookLinkRow }>("/book-links", {
    method: "POST",
    body: JSON.stringify({
      fromBookId: input.fromBookId,
      toBookId: input.toBookId,
      linkType: input.linkType,
      language: input.linkType === "translation_of" ? (input.language?.trim() || null) : null,
    }),
  });
  if (currentBookId === input.fromBookId) {
    data = { ...data, outgoing: [...data.outgoing, res.link] };
    emit();
  }
  return res.link;
}

export async function deleteBookLink(id: string): Promise<void> {
  await apiFetch<void>(`/book-links/${id}`, { method: "DELETE" });
  data = {
    outgoing: data.outgoing.filter((l) => l.id !== id),
    incoming: data.incoming.filter((l) => l.id !== id),
  };
  emit();
}

// ---------------------------------------------------------------------
// Bulk outgoing-link lookup — for the /projects list, which needs to know
// (across every currently-visible project at once) which ones are derived
// books that should fold under their original rather than show as their
// own top-level card. Deliberately a separate cache from the single
// "current book" one above: that one is scoped to whichever project's own
// Settings tab is open; this one needs many books' own outgoing links live
// simultaneously, the same "many keys at once" shape manuscript-store.ts's
// Map-keyed chapter-list/word-count caches already established (as opposed
// to the single-current-book pattern this file's own doc comment
// describes). Reuses the same GET /book-links?bookId= endpoint — there's
// no bulk "every book's links in one call" route on the backend, so this
// is one real request per visible project, the same "accepted per-visible-
// project fetch cost" tradeoff §5.6 already documents for chapter/word
// counts on this exact page.
// ---------------------------------------------------------------------

type BulkEntry = { status: LoadStatus; outgoing: BookLinkRow[] };
const bulkCache = new Map<string, BulkEntry>();
let bulkVersion = 0;
const bulkListeners = new Set<() => void>();
function emitBulk(): void {
  bulkVersion++;
  for (const l of bulkListeners) l();
}
function subscribeBulk(l: () => void): () => void {
  bulkListeners.add(l);
  return () => bulkListeners.delete(l);
}
function getBulkVersion(): number {
  return bulkVersion;
}

function getBulkEntry(bookId: string): BulkEntry {
  let entry = bulkCache.get(bookId);
  if (!entry) {
    entry = { status: "idle", outgoing: [] };
    bulkCache.set(bookId, entry);
  }
  return entry;
}

async function loadBulkOutgoing(bookId: string): Promise<void> {
  bulkCache.set(bookId, { status: "loading", outgoing: getBulkEntry(bookId).outgoing });
  emitBulk();
  try {
    const res = await apiFetch<BookLinksData>(`/book-links?bookId=${encodeURIComponent(bookId)}`);
    bulkCache.set(bookId, { status: "loaded", outgoing: res.outgoing ?? [] });
  } catch {
    bulkCache.set(bookId, { status: "error", outgoing: [] });
  }
  emitBulk();
}

/**
 * Every outgoing link (if any — almost always zero or one, per the
 * `UNIQUE(from_book_id, link_type)` constraint per type) for each of the
 * given book ids, keyed by book id. `bookIds` should be whatever set of
 * projects is actually visible at once (e.g. the /projects list's current
 * filtered/sorted result) — fetches lazily per id, cached thereafter.
 */
export function useOutgoingLinksByBook(bookIds: string[]): Map<string, BookLinkRow[]> {
  const key = bookIds.join(",");
  useEffect(() => {
    for (const id of bookIds) {
      if (getBulkEntry(id).status === "idle") void loadBulkOutgoing(id);
    }
    // key is the intentional dep — bookIds itself is a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const storeVersion = useSyncExternalStore(subscribeBulk, getBulkVersion, getBulkVersion);

  return useMemo(() => {
    const map = new Map<string, BookLinkRow[]>();
    for (const id of bookIds) {
      map.set(id, getBulkEntry(id).outgoing);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storeVersion]);
}
