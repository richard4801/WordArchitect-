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
 *    time. Resolving WHICH run that is for a given book is `GET
 *    /planning/runs?bookId=` (see `useBookPlanningRuns` below) — a real
 *    backend endpoint, not a client-side fallback: an earlier version of
 *    this store had no way to find a run without already knowing its id
 *    (normally carried in the page's own `?run=` URL param), so closing
 *    the browser and losing that query string made a fully intact run
 *    look completely gone. That workaround (a per-browser localStorage
 *    cache of the last-seen run id) is gone now that the real endpoint
 *    exists.
 */

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch, getUserId } from "@/lib/api-client";
import {
  currentUnitKey,
  type AgentPrompt,
  type AgentPromptAuthor,
  type AgentRole,
  type ContinuityLedgerEntry,
  type EffortLevel,
  type ExtractedEntityCandidate,
  type PartChapterRange,
  type PipelineType,
  type PlanningChatMessage,
  type PlanningRun,
  type PlanningRunStatus,
  type PlanningStage,
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

/**
 * Copies every active prompt from `fromBookId` into `toBookId` — the
 * "use the same prompts as my other project" action for a brand-new
 * book, which otherwise has zero `agent_prompts` rows (scoped per
 * `book_id`) and nothing for the Planning Engine to run. Each clone goes
 * through the normal versioning path server-side, so it's safe to call
 * even if `toBookId` already has some prompts — those just move into
 * version history rather than blocking the clone. Preserves whatever
 * `authored_by` the source prompt had (confirmed by reading
 * `clonePromptsFromBook()` directly): copying from a Claude-authored book
 * keeps the copies marked `"claude"`, with the same edit-warning
 * behavior. Throws (ApiError, status 404) if the source book has no
 * active prompts of its own to clone.
 */
export async function clonePromptsFromBook(fromBookId: string, toBookId: string): Promise<AgentPrompt[]> {
  const res = await apiFetch<PromptsListResponse>("/agent-prompts/clone", {
    method: "POST",
    body: JSON.stringify({ fromBookId, toBookId }),
  });
  await loadAgentPrompts(toBookId);
  return res.prompts.map(mapPromptRow);
}

// ---------------------------------------------------------------------
// Planning run
// ---------------------------------------------------------------------

type PanelHistoryEntryRow = { panel_reviews: Record<string, unknown> | null; arbitrator_synthesis: unknown };

type PlanningRunRow = {
  id: string;
  book_id: string;
  user_id: string;
  pipeline_type: PipelineType;
  current_stage: PlanningStage;
  status: PlanningRunStatus;
  current_act: number | null;
  current_part: number | null;
  current_beat_chunk: number | null;
  part_chapter_ranges: Record<string, PartChapterRange>;
  continuity_ledger: ContinuityLedgerEntry[];
  stage_artifacts: Record<string, string>;
  // Keyed by critic role — open, since the panel's composition isn't
  // hardcoded on either side (see the backend's own PlanningRun type).
  panel_reviews: Record<string, unknown> | null;
  arbitrator_synthesis: unknown;
  stage_panel_history: Record<string, PanelHistoryEntryRow>;
  chat_history: PlanningChatMessage[];
  intake_chat_history: PlanningChatMessage[];
  final_delta_directive: string | null;
  extracted_entities: ExtractedEntityCandidate[] | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};
type RunResponse = { run: PlanningRunRow };
type RunsListResponse = { runs: PlanningRunRow[] };

function mapRunRow(row: PlanningRunRow): PlanningRun {
  const stagePanelHistory: PlanningRun["stagePanelHistory"] = {};
  for (const [unit, entry] of Object.entries(row.stage_panel_history ?? {})) {
    stagePanelHistory[unit] = { panelReviews: entry.panel_reviews, arbitratorSynthesis: entry.arbitrator_synthesis };
  }
  return {
    id: row.id,
    bookId: row.book_id,
    userId: row.user_id,
    pipelineType: row.pipeline_type ?? "full",
    currentStage: row.current_stage,
    status: row.status,
    currentAct: row.current_act,
    currentPart: row.current_part,
    currentBeatChunk: row.current_beat_chunk,
    partChapterRanges: row.part_chapter_ranges ?? {},
    continuityLedger: row.continuity_ledger ?? [],
    stageArtifacts: row.stage_artifacts ?? {},
    panelReviews: row.panel_reviews,
    arbitratorSynthesis: row.arbitrator_synthesis,
    stagePanelHistory,
    chatHistory: row.chat_history ?? [],
    intakeChatHistory: row.intake_chat_history ?? [],
    finalDeltaDirective: row.final_delta_directive,
    extractedEntities: row.extracted_entities,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- Book-scoped run list — GET /planning/runs?bookId= ----
//
// Lets the frontend resolve "what run(s) does this book have" on its own
// instead of depending on a specific run id surviving client-side. Same
// bookId-scoped single-current-book pattern as notes-store.ts/
// character-store.ts. Server-sorted most-recently-updated first, so
// `runs[0]` is always "the run to resume" for a book with exactly one
// (the common case — a book wouldn't normally have several concurrent
// plans, though old done/discarded runs can still show up here for the
// Run List screen).

let bookRunRows: PlanningRunRow[] = [];
let bookRunsBookId: string | null = null;
let bookRunsStatus: LoadStatus = "idle";
let bookRunsError: string | null = null;
const bookRunsListeners = new Set<() => void>();
function emitBookRuns() {
  for (const l of bookRunsListeners) l();
}
function subscribeBookRuns(l: () => void) {
  bookRunsListeners.add(l);
  return () => bookRunsListeners.delete(l);
}
function getBookRunRowsSnapshot() {
  return bookRunRows;
}
function getBookRunsStatusSnapshot() {
  return bookRunsStatus;
}
function getBookRunsErrorSnapshot() {
  return bookRunsError;
}

async function loadBookPlanningRuns(bookId: string): Promise<void> {
  bookRunsBookId = bookId;
  bookRunsStatus = "loading";
  bookRunsError = null;
  emitBookRuns();
  try {
    const res = await apiFetch<RunsListResponse>(`/planning/runs?bookId=${encodeURIComponent(bookId)}`);
    bookRunRows = res.runs;
    bookRunsStatus = "loaded";
  } catch (err) {
    bookRunsStatus = "error";
    bookRunsError = err instanceof Error ? err.message : "Failed to load planning runs.";
  }
  emitBookRuns();
}

/** Force a re-fetch of this book's run list — e.g. after starting or deleting a run. */
export function refreshBookPlanningRuns(bookId: string): void {
  void loadBookPlanningRuns(bookId);
}

/** Every planning run for one book, most recently updated first (screen: Run List). */
export function useBookPlanningRuns(bookId: string | undefined): PlanningRun[] {
  useEffect(() => {
    if (bookId && bookId !== bookRunsBookId) void loadBookPlanningRuns(bookId);
  }, [bookId]);
  const rows = useSyncExternalStore(subscribeBookRuns, getBookRunRowsSnapshot, getBookRunRowsSnapshot);
  return rows.map(mapRunRow);
}
export function useBookPlanningRunsLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribeBookRuns, getBookRunsStatusSnapshot, getBookRunsStatusSnapshot);
}
export function useBookPlanningRunsError(): string | null {
  return useSyncExternalStore(subscribeBookRuns, getBookRunsErrorSnapshot, getBookRunsErrorSnapshot);
}

function patchBookRunCache(row: PlanningRunRow): void {
  const idx = bookRunRows.findIndex((r) => r.id === row.id);
  if (idx === -1) {
    bookRunRows = [row, ...bookRunRows];
  } else {
    bookRunRows = bookRunRows.map((r, i) => (i === idx ? row : r));
  }
  emitBookRuns();
}

function removeFromBookRunCache(runId: string): void {
  bookRunRows = bookRunRows.filter((r) => r.id !== runId);
  emitBookRuns();
}

// ---- The single active/open run ----

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
  patchBookRunCache(row);
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

/**
 * Abandons a run outright ("Discard this plan") — removes only the run's
 * own bookkeeping row (intake/chat history, stage artifacts, panel
 * reviews). Confirmed by reading the backend's `deletePlanningRun()`
 * directly: it does NOT touch anything already materialized from a prior
 * approval — a `chapter_beats` row or `codex_entries` created before this
 * run was discarded stay exactly where they are. Clears the active-run
 * singleton if this was the one in view, and drops it from the book's run
 * list cache too, so the caller can fall back to "Start Planning" (or the
 * next run in the list) without a stale reference lingering.
 */
export async function deletePlanningRun(runId: string): Promise<void> {
  await apiFetch<void>(`/planning/runs/${runId}`, { method: "DELETE" });
  if (activeRun?.id === runId) clearActivePlanningRun();
  removeFromBookRunCache(runId);
}

/** Load (or resume) a run by id. */
export async function loadPlanningRun(runId: string): Promise<void> {
  runStatus = "loading";
  runError = null;
  emitRun();
  try {
    const res = await apiFetch<RunResponse>(`/planning/runs/${runId}`);
    // A freshly-loaded run can't vouch for a critique success from some
    // earlier session/tab — only a real callCritique() success in THIS
    // session may unlock Arbitrate on a failed run, see nextForwardStep.
    lastCritiqueSuccess = null;
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
 * `sendIntakeChatTurn`/`finalizeIntakeConversation` below). `pipelineType`
 * defaults to "full" server-side when omitted — see PipelineType in
 * planning-data.ts for what "contract" gets you instead.
 */
export async function startPlanningRun(bookId: string, pipelineType?: PipelineType): Promise<PlanningRun> {
  runStatus = "loading";
  runError = null;
  emitRun();
  try {
    const res = await apiFetch<RunResponse>("/planning/runs", {
      method: "POST",
      body: JSON.stringify({ bookId, userId: getUserId(), ...(pipelineType ? { pipelineType } : {}) }),
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
 * Takes a COMPLETED (`status: "done"`) Contract Pipeline run and creates a
 * brand new "full" pipeline run for the same book, seeded with its
 * approved Stage 1 Summary and its already-materialized Part 1 (chapters
 * 1-5) — see `promoteContractRunToFull` in the backend's planningEngine.ts.
 * Returns the NEW run and makes it the active one; the original contract
 * run is left completely untouched (a new row, not a mutation), so it
 * stays visible in the Run List as a historical record. Also refreshes
 * this book's run list so the new run shows up there without a manual
 * reload.
 */
export async function promoteContractRunToFull(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/promote-to-full`, { method: "POST" });
  const run = setActiveRun(res.run);
  refreshBookPlanningRuns(run.bookId);
  return run;
}

/**
 * Creates a NEW run reusing an EXISTING run's already-approved Stage 1
 * Summary — skips intake and Stage 1 generation entirely, landing right
 * after it for the requested `pipelineType` (codex_documentation for
 * "contract", Act 1 Summary for "full"). `sourceRunId` just needs to have
 * gotten past stage_1_summary at some point — works whether that run is
 * still in progress or fully done. A secondary/power-user affordance for
 * trying a different pipeline against a book whose premise is already
 * settled, without paying for a duplicate Stage 1 call. 409 from the
 * backend if the source run has no approved Stage 1 Summary yet.
 */
export async function branchPlanningRun(sourceRunId: string, pipelineType: PipelineType): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${sourceRunId}/branch`, {
    method: "POST",
    body: JSON.stringify({ userId: getUserId(), pipelineType }),
  });
  const run = setActiveRun(res.run);
  refreshBookPlanningRuns(run.bookId);
  return run;
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

// Real production bug (flat-model era, still just as real under the
// Act/Part hierarchy): a `failed` run's retry heuristic used to infer
// "critique already succeeded" from `panel_reviews` merely being non-null
// — but the backend's critique step only ever *writes* `panel_reviews` on
// success (`markFailed` on a critique error persists `status: "failed"`
// and `last_error` only, leaving `panel_reviews` exactly as it was before
// this attempt). On a revision cycle for the SAME unit (reject ->
// regenerate -> that critique call fails), `panel_reviews` still holds
// the *previous* draft's real critique, non-null, so the stale field
// fooled the heuristic into skipping straight to Arbitrate. Under the
// Act/Part hierarchy this needs to key on the exact UNIT, not just
// `current_stage` — many different units (every Part's outline, every
// beats chunk) all share `current_stage: "part_outline"`/`"part_beats"`,
// so stage alone isn't specific enough to say "critique succeeded for
// THIS ONE". `currentUnitKey(run)` (planning-data.ts) is what actually
// addresses a unit uniquely. Only a critique call that actually
// succeeded, in this browser session, for this exact run+unit+artifact,
// may unlock Arbitrate — never inferred from stale data.
let lastCritiqueSuccess: { runId: string; unit: string; artifact: string } | null = null;

function critiqueSucceededForCurrentArtifact(run: PlanningRun): boolean {
  const unit = currentUnitKey(run);
  return (
    lastCritiqueSuccess !== null &&
    lastCritiqueSuccess.runId === run.id &&
    lastCritiqueSuccess.unit === unit &&
    lastCritiqueSuccess.artifact === (run.stageArtifacts[unit] ?? "")
  );
}

async function callGenerate(runId: string): Promise<PlanningRun> {
  lastCritiqueSuccess = null;
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/generate`, { method: "POST" });
  return setActiveRun(res.run);
}
async function callCritique(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/critique`, { method: "POST" });
  const run = setActiveRun(res.run);
  lastCritiqueSuccess = { runId: run.id, unit: currentUnitKey(run), artifact: run.stageArtifacts[currentUnitKey(run)] ?? "" };
  return run;
}
async function callArbitrate(runId: string, excludedCritics: AgentRole[] = []): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/arbitrate`, {
    method: "POST",
    body: JSON.stringify({ excludedCritics }),
  });
  return setActiveRun(res.run);
}

/**
 * Re-arbitrates the CURRENT unit with a different set of critics — the
 * per-critique checkboxes on each critic's card in the review gate. The
 * excluded critic's own review stays visible in its own card (nothing is
 * deleted server-side); only what the Arbitrator synthesizes from changes.
 * A deliberate, explicit re-run action, separate from
 * `runPipelineForward`'s own auto-chained Generate→Critique→Arbitrate
 * (which always arbitrates with every critic included — exclusions only
 * ever come from this manual action, never inferred/persisted anywhere).
 */
export async function rerunArbitration(runId: string, excludedCritics: AgentRole[]): Promise<PlanningRun> {
  return callArbitrate(runId, excludedCritics);
}

/**
 * Skips the whole Reject → chat interview → directive path: takes the
 * Arbitrator's already-computed synthesis (mustFix/worthConsidering from
 * the last arbitrate call) and sends it straight to the Generator as a
 * directive — no extra LLM call, instant. Only ever offered once a real
 * verdict exists for the current unit (mirrors the backend's own 400 for
 * "no arbitrator synthesis yet"). Callers should follow a success with
 * `runPipelineForward` to actually run the resulting Generate call, same
 * as after `finalizePlanningDirective`.
 */
export async function applyCritiquePlanningStage(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/apply-critique`, { method: "POST" });
  return setActiveRun(res.run);
}

/**
 * Figures out which of Generate/Critique/Arbitrate a run still needs from
 * the run's own state, rather than a client-tracked "which step was in
 * flight" — this is what lets one function serve both the very first
 * "Generate" click (status starts at `generating`) and "Retry" after a
 * `failed` run. On a `failed` run, Arbitrate is only ever offered once
 * `critiqueSucceededForCurrentArtifact` confirms a real, in-session
 * Critique success for this exact unit+artifact — never inferred from
 * `panelReviews` merely being present, which can be stale from an earlier
 * cycle (see the comment above `lastCritiqueSuccess`).
 */
function nextForwardStep(run: PlanningRun): "generate" | "critique" | "arbitrate" | null {
  if (run.status === "generating") return "generate";
  if (run.status === "critiquing") return "critique";
  if (run.status === "awaiting_arbitration") return "arbitrate";
  if (run.status === "failed") {
    if (!run.stageArtifacts[currentUnitKey(run)]) return "generate";
    if (!critiqueSucceededForCurrentArtifact(run)) return "critique";
    return "arbitrate";
  }
  return null;
}

/**
 * Drives the pipeline forward on its own — Generate, then Critique, then
 * Arbitrate — stopping the moment it needs a human (`awaiting_user_review`)
 * or hits a real error (`failed`). Backs a single "Generate"/"Retry"
 * button in the UI; each underlying call is still one bounded request, so
 * nothing here risks a client-side timeout regardless of how long an
 * individual step takes (these can run a couple of minutes).
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

/**
 * The review gate's Approve action. On `part_outline`, records the Part's
 * committed chapter range. On `part_beats`, also materializes the chunk
 * into the Outliner and reconciles the Continuity Ledger. Advances to the
 * next unit per the fixed Act→Part→Beats sequence, or marks the run
 * `done` once all 3 Acts' 9 Parts are fully planned.
 */
export async function approvePlanningStage(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/approve`, { method: "POST" });
  return setActiveRun(res.run);
}

/** The review gate's Reject action — opens the chat interview (status -> user_chat_active). chat_history is never reset by this — the Arbitrator keeps continuous memory for the whole run. */
export async function rejectPlanningStage(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/reject`, { method: "POST" });
  return setActiveRun(res.run);
}

/**
 * Undoes approving whatever unit came immediately before the current one
 * and reopens ITS rejection interview directly (not its review gate — the
 * gate's job, approve or reject, was already answered), restoring that
 * unit's real panel_reviews/arbitrator_synthesis from stage_panel_history.
 * Throws (ApiError, status 409) if the current unit already has its own
 * generated artifact (reverting would silently discard it — reject the
 * current unit's own artifact instead), or if there's no previous unit.
 */
export async function unapprovePlanningStage(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/unapprove`, { method: "POST" });
  return setActiveRun(res.run);
}

/**
 * Trashes the CURRENT unit's draft outright — unlike unapprove, allowed
 * even when one already exists, that's the point — and falls back to the
 * PREVIOUS unit's review gate (not its interview; there's nothing to
 * discuss) ready to re-approve into a genuinely fresh generation. Throws
 * (ApiError, status 409) if there's no previous unit to fall back to.
 */
export async function discardPlanningStage(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/discard-stage`, { method: "POST" });
  return setActiveRun(res.run);
}

/**
 * One turn of the rejection interview. Every prior turn (intake + the
 * WHOLE run's accumulated interview history, not just this cycle) is
 * resent server-side — the Arbitrator is one continuous point of contact
 * for the run, never a fresh stranger.
 *
 * Can auto-finalize: if the Arbitrator's reply signals it understood the
 * correction and the writer confirmed they're ready, the backend strips
 * that internal signal and chains straight into `finalizeDirective`
 * itself server-side — the returned run may already be back to
 * `status: "generating"` with a fresh `finalDeltaDirective`, not just an
 * updated `chatHistory`. Callers must check `run.status` after every call:
 * on `"generating"`, show the just-arrived assistant reply as normal, then
 * immediately call `runPipelineForward` to actually run that Generate
 * call and transition out of the chat view — no separate user action, per
 * the backend's own "don't make the writer find a button for something
 * they already confirmed in conversation." `finalizePlanningDirective`
 * still exists as an explicit manual fallback for when this doesn't fire.
 */
export async function sendPlanningChatTurn(runId: string, message: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
  return setActiveRun(res.run);
}

/** Compiles the interview into a delta directive and loops back to Generating for the same unit. Callers should follow this with runPipelineForward() (via an explicit next click, not auto-chained — see planning/page.tsx) to keep driving until the next human gate. */
export async function finalizePlanningDirective(runId: string): Promise<PlanningRun> {
  const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/finalize-directive`, { method: "POST" });
  return setActiveRun(res.run);
}

// ---- Entity extraction — a side action, deliberately independent of the main pipeline's status/error state ----
//
// extractEntities/confirmEntities never touch a run's `status` server-side
// (on-demand, callable whenever the writer wants — not tied to any one
// beats-chunk approval) — an error extracting entities must never make
// the run's real pipeline position look "failed". This state is kept
// entirely separate from runStatus/runError for the same reason.

let entityActionStatus: LoadStatus = "idle";
let entityActionError: string | null = null;
const entityActionListeners = new Set<() => void>();
function emitEntityAction() {
  for (const l of entityActionListeners) l();
}
function subscribeEntityAction(l: () => void) {
  entityActionListeners.add(l);
  return () => entityActionListeners.delete(l);
}
export function useEntityActionStatus(): LoadStatus {
  return useSyncExternalStore(subscribeEntityAction, () => entityActionStatus, () => entityActionStatus);
}
export function useEntityActionError(): string | null {
  return useSyncExternalStore(subscribeEntityAction, () => entityActionError, () => entityActionError);
}

/** On-demand entity scan — scans every approved Part Beats chunk in the run so far. Populates run.extractedEntities; does not change run.status. */
export async function extractPlanningEntities(runId: string): Promise<PlanningRun> {
  entityActionStatus = "loading";
  entityActionError = null;
  emitEntityAction();
  try {
    const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/entities/extract`, { method: "POST" });
    const run = setActiveRun(res.run);
    entityActionStatus = "loaded";
    emitEntityAction();
    return run;
  } catch (err) {
    entityActionStatus = "error";
    entityActionError = err instanceof Error ? err.message : "Couldn't extract entities.";
    emitEntityAction();
    throw err;
  }
}

