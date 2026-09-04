/**
 * Types and static reference metadata for the Planning Engine — a
 * pre-writing pipeline: an **intake conversation** first (the writer
 * describes the book in plain language, a link, or an attached document),
 * then Stage 1 Core Summary, then a strict, incremental **Act → Part →
 * Beats hierarchy**: 3 fixed Acts, each with 3 fixed Parts, each Part
 * planned as an outline pass then one or more beats-chunk passes. Every
 * unit (Stage 1 Summary, each Act Summary, each Part Outline, each Part's
 * beats chunks) goes through the identical cycle — generate, reviewed by
 * a 3-critic Scrutiny Panel, synthesized by an Arbitrator, and gated on
 * explicit human approval — before the next unit unlocks. This never
 * writes manuscript prose; that's still exclusively the Generate/Hanami
 * flow. Backed by the real backend's `agent_prompts` and `planning_runs`
 * tables (see the backend repo's `src/routes/agentPrompts.ts` /
 * `src/routes/planning.ts` and `src/services/planningEngine.ts`).
 *
 * Replaced a flat 3-stage model (Summary → whole-book Acts → whole-book
 * Beats) after the backend confirmed live that planning an entire book's
 * Act structure (or Chapter Beats) in one call produces real internal
 * contradictions — see `src/services/planningEngine.ts`'s own comment.
 * Nothing here plans further ahead of the book than the writer has
 * actually approved so far, which is also why the hierarchy is meant to
 * be worked alongside real drafting over weeks, not finished in one
 * sitting — a run can be picked back up wherever it was left, including
 * on a different browser/device (see `useBookPlanningRuns` in
 * `planning-store.ts`, backed by the real `GET /planning/runs?bookId=`).
 *
 * Every agent's behavior comes from a database row someone authors and
 * saves through the Prompt Editor — the backend contains zero prompt
 * content of its own. See `AgentPromptAuthor` below for how the editor
 * warns before an edit over a Claude-authored version.
 */

export type AgentRole =
  | "generator"
  | "continuity_critic"
  | "pacing_critic"
  | "craft_critic"
  | "arbitrator_panel"
  | "arbitrator_chat"
  | "arbitrator_directive"
  | "entity_extractor"
  | "ledger_extractor"
  | "platform_researcher";

export const AGENT_ROLES: AgentRole[] = [
  "generator",
  "continuity_critic",
  "pacing_critic",
  "craft_critic",
  "arbitrator_panel",
  "arbitrator_chat",
  "arbitrator_directive",
  "entity_extractor",
  "ledger_extractor",
  "platform_researcher",
];

/**
 * The critics making up the Scrutiny Panel, run in parallel by the
 * backend's `runCritique` — mirrors `CRITIC_ROLES` in the backend's own
 * `src/types/domain.ts`, a plain array (not hardcoded call sites) so
 * adding/removing a critic is a one-line change on both sides, not a
 * frontend rewrite. This list exists for display ordering/defaults only —
 * the actual Critique results panel (`UnitReview` in planning/page.tsx)
 * renders one card per key actually present in a run's `panelReviews`,
 * not this fixed list.
 */
export const CRITIC_ROLES: AgentRole[] = ["continuity_critic", "pacing_critic", "craft_critic"];

