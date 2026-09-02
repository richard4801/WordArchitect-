"use client";

import {
  AlertTriangle,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Circle,
  Cog,
  Download,
  Eye,
  GitBranch,
  GitFork,
  ListChecks,
  Lock,
  Loader2,
  Newspaper,
  Paperclip,
  PenLine,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Undo2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { OptionsMenu } from "@/components/ui/options-menu";
import { refreshOutline } from "@/lib/outline-store";
import { renderMarkdown } from "@/lib/simple-markdown";
import {
  ACTS_PER_BOOK,
  AGENT_ROLE_META,
  AGENT_ROLES,
  type AgentPrompt,
  type AgentPromptAuthor,
  chunksNeededForRange,
  computePlanningProgress,
  currentUnitKey,
  currentUnitPosition,
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  EFFORT_LEVELS,
  type ExtractedEntityCandidate,
  ledgerBadgeLabel,
  nextPlanningPosition,
  outputShapeHint,
  partRangeKey,
  PARTS_PER_ACT,
  PIPELINE_TYPE_META,
  placeholdersFor,
  PLANNING_RUN_STATUS_LABEL,
  PLANNING_STAGE_META,
  PLANNING_STAGES,
  type AgentRole,
  type ContinuityLedgerEntry,
  type EffortLevel,
  type PipelineType,
  type PlanningRun,
  type PlanningRunStatus,
  type PlanningStage,
  type UnitPosition,
  roleLabel,
  roleStageGuidance,
  RUN_STAGES,
  unitKeyForPosition,
} from "@/lib/planning-data";
import {
  approvePlanningStage,
  branchPlanningRun,
  clonePromptsFromBook,
  confirmPlanningEntities,
  deleteAgentPromptVersion,
  deletePlanningRun,
  discardPlanningStage,
  discardPlatformCraftNotesDraft,
  extractPlanningEntities,
  finalizeIntakeConversation,
  finalizePlanningDirective,
  loadPlanningRun,
  promoteContractRunToFull,
  refreshPlatformCraftNotes,
  rejectPlanningStage,
  runPipelineForward,
  saveAgentPromptVersion,
  savePlatformCraftNotes,
  sendIntakeChatTurn,
  sendPlanningChatTurn,
  startPlanningRun,
  startPlatformCraftNotesResearch,
  unapprovePlanningStage,
  updateAgentPromptVersion,
  useActivePlanningRun,
  useAgentPrompts,
  useAgentPromptsError,
  useAgentPromptsLoadStatus,
  useBookPlanningRuns,
  useBookPlanningRunsLoadStatus,
  useEntityActionError,
  useEntityActionStatus,
  usePlatformCraftNotes,
  usePlatformCraftNotesError,
  usePlatformCraftNotesLoadStatus,
  usePlatformCraftNotesPolling,
} from "@/lib/planning-store";
import { refreshCharacters } from "@/lib/character-store";
import { refreshWorld } from "@/lib/worldbuilding-store";
import { refreshManuscript } from "@/lib/manuscript-store";
import { useProject, useProjects } from "@/lib/project-store";

/**
 * The Planning Engine — a pre-writing pipeline: an intake conversation,
 * then Stage 1 Core Summary, then a strict, incremental Act → Part →
 * Beats hierarchy (3 fixed Acts, 3 fixed Parts each, each Part planned as
 * an outline then one or more beats chunks), every unit gated on human
 * approval. See planning-data.ts's own top-of-file comment and the
 * backend's CLAUDE.md "Planning Engine" section for the full contract
 * this was built against — read directly, not from a design mock alone;
 * the mock this UI's visual design is based on invented several fields
 * (a ledger "Type"/three-state "Status", entity confidence scores/source
 * units, a per-critic-pair review screen, a cross-book run list) that
 * don't exist on the real backend. Corrections applied throughout this
 * file are called out in their own comments where they matter.
 */

// ---------------------------------------------------------------------
// Shared small helpers
// ---------------------------------------------------------------------

/** Ticks once a second while `active` — the sanctioned "subscribe, then setState in a callback" effect shape (never synchronously in the effect body), needed for the React Compiler's react-hooks/set-state-in-effect rule. */
function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const interval = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [active]);
  return seconds;
}

function LongRunningNote({ seconds }: { seconds: number }) {
  if (seconds < 8) return <p className="mt-3 text-xs text-ink-faint">Working…</p>;
  return (
    <p className="mt-3 text-xs text-ink-faint">
      Still working — {seconds}s so far. This step can take a couple of minutes; that&apos;s normal, not stuck.
    </p>
  );
}

async function readFileAsBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const [, base64] = dataUrl.split(",", 2);
  return { base64, mediaType: file.type || "application/octet-stream" };
}

function fieldLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const ISSUE_STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "border-gold/40 bg-gold/10 text-gold" },
  unresolved: { label: "Unresolved", className: "border-danger/40 bg-danger/10 text-danger" },
  resolved: { label: "Resolved", className: "border-success/40 bg-success/10 text-success" },
};

function IssueStatusBadge({ status }: { status: string }) {
  const meta = ISSUE_STATUS_META[status] ?? { label: status, className: "border-line text-ink-muted" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}

const SEVERITY_META: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-danger" },
  moderate: { label: "Moderate", className: "bg-gold" },
  minor: { label: "Minor", className: "bg-info" },
};

/** A compact "6 issues · 2 critical · 3 moderate · 1 minor" summary line, computed from real issue data — no fabricated confidence score, just a count. */
function IssueSeverityCounts({ issues }: { issues: unknown }) {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const counts = new Map<string, number>();
  for (const issue of issues) {
    const severity = issue && typeof issue === "object" && "severity" in issue ? String((issue as { severity: unknown }).severity) : "unknown";
    counts.set(severity, (counts.get(severity) ?? 0) + 1);
  }
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      <span>{issues.length} issue{issues.length === 1 ? "" : "s"}</span>
      {Array.from(counts.entries()).map(([severity, count]) => {
        const meta = SEVERITY_META[severity];
        return (
          <span key={severity} className="inline-flex items-center gap-1">
            <span className={`size-1.5 rounded-full ${meta?.className ?? "bg-ink-faint"}`} />
            {count} {meta?.label ?? severity}
          </span>
        );
      })}
    </div>
  );
}

/** A Generator artifact is plain markdown prose at stage_1_summary/act_summary but a JSON string at part_outline/part_beats — render whichever it actually is, never the raw ###/braces syntax. */
function ArtifactContent({ artifact }: { artifact: string }) {
  const trimmed = artifact.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let parsed: unknown;
    let isJson = true;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      isJson = false;
    }
    if (isJson) return <StructuredValue value={parsed} />;
  }
  return <div className="text-ink">{renderMarkdown(artifact)}</div>;
}

type CodexDocumentationEntry = {
  name?: string;
  entryType?: string;
  description?: string;
  aliases?: string[];
  tier?: string;
  personalityTraits?: string[];
  motivations?: string[];
};

function EntryTagRow({ label, values }: { label: string; values?: string[] }) {
  if (!values || values.length === 0) return null;
  return (
    <div className="mt-2.5">
      <h5 className="label-caps text-[0.6rem] text-ink-faint">{label}</h5>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="rounded-full border border-line px-2 py-0.5 text-[0.7rem] text-ink-muted">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The codex_documentation unit's `{"entries": [...]}` artifact rendered as
 * real Codex-style entry cards, per the original build spec — falls back
 * to the generic ArtifactContent/StructuredValue renderer (a flat labeled
 * field list) if the artifact isn't valid JSON with an `entries` array,
 * so a malformed draft still shows *something* readable rather than
 * nothing at all.
 */
function CodexEntryCards({ artifact }: { artifact: string }) {
  let entries: CodexDocumentationEntry[] | null = null;
  try {
    const parsed = JSON.parse(artifact) as { entries?: unknown };
    if (Array.isArray(parsed.entries)) entries = parsed.entries as CodexDocumentationEntry[];
  } catch {
    entries = null;
  }

  if (!entries) return <ArtifactContent artifact={artifact} />;
  if (entries.length === 0) return <p className="text-sm text-ink-faint">No entries in this draft.</p>;

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={i} className="card-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <h4 className="font-display text-base text-ink">{entry.name || "Untitled entry"}</h4>
            <span className="label-caps shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[0.6rem] text-gold">
              {entry.entryType || "character"}
            </span>
          </div>
          {entry.tier && <p className="mt-0.5 text-[0.7rem] capitalize text-ink-faint">{entry.tier}</p>}
          {entry.description && <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{entry.description}</p>}
          <EntryTagRow label="Aliases" values={entry.aliases} />
          <EntryTagRow label="Personality Traits" values={entry.personalityTraits} />
          <EntryTagRow label="Motivations" values={entry.motivations} />
        </div>
      ))}
    </div>
  );
}

const BULLET_TONE: Record<string, string> = {
  mustFix: "bg-danger",
  worthConsidering: "bg-gold",
  whatWorks: "bg-success",
};

/**
 * panel_reviews / arbitrator_synthesis / a part_outline or part_beats
 * artifact have no fixed schema — they're whatever shape the writer's own
 * prompts ask the model to return. This walks that value recursively and
 * renders it as labeled sections/lists/prose instead of literal JSON
 * syntax (braces, brackets, quotes) — every string leaf still goes
 * through renderMarkdown so any ###/** the model wrote inside a field
 * also comes out readable. `toneKey`, when set, colors a bullet list's
 * markers (the Arbitrator's mustFix/worthConsidering/whatWorks sections)
 * instead of the plain gray dot every other list gets.
 */
