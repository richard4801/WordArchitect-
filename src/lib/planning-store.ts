"use client";

/**
 * Real backend-backed Planning Engine store — wraps `/api/v1/agent-prompts`
 * (the Prompt Editor's CRUD) and `/api/v1/planning/runs` (the pipeline
 * state machine). See planning-data.ts for the full shape reference and
 * the backend's own `src/routes/agentPrompts.ts` / `src/routes/planning.ts`
 * / `src/services/planningEngine.ts` for the authoritative contract this
 * was wired against (read directly, not just the handoff doc's summary —
 * same discipline every other domain integration in this app follows).
 *
 * Two independent pieces of state:
 * 1. Agent prompts — every version of every role/stage for one book,
 *    bookId-scoped single-current-book (same pattern as notes-store.ts /
 *    banned-terms-store.ts), since the Prompt Editor is only ever open
 *    for one project.
 * 2. The active planning run — a true singleton, like the manuscript
 *    editor's chapter-body cache. Only one run is ever being driven at a
 *    time; its `id` is what the page persists in the URL to resume after
 *    a refresh (see planning/page.tsx).
 */

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch, getUserId } from "@/lib/api-client";
import type {
  AgentPrompt,
  AgentPromptAuthor,
  AgentRole,
  EffortLevel,
  ExtractedEntityCandidate,
  PlanningChatMessage,
  PlanningRun,
  PlanningRunStatus,
  PlanningStage,
} from "@/lib/planning-data";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

// ---------------------------------------------------------------------
// Agent Prompts
// ---------------------------------------------------------------------

type AgentPromptRow = {
  id: string;
  book_id: string;
  agent_role: AgentRole;
  stage: PlanningStage;
  version: number;
  is_active: boolean;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  effort: EffortLevel;
  // Not declared on the backend's own AgentPrompt TypeScript interface as
  // of this writing, but the underlying column is real and `select("*")`
  // returns it regardless — optional/nullable here so a row that
  // genuinely lacks it doesn't break the mapping, just reads as "writer".
  authored_by?: AgentPromptAuthor | null;
  created_at: string;
};
type PromptsListResponse = { prompts: AgentPromptRow[] };
type PromptResponse = { prompt: AgentPromptRow };

function mapPromptRow(row: AgentPromptRow): AgentPrompt {
  return {
    id: row.id,
    bookId: row.book_id,
    agentRole: row.agent_role,
    stage: row.stage,
    version: row.version,
    isActive: row.is_active,
    systemPrompt: row.system_prompt,
    userPromptTemplate: row.user_prompt_template,
    model: row.model,
    effort: row.effort,
    authoredBy: row.authored_by ?? "writer",
    createdAt: row.created_at,
  };
}

let promptRows: AgentPromptRow[] = [];
let promptsBookId: string | null = null;
let promptsStatus: LoadStatus = "idle";
let promptsError: string | null = null;
const promptListeners = new Set<() => void>();
function emitPrompts() {
  for (const l of promptListeners) l();
}
function subscribePrompts(l: () => void) {
  promptListeners.add(l);
  return () => promptListeners.delete(l);
}
function getPromptRowsSnapshot() {
  return promptRows;
}
function getPromptsStatusSnapshot() {
  return promptsStatus;
}
function getPromptsErrorSnapshot() {
  return promptsError;
}

async function loadAgentPrompts(bookId: string): Promise<void> {
  promptsBookId = bookId;
  promptsStatus = "loading";
  promptsError = null;
  emitPrompts();
  try {
    const res = await apiFetch<PromptsListResponse>(`/agent-prompts?bookId=${encodeURIComponent(bookId)}`);
    promptRows = res.prompts;
    promptsStatus = "loaded";
  } catch (err) {
    promptsStatus = "error";
    promptsError = err instanceof Error ? err.message : "Failed to load agent prompts.";
  }
  emitPrompts();
}

/** Force a re-fetch — e.g. after a save/delete, or if a prompt might have been edited by another surface (MCP tool surface, most plausibly). */
export function refreshAgentPrompts(bookId: string): void {
  void loadAgentPrompts(bookId);
}

export function useAgentPrompts(bookId: string | undefined): AgentPrompt[] {
  useEffect(() => {
    if (bookId && bookId !== promptsBookId) void loadAgentPrompts(bookId);
  }, [bookId]);
  const rows = useSyncExternalStore(subscribePrompts, getPromptRowsSnapshot, getPromptRowsSnapshot);
  return rows.map(mapPromptRow);
}
export function useAgentPromptsLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribePrompts, getPromptsStatusSnapshot, getPromptsStatusSnapshot);
}
export function useAgentPromptsError(): string | null {
  return useSyncExternalStore(subscribePrompts, getPromptsErrorSnapshot, getPromptsErrorSnapshot);
}

export type NewAgentPromptInput = {
  agentRole: AgentRole;
  stage: PlanningStage;
  systemPrompt: string;
  userPromptTemplate: string;
  model?: string;
  effort?: EffortLevel;
};

