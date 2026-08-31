"use client";

import { AlertTriangle, Check, ChevronLeft, Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { OptionsMenu } from "@/components/ui/options-menu";
import { refreshOutline } from "@/lib/outline-store";
import {
  AGENT_ROLE_META,
  AGENT_ROLES,
  type AgentPrompt,
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  EFFORT_LEVELS,
  type ExtractedEntityCandidate,
  outputShapeHint,
  PLACEHOLDER_REFERENCE,
  PLANNING_RUN_STATUS_LABEL,
  PLANNING_STAGE_META,
  PLANNING_STAGES,
  type AgentRole,
  type EffortLevel,
  type PlanningRun,
  type PlanningRunStatus,
  type PlanningStage,
  RUN_STAGES,
  SINGLE_STAGE_ROLES,
} from "@/lib/planning-data";
import {
  approvePlanningStage,
  confirmPlanningEntities,
  deleteAgentPromptVersion,
  finalizePlanningDirective,
  loadPlanningRun,
  rejectPlanningStage,
  runPipelineForward,
  saveAgentPromptVersion,
  sendPlanningChatTurn,
  startPlanningRun,
  updateAgentPromptVersion,
  useActivePlanningRun,
  useAgentPrompts,
  useAgentPromptsError,
  useAgentPromptsLoadStatus,
} from "@/lib/planning-store";
import { useProject } from "@/lib/project-store";

/**
 * The Planning Engine workspace — a pre-writing pipeline (Stage 1 Core
 * Summary -> Stage 2 Act Outlines -> Stage 3 Chapter Beats), each stage
 * written by a Generator, reviewed by two parallel Critics, synthesized
 * by an Arbitrator, and gated on explicit human approval before
 * advancing. This never writes manuscript prose — drafting stays exactly
 * as it was, entirely through the existing Generate/Hanami flow.
 *
 * Two views live on one route rather than two separate ones: the Pipeline
 * runner (driving an in-progress run stage by stage) and the Prompt
 * Editor (authoring the agent behavior every run depends on — the backend
 * has zero prompt content of its own, so a run can't do anything until at
 * least the Stage 1 prompts exist). A dedicated, full-bleed page like
 * Chapters/Outliner/Assistant, not a tab inside the shared project
 * chrome — the Prompt Editor's two full-width textareas and the Pipeline's
 * review/chat panels both want more room than the tab-chrome + right-rail
 * layout leaves.
 *
 * A run's `id` is the only client-side state that needs to survive a
 * refresh — persisted in this page's own `?run=` URL param, per the
 * backend's own suggested resume pattern (`GET /planning/runs/:id`).
 */

type View = "pipeline" | "prompts";

export default function PlanningPage() {
  return (
    <Suspense fallback={null}>
      <PlanningPageInner />
    </Suspense>
  );
}

function PlanningPageInner() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const pathname = usePathname();
  const router = useRouter();
  const runIdParam = useSearchParams().get("run");
  const [view, setView] = useState<View>("pipeline");

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

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-5 py-3 sm:px-6">
        <Link
          href={`/projects/${project.id}`}
          className="flex shrink-0 items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" />
          Back to Project
        </Link>
        <span className="hidden text-line-strong sm:inline">/</span>
        <span className="hidden truncate text-sm font-medium text-ink sm:inline">Planning Engine</span>
        <div className="ml-auto flex items-center gap-1 rounded-xl border border-line p-1">
          <button
            type="button"
            onClick={() => setView("pipeline")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "pipeline" ? "bg-gold text-gold-contrast" : "text-ink-muted hover:text-ink"
            }`}
          >
            Pipeline
          </button>
          <button
            type="button"
            onClick={() => setView("prompts")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "prompts" ? "bg-gold text-gold-contrast" : "text-ink-muted hover:text-ink"
            }`}
          >
            Prompts
          </button>
        </div>
      </header>
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {view === "pipeline" ? (
          <PipelineView
            bookId={project.id}
            runIdParam={runIdParam}
            onRunIdChange={(runId) => router.replace(runId ? `${pathname}?run=${runId}` : pathname)}
          />
        ) : (
          <PromptEditorView bookId={project.id} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------

function PipelineView({
  bookId,
  runIdParam,
  onRunIdChange,
}: {
  bookId: string;
  runIdParam: string | null;
  onRunIdChange: (runId: string | null) => void;
}) {
  // The active-run store is a singleton across the whole app (one run is
  // ever being driven at a time) — guard against a stale run left over
  // from a different project after an SPA navigation, same "check the id
  // still matches" pattern the manuscript editor's chapter-body singleton
  // already uses.
  const { run: rawRun, status, error } = useActivePlanningRun();
  const run = rawRun && rawRun.bookId === bookId ? rawRun : null;

  const [starting, setStarting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (runIdParam && (!run || run.id !== runIdParam)) void loadPlanningRun(runIdParam);
  }, [runIdParam, run]);

  async function handleStart() {
    setStarting(true);
    setActionError(null);
    try {
      const newRun = await startPlanningRun(bookId);
      onRunIdChange(newRun.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't start a planning run.");
    } finally {
      setStarting(false);
    }
  }

  async function handleAdvance() {
    if (!run) return;
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
    if (!run) return;
    setAdvancing(true);
    setActionError(null);
    const wasStage3 = run.currentStage === "stage_3_beats";
    try {
      await approvePlanningStage(run.id);
      // Stage 3 approval materializes real chapter_beats server-side —
      // refresh the Outliner's own cache so the new beats show up there
      // without the writer needing a manual page reload.
      if (wasStage3) refreshOutline(bookId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't approve this stage.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleReject() {
    if (!run) return;
    setAdvancing(true);
    setActionError(null);
    try {
      await rejectPlanningStage(run.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't reject this stage.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleFinalizeDirective() {
    if (!run) return;
    setAdvancing(true);
    setActionError(null);
    try {
      await finalizePlanningDirective(run.id);
      const result = await runPipelineForward(run.id);
      if (result.status === "failed" && result.lastError) setActionError(result.lastError);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't finalize the directive.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleConfirmEntities(approvedIndexes: number[]) {
    if (!run) return;
    setAdvancing(true);
    setActionError(null);
    try {
      await confirmPlanningEntities(run.id, approvedIndexes);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't save the selected entities.");
    } finally {
      setAdvancing(false);
    }
  }

  if (!runIdParam && !run) {
    return <StartPlanningCard onStart={handleStart} starting={starting} error={actionError} />;
  }

  if (status === "loading" && !run) {
    return <p className="text-center text-sm text-ink-muted">Loading planning run…</p>;
  }

  if (status === "error" && !run) {
    return (
      <div className="mx-auto max-w-xl card p-6 text-center">
        <p className="text-sm text-danger">{error ?? "Couldn't load this planning run."}</p>
        <button
          type="button"
          onClick={handleStart}
          disabled={starting}
          className="mt-4 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Start a New Run
        </button>
      </div>
    );
  }

  if (!run) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <StageStepper currentStage={run.currentStage} runStatus={run.status} />
      {actionError && (
        <p className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          <AlertTriangle className="size-3.5 shrink-0" />
          {actionError}
        </p>
      )}
      <RunStatusPanel
        run={run}
        advancing={advancing}
        onAdvance={handleAdvance}
        onApprove={handleApprove}
        onReject={handleReject}
        onSendChat={(message) => sendPlanningChatTurn(run.id, message)}
        onFinalizeDirective={handleFinalizeDirective}
        onConfirmEntities={handleConfirmEntities}
      />
    </div>
  );
}

function StartPlanningCard({
  onStart,
  starting,
  error,
}: {
  onStart: () => void;
  starting: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-8 text-center">
        <Sparkles className="mx-auto size-6 text-gold" />
        <h2 className="mt-3 font-display text-xl text-ink">Start Planning</h2>
        <p className="mt-2 text-sm text-ink-muted">
          A guided pre-writing pipeline — Core Summary, then Act Outlines, then Chapter Beats — each stage written
          by a Generator, reviewed by two Critics, and synthesized by an Arbitrator before it comes to you for
          approval. This never writes manuscript prose; Generate/drafting stays exactly as it is.
        </p>
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

function StageStepper({
  currentStage,
  runStatus,
}: {
  currentStage: Exclude<PlanningStage, "all">;
  runStatus: PlanningRunStatus;
}) {
  const currentIndex = RUN_STAGES.indexOf(currentStage);
  return (
    <div className="flex items-center gap-2">
      {RUN_STAGES.map((stage, i) => {
        const meta = PLANNING_STAGE_META[stage];
        const isDone = i < currentIndex || (i === currentIndex && runStatus === "done");
        const isCurrent = i === currentIndex && runStatus !== "done";
        return (
          <div key={stage} className="flex flex-1 items-center gap-2 last:flex-none">
            <div
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                isCurrent
                  ? "border-gold bg-gold/10 text-gold"
                  : isDone
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-line text-ink-faint"
              }`}
            >
              {isDone ? <Check className="size-3.5" /> : <span className="font-num">{i + 1}</span>}
              {meta.short}
            </div>
            {i < RUN_STAGES.length - 1 && <div className="h-px flex-1 bg-line" />}
          </div>
        );
      })}
    </div>
  );
}

function RunStatusPanel({
  run,
  advancing,
  onAdvance,
  onApprove,
  onReject,
  onSendChat,
  onFinalizeDirective,
  onConfirmEntities,
}: {
  run: PlanningRun;
  advancing: boolean;
  onAdvance: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSendChat: (message: string) => Promise<PlanningRun>;
  onFinalizeDirective: () => void;
  onConfirmEntities: (approvedIndexes: number[]) => void;
}) {
  const stageMeta = PLANNING_STAGE_META[run.currentStage];

  switch (run.status) {
    case "generating":
    case "critiquing":
    case "awaiting_arbitration":
      return (
        <div className="card p-6 text-center">
          <p className="text-sm text-ink-muted">{PLANNING_RUN_STATUS_LABEL[run.status]}…</p>
          <button
            type="button"
            onClick={onAdvance}
            disabled={advancing}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {advancing && <Loader2 className="size-4 animate-spin" />}
            {advancing ? "Working…" : run.status === "generating" ? `Generate ${stageMeta.short}` : "Continue"}
          </button>
        </div>
      );
    case "failed":
      return (
        <div className="card space-y-3 p-6">
          <p className="flex items-center gap-2 text-sm text-danger">
            <AlertTriangle className="size-4 shrink-0" />
            {run.lastError ?? "Something went wrong."}
          </p>
          <button
            type="button"
            onClick={onAdvance}
            disabled={advancing}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-50"
          >
            {advancing && <Loader2 className="size-4 animate-spin" />}
            Retry
          </button>
        </div>
      );
    case "awaiting_user_review":
      return <ReviewGate run={run} advancing={advancing} onApprove={onApprove} onReject={onReject} />;
    case "user_chat_active":
      return <ChatInterview run={run} advancing={advancing} onSend={onSendChat} onFinalize={onFinalizeDirective} />;
    case "awaiting_entity_review":
      return <EntityReview key={run.id} run={run} advancing={advancing} onConfirm={onConfirmEntities} />;
    case "done":
      return (
        <div className="card p-6 text-center">
          <Check className="mx-auto size-6 text-success" />
          <p className="mt-2 text-sm text-ink">
            Planning complete. Chapter Beats are already in the Outliner — nothing else to do here.
          </p>
        </div>
      );
    default:
      return null;
  }
}

function ReviewGate({
  run,
  advancing,
  onApprove,
  onReject,
}: {
  run: PlanningRun;
  advancing: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const artifact = run.stageArtifacts[run.currentStage] ?? "";
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="label-caps text-[0.65rem]">{PLANNING_STAGE_META[run.currentStage].label} — Artifact</h3>
        <pre className="scroll-slim mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap break-words text-sm text-ink">
          {artifact}
        </pre>
      </div>
      {run.panelReviews && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ReviewCard title="Logic Critic" value={run.panelReviews.logic_critic} />
          <ReviewCard title="Suspense Critic" value={run.panelReviews.suspense_critic} />
        </div>
      )}
      {run.arbitratorSynthesis !== null && run.arbitratorSynthesis !== undefined && (
        <div className="card p-5">
          <h3 className="label-caps text-[0.65rem]">Arbitrator Synthesis</h3>
          <JsonBlock value={run.arbitratorSynthesis} />
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onReject}
          disabled={advancing}
          className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={advancing}
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {advancing && <Loader2 className="size-4 animate-spin" />}
          Approve
        </button>
      </div>
    </div>
  );
}

function ReviewCard({ title, value }: { title: string; value: unknown }) {
  if (value === undefined) return null;
  return (
    <div className="card p-4">
      <h4 className="label-caps text-[0.6rem]">{title}</h4>
      <JsonBlock value={value} />
    </div>
  );
}

/** panel_reviews / arbitrator_synthesis have no fixed schema — they're whatever shape the writer's own prompts ask the model to return, so this renders defensively rather than assuming any particular field. */
function JsonBlock({ value }: { value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="scroll-slim mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs text-ink-muted">
      {text}
    </pre>
  );
}

function ChatInterview({
  run,
  advancing,
  onSend,
  onFinalize,
}: {
  run: PlanningRun;
  advancing: boolean;
  onSend: (message: string) => Promise<PlanningRun>;
  onFinalize: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

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
    <div className="card flex flex-col p-5">
      <h3 className="label-caps text-[0.65rem]">Rejection Interview</h3>
      <p className="mt-1 text-xs text-ink-faint">
        Tell the Arbitrator what should change — once you&apos;re satisfied, finalize to regenerate.
      </p>
      <div className="scroll-slim mt-3 flex max-h-96 min-h-[120px] flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-line p-3">
        {run.chatHistory.length === 0 && (
          <p className="text-xs text-ink-faint">No messages yet — say what should change.</p>
        )}
        {run.chatHistory.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-gold/15 text-ink" : "bg-surface-2 text-ink-muted"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="What should change?"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
        />
        <button
          type="button"
          aria-label="Send"
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
      <button
        type="button"
        onClick={onFinalize}
        disabled={advancing || run.chatHistory.length === 0}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-50"
      >
        {advancing && <Loader2 className="size-4 animate-spin" />}
        Finalize & Regenerate
      </button>
    </div>
  );
}

type IndexedEntity = ExtractedEntityCandidate & { index: number };

function EntityReview({
  run,
  advancing,
  onConfirm,
}: {
  run: PlanningRun;
  advancing: boolean;
  onConfirm: (approvedIndexes: number[]) => void;
}) {
  const entities = run.extractedEntities ?? [];
  // Lazy initializer only — this component is remounted (keyed by run.id,
  // see RunStatusPanel) whenever it's showing a different run, so there's
  // no later point where `entities` changes out from under an already-
  // mounted instance that would need an effect to re-sync.
  const [checked, setChecked] = useState<Set<number>>(() => new Set(entities.map((_, i) => i)));

  const indexed: IndexedEntity[] = entities.map((e, i) => ({ ...e, index: i }));
  const characters = indexed.filter((e) => e.type === "codex_entry");
  const worldCategories = indexed.filter((e) => e.type === "world_category");

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  if (entities.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-ink-muted">No new entities were found in the approved beats.</p>
        <button
          type="button"
          onClick={() => onConfirm([])}
          disabled={advancing}
          className="mt-4 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Select which of these should actually be written to your Codex / World Categories — anything left unchecked
        is discarded.
      </p>
      {characters.length > 0 && <EntityGroup title="Characters" items={characters} checked={checked} onToggle={toggle} />}
      {worldCategories.length > 0 && (
        <EntityGroup title="World Categories" items={worldCategories} checked={checked} onToggle={toggle} />
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onConfirm([...checked])}
          disabled={advancing}
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {advancing && <Loader2 className="size-4 animate-spin" />}
          Confirm Selected ({checked.size})
        </button>
      </div>
    </div>
  );
}

function EntityGroup({
  title,
  items,
  checked,
  onToggle,
}: {
  title: string;
  items: IndexedEntity[];
  checked: Set<number>;
  onToggle: (index: number) => void;
}) {
  return (
    <div className="card p-4">
      <h4 className="label-caps text-[0.6rem]">{title}</h4>
      <ul className="mt-2 divide-y divide-line">
        {items.map((e) => (
          <li key={e.index} className="flex items-start gap-3 py-2.5">
            <input
              type="checkbox"
              checked={checked.has(e.index)}
              onChange={() => onToggle(e.index)}
              className="mt-0.5 accent-gold"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {e.name}
                {e.entryType ? ` · ${e.entryType}` : ""}
              </p>
              {e.description && <p className="mt-0.5 text-xs text-ink-muted">{e.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------
// Prompt Editor
// ---------------------------------------------------------------------

function PromptEditorView({ bookId }: { bookId: string }) {
  const prompts = useAgentPrompts(bookId);
  const listStatus = useAgentPromptsLoadStatus();
  const listError = useAgentPromptsError();

  const [role, setRole] = useState<AgentRole>("generator");
  const [stage, setStage] = useState<PlanningStage>("stage_1_summary");
  const [versionError, setVersionError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // A timed subscription, not a synchronous setState-in-effect — the
  // sanctioned effect shape (see EntityReview's comment above for the
  // alternative "remount via key" shape used for the draft form below).
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label-caps text-[0.6rem]">Role</label>
          <DropdownSelect
            value={AGENT_ROLE_META[role].label}
            onChange={(label) => {
              const next = AGENT_ROLES.find((r) => AGENT_ROLE_META[r].label === label);
              if (next) setRole(next);
            }}
            options={AGENT_ROLES.map((r) => AGENT_ROLE_META[r].label)}
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
        {AGENT_ROLE_META[role].description}
        {SINGLE_STAGE_ROLES.has(role) ? ' Typically only needs one "All Stages" version.' : ""}
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
                  <p className="text-sm text-ink">
                    v{v.version}
                    {v.isActive && (
                      <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-[0.6rem] font-semibold text-success">
                        ACTIVE
                      </span>
                    )}
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
 * The editable draft (System Prompt / User Prompt Template / Model /
 * Effort) for one role+stage. Remounted (via the `key` at its call site
 * in PromptEditorView, keyed by role+stage+active version id) whenever
 * any of those change, rather than an effect re-syncing local state to
 * `active` on every change — the same "reset via remount" shape the rest
 * of this app uses for an analogous case (EditorBody's `key={activeChapter.id}`
 * in the manuscript editor, see CLAUDE.md). `active` only ever seeds this
 * component's *initial* state; it's a draft from then on, so typing here
 * never fights a background refetch.
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

  async function handleSave() {
    if (!systemPrompt.trim() || !userPromptTemplate.trim()) {
      setSaveError("Both System Prompt and User Prompt Template are required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveAgentPromptVersion(bookId, { agentRole: role, stage, systemPrompt, userPromptTemplate, model, effort });
      // Success remounts this component fresh (the parent's `active` prop
      // changes to the new version, changing this component's key) — no
      // need to reset `saving` here.
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Couldn't save this prompt.");
      setSaving(false);
    }
  }

  const placeholders = PLACEHOLDER_REFERENCE[role];

  return (
    <div className="card space-y-4 p-5">
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
            <span
              key={p.token}
              title={p.meaning}
              className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.65rem] text-ink-muted"
            >
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
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save New Version
        </button>
      </div>
    </div>
  );
}