/** The entity batch-review screen's confirm action — only the listed indexes get written to real Codex/World Category rows server-side; everything else is discarded. Does not change run.status. */
export async function confirmPlanningEntities(runId: string, approvedIndexes: number[]): Promise<PlanningRun> {
  entityActionStatus = "loading";
  entityActionError = null;
  emitEntityAction();
  try {
    const res = await apiFetch<RunResponse>(`/planning/runs/${runId}/entities/confirm`, {
      method: "POST",
      body: JSON.stringify({ approvedIndexes }),
    });
    const run = setActiveRun(res.run);
    entityActionStatus = "loaded";
    emitEntityAction();
    return run;
  } catch (err) {
    entityActionStatus = "error";
    entityActionError = err instanceof Error ? err.message : "Couldn't save the selected entities.";
    emitEntityAction();
    throw err;
  }
}

// ---------------------------------------------------------------------
// Platform Craft Notes — a per-BOOK (not per-run) reference doc feeding
// {{PLATFORM_TRENDS}} into the Contract Pipeline's codex_documentation/
// hook_chapters_outline units. Backed by the real /platform-craft-notes
// GET/PATCH/POST-research(/discard) endpoints — see platformCraftNotes.ts
// on the backend. Deliberately NOT a live/scheduled feed: PATCH is the
// only way these notes ever actually get saved.
//
// A research pass is a detached background job, not a request/response
// round trip — POST /research returns immediately (202) with
// draftStatus: "running" already set; the real Claude+web_search/web_fetch
// call keeps running server-side, independent of this tab, and its result
// lands back on the same row (draft_content/draft_error) for a later GET
// to pick up. So this store never treats a POST /research response as "the
// draft" — it's just confirmation the job started — and the UI is expected
// to poll GET while draftStatus is "running" (see
// usePlatformCraftNotesPolling below). Saving via PATCH resets draftStatus
// to "idle" server-side (a draft is either accepted into `content` or
// explicitly discarded, never left as a stale "ready" banner) — this store
// just reflects whatever row PATCH/discard hand back, no separate reset
// needed client-side. bookId-scoped single-current-book, same pattern as
// Notes/Banned Terms.
// ---------------------------------------------------------------------