export const AGENT_ROLE_META: Record<AgentRole, { label: string; description: string }> = {
  generator: {
    label: "Generator",
    description: "Writes each unit's artifact — the Core Summary, an Act Summary, a Part Outline, or a Part's Beats chunk.",
  },
  continuity_critic: {
    label: "Continuity Critic",
    description: "Reviews the artifact for canon, timeline, and logic consistency — checks the Continuity Ledger first, ahead of even Codex contradiction.",
  },
  pacing_critic: {
    label: "Pacing & Chapter-Economy Critic",
    description: "Reviews chapter-to-plot ratio, decompression, cliffhanger cadence, and retention-curve pacing.",
  },
  craft_critic: {
    label: "Craft & Suspense Critic",
    description: "Reviews subtext, hook quality, anti-cliché, and foreshadowing/payoff.",
  },
  arbitrator_panel: {
    label: "Arbitrator — Panel Synthesis",
    description: "Synthesizes all three critics' reviews into one verdict for the human review gate.",
  },
  arbitrator_chat: {
    label: "Arbitrator — Chat",
    description: "Runs the conversation for the pre-Stage-1 intake, and the interview after a unit is rejected at the review gate.",
  },
  arbitrator_directive: {
    label: "Arbitrator — Directive",
    description: "Compiles the intake conversation or a rejection interview into a delta directive for the next generation.",
  },
  entity_extractor: {
    label: "Entity Extractor",
    description: "On-demand: scans every approved Part Beats chunk so far and proposes new Codex/World Category candidates.",
  },
  ledger_extractor: {
    label: "Ledger Extractor",
    description: "Runs automatically after each Part's beats are approved — extracts hard facts (numbers, rules, established states) into the Continuity Ledger, reconciled against real drafted chapters where they exist.",
  },
  platform_researcher: {
    label: "Platform Researcher",
    description: "On-demand research pass (web search/fetch) for the Contract Pipeline's Platform Craft Notes — finds current hook/pacing conventions for serialized-fiction platforms. Returns a draft only; never saves anything itself.",
  },
};

/**
 * `entity_extractor` and `ledger_extractor` are the two roles that only
 * ever need a single "all" version — the backend looks them up hardcoded
 * at stage `"all"` (see `extractEntities()`/`appendLedgerFacts()` in the
 * backend's `planningEngine.ts`), never at a run's actual `current_stage`.
 * A UI hint, not an enforced rule elsewhere: "all" is always a valid
 * stage for any role.
 */
export const SINGLE_STAGE_ROLES = new Set<AgentRole>(["entity_extractor", "ledger_extractor", "platform_researcher"]);

/**
 * `arbitrator_chat` and `arbitrator_directive` are looked up at TWO
 * distinct stages depending on the moment: `"intake"` for the pre-Stage-1
 * conversation, and the run's real current stage (falling back to
 * `"all"`) for a mid-pipeline rejection interview — confirmed by reading
 * `intakeChatTurn()`/`finalizeIntake()` vs. `chatTurn()`/`finalizeDirective()`
 * in the backend directly. These two roles need their own version at
 * `"intake"` AND one at `"all"` (or a specific stage) to work for both.
 */
export const DUAL_MOMENT_ROLES = new Set<AgentRole>(["arbitrator_chat", "arbitrator_directive"]);

/**
 * Replaced `stage_2_acts`/`stage_3_beats` (a single call that outlined —
 * or beat-mapped — the ENTIRE book at once) with a strict, incremental
 * hierarchy: 3 fixed Acts, each with 3 fixed Parts, each Part planned in
 * two passes (outline, then one or more beats chunks) before the next
 * Part unlocks. See `UnitPosition`/`unitKeyForPosition` below for how a
 * run's exact position in that hierarchy is tracked and keyed.
 *
 * `codex_documentation`/`hook_chapters_outline` are the Contract
 * Pipeline's own two units (see `PipelineType` below) — a flatter,
 * separate track that only shares `stage_1_summary` with the Act/Part/
 * Beats hierarchy above. See the backend's CLAUDE.md "Contract Pipeline"
 * section, confirmed directly against `src/services/planningEngine.ts`.
 */
export type PlanningStage =
  | "stage_1_summary"
  | "act_summary"
  | "part_outline"
  | "part_beats"
  | "codex_documentation"
  | "hook_chapters_outline"
  | "all"
  | "intake";

export const PLANNING_STAGES: PlanningStage[] = [
  "stage_1_summary",
  "act_summary",
  "part_outline",
  "part_beats",
  "codex_documentation",
  "hook_chapters_outline",
  "intake",
  "all",
];

/** The six real pipeline stages, in order — a run's `current_stage` is never "all" or "intake"; those only exist as prompt-lookup stages. */
export const RUN_STAGES: Exclude<PlanningStage, "all" | "intake">[] = [
  "stage_1_summary",
  "act_summary",
  "part_outline",
  "part_beats",
  "codex_documentation",
  "hook_chapters_outline",
];

