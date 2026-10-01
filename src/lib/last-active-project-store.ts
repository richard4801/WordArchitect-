"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which project the writer actually most recently had open — not
 * the same thing as `Project.updatedRank` (sorted client-side by the
 * backend's own `books.updated_at`), which only moves on a direct
 * `PATCH /books/:id` (Edit Project, Target Words). Writing a chapter,
 * adding a character, creating a note, running the Planning Engine, etc.
 * all touch other tables entirely and never bump that column — so every
 * "most recently active project" selection built on `updatedRank` (the
 * Dashboard's Continue Writing card, and every top-level workspace
 * redirect — /writing, /characters, /worldbuilding, /notes, /outlines,
 * /assistant) was silently equivalent to "most recently CREATED project"
 * in every real case except an explicit project-details edit — a real bug
 * reported directly: the Dashboard always opened the newest project, never
 * whichever one the writer had actually been working in.
 *
 * Same per-browser localStorage tradeoff as `writing-goal-store.ts`/
 * `getUserId()` — real and user-specific, just not synced across devices,
 * since there's no backend "last active project" concept to ask instead.
 */
const KEY = "wa-last-active-project";

export function recordProjectActivity(bookId: string): void {
  try {
    localStorage.setItem(KEY, bookId);
  } catch {
    // Private browsing, storage disabled, etc. — silently skip; every
    // caller already falls back to the updatedRank heuristic below.
  }
}

function getLastActiveProjectId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Resolves post-mount (a plain localStorage read, not a network call) —
 * starts `null` on the very first render to avoid an SSR/hydration
 * mismatch, same convention the Planning Engine's own localStorage
 * fallback already established, then updates synchronously on mount,
 * before any real project data has had time to arrive over the network.
 */
export function useLastActiveProjectId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    // Deferred into a callback rather than called synchronously in the
    // effect body — the same shape the Planning Engine's own localStorage
    // fallback (getStoredRunId/storeRunId) already established, required
    // to satisfy the React Compiler's react-hooks/set-state-in-effect rule.
    const timeout = window.setTimeout(() => setId(getLastActiveProjectId()), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  return id;
}

/**
 * The single "which project should opening a bare workspace land on"
 * decision, shared by the Dashboard's Continue Writing card and every
 * top-level workspace redirect page. Prefers the real last-active id if
 * it still points at a project that exists (it might not — deleted, or
 * never recorded yet for a brand-new account); falls back to the old
 * `updatedRank` heuristic otherwise, which is still a reasonable tie-
 * breaker (and the only option before any real activity has been tracked).
 */
export function pickActiveProject<T extends { id: string; updatedRank: number }>(
  projects: T[],
  lastActiveId: string | null,
): T {
  if (lastActiveId) {
    const match = projects.find((p) => p.id === lastActiveId);
    if (match) return match;
  }
  return projects.reduce((a, b) => (b.updatedRank < a.updatedRank ? b : a));
}