/**
 * Saves a new version and activates it immediately, deactivating whatever
 * was previously active for this exact role+stage — the only "save"
 * action in the editor, there's no separate draft/publish step. Refetches
 * the whole list afterward rather than patching the cache by hand: the
 * server-side deactivation of the prior version is exactly the kind of
 * side effect that's easy to get subtly wrong reproducing client-side,
 * and this list is small (a handful of rows per book) so a full refetch
 * is cheap.
 */
export async function saveAgentPromptVersion(bookId: string, input: NewAgentPromptInput): Promise<AgentPrompt> {
  const res = await apiFetch<PromptResponse>("/agent-prompts", {
    method: "POST",
    body: JSON.stringify({
      bookId,
      agentRole: input.agentRole,
      stage: input.stage,
      systemPrompt: input.systemPrompt,
      userPromptTemplate: input.userPromptTemplate,
      model: input.model,
      effort: input.effort,
    }),
  });
  await loadAgentPrompts(bookId);
  return mapPromptRow(res.prompt);
}

export type AgentPromptEdit = Partial<{
  systemPrompt: string;
  userPromptTemplate: string;
  model: string;
  effort: EffortLevel;
  isActive: boolean;
}>;

/** Edits an existing version's content in place (no new version created), or pass `isActive: true` to reactivate an older version instead. */
export async function updateAgentPromptVersion(bookId: string, id: string, edit: AgentPromptEdit): Promise<AgentPrompt> {
  const res = await apiFetch<PromptResponse>(`/agent-prompts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(edit),
  });
  await loadAgentPrompts(bookId);
  return mapPromptRow(res.prompt);
}

/** Throws (ApiError, status 409) if `id` is the currently active version for its role+stage — the backend refuses to leave a step with nothing to run. Reactivate a different version or delete that one first. */
export async function deleteAgentPromptVersion(bookId: string, id: string): Promise<void> {
  await apiFetch<void>(`/agent-prompts/${id}`, { method: "DELETE" });
  await loadAgentPrompts(bookId);
}

// ---------------------------------------------------------------------
// Planning run
// ---------------------------------------------------------------------

type PlanningRunRow = {
  id: string;
  book_id: string;
  user_id: string;
  current_stage: Exclude<PlanningStage, "all" | "intake">;
  status: PlanningRunStatus;
  stage_artifacts: Partial<Record<Exclude<PlanningStage, "all" | "intake">, string>>;
  panel_reviews: { logic_critic?: unknown; suspense_critic?: unknown } | null;
  arbitrator_synthesis: unknown;
  chat_history: PlanningChatMessage[];
  intake_chat_history: PlanningChatMessage[];
  final_delta_directive: string | null;
  extracted_entities: ExtractedEntityCandidate[] | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};
type RunResponse = { run: PlanningRunRow };

function mapRunRow(row: PlanningRunRow): PlanningRun {
  return {
    id: row.id,
    bookId: row.book_id,
    userId: row.user_id,
    currentStage: row.current_stage,
    status: row.status,
    stageArtifacts: row.stage_artifacts ?? {},
    panelReviews: row.panel_reviews,
    arbitratorSynthesis: row.arbitrator_synthesis,
    chatHistory: row.chat_history ?? [],
    intakeChatHistory: row.intake_chat_history ?? [],
    finalDeltaDirective: row.final_delta_directive,
    extractedEntities: row.extracted_entities,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

let activeRun: PlanningRun | null = null;
let runStatus: LoadStatus = "idle";
let runError: string | null = null;
const runListeners = new Set<() => void>();
function emitRun() {
  for (const l of runListeners) l();
}
function subscribeRun(l: () => void) {
  runListeners.add(l);
  return () => runListeners.delete(l);
}

function setActiveRun(row: PlanningRunRow): PlanningRun {
  activeRun = mapRunRow(row);
  runStatus = "loaded";
  runError = null;
  emitRun();
  return activeRun;
}

export function useActivePlanningRun(): { run: PlanningRun | null; status: LoadStatus; error: string | null } {
  const run = useSyncExternalStore(subscribeRun, () => activeRun, () => activeRun);
  const status = useSyncExternalStore(subscribeRun, () => runStatus, () => runStatus);
  const error = useSyncExternalStore(subscribeRun, () => runError, () => runError);
  return { run, status, error };
}

/** Clears the in-view run — e.g. leaving the Planning workspace, or starting over after `done`. */
export function clearActivePlanningRun(): void {
  activeRun = null;
  runStatus = "idle";
  runError = null;
  emitRun();
}

/** Load (or resume) a run by id — the only thing the page needs to persist client-side (its own `?run=` URL param) to pick a session back up after a refresh. */
export async function loadPlanningRun(runId: string): Promise<void> {
  runStatus = "loading";
  runError = null;
  emitRun();
  try {
    const res = await apiFetch<RunResponse>(`/planning/runs/${runId}`);
    setActiveRun(res.run);
  } catch (err) {
    runStatus = "error";
    runError = err instanceof Error ? err.message : "Couldn't load this planning run.";
    emitRun();
  }
}

/**
 * Starts a brand-new run for this book and makes it the active run — NOT
 * Stage 1 yet. A fresh run opens in `intake_active`: a conversation where
 * the writer describes the book before the Generator ever runs (see
 * `sendIntakeChatTurn`/`finalizeIntakeConversation` below).
 */
export async function startPlanningRun(bookId: string): Promise<PlanningRun> {
  runStatus = "loading";
  runError = null;
  emitRun();
  try {
    const res = await apiFetch<RunResponse>("/planning/runs", {
      method: "POST",
      body: JSON.stringify({ bookId, userId: getUserId() }),
    });
    return setActiveRun(res.run);
  } catch (err) {
    runStatus = "error";
    runError = err instanceof Error ? err.message : "Couldn't start a planning run.";
    emitRun();
    throw err;
  }
}

/**
 * One turn of the pre-Stage-1 intake conversation. Pasting a URL directly
 * in `message` is enough — the backend gives Claude a server-side
 * web_fetch tool that reads the page itself, no client-side fetching
 * needed. `document`, if given, is read for this one call only and never
 * persisted — this is a one-shot "attach a reference" input, not a saved
 * asset, so there's nothing to clean up client-side either.
 */
export async function sendIntakeChatTurn(
  runId: string,
  message: string,
  document?: { base64: string; mediaType: string },
): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/intake-chat`, {
    method: "POST",
    body: JSON.stringify({
      message,
      documentBase64: document?.base64,
      documentMediaType: document?.mediaType,
    }),
  });
  return setActiveRun(res.run);
}

