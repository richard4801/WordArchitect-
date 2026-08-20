"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Globe2,
  Lightbulb,
  Loader2,
  type LucideIcon,
  MessageSquare,
  Pencil,
  PenLine,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { OptionsMenu } from "@/components/ui/options-menu";
import { formatRelativeTime } from "@/lib/activity-log-store";
import { confirmProposal, ProposalError } from "@/lib/chat-proposals";
import {
  CHAT_PERSONAS,
  type ChatMessage,
  type ChatPersona,
  type ChatSessionRow,
  type ChatToolCall,
  type LoadStatus,
  deleteChatSession,
  openChatConversation,
  renameChatSession,
  sendChatMessage,
  startNewChatConversation,
  useActiveChat,
  useChatSending,
  useChatSessions,
  useChatSessionsLoadStatus,
} from "@/lib/chat-store";
import { renderMarkdown } from "@/lib/simple-markdown";

/**
 * The AI Assistant chat panel — a persona-based discussion/brainstorming
 * assistant, backed by real book data via read-only tool calls. Not for
 * writing manuscript prose (that's Generate/Hanami) and not streamed (a
 * turn can involve several tool round-trips), so the only "live" feedback
 * while waiting is a typing indicator, not partial tokens.
 *
 * One component, two layouts sharing the same store/logic:
 * - "full": a permanent Recent Conversations rail beside the thread —
 *   the dedicated project Assistant tab.
 * - "compact": the rail collapses into a dropdown behind the header, to
 *   fit the ~360px chapter-editor side panel.
 */
export function ChatPanel({ bookId, layout = "full" }: { bookId: string; layout?: "full" | "compact" }) {
  const sessions = useChatSessions(bookId);
  const sessionsStatus = useChatSessionsLoadStatus();
  const active = useActiveChat();
  const sending = useChatSending();

  const [pendingPersona, setPendingPersona] = useState<ChatPersona | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [renaming, setRenaming] = useState<ChatSessionRow | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active.messages.length, sending]);

  const currentPersona = active.persona ?? pendingPersona;
  const hasStarted = currentPersona !== null;

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending || !currentPersona) return;
    setSendError(null);
    setDraft("");
    try {
      await sendChatMessage(bookId, text, active.sessionId ? undefined : currentPersona);
    } catch (err) {
      setDraft(text);
      setSendError(err instanceof Error ? err.message : "Couldn't send that. Try again.");
    }
  }

  function handleNewConversation() {
    startNewChatConversation();
    setPendingPersona(null);
    setDraft("");
    setSendError(null);
    setShowConversations(false);
  }

  async function handleOpenConversation(id: string) {
    setShowConversations(false);
    setDraft("");
    setSendError(null);
    await openChatConversation(id);
  }

  return (
    <div className={`flex min-h-0 flex-1 ${layout === "full" ? "gap-5" : "flex-col"}`}>
      {layout === "full" && (
        <ConversationsRail
          sessions={sessions}
          status={sessionsStatus}
          activeId={active.sessionId}
          onNew={handleNewConversation}
          onOpen={handleOpenConversation}
          onRename={setRenaming}
          onDelete={setConfirmingDeleteId}
        />
      )}

      <section className={`flex min-h-0 flex-1 flex-col ${layout === "full" ? "card p-0" : ""}`}>
        {layout === "compact" && (
          <CompactHeader
            sessions={sessions}
            activeId={active.sessionId}
            currentPersona={currentPersona}
            canChangePersona={!active.sessionId && pendingPersona !== null}
            open={showConversations}
            onToggle={() => setShowConversations((v) => !v)}
            onNew={handleNewConversation}
            onOpen={handleOpenConversation}
            onRename={setRenaming}
            onDelete={setConfirmingDeleteId}
            onChangePersona={() => setPendingPersona(null)}
          />
        )}
        {layout === "full" && hasStarted && currentPersona && (
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <PersonaBadge persona={currentPersona} />
            {!active.sessionId && (
              <button
                type="button"
                onClick={() => setPendingPersona(null)}
                className="text-xs text-gold hover:opacity-80"
              >
                Change persona
              </button>
            )}
          </div>
        )}

        {!hasStarted ? (
          <PersonaPicker onPick={setPendingPersona} compact={layout === "compact"} />
        ) : (
          <>
            <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {active.status === "loading" && active.messages.length === 0 ? (
                <p className="pt-8 text-center text-sm text-ink-faint">Loading conversation…</p>
              ) : active.messages.length === 0 ? (
                <p className="pt-8 text-center text-sm text-ink-faint">
                  Ask your first question below to start talking it through.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {active.messages.map((m) => (
                    <MessageBubble key={m.id} message={m} bookId={bookId} />
                  ))}
                  {sending && <TypingIndicator />}
                </div>
              )}
            </div>

            {sendError && <p className="px-5 pb-1 text-xs text-danger">{sendError}</p>}

            <ChatInput value={draft} onChange={setDraft} onSend={handleSend} disabled={sending} />
          </>
        )}
      </section>

      {renaming && <RenameSessionModal session={renaming} onClose={() => setRenaming(null)} />}
      {confirmingDeleteId && (
        <ConfirmDialog
          title="Delete this conversation?"
          description="This permanently deletes the conversation and everything said in it."
          confirmLabel="Delete"
          onConfirm={async () => {
            await deleteChatSession(confirmingDeleteId);
            setConfirmingDeleteId(null);
          }}
          onCancel={() => setConfirmingDeleteId(null)}
        />
      )}
    </div>
  );
}