export const PLANNING_STAGE_META: Record<PlanningStage, { label: string; short: string }> = {
  stage_1_summary: { label: "Stage 1 — Core Summary", short: "Summary" },
  act_summary: { label: "Act Summary", short: "Act" },
  part_outline: { label: "Part Outline", short: "Outline" },
  part_beats: { label: "Part Beats", short: "Beats" },
  codex_documentation: { label: "Codex Documentation", short: "Codex" },
  hook_chapters_outline: { label: "Hook Chapters Outline (1-5)", short: "Hook Chapters" },
  intake: { label: "Intake (pre-Stage 1)", short: "Intake" },
  all: { label: "All Stages", short: "All" },
};

/**
 * "full" is the Act/Part/Beats hierarchy above. "contract" is a separate,
 * much shorter track — a Core Summary, then Codex documentation, then a
 * fixed 5-chapter hook outline — built to mirror how serialized-fiction
 * platforms (GoodNovel-style) decide whether a book gets picked up: on
 * roughly its first five chapters, judged on hook strength and early
 * pacing, not the whole book. Both tracks share the same stage_1_summary
 * unit and the same generate→critique→arbitrate→approve machinery; only
 * the stage sequence after Stage 1 differs (see `nextPlanningPosition`
 * below, mirroring the backend's own `nextPosition` in planningEngine.ts).
 * A completed contract run can be promoted into a fresh full-pipeline run
 * (see `promoteContractRunToFull` in planning-store.ts) that starts
 * already past Part 1 of Act 1, since those first five chapters are
 * already planned and approved.
 */
export type PipelineType = "full" | "contract";
export const PIPELINE_TYPES: PipelineType[] = ["full", "contract"];

export const PIPELINE_TYPE_META: Record<PipelineType, { label: string; description: string }> = {
  full: {
    label: "Plan the full book",
    description:
      "The complete Act → Part → Beats hierarchy — 3 Acts, 9 Parts, every chapter beat-mapped before you write it. Best when you're planning a book you already know you're writing.",
  },
  contract: {
    label: "Plan first 5 chapters for a contract submission",
    description:
      "A short track built to mirror how serialized-fiction platforms judge a book: a Core Summary, initial Codex documentation, and a fixed 5-chapter hook outline — nothing more. Once approved, it can be promoted into a full-book plan.",
  },
};

export const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

export const DEFAULT_MODEL = "claude-sonnet-5";
export const DEFAULT_EFFORT: EffortLevel = "high";

// `agent_prompts.model` is a free-text VARCHAR(50) backend-side (see the
// backend's own CLAUDE.md — "a runtime setting per role/stage, not
// hardcoded"), so this list is a frontend-only convenience, not a
// validated enum: it's the current real Claude model lineup, offered as a
// dropdown instead of a free-text field per an explicit request that a
// typo-prone text input was the wrong UI for choosing a model. `modelLabel()`
// falls back to the raw id for any value outside this list (an older model
// a prompt was already saved with, or one entered before this dropdown
// existed) — same "don't hide real data behind a fixed list" convention
// `roleLabel()` already established for an unrecognized AgentRole.
export const MODEL_OPTIONS = ["claude-opus-5", "claude-sonnet-5", "claude-fable-5-1", "claude-haiku-4-5-20251001"] as const;

const MODEL_LABELS: Record<string, string> = {
  "claude-opus-5": "Claude Opus 5",
  "claude-sonnet-5": "Claude Sonnet 5",
  "claude-fable-5-1": "Claude Fable 5.1",
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
};

export function modelLabel(model: string): string {
  return MODEL_LABELS[model] ?? model;
}

// Fixed, not model-decided — mirrors ACTS_PER_BOOK/PARTS_PER_ACT in the
// backend's src/types/domain.ts. A 600-chapter serial and a 90k-word
// single-POV romance both get exactly 3 Acts and 9 Parts.
export const ACTS_PER_BOOK = 3;
export const PARTS_PER_ACT = 3;

// Chapters worth of beats generated per part_beats call — mirrors
// PART_BEATS_CHAPTER_WINDOW in the backend's planningEngine.ts. Not
// exposed via the API; hardcoded here to match, since the frontend needs
// it to compute how many beats-chunk units a Part's chapter range implies
// (see chunksNeededForRange) for the Pipeline Map and progress count.
export const PART_BEATS_CHAPTER_WINDOW = 15;

/**
 * Who wrote this version — `"claude"` for the prompts an AI session
 * seeded to get this book's pipeline working, `"writer"` for anything
 * the actual writer has authored or edited themselves.
 */
