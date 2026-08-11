"use client";

/**
 * A tiny in-memory reactive store wrapping character-data.ts's mock array,
 * same pattern as project-store.ts — so the "New Character" form can
 * fake-create a character and have it actually show up in the character
 * list, the All Characters grid, and its own detail view, without a
 * backend. Module-level state: persists across client-side navigation but
 * resets on a hard refresh, same as every other mock-data page in this app.
 */

import { useSyncExternalStore } from "react";
import { CHARACTERS as seedCharacters, type Character, type CharacterRole } from "@/lib/character-data";

let characters: Character[] = [...seedCharacters];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return characters;
}

/** Live character list — re-renders when a character is fake-created. */
export function useCharacters(): Character[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Live lookup of a single character by id. */
export function useCharacter(id: string | undefined): Character | undefined {
  const list = useCharacters();
  return list.find((c) => c.id === id);
}

function slugify(name: string): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "unnamed";
  if (!characters.some((c) => c.id === base)) return base;
  let n = 2;
  while (characters.some((c) => c.id === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export type NewCharacterInput = {
  name: string;
  nickname?: string;
  role: CharacterRole;
  age?: number;
  gender?: string;
  occupation?: string;
  status?: string;
  alignment?: string;
  archetype?: string;
  povCharacter: boolean;
  motivation?: string;
  goal?: string;
  fear?: string;
  secret?: string;
  quickTraits: string[];
  summary?: string;
};

/** Fake-create a character (in-memory only) and return its id. */
export function createCharacter(input: NewCharacterInput): string {
  const id = slugify(input.name);
  const character: Character = {
    id,
    name: input.name.trim(),
    nickname: input.nickname?.trim() || undefined,
    epithet: input.nickname?.trim() || input.role,
    role: input.role,
    age: input.age ?? 0,
    gender: input.gender || "Unspecified",
    occupation: input.occupation || "Unknown",
    location: "Unknown",
    status: input.status || "Alive",
    alignment: input.alignment || "True Neutral",
    roleInStory: input.role,
    povCharacter: input.povCharacter,
    archetype: input.archetype || undefined,
    favorites: 0,
    overview: input.summary?.trim() || "No overview written yet.",
    physicalDescription: [],
    personalityTraits: input.quickTraits,
    motivations: [input.motivation, input.goal].filter((v): v is string => Boolean(v)),
    motivation: input.motivation || undefined,
    goal: input.goal || undefined,
    fear: input.fear || undefined,
    secret: input.secret || undefined,
    relationships: [],
  };
  characters = [character, ...characters];
  emit();
  return id;
}