export type PlatformResearchStatus = "idle" | "running" | "ready" | "failed";

export type PlatformCraftNotes = {
  bookId: string;
  content: string;
  updatedAt: string | null;
  draftStatus: PlatformResearchStatus;
  draftContent: string | null;
  draftError: string | null;
  draftUpdatedAt: string | null;
};
// Unlike every other domain's response shape in this app (books.ts,
// codex.ts, notes.ts all return the raw snake_case Postgres row untouched),
// this route's service layer (toPlatformCraftNotes in the backend's
// platformCraftNotes.ts) converts the DB row into the backend's own
// camelCase `PlatformCraftNotes` domain type BEFORE the route ships it —
// `res.json({ notes: await getPlatformCraftNotes(bookId) })` sends that
// already-camelCased object directly, not the raw row. Confirmed by
// reading that file directly after a production report (GET consistently
// returning draftStatus "idle"/draftContent null despite the backend's own
// internal conflict-check independently confirming a real "ready" row
// exists) turned out to be this exact mismatch — every field this store
// was reading under a snake_case name was silently `undefined` the whole
// time. So, uniquely for this one domain, the response really is
// camelCase — don't "fix" this back to snake_case if some other part of
// this backend later gets read and looks inconsistent; this route is the
// actual exception, confirmed against its live source.
type PlatformCraftNotesRow = {
  bookId: string;
  content: string;
  updatedAt: string | null;
  draftStatus?: PlatformResearchStatus;
  draftContent?: string | null;
  draftError?: string | null;
  draftUpdatedAt?: string | null;
};
type PlatformCraftNotesResponse = { notes: PlatformCraftNotesRow };

