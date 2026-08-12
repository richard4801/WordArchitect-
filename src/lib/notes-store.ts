"use client";

/**
 * Tiny in-memory reactive store wrapping notes-data.ts's mock note list —
 * same pattern as character-store.ts / worldbuilding-store.ts — so the
 * "New Note" and "Quick Notes" composers can fake-create a note, and the
 * pin toggle actually persists across the grid/rail/folder counts, without
 * a backend. Resets on a hard refresh, same as every other mock-data page.
 */

import { useSyncExternalStore } from "react";
import { NOTES as seedNotes, type Note, type NoteCategory } from "@/lib/notes-data";

let notes: Note[] = [...seedNotes];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return notes;
}

/** Live note list — re-renders on create/pin-toggle. */
export function useNotes(): Note[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function togglePinned(id: string): void {
  notes = notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
  emit();
}

export type NewNoteInput = {
  title: string;
  excerpt: string;
  category: NoteCategory;
};

/** Fake-create a note (in-memory only) and return its id. */
export function createNote(input: NewNoteInput): string {
  const id = `${input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
  const note: Note = {
    id,
    title: input.title.trim() || "Untitled Note",
    excerpt: input.excerpt.trim(),
    category: input.category,
    date: "Just now",
    dateRank: 0,
    comments: 0,
    pinned: false,
    mine: true,
  };
  notes = [note, ...notes];
  emit();
  return id;
}
