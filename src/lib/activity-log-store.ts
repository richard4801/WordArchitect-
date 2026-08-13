"use client";

/**
 * Real "Recent Activity" feed for the Dashboard — genuinely derived from
 * actions this browser has actually taken (project/character/note/world
 * creates, chapter writing sessions), not fabricated flavor text. There's
 * no activity-log backend resource (see CLAUDE.md §4.7), so — same
 * per-browser-not-synced tradeoff as `writing-goal-store.ts` and
 * `daily-progress-store.ts` — entries are appended by each store's own
 * create function at the moment the real action succeeds, and persisted to
 * localStorage so the feed survives a reload.
 */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "wordarchitect_activity_log";
const MAX_ENTRIES = 30;

export type ActivityKind = "wrote" | "character" | "world" | "note" | "project" | "banned";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  text: string;
  timestamp: number;
};

function loadFromStorage(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

let entries: ActivityEntry[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function ensureHydrated() {
  if (hydrated) return;
  entries = loadFromStorage();
  hydrated = true;
}
function getSnapshot(): ActivityEntry[] {
  ensureHydrated();
  return entries;
}
function getServerSnapshot(): ActivityEntry[] {
  return [];
}

/** Append a real activity entry (newest first, capped at MAX_ENTRIES). */
export function logActivity(kind: ActivityKind, text: string): void {
  ensureHydrated();
  entries = [{ id: crypto.randomUUID(), kind, text, timestamp: Date.now() }, ...entries].slice(0, MAX_ENTRIES);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
  emit();
}

export function useActivityLog(): ActivityEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