function mapPlatformCraftNotesRow(row: PlatformCraftNotesRow): PlatformCraftNotes {
  return {
    bookId: row.bookId,
    content: row.content,
    updatedAt: row.updatedAt,
    draftStatus: row.draftStatus ?? "idle",
    draftContent: row.draftContent ?? null,
    draftError: row.draftError ?? null,
    draftUpdatedAt: row.draftUpdatedAt ?? null,
  };
}

let platformNotes: PlatformCraftNotes | null = null;
let platformNotesStatus: LoadStatus = "idle";
let platformNotesError: string | null = null;
const platformNotesListeners = new Set<() => void>();
function emitPlatformNotes() {
  for (const l of platformNotesListeners) l();
}
function subscribePlatformNotes(l: () => void) {
  platformNotesListeners.add(l);
  return () => platformNotesListeners.delete(l);
}

async function loadPlatformCraftNotes(bookId: string): Promise<void> {
  platformNotesStatus = "loading";
  platformNotesError = null;
  emitPlatformNotes();
  try {
    const res = await apiFetch<PlatformCraftNotesResponse>(`/platform-craft-notes?bookId=${encodeURIComponent(bookId)}`);
    platformNotes = mapPlatformCraftNotesRow(res.notes);
    platformNotesStatus = "loaded";
  } catch (err) {
    platformNotesStatus = "error";
    platformNotesError = err instanceof Error ? err.message : "Couldn't load Platform Craft Notes.";
  }
  emitPlatformNotes();
}

