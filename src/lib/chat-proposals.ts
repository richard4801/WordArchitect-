"use client";

/**
 * Confirm/Reject handling for the Chat Assistant's `propose_*` tool calls
 * (see `chat-store.ts` and the backend's `src/services/chatAssistant.ts`
 * on `claude/ai-fiction-platform-backend-qnvkm5`, commit "Add confirm-gated
 * write tools to the Chat Assistant").
 *
 * A `propose_*` tool call never touches the database — the backend only
 * validates its shape and logs it into the assistant message's
 * `tool_calls` transparency record. The writer reviews it in the app
 * (`ProposalCard` in `chat-panel.tsx`) and only on an explicit Confirm does
 * this module call the real, already-existing CRUD endpoint with that
 * exact payload — the same endpoint the corresponding domain's own form
 * would call. Reject is purely a client-side UI state change: since
 * nothing was ever written, there's nothing to undo.
 *
 * The proposal's `input` *is* the request body (camelCase, matching each
 * CRUD endpoint's own accepted fields) — confirmed by reading the backend
 * route sources directly (codex.ts, worldCategories.ts, notes.ts,
 * manuscript.ts's new /manuscript/save-scene), not just the tool
 * descriptions in chatAssistant.ts. `fields` on the two Codex proposals is
 * a passthrough object (whatever POST/PATCH /api/v1/codex already accepts)
 * rather than an enumerated list, so it's spread directly into the request
 * body rather than mapped field-by-field.
 */

import { apiFetch, getUserId } from "@/lib/api-client";
import { logActivity } from "@/lib/activity-log-store";
import { refreshCharacters } from "@/lib/character-store";
import { createNote, togglePinned } from "@/lib/notes-store";
import { createWorldCategory, refreshWorld } from "@/lib/worldbuilding-store";
import { refreshManuscript } from "@/lib/manuscript-store";
import type { NoteCategory } from "@/lib/notes-data";

export class ProposalError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function confirmCreateCodexEntry(bookId: string, input: Record<string, unknown>): Promise<string> {
  const name = str(input.name);
  const entryType = str(input.entryType);
  const description = str(input.description);
  if (!name || !entryType || !description) {
    throw new ProposalError("This proposal is missing name, entryType, or description.");
  }
  const res = await apiFetch<{ entry: { id: string; name: string; entry_type: string } }>("/codex", {
    method: "POST",
    body: JSON.stringify({
      userId: getUserId(),
      bookId,
      name,
      entryType,
      description,
      ...(isRecord(input.fields) ? input.fields : {}),
    }),
  });
  if (entryType === "character") {
    refreshCharacters(bookId);
    logActivity("character", `Added character "${res.entry.name}" (via AI Assistant)`);
  } else {
    refreshWorld(bookId);
    logActivity("world", `Added "${res.entry.name}" to the Codex (via AI Assistant)`);
  }
  return `Created "${res.entry.name}".`;
}

async function confirmUpdateCodexEntry(bookId: string, input: Record<string, unknown>): Promise<string> {
  const entryId = str(input.entryId);
  if (!entryId) throw new ProposalError("This proposal is missing entryId.");
  const body: Record<string, unknown> = {};
  if (input.description !== undefined) body.description = input.description;
  if (isRecord(input.fields)) Object.assign(body, input.fields);
  if (Object.keys(body).length === 0) throw new ProposalError("This proposal has no fields to update.");

  const res = await apiFetch<{ entry: { id: string; name: string } }>(`/codex/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  refreshCharacters(bookId);
  refreshWorld(bookId);
  logActivity("character", `Updated "${res.entry.name}" (via AI Assistant)`);
  return `Updated "${res.entry.name}".`;
}

async function confirmCreateWorldCategory(bookId: string, input: Record<string, unknown>): Promise<string> {
  const name = str(input.name);
  if (!name) throw new ProposalError("This proposal is missing a name.");
  const key = await createWorldCategory(bookId, {
    name,
    description: str(input.description),
    color: str(input.color),
    iconKey: str(input.icon),
  });
  return `Created the "${name}" category (${key}).`;
}

async function confirmCreateNote(bookId: string, input: Record<string, unknown>): Promise<string> {
  const title = str(input.title);
  const excerpt = str(input.excerpt);
  const category = str(input.category) as NoteCategory | undefined;
  if (!title || !excerpt || !category) {
    throw new ProposalError("This proposal is missing title, excerpt, or category.");
  }
  const id = await createNote(bookId, { title, excerpt, category });
  if (input.pinned === true) await togglePinned(id);
  return `Added the note "${title}".`;
}

async function confirmSaveManuscriptScene(bookId: string, input: Record<string, unknown>): Promise<string> {
  const chapterNumber = typeof input.chapterNumber === "number" ? input.chapterNumber : undefined;
  const rawText = str(input.rawText);
  if (chapterNumber === undefined || !rawText) {
    throw new ProposalError("This proposal is missing chapterNumber or rawText.");
  }
  const res = await apiFetch<{ chunksSaved: number; chapterAction: "created" | "appended" }>(
    "/manuscript/save-scene",
    {
      method: "POST",
      body: JSON.stringify({ userId: getUserId(), bookId, chapterNumber, rawText }),
    },
  );
  refreshManuscript(bookId);
  logActivity("wrote", `Saved a scene into Chapter ${chapterNumber} (via AI Assistant)`);
  const chapterNote =
    res.chapterAction === "created" ? `created Chapter ${chapterNumber}` : `appended to Chapter ${chapterNumber}`;
  return `Saved — ${chapterNote}. Reopen the chapter in the editor to see it.`;
}

/**
 * Confirm one `propose_*` proposal for real. Returns a short human-readable
 * summary for the confirmed card; throws `ProposalError` (or lets an
 * `ApiError` from `apiFetch` bubble up) on failure, for the caller to show
 * inline rather than silently failing.
 */
export async function confirmProposal(tool: string, bookId: string, input: Record<string, unknown>): Promise<string> {
  switch (tool) {
    case "propose_create_codex_entry":
      return confirmCreateCodexEntry(bookId, input);
    case "propose_update_codex_entry":
      return confirmUpdateCodexEntry(bookId, input);
    case "propose_create_world_category":
      return confirmCreateWorldCategory(bookId, input);
    case "propose_create_note":
      return confirmCreateNote(bookId, input);
    case "propose_save_manuscript_scene":
      return confirmSaveManuscriptScene(bookId, input);
    default:
      throw new ProposalError(`Unknown proposal type: ${tool}`);
  }
}