const PERSONA_META: Record<ChatPersona, { label: string; focus: string; Icon: LucideIcon }> = {
  general: { label: "General Assistant", focus: "Whatever you bring up", Icon: Compass },
  story_assistant: { label: "Story Assistant", focus: "Plot, structure, pacing", Icon: BookOpen },
  character_coach: { label: "Character Coach", focus: "Motivations, relationships, arcs", Icon: Users },
  worldbuilding_guide: { label: "Worldbuilding Guide", focus: "Cultures, history, systems, geography", Icon: Globe2 },
  writing_editor: { label: "Writing Editor", focus: "Prose craft, line-level editing", Icon: PenLine },
  brainstormer: { label: "Brainstormer", focus: "Rapid idea generation, multiple options", Icon: Sparkles },
};

const TOOL_LABELS: Record<string, string> = {
  list_codex_entries: "Codex entries",
  get_codex_entry: "a Codex entry",
  search_manuscript: "manuscript search",
  get_manuscript_chapter: "a chapter",
  list_world_categories: "world categories",
  list_notes: "notes",
};

const PROPOSE_LABELS: Record<string, string> = {
  propose_create_codex_entry: "a new Codex entry",
  propose_update_codex_entry: "an update to a Codex entry",
  propose_create_world_category: "a new world category",
  propose_create_note: "a new note",
  propose_save_manuscript_scene: "saving a scene to the manuscript",
};

function PersonaBadge({ persona }: { persona: ChatPersona }) {
  const meta = PERSONA_META[persona];
  return (
    <div className="flex items-center gap-2">
      <meta.Icon className="size-4 text-gold" />
      <span className="text-sm font-medium text-ink">{meta.label}</span>
    </div>
  );
}