export type AgentPromptAuthor = "writer" | "claude";

/** One authored version of one agent's behavior at one stage — every field is writer-owned, nothing here is generated. */
export type AgentPrompt = {
  id: string;
  bookId: string;
  agentRole: AgentRole;
  stage: PlanningStage;
  version: number;
  isActive: boolean;
  systemPrompt: string;
  userPromptTemplate: string;
  model: string;
  effort: EffortLevel;
  authoredBy: AgentPromptAuthor;
  createdAt: string;
};

// `awaiting_entity_review` is a real value in the backend's own
// PlanningRunStatus TypeScript union, but confirmed dead code by reading
// every reference to it in src/ — it's declared and never assigned.
// Entity extraction/confirmation is on-demand and deliberately never
// touches `status` (see ExtractedEntityCandidate below); a run's status
// never actually becomes this. Left out of this frontend's own status
// union entirely rather than reproducing an unreachable state.
export type PlanningRunStatus =
  | "intake_active"
  | "generating"
  | "critiquing"
  | "awaiting_arbitration"
  | "awaiting_user_review"
  | "user_chat_active"
  | "done"
  | "failed";

export const PLANNING_RUN_STATUS_LABEL: Record<PlanningRunStatus, string> = {
  intake_active: "Describing your book",
  generating: "Generating",
  critiquing: "Running critique",
  awaiting_arbitration: "Arbitrating",
  awaiting_user_review: "Awaiting your review",
  user_chat_active: "Rejection interview",
  done: "Done",
  failed: "Failed",
};

export type PlanningChatMessage = { role: "user" | "assistant"; content: string };

/** No confidence score and no per-candidate source unit — the real entity_extractor contract, see backend's src/types/domain.ts. */
export type ExtractedEntityCandidate = {
  type: "codex_entry" | "world_category";
  name: string;
  entryType?: string;
  description?: string;
};

/** A Part's own committed chapter range, recorded once its outline is approved — the first point in the hierarchy concrete enough to state real chapter numbers. */
export type PartChapterRange = {
  startChapter: number;
  endChapter: number;
};

/**
 * One fact worth remembering across the rest of the book, extracted after
 * each Part's beats are approved. `sourcedFrom: "manuscript"` means this
 * was pulled from chapters actually drafted and accepted by the time it
 * was extracted (ground truth, can never be wrong); `"plan"` means those
 * chapters weren't written yet and this is only what the beats claimed.
 * No category/type field, no third status — see `roleLabel`'s sibling
 * `ledgerBadge` below for exactly how this renders.
 */
export type ContinuityLedgerEntry = {
  fact: string;
  sourcedFrom: "plan" | "manuscript";
  unit: string; // e.g. "act_1_part_2_beats_chunk_1" — where this fact was extracted from
};

