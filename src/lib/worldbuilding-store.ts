"use client";

/**
 * Real backend-backed Worldbuilding store — wraps the WordArchitect
 * backend's `/world-categories` and `/codex` (non-character entries).
 *
 * Categories: the fixed 8-category taxonomy (`WORLD_CATEGORIES` in
 * worldbuilding-data.ts) is kept as a permanent client-side base layer —
 * same "structure, not seed content" treatment already applied to the
 * Outliner's Act I/II/III containers, since a brand-new project otherwise
 * has zero categories to organize anything under. Real categories fetched
 * from the backend (both explicit `world_categories` rows and ones the
 * backend derives from `codex_entries.entry_type` values already in use —
 * see `listWorldCategories` in the backend's `worldCategories.ts`) are
 * merged on top, keyed by `key`, so a custom category created through the
 * form persists for real.
 *
 * Entries: `WorldEntry` records have no dedicated backend table — a world
 * entry *is* a `codex_entries` row whose `entry_type` isn't `"character"`
 * (same table Character uses, see `character-store.ts`). There's still no
 * in-app "New Entry" form (documented gap, unchanged by this pass), but
 * entries created some other way (the MCP tool surface's
 * `create_codex_entry`/`create_world_category`, most likely) now show up
 * for real instead of the hub always reading a permanently-empty seed
 * array — this is the same class of fix as Character's `findCharacter`
 * bug from the Character integration pass.
 */

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  iconForKey,
  WORLD_CATEGORIES as BASE_CATEGORIES,
  type WorldCategoryKey,
  type WorldCategoryMeta,
  type WorldEntry,
} from "@/lib/worldbuilding-data";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

/** `world_categories` row — explicit rows have a real `id`/`created_at`; server-derived ones (no row yet, inferred from codex usage) have `id: ""` and `is_derived: true`. */
type CategoryRow = {
  id: string;
  book_id: string;
  key: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  is_derived?: boolean;
};

type CategoriesListResponse = { categories: CategoryRow[] };
type CategoryResponse = { category: CategoryRow };

/** `codex_entries` row, worldbuilding fields only (same table Character uses). */
type CodexEntryRow = {
  id: string;
  book_id: string;
  name: string;
  entry_type: string;
  description: string;
  created_at: string;
  updated_at?: string;
};
type CodexListResponse = { entries: CodexEntryRow[] };

const FALLBACK_COLOR = "#8a93a6";

function mapRowToCategoryMeta(row: CategoryRow): WorldCategoryMeta {
  return {
    key: row.key as WorldCategoryKey,
    label: row.name,
    description: row.description?.trim() || "A new worldbuilding category.",
    Icon: iconForKey(row.icon),
    color: row.color || FALLBACK_COLOR,
  };
}

function mapRowToEntry(row: CodexEntryRow): WorldEntry {
  const updatedIso = row.updated_at ?? row.created_at;
  const hours = Math.max(0, Math.round((Date.now() - new Date(updatedIso).getTime()) / 3_600_000));
  return {
    id: row.id,
    name: row.name,
    category: row.entry_type as WorldCategoryKey,
    summary: row.description,
    updatedHours: hours,
  };
}

let categoryRows: CategoryRow[] = [];
let entryRows: CodexEntryRow[] = [];
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
function getCategoryRowsSnapshot() {
  return categoryRows;
}
function getEntryRowsSnapshot() {
  return entryRows;
}
function getStatusSnapshot() {
  return status;
}
function getErrorSnapshot() {
  return error;
}

async function loadWorld(bookId: string): Promise<void> {
  currentBookId = bookId;
  status = "loading";
  error = null;
  emit();
  try {
    const [categoriesRes, entriesRes] = await Promise.all([
      apiFetch<CategoriesListResponse>(`/world-categories?bookId=${encodeURIComponent(bookId)}`),
      apiFetch<CodexListResponse>(`/codex?bookId=${encodeURIComponent(bookId)}`),
    ]);
    categoryRows = categoriesRes.categories;
    entryRows = entriesRes.entries.filter((e) => e.entry_type !== "character");
    status = "loaded";
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : "Failed to load worldbuilding data.";
  }
  emit();
}

function useEnsureLoaded(bookId: string | undefined) {
  useEffect(() => {
    if (bookId && bookId !== currentBookId) void loadWorld(bookId);
  }, [bookId]);
}

/** Live category list for one project — fixed 8-category base merged with real backend categories. */
export function useWorldCategories(bookId: string | undefined): WorldCategoryMeta[] {
  useEnsureLoaded(bookId);
  const rows = useSyncExternalStore(subscribe, getCategoryRowsSnapshot, getCategoryRowsSnapshot);
  return useMemo(() => {
    const merged = new Map<string, WorldCategoryMeta>();
    for (const c of BASE_CATEGORIES) merged.set(c.key, c);
    for (const row of rows) merged.set(row.key, mapRowToCategoryMeta(row));
    return [...merged.values()];
  }, [rows]);
}

/** Live world entries (codex entries whose entry_type isn't "character") for one project. */
export function useWorldEntries(bookId: string | undefined): WorldEntry[] {
  useEnsureLoaded(bookId);
  const rows = useSyncExternalStore(subscribe, getEntryRowsSnapshot, getEntryRowsSnapshot);
  return useMemo(() => rows.map(mapRowToEntry), [rows]);
}

export function useWorldLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribe, getStatusSnapshot, getStatusSnapshot);
}
export function useWorldError(): string | null {
  return useSyncExternalStore(subscribe, getErrorSnapshot, getErrorSnapshot);
}

export type NewCategoryInput = {
  name: string;
  description?: string;
  color: string;
  /** Icon library name, e.g. "Castle" — see WORLD_ICON_REGISTRY in worldbuilding-data.ts. */
  iconKey?: string;
};

/** Create a real category and return its key. */
export async function createWorldCategory(bookId: string, input: NewCategoryInput): Promise<WorldCategoryKey> {
  const res = await apiFetch<CategoryResponse>("/world-categories", {
    method: "POST",
    body: JSON.stringify({
      bookId,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      color: input.color,
      icon: input.iconKey,
    }),
  });
  categoryRows = [...categoryRows, res.category];
  status = "loaded";
  emit();
  return res.category.key as WorldCategoryKey;
}