/** Force a re-fetch of this book's Platform Craft Notes — e.g. while polling a running research job, or after save/discard. */
export function refreshPlatformCraftNotes(bookId: string): void {
  void loadPlatformCraftNotes(bookId);
}

/**
 * The book's saved Platform Craft Notes plus any in-flight/ready/failed
 * research draft state — `content: ""`/`draftStatus: "idle"` for a book
 * that's never saved or researched any.
 *
 * Fetches fresh on EVERY mount, not just the first time this bookId is
 * seen — real bug this fixed: a `bookId !== platformNotesBookId` guard
 * here meant navigating away from the panel and back (unmounting and
 * remounting `PlatformCraftNotesView` for the same book) skipped the
 * fetch entirely, since the module-level `platformNotesBookId` singleton
 * still matched. The panel then rendered off whatever was last cached —
 * often still `draftStatus: "running"` from before the research job
 * actually finished server-side — with no polling interval running to
 * ever refresh it (that interval died when the component unmounted; see
 * `usePlatformCraftNotesPolling` below). GET is the only source of truth
 * for a detached background job like this one, so it must be re-checked
 * every time the panel becomes visible, not just once per bookId.
 */
export function usePlatformCraftNotes(bookId: string | undefined): PlatformCraftNotes | null {
  useEffect(() => {
    if (bookId) void loadPlatformCraftNotes(bookId);
  }, [bookId]);
  return useSyncExternalStore(subscribePlatformNotes, () => platformNotes, () => platformNotes);
}
export function usePlatformCraftNotesLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribePlatformNotes, () => platformNotesStatus, () => platformNotesStatus);
}
export function usePlatformCraftNotesError(): string | null {
  return useSyncExternalStore(subscribePlatformNotes, () => platformNotesError, () => platformNotesError);
}