/** Compiles the intake conversation into the Generator's first directive and opens Stage 1 (status -> generating). */
export async function finalizeIntakeConversation(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/intake-finalize`, { method: "POST" });
  return setActiveRun(res.run);
}

async function callGenerate(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/generate`, { method: "POST" });
  return setActiveRun(res.run);
}
async function callCritique(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/critique`, { method: "POST" });
  return setActiveRun(res.run);
}
async function callArbitrate(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/arbitrate`, { method: "POST" });
  return setActiveRun(res.run);
}

/**
 * Figures out which of Generate/Critique/Arbitrate a run still needs from
 * the run's own state, rather than a client-tracked "which step was in
 * flight" — this is what lets one function serve both the very first
 * "Generate" click (status starts at `generating`) and "Retry" after a
 * `failed` run (status alone doesn't say which step blew up, but whether
 * this stage already has an artifact / panel reviews does).
 */
function nextForwardStep(run: PlanningRun): "generate" | "critique" | "arbitrate" | null {
  if (run.status === "generating") return "generate";
  if (run.status === "critiquing") return "critique";
  if (run.status === "awaiting_arbitration") return "arbitrate";
  if (run.status === "failed") {
    if (!run.stageArtifacts[run.currentStage]) return "generate";
    if (!run.panelReviews) return "critique";
    return "arbitrate";
  }
  return null;
}

/**
 * Drives the pipeline forward on its own — Generate, then Critique, then
 * Arbitrate — stopping the moment it needs a human (`awaiting_user_review`)
 * or hits a real error (`failed`). Backs a single "Generate"/"Retry"
 * button in the UI rather than three separate clicks per the backend
 * doc's own suggestion that auto-chaining is better UX; each underlying
 * call is still one bounded request, so nothing here risks a client-side
 * timeout regardless of how long an individual step takes.
 */
export async function runPipelineForward(runId: string): Promise<PlanningRun> {
  if (!activeRun || activeRun.id !== runId) await loadPlanningRun(runId);
  if (!activeRun) throw new Error("Planning run not found.");
  let run = activeRun;
  for (;;) {
    const step = nextForwardStep(run);
    if (!step) break;
    if (step === "generate") run = await callGenerate(runId);
    else if (step === "critique") run = await callCritique(runId);
    else run = await callArbitrate(runId);
    if (run.status === "failed") break;
  }
  return run;
}

/** The review gate's Approve action. On Stage 3 this also writes the approved beats into the real Outliner (chapter_beats) and kicks off entity extraction; on Stage 1/2 it just advances to the next stage's Generate step. */
export async function approvePlanningStage(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/approve`, { method: "POST" });
  return setActiveRun(res.run);
}

/** The review gate's Reject action — opens the chat interview (status -> user_chat_active, chat history reset). */
export async function rejectPlanningStage(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/reject`, { method: "POST" });
  return setActiveRun(res.run);
}

/** One turn of the rejection interview. */
export async function sendPlanningChatTurn(runId: string, message: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  return setActiveRun(res.run);
}

/** Compiles the interview into a delta directive and loops back to Generating for the same stage. Callers should follow this with runPipelineForward() to keep driving until the next human gate, rather than leaving the run sitting at `generating` unattended. */
export async function finalizePlanningDirective(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/finalize-directive`, { method: "POST" });
  return setActiveRun(res.run);
}

/** The entity batch-review screen's confirm action — only the listed indexes get written to real Codex/World Category rows server-side; everything else is discarded. Status becomes `done`. */
export async function confirmPlanningEntities(runId: string, approvedIndexes: number[]): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/entities/confirm`, {
    method: "POST",
    body: JSON.stringify({ approvedIndexes }),
  });
  return setActiveRun(res.run);
}
