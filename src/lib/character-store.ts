"use client";

/**
 * Real backend-backed Character store — wraps the WordArchitect backend's
 * Codex CRUD (`/api/v1/codex`, `entryType: "character"`; see the backend
 * repo's CLAUDE.md "Codex CRUD" + `codex_entries` schema sections).
 * Second domain wired up, per the suggested integration order — Character
 * had the richest field-mapping gap in the old mock and is now backed by
 * real columns for nearly all of it (see `mapEntryToCharacter` below).
 *
 * Unlike `project-store.ts`, this store is explicitly scoped to one book
 * at a time (`useCharacters(bookId)`) — the old mock's parameterless
 * `useCharacters()` was a real limitation, not a deliberate design choice:
 * every project showed the exact same flat roster regardless of which
 * book was open, which only "worked" because the mock never distinguished
 * projects. Real data has to be scoped by `bookId`, so this is a
 * necessary signature change, not an optional one — same category as
 * `createProject` becoming `async`.
 */

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch, getUserId } from "@/lib/api-client";
import { logActivity } from "@/lib/activity-log-store";
import type { Character, CharacterArc, CharacterRole } from "@/lib/character-data";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

let characters: Character[] = [];
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
function getCharactersSnapshot() {
  return characters;
}
function getStatusSnapshot() {
  return status;
}
function getErrorSnapshot() {
  return error;
}

// ---------------------------------------------------------------------
// Backend <-> frontend mapping
// ---------------------------------------------------------------------

/**
 * Shape of a `codex_entries` row exactly as Supabase returns it — raw
 * snake_case columns (see the backend's `001_init_schema.sql`,
 * `002_expand_codex_schema.sql`, `014_character_expansion.sql`,
 * `016_world_categories.sql`). Only the fields Character actually uses
 * are listed; worldbuilding-only rows (other `entry_type` values) share
 * this same table and shape.
 */
type CodexEntryRow = {
  id: string;
  user_id: string;
  book_id: string;
  name: string;
  aliases?: string[] | null;
  entry_type: string;
  description: string;
  tier?: string | null;
  quote?: string | null;
  age?: string | null;
  gender?: string | null;
  role_in_story?: string | null;
  occupation?: string | null;
  location_name?: string | null;
  physical_description?: string[] | null;
  personality_traits?: string[] | null;
  motivations?: string[] | null;
  background?: string[] | null;
  character_arc?: { stage: string; description: string }[] | null;
  notes?: { title: string; body: string; date?: string; pinned?: boolean }[] | null;
  nickname?: string | null;
  epithet?: string | null;
  status?: string | null;
  alignment?: string | null;
  pov_character: boolean;
  archetype?: string | null;
  favorites: number;
  motivation?: string | null;
  goal?: string | null;
  fear?: string | null;
  secret?: string | null;
  life_events?: Record<string, unknown>[] | null;
  cultural_background?: Record<string, unknown> | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  internal_conflict?: string | null;
  created_at: string;
  updated_at: string;
};

type CodexListResponse = { entries: CodexEntryRow[] };
type CodexEntryResponse = { entry: CodexEntryRow };

const TIER_TO_ROLE: Record<string, CharacterRole> = {
  main: "Main",
  supporting: "Supporting",
  minor: "Minor",
  extra: "Extra",
};
const ROLE_TO_TIER: Record<CharacterRole, string> = {
  Main: "main",
  Supporting: "supporting",
  Minor: "minor",
  Extra: "extra",
};

/**
 * `character_arc` on the backend is a flexible array of `{ stage,
 * description }` (any stage names), but the frontend's arc timeline
 * renders exactly four fixed stages (Beginning/Middle/Climax/End — see
 * `ArcTimeline` in `characters/page.tsx`). Matches by stage name
 * case-insensitively; returns `undefined` (same as "no arc set") if
 * nothing matches, so the tab falls back to its empty state instead of
 * showing four blank timeline entries.
 */
function mapArc(rows?: { stage: string; description: string }[] | null): CharacterArc | undefined {
  if (!rows || rows.length === 0) return undefined;
  const find = (stage: string) =>
    rows.find((r) => r.stage.trim().toLowerCase() === stage)?.description ?? "";
  const beginning = find("beginning");
  const middle = find("middle");
  const climax = find("climax");
  const end = find("end");
  if (!beginning && !middle && !climax && !end) return undefined;
  return { beginning, middle, climax, end };
}

