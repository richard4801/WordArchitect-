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
import { useEffect, useSyncExternalStore } from "react";
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
