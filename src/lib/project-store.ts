"use client";

/**
 * A tiny in-memory reactive store wrapping the projects-data.ts mock array,
 * so the "New Project" form can fake-create a project and have it actually
 * show up on /projects and its own /projects/[id] page — without a backend.
 * Module-level state: it persists across client-side navigation (the module
 * stays loaded) but resets on a hard refresh, exactly like every other
 * mock-data page in this app.
 */

import { useSyncExternalStore } from "react";
import { projects as seedProjects, type Project } from "@/lib/projects-data";

let projects: Project[] = [...seedProjects];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return projects;
}

/** Live project list — re-renders when a project is fake-created. */
export function useProjects(): Project[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Live lookup of a single project by id. */
export function useProject(id: string | undefined): Project | undefined {
  const list = useProjects();
  return list.find((p) => p.id === id);
}

function slugify(title: string): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "untitled";
  if (!projects.some((p) => p.id === base)) return base;
  let n = 2;
  while (projects.some((p) => p.id === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export type NewProjectInput = {
  title: string;
  tagline?: string;
  description?: string;
  genre: string;
  subgenres?: string[];
  pov?: string;
  tense?: string;
  language?: string;
  targetWords?: number;
};

/** Fake-create a project (in-memory only) and return its id. */
export function createProject(input: NewProjectInput): string {
  const id = slugify(input.title);
  const genre = [input.genre, ...(input.subgenres ?? [])].filter(Boolean).join(" · ");
  const project: Project = {
    id,
    title: input.title.trim(),
    genre: genre || "Fiction",
    logline:
      input.tagline?.trim() ||
      input.description?.trim().slice(0, 160) ||
      "A new story, waiting to be written.",
    words: 0,
    target: input.targetWords && input.targetWords > 0 ? Math.round(input.targetWords) : 50000,
    chapters: 0,
    sessions: 0,
    daysActive: 0,
    updated: "Just now",
    updatedRank: 0,
    status: "active",
    stage: "Outline",
    created: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    pov: input.pov || undefined,
    tense: input.tense || undefined,
    language: input.language || "English",
    povCharacters: 0,
    worldEntries: 0,
    tags: (input.subgenres ?? []).slice(0, 5),
  };
  // Bump every existing project's rank so the new one sorts first under
  // "Recently Updated".
  projects = [project, ...projects.map((p) => ({ ...p, updatedRank: p.updatedRank + 1 }))];
  emit();
  return id;
}

/**
 * Raise (or otherwise change) a project's target word count — e.g. from the
 * detail page once actual words are approaching or past the original goal.
 * In-memory only, like everything else in this store.
 */
export function updateProjectTarget(id: string, target: number): void {
  if (!(target > 0)) return;
  projects = projects.map((p) => (p.id === id ? { ...p, target: Math.round(target) } : p));
  emit();
}
