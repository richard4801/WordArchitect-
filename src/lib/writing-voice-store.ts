"use client";

/**
 * Real backend-backed Writing Voice store — wraps the WordArchitect
 * backend's `/api/v1/writing-voice`. Deliberately scoped by `userId`
 * alone, with no `bookId` anywhere in its request/response shapes — this
 * is a standing per-writer preference applied silently to every
 * `/generate-prose` call once a sample exists, not a per-project setting.
 * Belongs on a Settings/Profile screen, not inside a book's editor.
 *
 * Singleton cache, same shape as `auth-store.ts`'s own session state —
 * there's exactly one writing-voice profile per signed-in account, never
 * a list, so this doesn't need the Map-keyed-by-bookId pattern most other
 * stores in this app use.
 */

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch, getUserId } from "@/lib/api-client";

export type WritingVoiceProfile = {
  id: string;
  user_id: string;
  sample_text: string;
  style_profile: string | null;
  extraction_error: string | null;
  updated_at: string;
};

export type LoadStatus = "idle" | "loading" | "loaded" | "error";
export type ActionStatus = "idle" | "saving" | "analyzing" | "clearing";

type GetResponse = { profile: WritingVoiceProfile | null };
type SaveResponse = { profile: WritingVoiceProfile; extractionFailed: boolean };
type ExtractResponse = { profile: WritingVoiceProfile };

let profile: WritingVoiceProfile | null = null;
let loadStatus: LoadStatus = "idle";
let loadError: string | null = null;
let hasStartedLoad = false;

let actionStatus: ActionStatus = "idle";
let actionError: string | null = null;

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getProfileSnapshot() {
  return profile;
}
function getLoadStatusSnapshot() {
  return loadStatus;
}
function getLoadErrorSnapshot() {
  return loadError;
}
function getActionStatusSnapshot() {
  return actionStatus;
}
function getActionErrorSnapshot() {
  return actionError;
}

async function loadWritingVoice(): Promise<void> {
  loadStatus = "loading";
  loadError = null;
  emit();
  try {
    const res = await apiFetch<GetResponse>(`/writing-voice?userId=${encodeURIComponent(getUserId())}`);
    profile = res.profile;
    loadStatus = "loaded";
  } catch (err) {
    loadStatus = "error";
    loadError = err instanceof Error ? err.message : "Couldn't load your writing voice.";
  }
  emit();
}

/** Loads once per session on first mount; every later mount reuses the live cache. */
export function useWritingVoice(): WritingVoiceProfile | null {
  useEffect(() => {
    if (!hasStartedLoad) {
      hasStartedLoad = true;
      void loadWritingVoice();
    }
  }, []);
  return useSyncExternalStore(subscribe, getProfileSnapshot, getProfileSnapshot);
}

export function useWritingVoiceLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribe, getLoadStatusSnapshot, getLoadStatusSnapshot);
}
export function useWritingVoiceLoadError(): string | null {
  return useSyncExternalStore(subscribe, getLoadErrorSnapshot, getLoadErrorSnapshot);
}
export function useWritingVoiceActionStatus(): ActionStatus {
  return useSyncExternalStore(subscribe, getActionStatusSnapshot, getActionStatusSnapshot);
}
export function useWritingVoiceActionError(): string | null {
  return useSyncExternalStore(subscribe, getActionErrorSnapshot, getActionErrorSnapshot);
}

/**
 * Saves a pasted sample and triggers analysis in one call — no separate
 * save/analyze step on first paste. Returns `extractionFailed` so the
 * caller can show a non-blocking warning rather than treating this as a
 * failed call; the sample is saved either way. The backend deliberately
 * never blanks a previously-good `style_profile` on a failed
 * re-extraction, and neither does this — whatever `profile` comes back
 * (stale-but-good profile, fresh sample) replaces the cache as-is.
 */
export async function saveWritingVoice(sampleText: string): Promise<{ extractionFailed: boolean }> {
  actionStatus = "saving";
  actionError = null;
  emit();
  try {
    const res = await apiFetch<SaveResponse>("/writing-voice", {
      method: "POST",
      body: JSON.stringify({ userId: getUserId(), sampleText }),
    });
    profile = res.profile;
    loadStatus = "loaded";
    actionStatus = "idle";
    emit();
    return { extractionFailed: res.extractionFailed };
  } catch (err) {
    actionStatus = "idle";
    actionError = err instanceof Error ? err.message : "Couldn't save your writing sample.";
    emit();
    throw err;
  }
}

/** Re-runs analysis against the already-saved sample — no re-paste required. */
export async function reanalyzeWritingVoice(): Promise<void> {
  actionStatus = "analyzing";
  actionError = null;
  emit();
  try {
    const res = await apiFetch<ExtractResponse>("/writing-voice/extract", {
      method: "POST",
      body: JSON.stringify({ userId: getUserId() }),
    });
    profile = res.profile;
    loadStatus = "loaded";
    actionStatus = "idle";
  } catch (err) {
    actionStatus = "idle";
    actionError = err instanceof Error ? err.message : "Couldn't re-analyze your writing sample.";
  }
  emit();
}

/** Clears both the sample and the derived profile — no undo; Hanami falls back to its default voice for this writer immediately afterward. */
export async function clearWritingVoice(): Promise<void> {
  actionStatus = "clearing";
  actionError = null;
  emit();
  try {
    await apiFetch<void>(`/writing-voice?userId=${encodeURIComponent(getUserId())}`, { method: "DELETE" });
    profile = null;
    loadStatus = "loaded";
    actionStatus = "idle";
    emit();
  } catch (err) {
    actionStatus = "idle";
    actionError = err instanceof Error ? err.message : "Couldn't clear your writing voice.";
    emit();
    throw err;
  }
}