function PersonaPicker({ onPick, compact }: { onPick: (p: ChatPersona) => void; compact: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div>
        <p className="font-display text-xl text-ink">Talk it through</p>
        <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
          Talk through your story — for writing actual prose, use Generate.
        </p>
      </div>
      <div className={`grid w-full max-w-md gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        {CHAT_PERSONAS.map((p) => {
          const meta = PERSONA_META[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              className="card-2 flex items-start gap-2.5 p-3.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2/60"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-gold">
                <meta.Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{meta.label}</span>
                <span className="block text-xs text-ink-faint">{meta.focus}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConversationsRail({
  sessions,
  status,
  activeId,
  onNew,
  onOpen,
  onRename,
  onDelete,
}: {
  sessions: ChatSessionRow[];
  status: LoadStatus;
  activeId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onRename: (session: ChatSessionRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="card flex w-72 shrink-0 flex-col p-0">
      <div className="flex items-center justify-between border-b border-line p-4">
        <h2 className="label-caps text-[0.65rem]">Conversations</h2>
        <button
          type="button"
          onClick={onNew}
          aria-label="New conversation"
          className="grid size-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-2">
        {status === "loading" && sessions.length === 0 && (
          <p className="p-3 text-xs text-ink-faint">Loading…</p>
        )}
        {status !== "loading" && sessions.length === 0 && (
          <p className="p-3 text-xs text-ink-faint">No conversations yet — start one above.</p>
        )}
        <ul className="flex flex-col gap-0.5">
          {sessions.map((s) => (
            <ConversationRow
              key={s.id}
              session={s}
              active={s.id === activeId}
              onOpen={() => onOpen(s.id)}
              onRename={() => onRename(s)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function ConversationRow({
  session,
  active,
  onOpen,
  onRename,
  onDelete,
}: {
  session: ChatSessionRow;
  active: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const meta = PERSONA_META[session.persona];
  return (
    <li>
      <div className={`group flex items-center gap-1 rounded-lg pr-1 ${active ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 px-2.5 py-2 text-left">
          <p className="truncate text-sm text-ink">{session.title || meta.label}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-faint">
            <meta.Icon className="size-3 shrink-0" />
            <span className="truncate">
              {meta.label} · {formatRelativeTime(new Date(session.updated_at).getTime())}
            </span>
          </p>
        </button>
        <OptionsMenu
          ariaLabel="Conversation options"
          items={[
            { label: "Rename", Icon: Pencil, onClick: onRename },
            { label: "Delete", Icon: Trash2, danger: true, onClick: onDelete },
          ]}
        />
      </div>
    </li>
  );
}

function CompactHeader({
  sessions,
  activeId,
  currentPersona,
  canChangePersona,
  open,
  onToggle,
  onNew,
  onOpen,
  onRename,
  onDelete,
  onChangePersona,
}: {
  sessions: ChatSessionRow[];
  activeId: string | null;
  currentPersona: ChatPersona | null;
  canChangePersona: boolean;
  open: boolean;
  onToggle: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onRename: (session: ChatSessionRow) => void;
  onDelete: (id: string) => void;
  onChangePersona: () => void;
}) {
  const meta = currentPersona ? PERSONA_META[currentPersona] : null;
  return (
    <div className="relative border-b border-line px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onToggle} className="flex min-w-0 items-center gap-1.5 text-sm text-ink">
          {meta ? (
            <meta.Icon className="size-3.5 shrink-0 text-gold" />
          ) : (
            <MessageSquare className="size-3.5 shrink-0 text-ink-faint" />
          )}
          <span className="truncate">{meta ? meta.label : "Conversations"}</span>
          <ChevronDown className={`size-3.5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {canChangePersona && (
            <button type="button" onClick={onChangePersona} className="text-xs text-gold hover:opacity-80">
              Change
            </button>
          )}
          <button
            type="button"
            onClick={onNew}
            aria-label="New conversation"
            className="grid size-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      {open && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-10 cursor-default" onClick={onToggle} />
          <div className="absolute inset-x-2 top-full z-20 mt-1">
            <div className="card-2 max-h-72 overflow-y-auto p-2">
              {sessions.length === 0 && <p className="p-2 text-xs text-ink-faint">No conversations yet.</p>}
              <ul className="flex flex-col gap-0.5">
                {sessions.map((s) => (
                  <ConversationRow
                    key={s.id}
                    session={s}
                    active={s.id === activeId}
                    onOpen={() => onOpen(s.id)}
                    onRename={() => onRename(s)}
                    onDelete={() => onDelete(s.id)}
                  />
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MessageBubble({ message, bookId }: { message: ChatMessage; bookId: string }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isUser ? "bg-gold text-gold-contrast" : "card-2"}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="text-ink">{renderMarkdown(message.content)}</div>
        )}
        {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
          <ToolCallSummary calls={message.tool_calls} bookId={bookId} />
        )}
      </div>
    </div>
  );
}

function summarizeReads(reads: ChatToolCall[]): string {
  if (reads.length === 0) return "";
  const counts = new Map<string, number>();
  for (const r of reads) counts.set(r.tool, (counts.get(r.tool) ?? 0) + 1);
  const parts = [...counts.entries()].map(([tool, n]) => {
    const label = TOOL_LABELS[tool] ?? tool;
    return n > 1 ? `${n} ${label}` : label;
  });
  return `Looked up: ${parts.join(", ")}`;
}

function ToolCallSummary({ calls, bookId }: { calls: ChatToolCall[]; bookId: string }) {
  const [expanded, setExpanded] = useState(false);
  const reads = calls.filter((c) => !c.tool.startsWith("propose_"));
  const proposals = calls.filter((c) => c.tool.startsWith("propose_"));
  const readSummary = summarizeReads(reads);

  return (
    <div className="mt-2.5 border-t border-line/60 pt-2">
      {reads.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink"
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          <Search className="size-3" />
          {readSummary || "Looked something up"}
        </button>
      )}
      {expanded && reads.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-[0.68rem] text-ink-faint">
          {reads.map((c, i) => (
            <li key={i} className="break-all font-mono">
              {c.tool}({JSON.stringify(c.input)})
            </li>
          ))}
        </ul>
      )}
      {proposals.length > 0 && (
        <div className={`space-y-2 ${reads.length > 0 ? "mt-2.5" : ""}`}>
          {proposals.map((p, i) => (
            <ProposalCard key={i} tool={p.tool} input={p.input} bookId={bookId} />
          ))}
        </div>
      )}
    </div>
  );
}

function describeProposal(tool: string, input: Record<string, unknown>): string {
  switch (tool) {
    case "propose_create_codex_entry":
      return `${String(input.name ?? "Untitled")} — ${String(input.entryType ?? "?")}\n${String(input.description ?? "")}`;
    case "propose_update_codex_entry": {
      const fields = { ...(typeof input.fields === "object" && input.fields ? input.fields : {}) } as Record<string, unknown>;
      if (input.description !== undefined) fields.description = input.description;
      const keys = Object.keys(fields);
      return `Update ${keys.length > 0 ? keys.join(", ") : "this entry"}`;
    }
    case "propose_create_world_category":
      return String(input.name ?? "Untitled category");
    case "propose_create_note":
      return `${String(input.title ?? "Untitled note")} (${String(input.category ?? "?")})\n${String(input.excerpt ?? "")}`;
    case "propose_save_manuscript_scene": {
      const text = String(input.rawText ?? "");
      const preview = text.length > 140 ? `${text.slice(0, 140)}…` : text;
      return `Chapter ${String(input.chapterNumber ?? "?")}\n${preview}`;
    }
    default:
      return JSON.stringify(input);
  }
}

type ProposalState = { kind: "pending" } | { kind: "confirming" } | { kind: "confirmed"; summary: string } | { kind: "rejected" } | { kind: "error"; message: string };

/**
 * A real Confirm/Reject card for one `propose_*` tool call — see
 * `chat-proposals.ts` for what Confirm actually does. Reject is purely a
 * local state change: since the proposal never wrote anything, there's
 * nothing on the backend to undo. State resets whenever this component
 * remounts (e.g. switching conversations), matching the rest of this
 * panel's "no persisted confirm/reject state" scope — the underlying
 * message's tool_calls log is the permanent record of what was proposed.
 */
function ProposalCard({ tool, input, bookId }: { tool: string; input: Record<string, unknown>; bookId: string }) {
  const [state, setState] = useState<ProposalState>({ kind: "pending" });
  const label = PROPOSE_LABELS[tool] ?? tool;
  const [title, ...rest] = describeProposal(tool, input).split("\n");
  const detail = rest.join("\n").trim();

  async function handleConfirm() {
    setState({ kind: "confirming" });
    try {
      const summary = await confirmProposal(tool, bookId, input);
      setState({ kind: "confirmed", summary });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof ProposalError ? err.message : err instanceof Error ? err.message : "Couldn't save this.",
      });
    }
  }

  if (state.kind === "confirmed") {
    return (
      <p className="flex items-start gap-1.5 text-xs text-success">
        <Check className="mt-0.5 size-3 shrink-0" />
        <span>{state.summary}</span>
      </p>
    );
  }
  if (state.kind === "rejected") {
    return (
      <p className="flex items-start gap-1.5 text-xs text-ink-faint">
        <X className="mt-0.5 size-3 shrink-0" />
        <span>Rejected — nothing was saved.</span>
      </p>
    );
  }

  return (
    <div className="card-2 space-y-2 p-3">
      <p className="flex items-start gap-1.5 text-xs font-medium text-warn">
        <Lightbulb className="mt-0.5 size-3 shrink-0" />
        <span>Proposed {label}</span>
      </p>
      <div className="text-xs text-ink">
        <p className="font-medium">{title}</p>
        {detail && <p className="mt-1 whitespace-pre-wrap text-ink-muted">{detail}</p>}
      </div>
      {state.kind === "error" && <p className="text-xs text-danger">{state.message}</p>}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={state.kind === "confirming"}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {state.kind === "confirming" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          {state.kind === "confirming" ? "Saving…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setState({ kind: "rejected" })}
          disabled={state.kind === "confirming"}
          className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
        >
          <X className="size-3" />
          Reject
        </button>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="card-2 flex items-center gap-1.5 px-4 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-ink-faint" />
      </div>
    </div>
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border-t border-line p-3.5">
      <div className="flex items-end gap-2 rounded-xl border border-line bg-surface px-3 py-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder="Ask anything about your story…"
          className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="button"
          aria-label="Send"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-gold text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Send className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function RenameSessionModal({ session, onClose }: { session: ChatSessionRow; onClose: () => void }) {
  const [title, setTitle] = useState(session.title ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await renameChatSession(session.id, trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't rename this conversation.");
      setSubmitting(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-canvas/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="card w-full max-w-sm p-5">
        <h2 className="font-display text-lg text-ink">Rename Conversation</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
          }}
          autoFocus
          className="mt-4 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
        />
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting || !title.trim()}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