function StructuredValue({ value, toneKey }: { value: unknown; toneKey?: string }) {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return value.trim() ? <div className="text-ink">{renderMarkdown(value)}</div> : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="leading-relaxed text-ink">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const allPrimitive = value.every((v) => typeof v === "string" || typeof v === "number" || typeof v === "boolean");
    if (allPrimitive) {
      const dotClass = (toneKey && BULLET_TONE[toneKey]) || "bg-ink-faint";
      return (
        <ul className="space-y-1.5">
          {value.map((v, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dotClass}`} />
              <span>{typeof v === "string" ? renderMarkdown(v) : String(v)}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="border-l-2 border-line pl-3">
            <StructuredValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return null;
  return (
    <div className="space-y-3">
      {entries.map(([key, v]) => {
        // A critic issue's own `status` — "new" | "unresolved" | "resolved"
        // — is literally showing whether the critic's prior complaint got
        // fixed on a revision pass, worth a badge rather than a generic
        // labeled text block like every other field.
        if (key.toLowerCase() === "status" && typeof v === "string" && ISSUE_STATUS_META[v]) {
          return (
            <div key={key}>
              <IssueStatusBadge status={v} />
            </div>
          );
        }
        // The Arbitrator's issues array gets a compact severity-count
        // summary line above the full list, matching the mock's visual
        // design (real data: issues[].severity from each critic review).
        if (key.toLowerCase() === "issues" && Array.isArray(v)) {
          return (
            <div key={key}>
              <h5 className="label-caps text-[0.6rem] text-ink-muted">{fieldLabel(key)}</h5>
              <IssueSeverityCounts issues={v} />
              <div className="mt-2">
                <StructuredValue value={v} />
              </div>
            </div>
          );
        }
        return (
          <div key={key}>
            <h5 className="label-caps text-[0.6rem] text-ink-muted">{fieldLabel(key)}</h5>
            <div className="mt-1">
              <StructuredValue value={v} toneKey={key} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** panel_reviews / arbitrator_synthesis have no fixed schema — renders defensively rather than assuming any particular field. */
function JsonBlock({ value, toneKey }: { value: unknown; toneKey?: string }) {
  // No inner max-height/scroll — the review column already sits inside the
  // page's own scroll region, and a second nested scrollbar was clipping
  // critic issues/verdict text mid-sentence with no visible "there's more"
  // affordance (real production report: a 16rem cap on a 320px-wide column
  // reads as a truncation bug, not a scrollable one).
  return (
    <div className="mt-2 text-xs text-ink-muted">
      <StructuredValue value={value} toneKey={toneKey} />
    </div>
  );
}

/**
 * One message bubble — user (gold, right-aligned) or assistant (card-2,
 * left-aligned, markdown-rendered), the exact same visual language as
 * `MessageBubble` in `chat-panel.tsx` (the AI Assistant), reused here so
 * the intake conversation and the rejection interview both read as the
 * same real chat surface as the rest of the app.
 */
function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gold px-4 py-2.5 text-sm text-gold-contrast">{content}</div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="card-2 max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-ink">{renderMarkdown(content)}</div>
    </div>
  );
}

function ChatTypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="card-2 flex items-center gap-1 rounded-2xl rounded-tl-sm px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-ink-faint"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------

/**
 * The Planning Engine now lives as two entirely separate sections per
 * book — Main Pipeline (`/projects/[id]/planning/main`) and Contract
 * Pipeline (`/projects/[id]/planning/contract`) — sharing this one
 * component, parameterized by `pipelineType`, rather than one mixed
 * workspace whose sidebar showed every feature (including Platform Craft
 * Notes, which only ever means anything for a Contract run) regardless of
 * which kind of run was actually open. `/projects/[id]/planning` itself
 * is now just a chooser between the two (see PipelineTypeChooser.tsx) —
 * book already known there, so it skips straight to picking a type.
 */
export function PlanningWorkspace({ bookId, pipelineType }: { bookId: string; pipelineType: PipelineType }) {
  return (
    <Suspense fallback={null}>
      <PlanningWorkspaceInner bookId={bookId} pipelineType={pipelineType} />
    </Suspense>
  );
}

type PlanningView = "pipeline" | "runs" | "ledger" | "entities" | "platform-notes" | "prompts";

/** Platform Craft Notes only ever means anything for a Contract Pipeline run — it's the one nav item that isn't shared between sections. */
function navItemsFor(pipelineType: PipelineType): { key: PlanningView; label: string; Icon: typeof GitBranch }[] {
  const base: { key: PlanningView; label: string; Icon: typeof GitBranch }[] = [
    { key: "pipeline", label: "Pipeline Map", Icon: GitBranch },
    { key: "runs", label: "Run List", Icon: ListChecks },
    { key: "ledger", label: "Continuity Ledger", Icon: BookOpen },
    { key: "entities", label: "Entity Review", Icon: Users },
  ];
  if (pipelineType === "contract") base.push({ key: "platform-notes", label: "Platform Craft Notes", Icon: Newspaper });
  base.push({ key: "prompts", label: "Settings", Icon: Cog });
  return base;
}

function PlanningWorkspaceInner({ bookId, pipelineType }: { bookId: string; pipelineType: PipelineType }) {
  const project = useProject(bookId);
  const pathname = usePathname();
  const router = useRouter();
  const runIdParam = useSearchParams().get("run");
  const [view, setView] = useState<PlanningView>("pipeline");
  const navItems = navItemsFor(pipelineType);

  // Real GET /planning/runs?bookId= — resolves "what run(s) does this book
  // have" without depending on a specific run id surviving client-side
  // (closing the browser, a bookmark, the project's own nav link — none
  // of these carry ?run=). Server-sorted most-recently-updated first, so
  // runs[0] is "the run to resume" for the common one-active-run case.
  // Filtered to this section's own pipeline type — a Main-section run
  // list should never show Contract runs and vice versa, matching the
  // "every feature lives in its own menu" split.
  const allRuns = useBookPlanningRuns(bookId);
  const runs = useMemo(() => allRuns.filter((r) => r.pipelineType === pipelineType), [allRuns, pipelineType]);
  const runsLoadStatus = useBookPlanningRunsLoadStatus();
  const { run: rawRun, status: runLoadStatus, error: runLoadError } = useActivePlanningRun();
  const run = rawRun && rawRun.bookId === bookId && rawRun.pipelineType === pipelineType ? rawRun : null;

  const targetRunId = runIdParam ?? runs[0]?.id ?? null;

  useEffect(() => {
    if (targetRunId && (!run || run.id !== targetRunId)) void loadPlanningRun(targetRunId);
  }, [targetRunId, run]);

  function onRunIdChange(runId: string | null) {
    router.replace(runId ? `${pathname}?run=${runId}` : pathname);
  }

  // A run created by Promote-to-Full or Branch can genuinely belong to
  // the OTHER pipeline type (e.g. promoting a Contract run produces a
  // "full" run) — that run doesn't belong in this section's menu at all,
  // so opening it means navigating across to the other section's own
  // route rather than just updating this page's ?run= query.
  function goToRun(target: PlanningRun) {
    if (target.pipelineType === pipelineType) {
      onRunIdChange(target.id);
      setView("pipeline");
    } else {
      router.push(`/projects/${bookId}/planning/${target.pipelineType === "contract" ? "contract" : "main"}?run=${target.id}`);
    }
  }

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const newRun = await startPlanningRun(bookId, pipelineType);
      onRunIdChange(newRun.id);
      setView("pipeline");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Couldn't start a planning run.");
    } finally {
      setStarting(false);
    }
  }

  if (!project) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-2xl text-ink">Project not found</p>
          <Link href="/projects" className="mt-3 inline-block text-sm text-gold hover:opacity-80">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const stillResolvingRuns = runsLoadStatus === "idle" || runsLoadStatus === "loading";

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface-1 p-4">
        <Link
          href={`/projects/${project.id}`}
          className="mb-1 flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          Back to Project
        </Link>
        <Link
          href={`/projects/${project.id}/planning`}
          className="mb-5 flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          Switch Pipeline
        </Link>
        <div className="mb-6 flex items-center gap-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="label-caps text-[0.6rem] text-ink-faint">
              {pipelineType === "contract" ? "Contract Pipeline" : "Main Pipeline"}
            </p>
            <p className="truncate text-sm font-medium text-ink">{project.title}</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              disabled={item.key !== "runs" && item.key !== "prompts" && item.key !== "platform-notes" && !targetRunId}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                view === item.key ? "bg-gold text-gold-contrast" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <item.Icon className="size-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <div className="card-2 flex items-center gap-2.5 p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-faint">
              <BookOpen className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink">{project.title}</p>
              <p className="truncate text-[0.7rem] text-ink-faint">{project.genre}</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
        {stillResolvingRuns ? null : view === "prompts" ? (
          <PromptEditorView bookId={project.id} />
        ) : view === "platform-notes" ? (
          <PlatformCraftNotesView bookId={project.id} />
        ) : view === "runs" ? (
          <RunListView
            bookId={project.id}
            pipelineType={pipelineType}
            activeRunId={targetRunId}
            onOpenRun={goToRun}
            onClearActiveRun={() => onRunIdChange(null)}
            onStartNew={handleStart}
            starting={starting}
          />
        ) : !targetRunId ? (
          <StartPlanningCard pipelineType={pipelineType} onStart={handleStart} starting={starting} error={startError} />
        ) : !run ? (
          runLoadStatus === "error" ? (
            <div className="mx-auto max-w-xl card p-6 text-center">
              <p className="text-sm text-danger">{runLoadError ?? "Couldn't load this planning run."}</p>
            </div>
          ) : (
            <p className="text-center text-sm text-ink-muted">Loading planning run…</p>
          )
        ) : view === "ledger" ? (
          <ContinuityLedgerView run={run} />
        ) : view === "entities" ? (
          <EntityReviewView key={run.updatedAt} run={run} />
        ) : (
          <PipelineView
            run={run}
            bookId={project.id}
            onOpenLedger={() => setView("ledger")}
            onOpenEntities={() => setView("entities")}
            onOpenPlatformNotes={() => setView("platform-notes")}
            onOpenRun={goToRun}
          />
        )}
      </div>
    </div>
  );
}

function StartPlanningCard({
  pipelineType,
  onStart,
  starting,
  error,
}: {
  pipelineType: PipelineType;
  onStart: () => void;
  starting: boolean;
  error: string | null;
}) {
  const meta = PIPELINE_TYPE_META[pipelineType];
  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-8 text-center">
        <Sparkles className="mx-auto size-6 text-gold" />
        <h2 className="mt-3 font-display text-xl text-ink">Let&apos;s build your story</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Starts with a conversation — describe your book, in your own words — then a guided pipeline takes it from
          there. This never writes manuscript prose; Generate/drafting stays exactly as it is.
        </p>

        <div className="mt-5 rounded-xl border border-gold/40 bg-gold/5 p-3.5 text-left">
          <p className="text-sm font-medium text-ink">{meta.label}</p>
          <p className="mt-1 text-xs text-ink-muted">{meta.description}</p>
        </div>

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {starting && <Loader2 className="size-4 animate-spin" />}
          Start Planning
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Unit addressing helpers (UI-only — planning-data.ts owns the raw
// backend-mirroring logic; these build on top of it for display).
// ---------------------------------------------------------------------

const FIRST_UNIT_POSITION: UnitPosition = { stage: "stage_1_summary", act: null, part: null, beatChunk: null };

function buildUnitSequence(run: PlanningRun): UnitPosition[] {
  const seq: UnitPosition[] = [];
  let pos: UnitPosition | null = FIRST_UNIT_POSITION;
  let guard = 0;
  while (pos && guard++ < 500) {
    seq.push(pos);
    pos = nextPlanningPosition(pos, run.partChapterRanges, run.pipelineType);
  }
  return seq;
}

type UnitState = "locked" | "current" | "approved";

function unitStateFor(pos: UnitPosition, sequence: UnitPosition[], run: PlanningRun): UnitState {
  if (run.status === "done") return "approved";
  const key = unitKeyForPosition(pos);
  const currentKey = currentUnitKey(run);
  const idxOfPos = sequence.findIndex((p) => unitKeyForPosition(p) === key);
  const idxOfCurrent = sequence.findIndex((p) => unitKeyForPosition(p) === currentKey);
  if (idxOfPos === -1 || idxOfCurrent === -1) return "locked";
  if (idxOfPos < idxOfCurrent) return "approved";
  if (idxOfPos === idxOfCurrent) return "current";
  return "locked";
}

function unitLabel(pos: UnitPosition, run: PlanningRun): string {
  switch (pos.stage) {
    case "stage_1_summary":
      return "Stage 1 — Core Summary";
    case "codex_documentation":
      return "Codex Documentation";
    case "hook_chapters_outline":
      return "Hook Chapters Outline (Chapters 1-5)";
    case "act_summary":
      return `Act ${pos.act} — Summary`;
    case "part_outline":
      return `Act ${pos.act} · Part ${pos.part} — Outline`;
    case "part_beats": {
      const range = run.partChapterRanges[partRangeKey(pos.act as number, pos.part as number)];
      const total = range ? chunksNeededForRange(range) : null;
      return `Act ${pos.act} · Part ${pos.part} — Beats${total ? ` (chunk ${pos.beatChunk} of ${total})` : ""}`;
    }
  }
}

const STATE_DOT_COLOR: Record<UnitState, string> = {
  locked: "var(--ink-faint)",
  current: "var(--gold)",
  approved: "var(--success)",
};

function StatusIcon({ state }: { state: UnitState }) {
  if (state === "approved") return <CheckCircle2 className="size-4 text-success" />;
  if (state === "current") return <Circle className="size-4 fill-gold text-gold" />;
  return <Lock className="size-3.5 text-ink-faint" />;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/** What the next click on "Continue"/"Generate" will actually do, for the Current Unit bar's "What's Next" line. */
function whatsNextFor(run: PlanningRun): string {
  switch (run.status) {
    case "generating":
      return "Generate → Critique → Arbitrate → Your Review";
    case "critiquing":
      return "Critique → Arbitrate → Your Review";
    case "awaiting_arbitration":
      return "Arbitrate → Your Review";
    case "awaiting_user_review":
      return "Awaiting your review";
    case "user_chat_active":
      return "Rejection interview in progress";
    case "failed":
      return "Needs a retry";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------
// Pipeline Map — the Act/Part/Beats roadmap
// ---------------------------------------------------------------------

function PipelineMap({
  run,
  onOpenUnit,
  onOpenLedger,
  onOpenEntities,
  onOpenPlatformNotes,
  onPromote,
  promoting,
}: {
  run: PlanningRun;
  onOpenUnit: () => void;
  onOpenLedger: () => void;
  onOpenEntities: () => void;
  onOpenPlatformNotes: () => void;
  onPromote: () => void;
  promoting: boolean;
}) {
  const sequence = useMemo(() => buildUnitSequence(run), [run]);
  const progress = useMemo(() => computePlanningProgress(run), [run]);
  const currentPos = currentUnitPosition(run);
  const isDone = run.status === "done";
  const percent = progress.total > 0 ? Math.min(100, Math.round((progress.approved / progress.total) * 100)) : 0;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="label-caps text-[0.65rem] text-ink-faint">Book Progress</h3>
          <span className="font-num text-sm text-ink">{percent}%</span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-xs text-ink-muted">
            {progress.approved} / {progress.total}
            {progress.totalIsFinal ? "" : "+"} units approved
          </p>
          {!progress.totalIsFinal && (
            <p className="text-[0.7rem] text-ink-faint">Final count grows as each Part&apos;s outline is approved</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line px-4 py-2.5">
        <LegendDot color={STATE_DOT_COLOR.locked} label="Locked" />
        <LegendDot color={STATE_DOT_COLOR.current} label="Current" />
        <LegendDot color={STATE_DOT_COLOR.approved} label="Approved" />
      </div>

      <UnitRow label={unitLabel(FIRST_UNIT_POSITION, run)} state={unitStateFor(FIRST_UNIT_POSITION, sequence, run)} />

      {run.pipelineType === "contract" ? (
        <div className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[0.6rem] text-purple">Contract Pipeline</span>
            <button
              type="button"
              onClick={onOpenPlatformNotes}
              className="flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
            >
              <Newspaper className="size-3.5" />
              Platform Craft Notes
            </button>
          </div>
          {(
            [
              { stage: "codex_documentation", act: null, part: null, beatChunk: null },
              { stage: "hook_chapters_outline", act: null, part: null, beatChunk: null },
            ] as UnitPosition[]
          ).map((pos) => (
            <UnitRow key={pos.stage} label={unitLabel(pos, run)} state={unitStateFor(pos, sequence, run)} />
          ))}
        </div>
      ) : (
        Array.from({ length: ACTS_PER_BOOK }, (_, i) => i + 1).map((act, actIdx) => {
        const actSummaryPos: UnitPosition = { stage: "act_summary", act, part: null, beatChunk: null };
        const actSummaryState = unitStateFor(actSummaryPos, sequence, run);
        return (
          <div key={act} className="relative">
            {actIdx > 0 && <div className="absolute -top-5 left-6 h-5 w-px bg-line" />}
            <div className={`card space-y-4 p-5 ${actSummaryState === "current" ? "border-gold/50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="label-caps text-[0.6rem] text-gold">Act {act}</span>
                  <UnitRow label={unitLabel(actSummaryPos, run)} state={actSummaryState} compact />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: PARTS_PER_ACT }, (_, i) => i + 1).map((part) => {
                  const outlinePos: UnitPosition = { stage: "part_outline", act, part, beatChunk: null };
                  const outlineState = unitStateFor(outlinePos, sequence, run);
                  const range = run.partChapterRanges[partRangeKey(act, part)];
                  const totalChunks = range ? chunksNeededForRange(range) : 1;
                  const beatStates = Array.from({ length: totalChunks }, (_, i) => {
                    const pos: UnitPosition = { stage: "part_beats", act, part, beatChunk: i + 1 };
                    return unitStateFor(pos, sequence, run);
                  });
                  const beatsApproved = beatStates.filter((s) => s === "approved" || (isDone && s !== "locked")).length;
                  const partIsCurrent = outlineState === "current" || beatStates.includes("current");
                  const partIsLocked = outlineState === "locked" && beatStates.every((s) => s === "locked");
                  const partIsFresh = partIsCurrent && outlineState === "current" && !run.stageArtifacts[unitKeyForPosition(outlinePos)];

                  return (
                    <div
                      key={part}
                      className={`rounded-xl border p-3.5 transition-colors ${
                        partIsCurrent ? "border-gold/60 bg-gold/5" : partIsLocked ? "border-line/70 opacity-60" : "border-line"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-ink">Part {part}</span>
                        {partIsCurrent && (
                          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.6rem] font-medium text-gold">
                            {partIsFresh ? "Up Next" : "In Progress"}
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center gap-1">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: STATE_DOT_COLOR[outlineState] }}
                          title="Outline"
                        />
                        {beatStates.map((s, i) => (
                          <span key={i} className="size-2 rounded-full" style={{ background: STATE_DOT_COLOR[s] }} title={`Beats chunk ${i + 1}`} />
                        ))}
                      </div>
                      <div className="mt-2 space-y-1 text-[0.7rem] text-ink-muted">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon state={outlineState} />
                          Outline
                        </div>
                        <div className="flex items-center gap-1.5">
                          {range ? <StatusIcon state={beatStates[0]} /> : <Lock className="size-3.5 text-ink-faint" />}
                          Beats {range ? `(${beatsApproved}/${totalChunks})` : "(chapter range TBD)"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
        })
      )}

      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        {isDone && run.pipelineType === "contract" ? (
          <div>
            <p className="text-sm font-medium text-ink">
              Contract plan complete — Codex documentation and Chapters 1-5 are locked in.
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Real Codex entries and chapter beats are already in your Outliner.{" "}
              <button type="button" onClick={onOpenEntities} className="text-gold hover:opacity-80">
                Review extracted entities
              </button>{" "}
              or{" "}
              <button type="button" onClick={onOpenLedger} className="text-gold hover:opacity-80">
                browse the Continuity Ledger
              </button>
              . When you&apos;re ready to plan the rest of the book, promote this plan to the full pipeline.
            </p>
          </div>
        ) : isDone ? (
          <div>
            <p className="text-sm font-medium text-ink">Planning complete — every Act and Part is fully mapped.</p>
            <p className="mt-1 text-xs text-ink-muted">
              Chapter Beats are already in the Outliner.{" "}
              <button type="button" onClick={onOpenEntities} className="text-gold hover:opacity-80">
                Review extracted entities
              </button>{" "}
              or{" "}
              <button type="button" onClick={onOpenLedger} className="text-gold hover:opacity-80">
                browse the Continuity Ledger
              </button>
              .
            </p>
          </div>
        ) : (
          <div>
            <p className="label-caps text-[0.6rem] text-ink-faint">Current Unit</p>
            <p className="mt-1 font-display text-base text-ink">{unitLabel(currentPos, run)}</p>
            <p className="mt-1 text-xs text-ink-muted">
              <span className="font-medium text-ink">{PLANNING_RUN_STATUS_LABEL[run.status]}</span>
              {" · What's Next: "}
              {whatsNextFor(run)}
            </p>
          </div>
        )}
        {isDone && run.pipelineType === "contract" ? (
          <button
            type="button"
            onClick={onPromote}
            disabled={promoting}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {promoting ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            Promote to Full Plan
          </button>
        ) : (
          !isDone && (
            <button
              type="button"
              onClick={onOpenUnit}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
            >
              Open Unit
            </button>
          )
        )}
      </div>
    </div>
  );
}

function UnitRow({ label, state, compact }: { label: string; state: UnitState; compact?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-2" : "card flex items-center gap-2 p-4"}>
      <StatusIcon state={state} />
      <span className={`text-sm ${state === "locked" ? "text-ink-faint" : "text-ink"}`}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------
// Intake — a real multi-turn conversation, never a form that skips
// straight to intake-finalize (see the file's own top-of-file comment)
// ---------------------------------------------------------------------

function IntakeChat({
  run,
  sending,
  finalizing,
  onSend,
  onFinalize,
}: {
  run: PlanningRun;
  sending: boolean;
  finalizing: boolean;
  onSend: (message: string, document?: { base64: string; mediaType: string }) => Promise<void>;
  onFinalize: () => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const elapsed = useElapsedSeconds(sending || finalizing);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [run.intakeChatHistory.length, sending]);

  async function handleSend() {
    const text = message.trim();
    if (!text || sending) return;
    setAttachError(null);
    let document: { base64: string; mediaType: string } | undefined;
    if (attachedFile) {
      try {
        document = await readFileAsBase64(attachedFile);
      } catch {
        setAttachError("Couldn't read that file — try again or send without it.");
        return;
      }
    }
    setMessage("");
    setAttachedFile(null);
    try {
      await onSend(text, document);
    } catch {
      // actionError banner (rendered by the caller) already shows this.
    }
  }

  return (
    <section className="card flex min-h-0 flex-1 flex-col p-0">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-5 py-4">
        <Sparkles className="size-4 text-gold" />
        <div>
          <p className="text-sm font-medium text-ink">Tell me about your book</p>
          <p className="text-xs text-ink-faint">Plain language, a reference link, or an attached document — I&apos;ll read it.</p>
        </div>
      </header>
      <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {run.intakeChatHistory.length === 0 && (
          <p className="text-sm text-ink-faint">
            Describe your book&apos;s premise, themes, and how you want it to feel — I&apos;ll ask follow-up questions
            until we&apos;re ready to start planning.
          </p>
        )}
        {run.intakeChatHistory.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        {sending && <ChatTypingIndicator />}
        {(sending || finalizing) && <LongRunningNote seconds={elapsed} />}
      </div>
      <div className="shrink-0 border-t border-line p-3">
        {attachError && <p className="mb-2 px-1 text-xs text-danger">{attachError}</p>}
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted">
            <Paperclip className="size-3.5 shrink-0" />
            <span className="truncate">{attachedFile.name}</span>
            <button type="button" onClick={() => setAttachedFile(null)} className="ml-auto text-ink-faint hover:text-ink">
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.docx"
            className="hidden"
            onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach a document"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Paperclip className="size-4" />
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe your book, or paste a link…"
            rows={1}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
          />
          <button
            type="button"
            aria-label="Send"
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </button>
        </div>
        <button
          type="button"
          onClick={onFinalize}
          disabled={run.intakeChatHistory.length === 0 || finalizing || sending}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {finalizing && <Loader2 className="size-4 animate-spin" />}
          Start Planning
        </button>
        <p className="mt-1.5 text-center text-[0.7rem] text-ink-faint">This will lock in your brief and begin Stage 1: Core Summary.</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Unit Detail — one reusable component for every unit type, keyed by
// current_stage/current_act/current_part/current_beat_chunk, per
// correction #3: a Part's Outline and its Beats chunk(s) are SEPARATE
// gated units, never merged into one screen/action. This component is
// only ever shown for the run's CURRENT unit — never a historical one —
// so correction #2's "Approved badge and Approve/Reject buttons never
// both on screen" is satisfied by construction, not by extra state.
// ---------------------------------------------------------------------

const STATUS_BADGE_CLASS: Record<PlanningRunStatus, string> = {
  intake_active: "border-line text-ink-muted",
  generating: "border-gold/40 bg-gold/10 text-gold",
  critiquing: "border-gold/40 bg-gold/10 text-gold",
  awaiting_arbitration: "border-gold/40 bg-gold/10 text-gold",
  awaiting_user_review: "border-info/40 bg-info/10 text-info",
  user_chat_active: "border-warn/40 bg-warn/10 text-warn",
  done: "border-success/40 bg-success/10 text-success",
  failed: "border-danger/40 bg-danger/10 text-danger",
};

function RunStatusBadge({ status }: { status: PlanningRunStatus }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[0.65rem] font-medium ${STATUS_BADGE_CLASS[status]}`}>
      {PLANNING_RUN_STATUS_LABEL[status]}
    </span>
  );
}

function ContextPanel({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="label-caps text-[0.6rem] text-ink-faint">Context — {label}</span>
        <ChevronDown className={`size-3.5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="scroll-slim mt-3 max-h-56 overflow-y-auto text-sm text-ink-muted">
          <ArtifactContent artifact={text} />
        </div>
      )}
    </div>
  );
}

function parentArtifactFor(run: PlanningRun): { label: string; text: string } | null {
  const pos = currentUnitPosition(run);
  if (pos.stage === "stage_1_summary") return null;
  if (pos.stage === "act_summary") return { label: "Book Vision", text: run.stageArtifacts["stage_1_summary"] ?? "" };
  if (pos.stage === "part_outline") return { label: `Act ${pos.act} Summary`, text: run.stageArtifacts[`act_${pos.act}_summary`] ?? "" };
  return { label: `Act ${pos.act} · Part ${pos.part} Outline`, text: run.stageArtifacts[`act_${pos.act}_part_${pos.part}_outline`] ?? "" };
}

function UnitDetail({
  run,
  advancing,
  onBack,
  onAdvance,
  onApprove,
  onReject,
  onUnapprove,
  onDiscardStage,
  onSendChat,
  onFinalizeDirective,
}: {
  run: PlanningRun;
  advancing: boolean;
  onBack: () => void;
  onAdvance: () => void;
  onApprove: () => void;
  onReject: () => void;
  onUnapprove: () => void;
  onDiscardStage: () => void;
  onSendChat: (message: string) => Promise<void>;
  onFinalizeDirective: () => void;
}) {
  const elapsed = useElapsedSeconds(advancing);
  const unit = currentUnitKey(run);
  const isFirstUnit = unit === "stage_1_summary";
  const hasOwnArtifact = Boolean(run.stageArtifacts[unit]);
  const parent = parentArtifactFor(run);
  const [confirmingDiscardStage, setConfirmingDiscardStage] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink">
          <ChevronLeft className="size-4" />
          Back to Pipeline Map
        </button>
        {!isFirstUnit && !hasOwnArtifact && (
          <button
            type="button"
            onClick={onUnapprove}
            disabled={advancing}
            className="flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink disabled:opacity-50"
          >
            <Undo2 className="size-3.5" />
            Undo last approval
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl text-ink">{unitLabel(currentUnitPosition(run), run)}</h2>
        <RunStatusBadge status={run.status} />
      </div>

      {parent && parent.text && <ContextPanel label={parent.label} text={parent.text} />}

      {(run.status === "generating" || run.status === "critiquing" || run.status === "awaiting_arbitration") && (
        <div className="card p-6 text-center">
          <p className="text-sm text-ink-muted">{PLANNING_RUN_STATUS_LABEL[run.status]}…</p>
          <button
            type="button"
            onClick={onAdvance}
            disabled={advancing}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {advancing && <Loader2 className="size-4 animate-spin" />}
            {advancing ? "Working…" : run.status === "generating" ? "Generate" : "Continue"}
          </button>
          {advancing && <LongRunningNote seconds={elapsed} />}
        </div>
      )}

      {run.status === "failed" && (
        <div className="card space-y-3 p-6">
          <p className="flex items-center gap-2 text-sm text-danger">
            <AlertTriangle className="size-4 shrink-0" />
            {run.lastError ?? "Something went wrong."}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAdvance}
              disabled={advancing}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-50"
            >
              {advancing && <Loader2 className="size-4 animate-spin" />}
              Retry
            </button>
            {!isFirstUnit && hasOwnArtifact && (
              <button
                type="button"
                onClick={() => setConfirmingDiscardStage(true)}
                className="text-xs text-ink-faint underline-offset-2 hover:text-danger hover:underline"
              >
                Discard this draft
              </button>
            )}
          </div>
          {advancing && <LongRunningNote seconds={elapsed} />}
        </div>
      )}

      {run.status === "awaiting_user_review" && (
        <ReviewGate
          run={run}
          unit={unit}
          advancing={advancing}
          hasOwnArtifact={hasOwnArtifact}
          isFirstUnit={isFirstUnit}
          onApprove={onApprove}
          onReject={onReject}
          onDiscardStage={() => setConfirmingDiscardStage(true)}
        />
      )}

      {run.status === "user_chat_active" && (
        <RejectionInterview run={run} advancing={advancing} onSend={onSendChat} onFinalize={onFinalizeDirective} />
      )}

      {confirmingDiscardStage && (
        <ConfirmDialog
          title="Discard this draft?"
          description="This trashes the current draft outright and falls back to the previous unit's review gate, ready to re-approve into a fresh generation. This can't be undone."
          confirmLabel="Discard"
          onCancel={() => setConfirmingDiscardStage(false)}
          onConfirm={() => {
            setConfirmingDiscardStage(false);
            onDiscardStage();
          }}
        />
      )}
    </div>
  );
}

const CRITIC_DOT_COLORS = ["var(--gold)", "var(--info)", "var(--purple)"];

function ReviewGate({
  run,
  unit,
  advancing,
  hasOwnArtifact,
  isFirstUnit,
  onApprove,
  onReject,
  onDiscardStage,
}: {
  run: PlanningRun;
  unit: string;
  advancing: boolean;
  hasOwnArtifact: boolean;
  isFirstUnit: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDiscardStage: () => void;
}) {
  const artifact = run.stageArtifacts[unit] ?? "";
  const reviewEntries = run.panelReviews ? Object.entries(run.panelReviews) : [];
  const hasVerdict = run.arbitratorSynthesis !== null && run.arbitratorSynthesis !== undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        {/*
          A CSS Grid row auto-sizes to its tallest item regardless of
          align-items, so a short Artifact next to a long Critics rail
          (real critiques with several issues each can run well past the
          viewport) left a large genuinely-empty gap under the Artifact
          card while the page kept scrolling through Critics beside it —
          the actual "too much space to scroll through" production report.
          Not fixable by capping the Critics column's own height instead
          (already tried and reverted — see JsonBlock's comment: a nested
          scrollbar there read as truncated content, not scrollable).
          Sticky keeps the Artifact filling that space as the reader
          scrolls, rather than leaving it blank; harmless on narrower
          layouts where the columns stack (no sticky ancestor scroll
          context to speak of there anyway).

          The sticky/top utilities live on a plain wrapper, not on the
          `.card` div itself — `.card` (globals.css) sets an unconditional
          `position: relative` inside the same `@layer utilities` Tailwind's
          own generated classes use, later in the merged layer, so it
          silently wins the cascade over `lg:sticky` on the same element
          (confirmed live: `lg:top-6` took effect, `lg:sticky` didn't).
          Keeping them on a separate ancestor sidesteps the collision
          entirely instead of touching `.card`'s shared, load-bearing CSS.
        */}
        <div className="lg:sticky lg:top-6">
          <div className="card p-5">
            <h3 className="label-caps text-[0.65rem] text-ink-faint">Artifact</h3>
            <div className="scroll-slim mt-3 max-h-[32rem] overflow-y-auto text-sm text-ink">
              {unit === "codex_documentation" ? <CodexEntryCards artifact={artifact} /> : <ArtifactContent artifact={artifact} />}
            </div>
          </div>
        </div>

        {(reviewEntries.length > 0 || hasVerdict) && (
          <div className="space-y-4">
            {reviewEntries.length > 0 && (
              <div>
                <h3 className="label-caps mb-2 text-[0.6rem] text-ink-faint">Critics</h3>
                <div className="space-y-3">
                  {reviewEntries.map(([role, value], i) => (
                    <ReviewCard key={role} title={roleLabel(role)} value={value} dotColor={CRITIC_DOT_COLORS[i % CRITIC_DOT_COLORS.length]} />
                  ))}
                </div>
              </div>
            )}
            {hasVerdict && <ArbitratorVerdictCard synthesis={run.arbitratorSynthesis} />}
          </div>
        )}
      </div>

      {(unit === "codex_documentation" || unit === "hook_chapters_outline") && (
        <p className="rounded-xl border border-info/40 bg-info/10 p-3 text-xs text-ink-muted">
          {unit === "codex_documentation"
            ? "Approving writes these entries directly into your Codex — not a proposal you review again later."
            : "Approving creates chapters 1-5 in your Manuscript with these planned beats, the same as an approved Part Beats chunk."}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {!isFirstUnit && hasOwnArtifact ? (
          <button type="button" onClick={onDiscardStage} className="text-xs text-ink-faint underline-offset-2 hover:text-danger hover:underline">
            Discard this draft
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReject}
            disabled={advancing}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
          >
            Reject &amp; Discuss
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={advancing}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {advancing && <Loader2 className="size-4 animate-spin" />}
            Approve &amp; Lock
          </button>
        </div>
      </div>
    </div>
  );
}

function scoreOf(value: unknown): string | null {
  if (value && typeof value === "object" && "score" in value) {
    const s = (value as { score: unknown }).score;
    if (typeof s === "number" || typeof s === "string") return String(s);
  }
  return null;
}

function ReviewCard({ title, value, dotColor }: { title: string; value: unknown; dotColor: string }) {
  if (value === undefined) return null;
  const score = scoreOf(value);
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-medium text-ink">
          <span className="size-2 shrink-0 rounded-full" style={{ background: dotColor }} />
          {title}
        </h4>
        {score && <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[0.65rem] font-medium text-ink">{score}/10</span>}
      </div>
      <JsonBlock value={value} />
    </div>
  );
}

function ArbitratorVerdictCard({ synthesis }: { synthesis: unknown }) {
  const isObject = synthesis !== null && typeof synthesis === "object" && !Array.isArray(synthesis);
  const recommendation = isObject && "recommendation" in (synthesis as object) ? String((synthesis as { recommendation: unknown }).recommendation) : null;
  const approves = recommendation === "approve";
  // Strip the field already surfaced prominently above (icon + headline)
  // so it isn't shown twice in the generic body render below.
  const rest = isObject ? Object.fromEntries(Object.entries(synthesis as Record<string, unknown>).filter(([k]) => k !== "recommendation")) : synthesis;
  return (
    <div className="card p-4">
      <h3 className="label-caps mb-3 text-[0.6rem] text-ink-faint">Arbitrator Verdict</h3>
      <div className="flex items-center gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${approves ? "bg-success/15 text-success" : "bg-warn/15 text-warn"}`}>
          {approves ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
        </span>
        <p className="text-sm font-medium text-ink">{approves ? "Recommend Approve" : recommendation ? `Recommend ${fieldLabel(recommendation)}` : "Verdict"}</p>
      </div>
      <div className="mt-3">
        <JsonBlock value={rest} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Rejection Interview
//
// CORRECTION vs. the design mock: the mock showed a left rail grouping
// history by unit with a "Rejected N times" count per unit. That
// structure doesn't exist in the real data — chat_history is one flat
// array of {role, content}, the WHOLE run's rejection interviews
// concatenated, with no per-turn unit tag to group by. Rendered here as
// one continuous thread instead, exactly what the data supports — never
// sliced to "this unit only," and with no "clear history" action at all
// (there's no endpoint for it, and it would erase the Arbitrator's
// deliberate continuous memory across the whole run).
// ---------------------------------------------------------------------

function RejectionInterview({
  run,
  advancing,
  onSend,
  onFinalize,
}: {
  run: PlanningRun;
  advancing: boolean;
  onSend: (message: string) => Promise<void>;
  onFinalize: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const elapsed = useElapsedSeconds(sending);
  const finalizingElapsed = useElapsedSeconds(advancing);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [run.chatHistory.length, sending]);

  async function handleSend() {
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    setMessage("");
    try {
      await onSend(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card flex h-[36rem] flex-col p-0">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-5 py-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-warn/15 text-warn">
          <PenLine className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            Rejection Interview
            <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[0.6rem] font-medium text-warn">In Interview</span>
          </p>
          <p className="text-xs text-ink-faint">The Arbitrator&apos;s full conversation across this whole run — nothing here is ever cleared.</p>
        </div>
      </header>
      <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {run.chatHistory.length === 0 && <p className="text-sm text-ink-faint">Tell the Arbitrator what to change about this unit.</p>}
        {run.chatHistory.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        {sending && <ChatTypingIndicator />}
        {sending && <LongRunningNote seconds={elapsed} />}
        {advancing && <LongRunningNote seconds={finalizingElapsed} />}
      </div>
      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message to the Arbitrator…"
            rows={1}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-line-strong"
          />
          <button
            type="button"
            aria-label="Send"
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </button>
        </div>
        <button
          type="button"
          onClick={onFinalize}
          disabled={run.chatHistory.length === 0 || advancing || sending}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {advancing && <Loader2 className="size-4 animate-spin" />}
          Send Directive &amp; Regenerate
        </button>
        <p className="mt-1.5 text-center text-[0.7rem] text-ink-faint">This compiles the conversation into a directive and restarts the generate → critique → arbitrate cycle.</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Pipeline — orchestrates Intake / Pipeline Map / Unit Detail for one run
// ---------------------------------------------------------------------

function PipelineView({
  run,
  bookId,
  onOpenLedger,
  onOpenEntities,
  onOpenPlatformNotes,
  onOpenRun,
}: {
  run: PlanningRun;
  bookId: string;
  onOpenLedger: () => void;
  onOpenEntities: () => void;
  onOpenPlatformNotes: () => void;
  onOpenRun: (run: PlanningRun) => void;
}) {
  const [subView, setSubView] = useState<"map" | "unit">("map");
  const [actionError, setActionError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [confirmingDiscardRun, setConfirmingDiscardRun] = useState(false);
  const [intakeSending, setIntakeSending] = useState(false);
  const [intakeFinalizing, setIntakeFinalizing] = useState(false);

  async function handleIntakeSend(message: string, document?: { base64: string; mediaType: string }) {
    setIntakeSending(true);
    setActionError(null);
    try {
      await sendIntakeChatTurn(run.id, message, document);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't send that message.");
      throw err;
    } finally {
      setIntakeSending(false);
    }
  }

  async function handleIntakeFinalize() {
    setIntakeFinalizing(true);
    setActionError(null);
    try {
      // Deliberately doesn't auto-chain into Generate — finalizing intake
      // (or a rejection directive, below) is the writer's last input
      // before a fresh 60-180s call, and it should be a deliberate next
      // click, not a multi-minute wait sprung by the same click.
      await finalizeIntakeConversation(run.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't start planning.");
      throw err;
    } finally {
      setIntakeFinalizing(false);
    }
  }

  async function handleAdvance() {
    setAdvancing(true);
    setActionError(null);
    try {
      const result = await runPipelineForward(run.id);
      if (result.status === "failed" && result.lastError) setActionError(result.lastError);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong running the pipeline.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleApprove() {
    setAdvancing(true);
    setActionError(null);
    const wasPartBeats = run.currentStage === "part_beats" || run.currentStage === "hook_chapters_outline";
    const wasCodexDocumentation = run.currentStage === "codex_documentation";
    try {
      await approvePlanningStage(run.id);
      // A part_beats (or the Contract Pipeline's hook_chapters_outline)
      // approval materializes real chapter_beats — plus real
      // manuscript_chapters rows for hook_chapters_outline specifically,
      // since those chapters don't exist yet on a fresh contract run —
      // server-side. Refresh both caches so the Outliner and Manuscript
      // both show the new content without a manual page reload.
      if (wasPartBeats) {
        refreshOutline(bookId);
        refreshManuscript(bookId);
      }
      // A codex_documentation approval writes real codex_entries rows
      // server-side — refresh both caches since a fresh entry's entryType
      // isn't known client-side without a lookup (harmless either way).
      if (wasCodexDocumentation) {
        refreshCharacters(bookId);
        refreshWorld(bookId);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't approve this unit.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleReject() {
    setAdvancing(true);
    setActionError(null);
    try {
      await rejectPlanningStage(run.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't reject this unit.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleUnapprove() {
    setAdvancing(true);
    setActionError(null);
    try {
      await unapprovePlanningStage(run.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't undo the last approval.",
      );
    } finally {
      setAdvancing(false);
    }
  }

  async function handleDiscardStage() {
    setAdvancing(true);
    setActionError(null);
    try {
      await discardPlanningStage(run.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409
          ? err.message
          : err instanceof Error
            ? err.message
            : "Couldn't discard this draft.",
      );
    } finally {
      setAdvancing(false);
    }
  }

  async function handleFinalizeDirective() {
    setAdvancing(true);
    setActionError(null);
    try {
      await finalizePlanningDirective(run.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't finalize the directive.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleDiscardRun() {
    setDiscarding(true);
    try {
      await deletePlanningRun(run.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't discard this plan.");
    } finally {
      setDiscarding(false);
      setConfirmingDiscardRun(false);
    }
  }

  async function handlePromote() {
    setPromoting(true);
    setActionError(null);
    try {
      const newRun = await promoteContractRunToFull(run.id);
      onOpenRun(newRun);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't promote this run to the full pipeline.");
    } finally {
      setPromoting(false);
    }
  }

  const discardRunControl = (
    <div className="mb-1 flex justify-end">
      <button
        type="button"
        onClick={() => setConfirmingDiscardRun(true)}
        disabled={discarding}
        className="text-xs text-ink-faint underline-offset-2 transition-colors hover:text-danger hover:underline disabled:opacity-50"
      >
        Discard this plan
      </button>
    </div>
  );

  const confirmDiscardRunDialog = confirmingDiscardRun && (
    <ConfirmDialog
      title="Discard this plan?"
      description="This removes the run's own conversation, artifacts, and reviews. It does NOT undo anything already written to your Outliner or Codex from a prior approval — those stay exactly as they are. This can't be undone."
      confirmLabel="Discard"
      onCancel={() => setConfirmingDiscardRun(false)}
      onConfirm={handleDiscardRun}
    />
  );

  const errorBanner = actionError && (
    <p className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
      <AlertTriangle className="size-3.5 shrink-0" />
      {actionError}
    </p>
  );

  if (run.status === "intake_active") {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col">
        {discardRunControl}
        {errorBanner}
        <IntakeChat run={run} sending={intakeSending} finalizing={intakeFinalizing} onSend={handleIntakeSend} onFinalize={handleIntakeFinalize} />
        {confirmDiscardRunDialog}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {discardRunControl}
      {errorBanner}
      {subView === "map" || run.status === "done" ? (
        <PipelineMap
          run={run}
          onOpenUnit={() => setSubView("unit")}
          onOpenLedger={onOpenLedger}
          onOpenEntities={onOpenEntities}
          onOpenPlatformNotes={onOpenPlatformNotes}
          onPromote={handlePromote}
          promoting={promoting}
        />
      ) : (
        <UnitDetail
          run={run}
          advancing={advancing}
          onBack={() => setSubView("map")}
          onAdvance={handleAdvance}
          onApprove={handleApprove}
          onReject={handleReject}
          onUnapprove={handleUnapprove}
          onDiscardStage={handleDiscardStage}
          onSendChat={async (message) => {
            await sendPlanningChatTurn(run.id, message);
          }}
          onFinalizeDirective={handleFinalizeDirective}
        />
      )}
      {confirmDiscardRunDialog}
    </div>
  );
}

// ---------------------------------------------------------------------
// Run List — CORRECTION vs. the design mock: the mock showed multiple
// DIFFERENT BOOKS' runs in one cross-project dashboard, but
// GET /planning/runs?bookId= only ever returns runs for ONE book. This
// is scoped to the current book's own run history, in practice usually
// one active run (a book wouldn't normally have several concurrent
// plans) plus any past done/discarded ones. A true cross-book dashboard
// would need a new backend endpoint — flagged, not built here.
// ---------------------------------------------------------------------

function RunListView({
  bookId,
  pipelineType,
  activeRunId,
  onOpenRun,
  onClearActiveRun,
  onStartNew,
  starting,
}: {
  bookId: string;
  pipelineType: PipelineType;
  activeRunId: string | null;
  onOpenRun: (run: PlanningRun) => void;
  onClearActiveRun: () => void;
  onStartNew: () => void;
  starting: boolean;
}) {
  // Scoped to this section's own pipeline type — a Branch action below can
  // still create a run of the OTHER type (a deliberate cross-pipeline
  // power action), but that run then lives in the other section's own Run
  // List, not this one.
  const allRuns = useBookPlanningRuns(bookId);
  const runs = useMemo(() => allRuns.filter((r) => r.pipelineType === pipelineType), [allRuns, pipelineType]);
  const loadStatus = useBookPlanningRunsLoadStatus();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);

  async function handleDelete(runId: string) {
    try {
      await deletePlanningRun(runId);
      if (runId === activeRunId) onClearActiveRun();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't discard this plan.");
    } finally {
      setConfirmingDeleteId(null);
    }
  }

  async function handlePromote(runId: string) {
    setError(null);
    setBusyRunId(runId);
    try {
      const newRun = await promoteContractRunToFull(runId);
      onOpenRun(newRun);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't promote this run to the full pipeline.");
    } finally {
      setBusyRunId(null);
    }
  }

  async function handleBranch(runId: string, targetType: PipelineType) {
    setError(null);
    setBusyRunId(runId);
    try {
      const newRun = await branchPlanningRun(runId, targetType);
      onOpenRun(newRun);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't branch this run — it may not have an approved Stage 1 Summary yet.");
    } finally {
      setBusyRunId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">
          {pipelineType === "contract" ? "Contract Pipeline Runs" : "Main Pipeline Runs"}
        </h2>
        <button
          type="button"
          onClick={onStartNew}
          disabled={starting}
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-3.5 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {starting && <Loader2 className="size-3.5 animate-spin" />}
          New Run
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {loadStatus === "loading" && runs.length === 0 && <p className="text-sm text-ink-muted">Loading…</p>}
      {loadStatus === "loaded" && runs.length === 0 && <p className="text-sm text-ink-muted">No planning runs for this book yet.</p>}
      <div className="space-y-2">
        {runs.map((run) => {
          const progress = computePlanningProgress(run);
          const canPromote = run.status === "done" && run.pipelineType === "contract";
          const canBranch = Boolean(run.stageArtifacts["stage_1_summary"]);
          const busy = busyRunId === run.id;
          return (
            <div key={run.id} className={`card flex items-center gap-4 p-4 ${run.id === activeRunId ? "border-gold/50" : ""}`}>
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-faint">
                <BookOpen className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-ink">
                    {run.status === "done" ? "Complete plan" : PLANNING_RUN_STATUS_LABEL[run.status]}
                  </p>
                  {run.id === activeRunId && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.6rem] font-medium text-gold">Active</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-faint">
                  Last updated {new Date(run.updatedAt).toLocaleString()} · {progress.approved} / {progress.total}
                  {progress.totalIsFinal ? "" : "+"} units approved
                </p>
                <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${progress.total > 0 ? Math.min(100, (progress.approved / progress.total) * 100) : 0}%` }}
                  />
                </div>
                {canPromote && (
                  <button
                    type="button"
                    onClick={() => handlePromote(run.id)}
                    disabled={busy}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:opacity-80 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-3 animate-spin" /> : <Rocket className="size-3" />}
                    Promote to Full Plan
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenRun(run)}
                className={
                  run.id === activeRunId
                    ? "shrink-0 rounded-xl bg-gold px-3.5 py-1.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
                    : "shrink-0 rounded-xl border border-line px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-line-strong"
                }
              >
                {run.id === activeRunId ? "Resume" : "Open"}
              </button>
              <OptionsMenu
                items={[
                  ...(canBranch
                    ? [
                        {
                          label: "Branch → new Full Plan",
                          Icon: GitFork,
                          onClick: () => handleBranch(run.id, "full"),
                        },
                        {
                          label: "Branch → new Contract Plan",
                          Icon: GitFork,
                          onClick: () => handleBranch(run.id, "contract"),
                        },
                      ]
                    : []),
                  {
                    label: "Discard this plan",
                    Icon: Trash2,
                    danger: true,
                    onClick: () => setConfirmingDeleteId(run.id),
                  },
                ]}
              />
            </div>
          );
        })}
      </div>
      {confirmingDeleteId && (
        <ConfirmDialog
          title="Discard this plan?"
          description="This removes the run's own conversation, artifacts, and reviews. It does NOT undo anything already written to your Outliner or Codex from a prior approval — those stay exactly as they are. This can't be undone."
          confirmLabel="Discard"
          onCancel={() => setConfirmingDeleteId(null)}
          onConfirm={() => handleDelete(confirmingDeleteId)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Platform Craft Notes — a per-BOOK (not per-run) reference doc feeding
// {{PLATFORM_TRENDS}} into the Contract Pipeline's codex_documentation/
// hook_chapters_outline units. PATCH is the only save path.
//
// A research pass is a detached background job, not a request/response
// round trip — POST /research returns almost immediately with
// draftStatus: "running" already set; the real result lands later on the
// same row (draftContent on success, draftError on failure), picked up by
// polling GET while "running". Driven entirely off `draftStatus`, four
// states: "idle" (nothing in flight — edit/save the saved `content`
// directly), "running" (job in progress — loading state, no editable
// textarea, Run Research Pass disabled), "ready" (a completed draft is
// waiting — THIS is the review-it banner, textarea bound to
// `draftContent`, Save or Discard), "failed" (show `draftError`, offer
// Try Again). Never bind the textarea to `content` while a draft is
// "ready" — that was the original bug report: showing the review banner
// immediately on click, bound to the (still-empty) saved content instead
// of where the research result actually lands.
// ---------------------------------------------------------------------

function PlatformCraftNotesView({ bookId }: { bookId: string }) {
  const notes = usePlatformCraftNotes(bookId);
  const loadStatus = usePlatformCraftNotesLoadStatus();
  const loadError = usePlatformCraftNotesError();
  const [startingResearch, setStartingResearch] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Specifically the backend's 409 "an unsaved ready draft already exists"
  // guard, as opposed to any other start-research failure — only this one
  // has a real one-click recovery (force: true, discarding the existing
  // draft and starting over).
  const [researchConflict, setResearchConflict] = useState(false);

  const draftStatus = notes?.draftStatus ?? "idle";
  // Cheap/free row read — polling every ~7s while a job is running is
  // harmless, and picks up "ready"/"failed" whenever the backend finishes,
  // independent of whether this is the same tab that started the job.
  usePlatformCraftNotesPolling(bookId, draftStatus === "running");

  async function handleStartResearch(force = false) {
    setStartingResearch(true);
    setActionError(null);
    setResearchConflict(false);
    try {
      await startPlatformCraftNotesResearch(bookId, force);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't start a research pass.");
      setResearchConflict(err instanceof ApiError && err.status === 409);
      // A failed start — most commonly this 409 — often means the
      // backend's row already differs from whatever this store last
      // cached (the 409 specifically only fires because a real "ready"
      // draft already exists server-side). Re-fetch so the UI reflects
      // reality instead of leaving the writer staring at a stale empty
      // box next to an error describing a draft they can't actually see.
      refreshPlatformCraftNotes(bookId);
    } finally {
      setStartingResearch(false);
    }
  }

  const researchBusy = startingResearch || draftStatus === "running";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Platform Craft Notes</h2>
        <p className="mt-1 text-sm text-ink-muted">
          A reference doc for the Contract Pipeline&apos;s hook-focused Generator and Critics — current hook
          conventions, early-chapter pacing expectations, and common rejection reasons for serialized-fiction
          platforms. Not a live feed: refreshed only when you run a research pass below, and only saved once you
          review and confirm it.
        </p>
      </div>

      {loadStatus === "error" && <p className="text-xs text-danger">{loadError}</p>}
      {actionError && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          <p>{actionError}</p>
          {researchConflict && (
            <button
              type="button"
              onClick={() => handleStartResearch(true)}
              disabled={researchBusy}
              className="mt-2 rounded-lg border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              Discard it and start a fresh pass
            </button>
          )}
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="label-caps text-[0.65rem] text-ink-faint">Notes</h3>
          <button
            type="button"
            onClick={() => handleStartResearch()}
            disabled={researchBusy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-50"
          >
            {researchBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {researchBusy ? "Researching…" : "Run Research Pass"}
          </button>
        </div>

        {draftStatus === "running" && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-3 text-xs text-ink-muted">
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
            Researching current hook/platform trends — this runs in the background and can take a couple of minutes.
            Feel free to leave this page; the result will be here when you come back.
          </div>
        )}

        {draftStatus === "failed" && (
          <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
            <p>Research failed: {notes?.draftError ?? "Unknown error."}</p>
            <button
              type="button"
              onClick={() => handleStartResearch()}
              disabled={researchBusy}
              className="mt-2 rounded-lg border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              Try Again
            </button>
          </div>
        )}

        {draftStatus === "ready" && (
          <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-ink-muted">
            This is a fresh research draft — nothing is saved yet. Review it below, edit anything you want to change,
            then Save to keep it, or Discard to drop it.
          </p>
        )}

        {(draftStatus === "idle" || draftStatus === "ready") && (
          <PlatformNotesEditor
            key={`${draftStatus}:${draftStatus === "ready" ? notes?.draftUpdatedAt : notes?.updatedAt}`}
            bookId={bookId}
            isDraft={draftStatus === "ready"}
            initialValue={draftStatus === "ready" ? (notes?.draftContent ?? "") : (notes?.content ?? "")}
            savedAt={notes?.updatedAt ?? null}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Owns the editable textarea plus Save/Discard for one "source" — either
 * the saved `content` (idle) or a ready draft's `draftContent`. Keyed by
 * the parent on `${draftStatus}:${...UpdatedAt}` so switching between
 * idle/ready (or a fresh save/discard) remounts this with a freshly-seeded
 * `useState` initializer instead of an effect re-syncing local state to a
 * prop — the same "reset via remount" shape this file already uses for
 * PromptDraftEditor/EntityReviewView.
 */
function PlatformNotesEditor({
  bookId,
  isDraft,
  initialValue,
  savedAt,
}: {
  bookId: string;
  isDraft: boolean;
  initialValue: string;
  savedAt: string | null;
}) {
  const [value, setValue] = useState(initialValue);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  // Default to a rendered preview when there's already something to read
  // (a saved doc, or a fresh research draft) rather than dropping the
  // writer straight into raw "## Hook Conventions" / "*italic*" markdown
  // syntax — that's the whole complaint this toggle fixes. An empty doc
  // has nothing to preview, so start in Edit instead.
  const [mode, setMode] = useState<"edit" | "preview">(initialValue.trim() ? "preview" : "edit");

  useEffect(() => {
    if (!savedFlash) return;
    const timeout = window.setTimeout(() => setSavedFlash(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [savedFlash]);

  async function handleSave() {
    setSaving(true);
    setActionError(null);
    try {
      await savePlatformCraftNotes(bookId, value);
      setDirty(false);
      setSavedFlash(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't save Platform Craft Notes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDiscard() {
    setDiscarding(true);
    setActionError(null);
    try {
      await discardPlatformCraftNotesDraft(bookId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't discard this draft.");
    } finally {
      setDiscarding(false);
    }
  }

  return (
    <div>
      {actionError && <p className="mt-3 text-xs text-danger">{actionError}</p>}

      <div className="mt-3 flex w-fit items-center gap-1 rounded-lg border border-line p-1">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "edit" ? "bg-surface-2 text-ink" : "text-ink-faint hover:text-ink"
          }`}
        >
          <PenLine className="size-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "preview" ? "bg-surface-2 text-ink" : "text-ink-faint hover:text-ink"
          }`}
        >
          <Eye className="size-3.5" />
          Preview
        </button>
      </div>

      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setDirty(true);
          }}
          placeholder="No notes saved yet. Write your own, or run a research pass to get a starting draft."
          rows={16}
          className="scroll-slim mt-2 w-full resize-y rounded-xl border border-line bg-surface-2 p-3 text-sm text-ink outline-none focus:border-gold/60"
        />
      ) : (
        <div className="scroll-slim mt-2 min-h-[24rem] max-h-[32rem] overflow-y-auto rounded-xl border border-line bg-surface-2 p-4 text-sm">
          {value.trim() ? (
            <div className="text-ink">{renderMarkdown(value)}</div>
          ) : (
            <p className="text-ink-faint">Nothing to preview yet — switch to Edit to write something.</p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        {(isDraft || dirty) && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || discarding}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </button>
        )}
        {isDraft && (
          <button
            type="button"
            onClick={handleDiscard}
            disabled={saving || discarding}
            className="text-xs text-ink-faint underline-offset-2 hover:text-danger hover:underline disabled:opacity-50"
          >
            {discarding && <Loader2 className="mr-1 inline size-3 animate-spin" />}
            Discard
          </button>
        )}
        {savedFlash && <span className="text-xs text-success">Saved</span>}
      </div>

      {savedAt && !isDraft && !dirty && (
        <p className="mt-3 text-[0.7rem] text-ink-faint">Last saved {new Date(savedAt).toLocaleString()}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Continuity Ledger — CORRECTION vs. the design mock: the mock showed a
// "Type" (World/Character/Plot) column and a three-state "Status"
// (Established/Tentative/Not yet in draft). The real ContinuityLedgerEntry
// is only { fact, sourcedFrom: "plan"|"manuscript", unit } — no category,
// no third status. Rendered here against exactly that shape: a two-state
// badge derived directly from sourcedFrom, no Type column, no
// category grouping (there's nothing in the data to group by).
// ---------------------------------------------------------------------

const LEDGER_PAGE_SIZE = 8;

function ContinuityLedgerView({ run }: { run: PlanningRun }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return run.continuityLedger;
    return run.continuityLedger.filter((e) => e.fact.toLowerCase().includes(q) || e.unit.toLowerCase().includes(q));
  }, [run.continuityLedger, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / LEDGER_PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageStart = clampedPage * LEDGER_PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + LEDGER_PAGE_SIZE);

  function handleExport() {
    const text = run.continuityLedger.map((e) => `[${ledgerBadgeLabel(e.sourcedFrom)}] ${e.fact} (from ${e.unit})`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "continuity-ledger.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">Continuity Ledger</h2>
          <p className="text-xs text-ink-muted">Every established fact across this book&apos;s plan. Use this to keep everything consistent.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={run.continuityLedger.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-40"
        >
          <Download className="size-3.5" />
          Export Ledger
        </button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search facts…"
          className="w-full rounded-xl border border-line bg-transparent py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-line-strong"
        />
      </div>
      {run.continuityLedger.length === 0 ? (
        <p className="text-sm text-ink-muted">No ledger entries yet — these accumulate automatically once a Part&apos;s Beats are approved.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-muted">No facts match &quot;{query}&quot;.</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[0.65rem] uppercase tracking-wide text-ink-faint">
                  <th className="w-10 px-4 py-2.5 font-medium">#</th>
                  <th className="px-4 py-2.5 font-medium">Fact</th>
                  <th className="w-32 px-4 py-2.5 font-medium">Status</th>
                  <th className="w-48 px-4 py-2.5 font-medium">Introduced In</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((entry, i) => (
                  <LedgerRow key={pageStart + i} index={pageStart + i + 1} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-faint">
              <span>
                {pageStart + 1}-{Math.min(pageStart + LEDGER_PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: pageCount }, (_, i) => i).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    className={`grid size-7 place-items-center rounded-lg transition-colors ${
                      i === clampedPage ? "bg-gold text-gold-contrast" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LedgerRow({ index, entry }: { index: number; entry: ContinuityLedgerEntry }) {
  const label = ledgerBadgeLabel(entry.sourcedFrom);
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3 align-top text-xs text-ink-faint">{index}</td>
      <td className="px-4 py-3 align-top text-ink">{entry.fact}</td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium ${
            entry.sourcedFrom === "manuscript" ? "border-success/40 bg-success/10 text-success" : "border-info/40 bg-info/10 text-info"
          }`}
        >
          {label}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-xs text-ink-faint">{entry.unit}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------
// Entity Review — CORRECTION vs. the design mock: the mock showed a
// "Confidence %" column and a per-candidate "Source" (originating unit)
// column. The real entity_extractor contract is
// [{ type, name, entryType, description }] — no confidence score, no
// per-candidate source unit (extraction scans every approved beats chunk
// concatenated in one call, so there's no way to attribute a candidate to
// one specific chunk). Both dropped; grouping/filtering only by entryType
// (real data). Extraction is on-demand — its own explicit action, never
// tied to any approve click or to run.status.
// ---------------------------------------------------------------------

// Keyed by run.updatedAt at the call site (see PlanningPageInner) so this
// whole component remounts fresh whenever the candidate set actually
// changes (a new extraction, or a confirm clearing it) — the "reset via
// remount" shape this app already uses elsewhere (e.g. PromptDraftEditor)
// instead of an effect that calls setState synchronously on every change.
function EntityReviewView({ run }: { run: PlanningRun }) {
  const candidates = useMemo(() => run.extractedEntities ?? [], [run.extractedEntities]);
  const actionStatus = useEntityActionStatus();
  const actionError = useEntityActionError();
  const [selected, setSelected] = useState<Set<number>>(() => new Set(candidates.map((_, i) => i)));
  const [filter, setFilter] = useState<string>("all");

  const entryTypes = useMemo(() => Array.from(new Set(candidates.map((c) => c.entryType ?? c.type))), [candidates]);

  const visible = useMemo(
    () => candidates.map((c, i) => ({ c, i })).filter(({ c }) => filter === "all" || (c.entryType ?? c.type) === filter),
    [candidates, filter],
  );

  async function handleScan() {
    try {
      await extractPlanningEntities(run.id);
    } catch {
      // actionError banner below already shows this.
    }
  }

  async function handleConfirm(indexes: number[]) {
    try {
      await confirmPlanningEntities(run.id, indexes);
    } catch {
      // actionError banner below already shows this.
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ink">Entity Review</h2>
          <p className="text-xs text-ink-muted">We scan everything approved so far and surface potential entities worth adding to your Codex.</p>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={actionStatus === "loading"}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-50"
        >
          {actionStatus === "loading" && <Loader2 className="size-4 animate-spin" />}
          Scan for New Entities
        </button>
      </div>
      {actionError && <p className="text-xs text-danger">{actionError}</p>}

      {candidates.length === 0 ? (
        <p className="text-sm text-ink-muted">No candidates pending review. Run a scan to look for new characters or world elements.</p>
      ) : (
        <>
          {entryTypes.length > 1 && (
            <div className="flex gap-5 border-b border-line">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                  filter === "all" ? "border-gold text-gold" : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                All ({candidates.length})
              </button>
              {entryTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilter(t)}
                  className={`border-b-2 pb-2.5 text-sm font-medium capitalize transition-colors ${
                    filter === t ? "border-gold text-gold" : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {t} ({candidates.filter((c) => (c.entryType ?? c.type) === t).length})
                </button>
              ))}
            </div>
          )}
          <div className="card overflow-hidden">
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[0.65rem] uppercase tracking-wide text-ink-faint">
                    <th className="w-10 px-4 py-2.5 font-medium" />
                    <th className="px-4 py-2.5 font-medium">Entity</th>
                    <th className="w-32 px-4 py-2.5 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(({ c, i }) => (
                    <EntityCandidateRow
                      key={i}
                      candidate={c}
                      checked={selected.has(i)}
                      onToggle={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-ink-faint">
              <span>{selected.size} selected</span>
              <button type="button" onClick={() => setSelected(new Set(candidates.map((_, i) => i)))} className="text-gold hover:opacity-80">
                Select All
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleConfirm([])}
                disabled={actionStatus === "loading"}
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
                title="Confirming writes only checked candidates — there's no separate per-item reject call, so this discards the whole batch instead."
              >
                Reject All
              </button>
              <button
                type="button"
                onClick={() => handleConfirm(Array.from(selected))}
                disabled={actionStatus === "loading" || selected.size === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {actionStatus === "loading" && <Loader2 className="size-4 animate-spin" />}
                Approve Selected
              </button>
            </div>
          </div>
          <p className="text-[0.7rem] text-ink-faint">Approved entities are added to your Codex/World Categories. Anything not selected is discarded, never written.</p>
        </>
      )}
    </div>
  );
}

function EntityCandidateRow({
  candidate,
  checked,
  onToggle,
}: {
  candidate: ExtractedEntityCandidate;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2" onClick={onToggle}>
      <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={onToggle} className="size-4 accent-gold" />
      </td>
      <td className="px-4 py-3 align-top">
        <p className="text-sm font-medium text-ink">{candidate.name}</p>
        {candidate.description && <p className="mt-0.5 text-xs text-ink-muted">{candidate.description}</p>}
      </td>
      <td className="px-4 py-3 align-top">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.65rem] capitalize text-ink-muted">{candidate.entryType ?? candidate.type}</span>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------
// Prompt Editor (left nav: "Settings")
// ---------------------------------------------------------------------

/**
 * `generator` is the only role that actually varies across all 4 real
 * stages — the critic roles, `arbitrator_panel`, `entity_extractor`, and
 * `ledger_extractor` each have exactly one active prompt at `"all"`, and
 * `arbitrator_chat`/`arbitrator_directive` each have two, one at
 * `"intake"` and one at `"all"`. Switching Role while Stage still points
 * at wherever the *previous* role's prompt lived (most commonly the
 * default "Stage 1", which only Generator ever uses) filters `versions`
 * to nothing — indistinguishable in the UI from "this role has no
 * prompt," even though the fetch returned all of them. This picks the
 * stage that role's own data actually lives at instead of leaving Stage
 * untouched across a Role switch.
 */
function pickDefaultStageForRole(role: AgentRole, prompts: AgentPrompt[]): PlanningStage {
  const activeStages = new Set(prompts.filter((p) => p.agentRole === role && p.isActive).map((p) => p.stage));
  if (activeStages.has("all")) return "all";
  if (activeStages.has("intake")) return "intake";
  for (const s of RUN_STAGES) {
    if (activeStages.has(s)) return s;
  }
  return "all";
}

function PromptEditorView({ bookId }: { bookId: string }) {
  const prompts = useAgentPrompts(bookId);
  const listStatus = useAgentPromptsLoadStatus();
  const listError = useAgentPromptsError();

  const [role, setRole] = useState<AgentRole>("generator");
  const [stage, setStage] = useState<PlanningStage>("stage_1_summary");
  const [versionError, setVersionError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [dismissedClonePrompt, setDismissedClonePrompt] = useState(false);

  // A brand-new book has zero rows here — only once the list has actually
  // loaded (not just idle/loading) does an empty array mean "genuinely
  // nothing yet" rather than "hasn't fetched yet."
  const isEmptyBook = listStatus === "loaded" && prompts.length === 0;

  // A timed subscription, not a synchronous setState-in-effect — the
  // sanctioned effect shape.
  useEffect(() => {
    if (!savedFlash) return;
    const timeout = window.setTimeout(() => setSavedFlash(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [savedFlash]);

  const versions = useMemo(
    () => prompts.filter((p) => p.agentRole === role && p.stage === stage).sort((a, b) => b.version - a.version),
    [prompts, role, stage],
  );
  const active = versions.find((v) => v.isActive) ?? null;

  // The Role dropdown's options are AGENT_ROLES plus any role actually
  // present in this book's own fetched prompts that isn't in that fixed
  // list — defensive against the exact class of bug that hid 6 of 7 roles
  // here once already (this file's own git history): if the backend adds
  // or renames a role before this file catches up, that role's prompt
  // still shows up and is selectable via roleLabel()'s derived-label
  // fallback, instead of silently disappearing from the editor.
  const roleOptions = useMemo<AgentRole[]>(() => {
    const extra = Array.from(new Set(prompts.map((p) => p.agentRole))).filter((r) => !AGENT_ROLES.includes(r));
    return [...AGENT_ROLES, ...extra];
  }, [prompts]);

  async function handleActivate(id: string) {
    setVersionError(null);
    try {
      await updateAgentPromptVersion(bookId, id, { isActive: true });
    } catch (err) {
      setVersionError(err instanceof Error ? err.message : "Couldn't activate this version.");
    }
  }

  async function handleDelete(id: string) {
    setVersionError(null);
    try {
      await deleteAgentPromptVersion(bookId, id);
    } catch (err) {
      setVersionError(
        err instanceof ApiError && err.status === 409
          ? "This is the active version — activate a different one first, or delete a different version instead."
          : err instanceof Error
            ? err.message
            : "Couldn't delete this version.",
      );
    }
  }

  const hint = outputShapeHint(role, stage);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {isEmptyBook && !dismissedClonePrompt && <ClonePromptsCard bookId={bookId} onDismiss={() => setDismissedClonePrompt(true)} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label-caps text-[0.6rem]">Role</label>
          <DropdownSelect
            value={roleLabel(role)}
            onChange={(label) => {
              const next = roleOptions.find((r) => roleLabel(r) === label);
              if (!next) return;
              setRole(next);
              // Jump Stage to wherever this role's own prompt actually
              // lives — see pickDefaultStageForRole's comment for why
              // leaving Stage untouched across a Role switch is the bug
              // that made every non-Generator role look like it had no
              // prompt at all.
              setStage(pickDefaultStageForRole(next, prompts));
            }}
            options={roleOptions.map((r) => roleLabel(r))}
            placeholder="Select role"
            className="mt-1.5"
          />
        </div>
        <div>
          <label className="label-caps text-[0.6rem]">Stage</label>
          <DropdownSelect
            value={PLANNING_STAGE_META[stage].label}
            onChange={(label) => {
              const next = PLANNING_STAGES.find((s) => PLANNING_STAGE_META[s].label === label);
              if (next) setStage(next);
            }}
            options={PLANNING_STAGES.map((s) => PLANNING_STAGE_META[s].label)}
            placeholder="Select stage"
            className="mt-1.5"
          />
        </div>
      </div>

      <p className="text-xs text-ink-faint">
        {AGENT_ROLE_META[role]?.description ?? "A role this Prompt Editor doesn't have a description for yet."}
        {roleStageGuidance(role) ? ` ${roleStageGuidance(role)}` : ""}
      </p>

      {listStatus === "error" && <p className="text-xs text-danger">{listError}</p>}
      {hint && (
        <div className="rounded-xl border border-info/40 bg-info/10 p-3 text-xs text-ink-muted">
          <p className="font-medium text-ink">This role/stage&apos;s output is parsed by code:</p>
          <pre className="mt-1 whitespace-pre-wrap break-words">{hint}</pre>
        </div>
      )}

      <PromptDraftEditor
        key={`${role}:${stage}:${active?.id ?? "new"}`}
        bookId={bookId}
        role={role}
        stage={stage}
        active={active}
        savedFlash={savedFlash}
        onSaved={() => setSavedFlash(true)}
      />

      <div className="card p-5">
        <h3 className="label-caps text-[0.65rem]">Version History</h3>
        {versionError && <p className="mt-2 text-xs text-danger">{versionError}</p>}
        {versions.length === 0 ? (
          <p className="mt-2 text-xs text-ink-faint">No versions saved yet for this role/stage.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
                    v{v.version}
                    {v.isActive && (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[0.6rem] font-semibold text-success">ACTIVE</span>
                    )}
                    <AuthorBadge author={v.authoredBy} />
                  </p>
                  <p className="truncate text-xs text-ink-faint">
                    {v.model} · {v.effort} · {new Date(v.createdAt).toLocaleString()}
                  </p>
                </div>
                <OptionsMenu
                  items={[
                    ...(v.isActive ? [] : [{ label: "Activate", Icon: Check, onClick: () => handleActivate(v.id) }]),
                    { label: "Delete", Icon: Trash2, danger: true, onClick: () => handleDelete(v.id) },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Shown when this book has zero agent prompts of its own — a brand-new
 * book, since prompts are scoped per `book_id`. Offers reusing another of
 * the writer's own projects' prompts instead of writing every role from
 * scratch. Not a hard gate: dismissible, and the normal role/stage editor
 * below is always available either way. Disappears on its own once
 * cloning succeeds, since `prompts.length` naturally goes from 0 to real
 * and `isEmptyBook` in the parent flips false — no separate "done"
 * callback needed.
 */
function ClonePromptsCard({ bookId, onDismiss }: { bookId: string; onDismiss: () => void }) {
  const projects = useProjects();
  const otherProjects = useMemo(() => projects.filter((p) => p.id !== bookId), [projects, bookId]);

  function labelFor(id: string): string {
    const p = otherProjects.find((x) => x.id === id);
    if (!p) return "";
    // Disambiguate same-named projects ("Untitled Project" is a common
    // one early on) rather than risk cloning from the wrong one.
    const dupes = otherProjects.filter((x) => x.title === p.title);
    return dupes.length > 1 ? `${p.title} (${p.id.slice(0, 8)})` : p.title;
  }

  const [selectedId, setSelectedId] = useState(otherProjects[0]?.id ?? "");
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClone() {
    if (!selectedId) return;
    setCloning(true);
    setError(null);
    try {
      await clonePromptsFromBook(selectedId, bookId);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "That project has no prompts set up yet either."
          : err instanceof Error
            ? err.message
            : "Couldn't copy prompts.",
      );
    } finally {
      setCloning(false);
    }
  }

  if (otherProjects.length === 0) return null;

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-ink">Copy prompts from another project</h3>
          <p className="mt-0.5 text-xs text-ink-faint">
            This book has no agent prompts yet. Reuse another project&apos;s instead of writing every role from scratch.
          </p>
        </div>
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="shrink-0 text-ink-faint transition-colors hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <DropdownSelect
          value={labelFor(selectedId)}
          onChange={(label) => {
            const match = otherProjects.find((p) => labelFor(p.id) === label);
            if (match) setSelectedId(match.id);
          }}
          options={otherProjects.map((p) => labelFor(p.id))}
          placeholder="Select a project"
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleClone}
          disabled={cloning || !selectedId}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {cloning && <Loader2 className="size-4 animate-spin" />}
          Copy
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/**
 * The editable draft (System Prompt / User Prompt Template / Model /
 * Effort) for one role+stage. Remounted (via the `key` at its call site
 * in PromptEditorView, keyed by role+stage+active version id) whenever
 * any of those change, rather than an effect re-syncing local state to
 * `active` on every change. `active` only ever seeds this component's
 * *initial* state; it's a draft from then on.
 */
function PromptDraftEditor({
  bookId,
  role,
  stage,
  active,
  savedFlash,
  onSaved,
}: {
  bookId: string;
  role: AgentRole;
  stage: PlanningStage;
  active: AgentPrompt | null;
  savedFlash: boolean;
  onSaved: () => void;
}) {
  const [systemPrompt, setSystemPrompt] = useState(active?.systemPrompt ?? "");
  const [userPromptTemplate, setUserPromptTemplate] = useState(active?.userPromptTemplate ?? "");
  const [model, setModel] = useState(active?.model ?? DEFAULT_MODEL);
  const [effort, setEffort] = useState<EffortLevel>(active?.effort ?? DEFAULT_EFFORT);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);

  // Fixed for this component instance's lifetime — only "claude"-authored
  // prompts get the edit warning/confirm below; once the writer has saved
  // over one, the new version defaults to "writer"-authored server-side
  // and this component remounts clean.
  const loadedFromClaude = (active?.authoredBy ?? "writer") === "claude";

  async function performSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await saveAgentPromptVersion(bookId, { agentRole: role, stage, systemPrompt, userPromptTemplate, model, effort });
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save this prompt.");
      setSaving(false);
    }
  }

  function handleSaveClick() {
    if (!systemPrompt.trim() || !userPromptTemplate.trim()) {
      setSaveError("Both System Prompt and User Prompt Template are required.");
      return;
    }
    setSaveError(null);
    if (loadedFromClaude) {
      setConfirmingOverwrite(true);
      return;
    }
    void performSave();
  }

  const placeholders = placeholdersFor(role, stage);

  return (
    <div className="card space-y-4 p-5">
      {loadedFromClaude && (
        <p className="flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-ink-muted">
          <Bot className="mt-0.5 size-3.5 shrink-0 text-warn" />
          This prompt was written by Claude and tuned to work reliably. Editing it may reduce reliability.
        </p>
      )}
      <div>
        <label className="label-caps text-[0.6rem]">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={6}
          placeholder="You are..."
          className="scroll-slim mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
        />
      </div>
      <div>
        <label className="label-caps text-[0.6rem]">User Prompt Template</label>
        <textarea
          value={userPromptTemplate}
          onChange={(e) => setUserPromptTemplate(e.target.value)}
          rows={10}
          placeholder="{{BOOK_CONTEXT}}..."
          className="scroll-slim mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {placeholders.map((p) => (
            <span key={p.token} title={p.meaning} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.65rem] text-ink-muted">
              {p.token}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label-caps text-[0.6rem]">Model</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-line-strong focus:outline-none"
          />
        </div>
        <div>
          <label className="label-caps text-[0.6rem]">Effort</label>
          <DropdownSelect
            value={effort}
            onChange={(v) => setEffort(v as EffortLevel)}
            options={[...EFFORT_LEVELS]}
            placeholder="Effort"
            className="mt-1.5"
          />
        </div>
      </div>

      {saveError && <p className="text-xs text-danger">{saveError}</p>}
      <div className="flex items-center justify-end gap-3">
        {savedFlash && <span className="text-xs text-success">Saved — now active.</span>}
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save New Version
        </button>
      </div>

      {confirmingOverwrite && (
        <ConfirmDialog
          title="Overwrite a Claude-authored prompt?"
          description="This will save your edited version as a new, active version — the original Claude-authored one stays in Version History if you want it back. Continue?"
          confirmLabel="Save Anyway"
          onCancel={() => setConfirmingOverwrite(false)}
          onConfirm={() => {
            setConfirmingOverwrite(false);
            void performSave();
          }}
        />
      )}
    </div>
  );
}

function AuthorBadge({ author }: { author: AgentPromptAuthor }) {
  return author === "claude" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[0.6rem] font-medium text-ink-muted">
      <Bot className="size-3" />
      Claude
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[0.6rem] font-medium text-ink-muted">
      <PenLine className="size-3" />
      Writer
    </span>
  );
}
