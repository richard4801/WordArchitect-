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

/**
 * Whether a manuscript-editor focus mode (Normal/Typewriter/Zen) is active.
 * The picker and its modes live entirely inside the chapters page, but the
 * global Sidebar is rendered one level up in (app)/layout.tsx — this bridges
 * the two so focus mode can hide it too, rather than leaving app nav sitting
 * in what's supposed to be a distraction-free view. Ephemeral (no
 * persistence): it always starts false and the chapters page resets it on
 * unmount, so it can never strand the Sidebar hidden on another page.
 */
let focusModeActive = false;
const focusListeners = new Set<() => void>();

function emitFocus() {
  for (const listener of focusListeners) listener();
}

function subscribeFocus(listener: () => void) {
  focusListeners.add(listener);
  return () => focusListeners.delete(listener);
}

function getFocusSnapshot() {
  return focusModeActive;
}

function getFocusServerSnapshot() {
  return false;
}

export function useFocusModeActive(): boolean {
  return useSyncExternalStore(subscribeFocus, getFocusSnapshot, getFocusServerSnapshot);
}

export function setFocusModeActive(active: boolean): void {
  if (focusModeActive === active) return;
  focusModeActive = active;
  emitFocus();
}
