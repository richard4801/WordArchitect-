"use client";

/**
 * Tiny in-memory reactive store wrapping worldbuilding-data.ts's mock
 * category list — same pattern as character-store.ts — so the "New
 * Category" form can fake-create a category and have it actually show up
 * in the Categories grid, the filter tabs, and World Stats, without a
 * backend. Module-level state: persists across client-side navigation but
 * resets on a hard refresh, same as every other mock-data page in this app.
 */

import { useSyncExternalStore } from "react";
import { Layers } from "lucide-react";
import {
  WORLD_CATEGORIES as seedCategories,
  type WorldCategoryKey,
  type WorldCategoryMeta,
} from "@/lib/worldbuilding-data";

let categories: WorldCategoryMeta[] = [...seedCategories];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return categories;
}

/** Live category list — re-renders when a category is fake-created. */
export function useWorldCategories(): WorldCategoryMeta[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function slugify(name: string): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "category";
  if (!categories.some((c) => c.key === (base as WorldCategoryKey))) return base;
  let n = 2;
  while (categories.some((c) => c.key === (`${base}-${n}` as WorldCategoryKey))) n++;
  return `${base}-${n}`;
}

export type NewCategoryInput = {
  name: string;
  description?: string;
  color: string;
  Icon: WorldCategoryMeta["Icon"];
};

/** Fake-create a category (in-memory only) and return its key. */
export function createWorldCategory(input: NewCategoryInput): WorldCategoryKey {
  const key = slugify(input.name) as WorldCategoryKey;
  const category: WorldCategoryMeta = {
    key,
    label: input.name.trim(),
    description: input.description?.trim() || "A new worldbuilding category.",
    Icon: input.Icon ?? Layers,
    color: input.color,
  };
  categories = [...categories, category];
  emit();
  return key;
}