/**
 * Maps a `codex_entries` row (entryType "character") onto the frontend's
 * `Character` shape. Nearly every field is real now — `arc`/`background`/
 * `lifeEvents`/`culturalBackground`/`strengths`/`weaknesses`/
 * `internalConflict`/`notes` all have real columns as of the backend's
 * `014_character_expansion.sql` migration, even though no frontend form
 * writes to most of them yet (still the biggest EDITABLE gap — see
 * CLAUDE.md §4.2). `relationships` is deliberately left `[]` here: it
 * lives in a separate `codex_relationships` table/endpoint, fetched only
 * for whichever character is actually open (`useCharacterRelationships`
 * below) rather than N+1-fetched for every row in a list.
 */
function mapEntryToCharacter(row: CodexEntryRow): Character {
  const role = (row.tier && TIER_TO_ROLE[row.tier]) || "Supporting";
  const ageNum = row.age ? Number(row.age) : NaN;
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname ?? undefined,
    epithet: row.epithet || row.nickname || role,
    role,
    age: Number.isFinite(ageNum) ? ageNum : 0,
    gender: row.gender || "Unspecified",
    occupation: row.occupation || "Unknown",
    location: row.location_name || "Unknown",
    status: row.status || "Alive",
    alignment: row.alignment || "True Neutral",
    roleInStory: row.role_in_story || role,
    povCharacter: row.pov_character,
    archetype: row.archetype ?? undefined,
    quote: row.quote ?? undefined,
    favorites: row.favorites ?? 0,
    overview: row.description || "No overview written yet.",
    physicalDescription: row.physical_description ?? [],
    personalityTraits: row.personality_traits ?? [],
    motivations: row.motivations ?? [],
    motivation: row.motivation ?? undefined,
    goal: row.goal ?? undefined,
    fear: row.fear ?? undefined,
    secret: row.secret ?? undefined,
    arc: mapArc(row.character_arc),
    relationships: [],
    background: row.background ?? undefined,
    lifeEvents: (row.life_events as Character["lifeEvents"]) ?? undefined,
    culturalBackground: (row.cultural_background as Character["culturalBackground"]) ?? undefined,
    strengths: row.strengths ?? undefined,
    weaknesses: row.weaknesses ?? undefined,
    internalConflict: row.internal_conflict ?? undefined,
    // Backend's `date` is optional (a note can be created without one);
    // the frontend's CharacterNote.date is a required display string, so
    // an unset date reads as blank rather than widening the type.
    notes: row.notes?.map((n) => ({ ...n, date: n.date ?? "" })) ?? undefined,
  };
}

// ---------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------

async function loadCharacters(bookId: string): Promise<void> {
  currentBookId = bookId;
  status = "loading";
  error = null;
  emit();
  try {
    const res = await apiFetch<CodexListResponse>(
      `/codex?bookId=${encodeURIComponent(bookId)}&entryType=character`,
    );
    characters = res.entries.map(mapEntryToCharacter);
    status = "loaded";
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : "Failed to load characters.";
  }
  emit();
}

export function refreshCharacters(bookId: string): void {
  void loadCharacters(bookId);
}

/** Live character list for one book — fetches on first use or when `bookId` changes. */
export function useCharacters(bookId: string | undefined): Character[] {
  useEffect(() => {
    if (bookId && bookId !== currentBookId) {
      void loadCharacters(bookId);
    }
  }, [bookId]);
  return useSyncExternalStore(subscribe, getCharactersSnapshot, getCharactersSnapshot);
}

export function useCharactersLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribe, getStatusSnapshot, getStatusSnapshot);
}

export function useCharactersError(): string | null {
  return useSyncExternalStore(subscribe, getErrorSnapshot, getErrorSnapshot);
}

/** Live lookup of a single character by id, from the already-loaded list. */
export function useCharacter(bookId: string | undefined, id: string | undefined): Character | undefined {
  const list = useCharacters(bookId);
  return list.find((c) => c.id === id);
}

// ---------------------------------------------------------------------
// Relationships (separate table/endpoint — fetched per-character, not
// bundled into the list above)
// ---------------------------------------------------------------------

type CodexRelationshipRow = {
  id: string;
  book_id: string;
  from_entry_id: string;
  to_entry_id: string;
  bond_type: string;
  description: string | null;
  strength: string | null;
  created_at: string;
};
type RelationshipsResponse = { relationships: CodexRelationshipRow[] };

const STRENGTH_MAP: Record<string, "Strong" | "Moderate" | "Tense" | "Weak"> = {
  strong: "Strong",
  moderate: "Moderate",
  tense: "Tense",
  weak: "Weak",
};

let relationshipsForEntryId: string | null = null;
let relationships: Character["relationships"] = [];