/** The only way these notes actually get saved — whether the content came from editing a research draft or writing it directly. Also resets draftStatus to "idle" server-side. */
export async function savePlatformCraftNotes(bookId: string, content: string): Promise<PlatformCraftNotes> {
  const res = await apiFetch<PlatformCraftNotesResponse>("/platform-craft-notes", {
    method: "PATCH",
    body: JSON.stringify({ bookId, content }),
  });
  platformNotes = mapPlatformCraftNotesRow(res.notes);
  platformNotesStatus = "loaded";
  emitPlatformNotes();
  return platformNotes;
}

/**
 * Starts an on-demand, billed research pass (Claude + web search/fetch) as
 * a detached background job — returns almost immediately with
 * draftStatus: "running" already reflected in the cache. Does NOT return
 * the eventual draft text; the caller must poll (`refreshPlatformCraftNotes`
 * on an interval, or `usePlatformCraftNotesPolling` below) until
 * draftStatus becomes "ready" (draftContent populated) or "failed"
 * (draftError populated). The backend itself refuses to start a second
 * job while one's already running for this book and just returns the
 * existing in-flight state, so calling this again mid-run is harmless.
 *
 * Also refuses (409) to start a fresh pass while an unsaved "ready" draft
 * is still waiting for review — pass `force: true` to discard that draft
 * and start over anyway (equivalent to calling
 * `discardPlatformCraftNotesDraft` first). On any failure — including this
 * 409 — the caller should re-fetch (`refreshPlatformCraftNotes`) rather
 * than trust the cache: a 409 here specifically means the backend's row
 * already differs from whatever this store last cached (real content is
 * sitting there waiting), and unrelated failures might too.
 */