export type PlanningRun = {
  id: string;
  bookId: string;
  userId: string;
  // "full" (default) or "contract" — see PipelineType. Fixed for the life
  // of a run; a promoted contract run creates a brand new "full" row
  // rather than converting itself in place, so the contract run stays as
  // an intact historical record of what actually got the contract.
  pipelineType: PipelineType;
  currentStage: PlanningStage;
  status: PlanningRunStatus;
  // A run's exact position once it's past stage_1_summary — null/null/null
  // while currentStage is 'stage_1_summary' or during intake. currentPart
  // is also null while currentStage is 'act_summary'. currentBeatChunk is
  // only meaningful during 'part_beats'.
  currentAct: number | null;
  currentPart: number | null;
  currentBeatChunk: number | null;
  // Keyed "act-part" (e.g. "1-2") — recorded once that Part's outline is approved.
  partChapterRanges: Record<string, PartChapterRange>;
  // Accumulates one entry per approved Part's beats chunk. Never pruned within a run.
  continuityLedger: ContinuityLedgerEntry[];
  // Keyed by unit, not by stage type — 'stage_1_summary', 'act_1_summary',
  // 'act_1_part_2_outline', 'act_1_part_2_beats_chunk_1', etc. — see
  // unitKeyForPosition below. A beats chunk gets its own key per chunk,
  // not one accumulated key per Part.
  stageArtifacts: Record<string, string>;
  /**
   * Keyed by critic role (see `CRITIC_ROLES`) — an open map, not a fixed
   * set of named fields. Each issue inside a critic's own `issues` array
   * also carries a `status: "new" | "unresolved" | "resolved"` field on a
   * revision pass, rendered as a small badge in the Critique display.
   */
  panelReviews: Record<string, unknown> | null;
  arbitratorSynthesis: unknown;
  // Snapshot of a unit's panelReviews/arbitratorSynthesis, keyed by the
  // same unit key as stageArtifacts, taken right before approve clears
  // them on advancing — what unapprove/discard restore from.
  stagePanelHistory: Record<string, { panelReviews: Record<string, unknown> | null; arbitratorSynthesis: unknown }>;
  /** Rejection interviews, across the WHOLE run — never reset per unit or per rejection cycle. */
  chatHistory: PlanningChatMessage[];
  /** The one-time pre-Stage-1 conversation (status "intake_active") where the writer describes the book. */
  intakeChatHistory: PlanningChatMessage[];
  finalDeltaDirective: string | null;
  /** On-demand entity scan candidates — never null-vs-status-coupled; presence alone (non-null, non-empty) is what should show the Entity Review screen, independent of `status`. */
  extractedEntities: ExtractedEntityCandidate[] | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------
// Unit position — the Act/Part/Beats-chunk addressing scheme
// ---------------------------------------------------------------------

export type RealPlanningStage = Exclude<PlanningStage, "all" | "intake">;

export type UnitPosition = {
  stage: RealPlanningStage;
  act: number | null;
  part: number | null;
  beatChunk: number | null;
};

/** Mirrors the backend's own `unitKey()` in planningEngine.ts exactly — this is the literal key stageArtifacts/stagePanelHistory use. */
export function unitKeyForPosition(pos: UnitPosition): string {
  switch (pos.stage) {
    case "stage_1_summary":
      return "stage_1_summary";
    case "codex_documentation":
      return "codex_documentation";
    case "hook_chapters_outline":
      return "hook_chapters_outline";
    case "act_summary":
      return `act_${pos.act}_summary`;
    case "part_outline":
      return `act_${pos.act}_part_${pos.part}_outline`;
    case "part_beats":
      return `act_${pos.act}_part_${pos.part}_beats_chunk_${pos.beatChunk}`;
  }
}

export function currentUnitPosition(run: PlanningRun): UnitPosition {
  return {
    stage: run.currentStage as RealPlanningStage,
    act: run.currentAct,
    part: run.currentPart,
    beatChunk: run.currentBeatChunk,
  };
}

/** The exact stageArtifacts/stagePanelHistory key for whatever unit this run is currently on. */
export function currentUnitKey(run: PlanningRun): string {
  return unitKeyForPosition(currentUnitPosition(run));
}

export function partRangeKey(act: number, part: number): string {
  return `${act}-${part}`;
}

/** Mirrors the backend's chunksNeededForRange exactly. */
export function chunksNeededForRange(range: PartChapterRange): number {
  const totalChapters = range.endChapter - range.startChapter + 1;
  return Math.max(1, Math.ceil(totalChapters / PART_BEATS_CHAPTER_WINDOW));
}

/**
 * Mirrors the backend's own `nextPosition()` exactly — what comes after
 * `pos`, given the run's partChapterRanges (needed to know how many
 * beat-generation chunks a Part needs) and pipelineType (needed only at
 * the one fork point right after stage_1_summary — everywhere else the
 * stage alone already disambiguates, since codex_documentation/
 * hook_chapters_outline only ever exist on a "contract" run). Null once
 * the run's whole track is fully planned (all 3 Acts' 9 Parts for "full",
 * or the fixed 3-unit sequence for "contract"). Used to compute the
 * Pipeline Map's locked/current/approved state for every unit, and the
 * approved-unit progress count.
 */
export function nextPlanningPosition(
  pos: UnitPosition,
  partChapterRanges: Record<string, PartChapterRange>,
  pipelineType: PipelineType = "full",
): UnitPosition | null {
  if (pos.stage === "stage_1_summary") {
    if (pipelineType === "contract") {
      return { stage: "codex_documentation", act: null, part: null, beatChunk: null };
    }
    return { stage: "act_summary", act: 1, part: null, beatChunk: null };
  }
  if (pos.stage === "codex_documentation") {
    return { stage: "hook_chapters_outline", act: null, part: null, beatChunk: null };
  }
  if (pos.stage === "hook_chapters_outline") {
    // The Contract Pipeline is exactly these three units — done once this
    // is approved. See promoteContractRunToFull (planning-store.ts) for
    // how an approved run continues into the main hierarchy, as a brand
    // new "full" run.
    return null;
  }
  if (pos.stage === "act_summary") {
    // A run created by promoteContractRunToFull already has Part 1
    // (chapters 1-5) materialized before Act 1's summary is even
    // generated — its chapter range was pre-seeded. Skip straight to
    // Part 2 rather than re-planning a Part that's already written and
    // approved via the Contract Pipeline. Mirrors the backend's own
    // nextPosition exactly.
    if (pos.act === 1 && partChapterRanges[partRangeKey(1, 1)]) {
      return { stage: "part_outline", act: 1, part: 2, beatChunk: null };
    }
    return { stage: "part_outline", act: pos.act, part: 1, beatChunk: null };
  }
  if (pos.stage === "part_outline") {
    return { stage: "part_beats", act: pos.act, part: pos.part, beatChunk: 1 };
  }
  const range = partChapterRanges[partRangeKey(pos.act as number, pos.part as number)];
  const totalChunks = range ? chunksNeededForRange(range) : 1;
  if ((pos.beatChunk ?? 1) < totalChunks) {
    return { stage: "part_beats", act: pos.act, part: pos.part, beatChunk: (pos.beatChunk ?? 1) + 1 };
  }
  if ((pos.part as number) < PARTS_PER_ACT) {
    return { stage: "part_outline", act: pos.act, part: (pos.part as number) + 1, beatChunk: null };
  }
  if ((pos.act as number) < ACTS_PER_BOOK) {
    return { stage: "act_summary", act: (pos.act as number) + 1, part: null, beatChunk: null };
  }
  return null;
}

function samePosition(a: UnitPosition, b: UnitPosition): boolean {
  return a.stage === b.stage && a.act === b.act && a.part === b.part && a.beatChunk === b.beatChunk;
}

const FIRST_UNIT: UnitPosition = { stage: "stage_1_summary", act: null, part: null, beatChunk: null };

/**
 * The number of units approved so far (everything strictly before the
 * run's current position in Act→Part→Beats order) and the best-known
 * total. Per the real constraint that a Part's beats-chunk count isn't
 * knowable until that Part's own outline is approved: the denominator is
 * 13 guaranteed units (1 Stage-1 Summary + 3 Act Summaries + 9 Part
 * Outlines) plus the sum of beats-chunk counts for every Part whose
 * outline has been approved so far (from partChapterRanges), plus a
 * 1-chunk placeholder for a Part not yet outlined (nextPlanningPosition's
 * own `range ? chunksNeededForRange(range) : 1` fallback) — `totalIsFinal`
 * is true only once every Part has a recorded chapter range, i.e. the
 * number can no longer change.
 */
export function computePlanningProgress(run: PlanningRun): { approved: number; total: number; totalIsFinal: boolean } {
  // Once "done", current_act/part/beatChunk still point at the very last
  // unit (approveStage doesn't move them further once there's no next
  // position) — every unit, including that one, is approved.
  const current = run.status === "done" || run.status === "intake_active" ? null : currentUnitPosition(run);
  let reachedCurrent = false;
  let approved = 0;
  let total = 0;
  let totalIsFinal = true;

  let pos: UnitPosition | null = FIRST_UNIT;
  while (pos) {
    if (pos.stage === "part_beats" && !run.partChapterRanges[partRangeKey(pos.act as number, pos.part as number)]) {
      totalIsFinal = false;
    }
    total += 1;
    if (current && samePosition(pos, current)) reachedCurrent = true;
    else if (!reachedCurrent) approved += 1;
    pos = nextPlanningPosition(pos, run.partChapterRanges, run.pipelineType);
  }

  return { approved: run.status === "done" ? total : approved, total, totalIsFinal };
}

// ---------------------------------------------------------------------
// Prompt Editor reference metadata
// ---------------------------------------------------------------------

/**
 * Which `{{PLACEHOLDER}}` tokens a role's user_prompt_template can
 * reference — shown next to the template field in the Prompt Editor.
 * Anything not present in a given call is just left blank server-side, no
 * error, so this is documentation, not validation. Confirmed against the
 * backend's own `planningEngine.ts` directly (which layer of context each
 * step's `interpolateTemplate` call actually passes), not just the
 * handoff doc's summary table.
 */
export function placeholdersFor(role: AgentRole, stage: PlanningStage): { token: string; meaning: string }[] {
  switch (role) {
    case "generator":
      return [
        { token: "{{BOOK_CONTEXT}}", meaning: "Book Facts + every current Codex entry, as JSON" },
        { token: "{{BOOK_VISION}}", meaning: "Stage 1's approved Core Summary — the same value at every depth, never diluted" },
        { token: "{{PARENT_ARTIFACT}}", meaning: "The immediate parent unit's approved content (blank at Stage 1)" },
        { token: "{{CONTINUITY_LEDGER}}", meaning: "Accumulated hard facts from every approved beats chunk so far" },
        { token: "{{PREVIOUS_ARTIFACT}}", meaning: "This exact unit's own last draft — blank on a first generation" },
        { token: "{{CHAPTER_RANGE}}", meaning: "Which chapter window this call must produce (part_beats and hook_chapters_outline — fixed at chapters 1-5 for the latter)" },
        { token: "{{FINAL_DELTA_DIRECTIVE}}", meaning: "Set after intake, or after a rejection's finalize-directive" },
        {
          token: "{{PLATFORM_TRENDS}}",
          meaning: "Platform Craft Notes content (Contract Pipeline runs only) — empty on a \"full\" run or a book with no notes saved yet",
        },
      ];
    case "continuity_critic":
    case "pacing_critic":
    case "craft_critic":
      return [
        { token: "{{BOOK_CONTEXT}}", meaning: "Book Facts + every current Codex entry, as JSON" },
        { token: "{{BOOK_VISION}}", meaning: "Stage 1's approved Core Summary" },
        { token: "{{CONTINUITY_LEDGER}}", meaning: "Accumulated hard facts — the Continuity Critic checks this first" },
        { token: "{{CURRENT_ARTIFACT}}", meaning: "The artifact currently being reviewed" },
        {
          token: "{{PREVIOUS_CRITIQUE}}",
          meaning: "This critic's own previous review of this same unit — empty on a first review, populated on a revision pass",
        },
        {
          token: "{{PLATFORM_TRENDS}}",
          meaning: "Platform Craft Notes content (Contract Pipeline runs only) — empty on a \"full\" run or a book with no notes saved yet",
        },
      ];
    case "arbitrator_panel":
      return [
        { token: "{{BOOK_VISION}}", meaning: "Stage 1's approved Core Summary" },
        { token: "{{CURRENT_ARTIFACT}}", meaning: "The artifact currently being reviewed" },
        { token: "{{PANEL_REVIEWS}}", meaning: "All three critics' JSON output" },
        {
          token: "{{PREVIOUS_SYNTHESIS}}",
          meaning: "This Arbitrator's own previous synthesis of this same unit — empty on a first synthesis, populated on a revision pass",
        },
        {
          token: "{{PLATFORM_TRENDS}}",
          meaning: "Platform Craft Notes content (Contract Pipeline runs only) — empty on a \"full\" run or a book with no notes saved yet",
        },
      ];
    case "arbitrator_chat":
      return stage === "intake"
        ? [
            {
              token: "{{BOOK_CONTEXT}}",
              meaning: "Book Facts + Codex JSON — keeps intake aware of an already-established book",
            },
          ]
        : [
            { token: "{{CURRENT_ARTIFACT}}", meaning: "The artifact being reconsidered after rejection" },
            { token: "{{PANEL_REVIEWS}}", meaning: "All three critics' JSON output" },
          ];
    case "arbitrator_directive":
      return stage === "intake"
        ? [{ token: "{{CHAT_HISTORY}}", meaning: "The full intake conversation" }]
        : [
            { token: "{{CHAT_HISTORY}}", meaning: "The writer's ENTIRE conversation with the Arbitrator so far — intake plus every rejection interview across the whole run" },
            { token: "{{PANEL_REVIEWS}}", meaning: "All three critics' JSON output" },
            { token: "{{CURRENT_ARTIFACT}}", meaning: "The artifact being reconsidered" },
          ];
    case "entity_extractor":
      return [
        { token: "{{BOOK_CONTEXT}}", meaning: "Book Facts + every current Codex entry, as JSON" },
        { token: "{{CURRENT_ARTIFACT}}", meaning: "Every approved Part Beats chunk in the run so far, concatenated" },
      ];
    case "ledger_extractor":
      return [
        { token: "{{CONTENT}}", meaning: "The reconciled per-chapter content to extract facts from (real drafted text where it exists, else the chunk's own beats)" },
        { token: "{{EXISTING_LEDGER}}", meaning: "The ledger so far, so it doesn't re-extract duplicates" },
      ];
    case "platform_researcher":
      return [{ token: "{{EXISTING_NOTES}}", meaning: "The book's currently-saved Platform Craft Notes, if any — so a re-research pass can build on what's already there" }];
    default:
      // A role the backend added that this file doesn't recognize yet (see
      // AGENT_ROLES' comment on the Prompt Editor's defensive fallback) —
      // no known placeholders to document rather than a crash.
      return [];
  }
}

/**
 * A readable label for any role string — `AGENT_ROLE_META`'s hand-written
 * label when we know it, otherwise a derived title-cased fallback (splits
 * both `snake_case` and `camelCase`) so a role the backend added or
 * renamed before this file caught up still shows something readable
 * instead of crashing or silently disappearing from the Prompt Editor's
 * Role dropdown or the Critique results display. Takes a plain `string`,
 * not `AgentRole`, on purpose — the whole point is to handle roles this
 * file's own type doesn't (yet) know about.
 */
export function roleLabel(role: string): string {
  const known = AGENT_ROLE_META[role as AgentRole];
  if (known) return known.label;
  return role
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A short note on which stage(s) a role is actually looked up at, for the roles where that isn't just "whatever you pick." */
export function roleStageGuidance(role: AgentRole): string | null {
  if (SINGLE_STAGE_ROLES.has(role)) {
    return 'Always looked up at stage "All Stages" — save your version there.';
  }
  if (DUAL_MOMENT_ROLES.has(role)) {
    return 'Looked up separately for two different moments: "Intake" for the pre-Stage-1 conversation, and the run\'s current stage (falling back to "All Stages") for a rejection interview. Save a version at each if you want them to sound different.';
  }
  return null;
}

/**
 * Role/stage combinations whose output gets parsed by code, not just
 * displayed — getting the shape wrong means a clean, specific error
 * rather than a crash, but still worth a visible hint in the editor.
 */
export function outputShapeHint(role: AgentRole, stage: PlanningStage): string | null {
  if (role === "generator" && stage === "part_outline") {
    return 'Must return JSON:\n{"startChapter": 1, "endChapter": 12, "outline": "..."}';
  }
  if (role === "generator" && (stage === "part_beats" || stage === "hook_chapters_outline")) {
    return 'Must return JSON:\n{"chapters": [{"chapterNumber": 1, "title": "...", "beats": [{"title": "...", "outlineText": "..."}]}]}';
  }
  if (role === "generator" && stage === "codex_documentation") {
    return 'Must return JSON:\n{"entries": [{"name": "...", "entryType": "character", "description": "...", "aliases"?: [...], "tier"?: "...", "personalityTraits"?: [...], "motivations"?: [...]}]}\nApproving this unit writes these directly into your Codex.';
  }
  if (role === "entity_extractor") {
    return 'Must return a JSON array:\n[{"type": "codex_entry" | "world_category", "name": "...", "entryType": "...", "description": "..."}]';
  }
  if (role === "ledger_extractor") {
    return 'Must return a JSON array of plain strings:\n["fact one", "fact two"]';
  }
  return null;
}

/** Two-state badge label for a ContinuityLedgerEntry — see the type's own comment for why there's no third state. */
export function ledgerBadgeLabel(sourcedFrom: ContinuityLedgerEntry["sourcedFrom"]): string {
  return sourcedFrom === "manuscript" ? "Established" : "Planned";
}