function getRelationshipsSnapshot() {
  return relationships;
}

async function loadRelationships(entryId: string): Promise<void> {
  relationshipsForEntryId = entryId;
  emit();
  try {
    const res = await apiFetch<RelationshipsResponse>(`/codex/${entryId}/relationships`);
    relationships = res.relationships.map((r) => ({
      // The "other" character in the bond, regardless of which side `entryId` was on.
      characterId: r.from_entry_id === entryId ? r.to_entry_id : r.from_entry_id,
      bond: r.bond_type,
      description: r.description ?? "",
      strength: (r.strength && STRENGTH_MAP[r.strength]) || "Moderate",
    }));
  } catch {
    relationships = [];
  }
  emit();
}

/** Live relationships for one character — fetched lazily, only for whichever entry is actually open. */
export function useCharacterRelationships(entryId: string | undefined): Character["relationships"] {
  useEffect(() => {
    if (entryId && entryId !== relationshipsForEntryId) {
      void loadRelationships(entryId);
    }
  }, [entryId]);
  return useSyncExternalStore(subscribe, getRelationshipsSnapshot, getRelationshipsSnapshot);
}

// ---------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------

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

/**
 * Create a real character on the backend and return its id. `description`
 * is required by the backend, so an unfilled summary falls back to the
 * same placeholder the old mock used rather than sending an empty string
 * (which the backend rejects with a 400).
 */
export async function createCharacter(bookId: string, input: NewCharacterInput): Promise<string> {
  const res = await apiFetch<CodexEntryResponse>("/codex", {
    method: "POST",
    body: JSON.stringify({
      userId: getUserId(),
      bookId,
      name: input.name.trim(),
      entryType: "character",
      description: input.summary?.trim() || "No overview written yet.",
      tier: ROLE_TO_TIER[input.role],
      nickname: input.nickname?.trim() || undefined,
      epithet: input.nickname?.trim() || input.role,
      age: input.age ? String(input.age) : undefined,
      gender: input.gender || undefined,
      occupation: input.occupation || undefined,
      status: input.status || undefined,
      alignment: input.alignment || undefined,
      archetype: input.archetype || undefined,
      povCharacter: input.povCharacter,
      personalityTraits: input.quickTraits,
      motivations: [input.motivation, input.goal].filter((v): v is string => Boolean(v)),
      motivation: input.motivation || undefined,
      goal: input.goal || undefined,
      fear: input.fear || undefined,
      secret: input.secret || undefined,
    }),
  });
  const newCharacter = mapEntryToCharacter(res.entry);
  characters = [newCharacter, ...characters];
  status = "loaded";
  emit();
  logActivity("character", `Added character "${newCharacter.name}"`);
  return res.entry.id;
}

/**
 * Edit a real character on the backend. Same field set as `createCharacter`
 * — reused by the New/Edit Character form in edit mode — but sends `null`
 * (not `undefined`) for any field the user cleared, since PATCH treats an
 * omitted key as "leave unchanged" while an explicit `null` clears it (see
 * `buildEntryPayload` in the backend's `codex.ts`); creation has nothing to
 * clear, so `createCharacter` above keeps its `undefined`-omits-the-key
 * behavior.
 */
export async function updateCharacter(id: string, input: NewCharacterInput): Promise<void> {
  const res = await apiFetch<CodexEntryResponse>(`/codex/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: input.name.trim(),
      description: input.summary?.trim() || "No overview written yet.",
      tier: ROLE_TO_TIER[input.role],
      nickname: input.nickname?.trim() || null,
      epithet: input.nickname?.trim() || input.role,
      age: input.age ? String(input.age) : null,
      gender: input.gender || null,
      occupation: input.occupation || null,
      status: input.status || null,
      alignment: input.alignment || null,
      archetype: input.archetype || null,
      povCharacter: input.povCharacter,
      personalityTraits: input.quickTraits,
      motivations: [input.motivation, input.goal].filter((v): v is string => Boolean(v)),
      motivation: input.motivation || null,
      goal: input.goal || null,
      fear: input.fear || null,
      secret: input.secret || null,
    }),
  });
  const updated = mapEntryToCharacter(res.entry);
  characters = characters.map((c) => (c.id === id ? updated : c));
  emit();
}

/** Delete a character for real. Optimistically removes it from the local cache on success. */
export async function deleteCharacter(id: string): Promise<void> {
  await apiFetch<void>(`/codex/${id}`, { method: "DELETE" });
  characters = characters.filter((c) => c.id !== id);
  emit();
}
