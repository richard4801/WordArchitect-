"use client";

/**
 * Tiny reactive store for cross-page UI state, same useSyncExternalStore
 * pattern as project-store.ts. Currently just the sidebar's collapsed/icon-
 * rail state — a user-initiated toggle (not tied to any particular route),
 * persisted to localStorage so it survives a refresh.
 */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "wa-sidebar-collapsed";

let collapsed = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return collapsed;
}

function getServerSnapshot() {
  return false;
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [value, toggleSidebarCollapsed];
}

export function toggleSidebarCollapsed(): void {
  collapsed = !collapsed;
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // localStorage unavailable (e.g. private mode) — in-memory only, fine.
  }
  emit();
}

/** Read the persisted value once on mount, client-side only. */
export function hydrateSidebarCollapsed(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      collapsed = stored === "1";
      emit();
    }
  } catch {
    // ignore
  }
}