export async function startPlatformCraftNotesResearch(bookId: string, force = false): Promise<PlatformCraftNotes> {
  const res = await apiFetch<PlatformCraftNotesResponse>("/platform-craft-notes/research", {
    method: "POST",
    body: JSON.stringify({ bookId, force }),
  });
  platformNotes = mapPlatformCraftNotesRow(res.notes);
  platformNotesStatus = "loaded";
  emitPlatformNotes();
  return platformNotes;
}

/** Discards a "ready" or "failed" draft without saving it — resets draftStatus to "idle" server-side. Leaves the last actually-saved `content` untouched. */
export async function discardPlatformCraftNotesDraft(bookId: string): Promise<PlatformCraftNotes> {
  const res = await apiFetch<PlatformCraftNotesResponse>("/platform-craft-notes/research/discard", {
    method: "POST",
    body: JSON.stringify({ bookId }),
  });
  platformNotes = mapPlatformCraftNotesRow(res.notes);
  platformNotesStatus = "loaded";
  emitPlatformNotes();
  return platformNotes;
}

/**
 * Polls GET /platform-craft-notes on an interval while `active` — this
 * call is cheap/free (a plain row read, no LLM call), so polling every
 * ~7s while a research job is running is harmless. The sanctioned
 * "subscribe, then act in a callback" effect shape (never setState
 * synchronously in the effect body) — same pattern useElapsedSeconds uses
 * elsewhere in this codebase for the same React Compiler lint reason.
 */
export function usePlatformCraftNotesPolling(bookId: string | undefined, active: boolean): void {
  useEffect(() => {
    if (!active || !bookId) return;
    const interval = window.setInterval(() => refreshPlatformCraftNotes(bookId), 7000);
    return () => window.clearInterval(interval);
  }, [bookId, active]);
}
