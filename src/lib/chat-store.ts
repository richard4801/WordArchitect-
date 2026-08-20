"use client";

/**
 * Real backend-backed AI Assistant Chat store — wraps the WordArchitect
 * backend's `/api/v1/chat` (+ session management endpoints; see the
 * backend repo's `src/routes/chat.ts` and `src/services/chatAssistant.ts`
 * on `claude/ai-fiction-platform-backend-qnvkm5`). This is a
 * persona-based discussion/brainstorming assistant backed by real book
 * data via read-only tool calls — separate from Hanami prose generation
 * (`/generate-prose`), and **not** streamed: a turn can involve several
 * tool round-trips before Claude produces a final answer, so callers
 * should show a typing indicator while `sendChatMessage` is in flight,
 * not a progress bar.
 *
 * A conversation is locked to the persona it was created with — the
 * backend already enforces this itself (`POST /chat` only reads
 * `persona` from the request body when `sessionId` is omitted; resuming
 * an existing session always uses that session's own stored persona,
 * ignoring anything else sent), so the frontend just needs to not offer
 * a UI affordance to change it mid-conversation.
 *
 * Same `bookId`-scoped single-current-book pattern as `notes-store.ts`/
 * `character-store.ts`/`banned-terms-store.ts` for the session *list*
 * (only one project's Recent Conversations are ever shown at once). The
 * currently open conversation's message thread is a separate, smaller
 * piece of state — same split `manuscript-store.ts` already uses between
 * the chapter list and whichever single chapter body is actually open.
 */

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch, getUserId } from "@/lib/api-client";

export type ChatPersona =
  | "general"
  | "story_assistant"
  | "character_coach"
  | "worldbuilding_guide"
  | "writing_editor"
  | "brainstormer";

export const CHAT_PERSONAS: ChatPersona[] = [
  "general",
  "story_assistant",
  "character_coach",
  "worldbuilding_guide",
  "writing_editor",
  "brainstormer",
];

export type ChatToolCall = { tool: string; input: Record<string, unknown> };

/** `chat_messages` row exactly as the backend returns it. */
export type ChatMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls: ChatToolCall[] | null;
  created_at: string;
};

/** `chat_sessions` row exactly as the backend returns it. */
export type ChatSessionRow = {
  id: string;
  user_id: string;
  book_id: string;
  persona: ChatPersona;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

type ChatResponse = { sessionId: string; message: ChatMessage };
type SessionsListResponse = { sessions: ChatSessionRow[] };
type SessionDetailResponse = { session: ChatSessionRow; messages: ChatMessage[] };
type SessionResponse = { session: ChatSessionRow };

// ---------------------------------------------------------------------
// Recent Conversations list (one book at a time)
// ---------------------------------------------------------------------

let sessionRows: ChatSessionRow[] = [];
let sessionsBookId: string | null = null;
let sessionsStatus: LoadStatus = "idle";
let sessionsError: string | null = null;

// ---------------------------------------------------------------------
// Whichever single conversation is actually open right now
// ---------------------------------------------------------------------

let activeSessionId: string | null = null;
let activeMessages: ChatMessage[] = [];
let activePersona: ChatPersona | null = null;
let activeStatus: LoadStatus = "idle";
let sending = false;

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSessionRowsSnapshot() {
  return sessionRows;
}
function getSessionsStatusSnapshot() {
  return sessionsStatus;
}
function getSessionsErrorSnapshot() {
  return sessionsError;
}

async function loadChatSessions(bookId: string): Promise<void> {
  sessionsBookId = bookId;
  sessionsStatus = "loading";
  sessionsError = null;
  emit();
  try {
    const res = await apiFetch<SessionsListResponse>(
      `/chat/sessions?bookId=${encodeURIComponent(bookId)}&userId=${encodeURIComponent(getUserId())}`,
    );
    sessionRows = res.sessions;
    sessionsStatus = "loaded";
  } catch (err) {
    sessionsStatus = "error";
    sessionsError = err instanceof Error ? err.message : "Failed to load conversations.";
  }
  emit();
}

/** Recent Conversations for one project, most-recently-updated first (server-sorted). */
export function useChatSessions(bookId: string | undefined): ChatSessionRow[] {
  useEffect(() => {
    if (bookId && bookId !== sessionsBookId) void loadChatSessions(bookId);
  }, [bookId]);
  return useSyncExternalStore(subscribe, getSessionRowsSnapshot, getSessionRowsSnapshot);
}
export function useChatSessionsLoadStatus(): LoadStatus {
  return useSyncExternalStore(subscribe, getSessionsStatusSnapshot, getSessionsStatusSnapshot);
}
export function useChatSessionsError(): string | null {
  return useSyncExternalStore(subscribe, getSessionsErrorSnapshot, getSessionsErrorSnapshot);
}

// ---------------------------------------------------------------------
// Active conversation
// ---------------------------------------------------------------------

function getActiveSnapshot() {
  return { sessionId: activeSessionId, messages: activeMessages, persona: activePersona, status: activeStatus };
}
let activeSnapshotCache = getActiveSnapshot();
function refreshActiveSnapshot() {
  activeSnapshotCache = getActiveSnapshot();
}

export type ActiveChat = {
  sessionId: string | null;
  messages: ChatMessage[];
  persona: ChatPersona | null;
  status: LoadStatus;
};

/** Whichever conversation is currently open (or a blank "not started yet" state). */
export function useActiveChat(): ActiveChat {
  return useSyncExternalStore(
    subscribe,
    () => activeSnapshotCache,
    () => activeSnapshotCache,
  );
}

export function useChatSending(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => sending,
    () => sending,
  );
}

/** Clears the active thread so the next sendChatMessage starts a brand-new conversation. */
export function startNewChatConversation(): void {
  activeSessionId = null;
  activeMessages = [];
  activePersona = null;
  activeStatus = "idle";
  refreshActiveSnapshot();
  emit();
}

/** Opens an existing conversation by id, loading its full history. */
export async function openChatConversation(sessionId: string): Promise<void> {
  activeSessionId = sessionId;
  activeMessages = [];
  activePersona = null;
  activeStatus = "loading";
  refreshActiveSnapshot();
  emit();
  try {
    const res = await apiFetch<SessionDetailResponse>(`/chat/sessions/${sessionId}`);
    if (activeSessionId !== sessionId) return; // superseded by a newer open/new-conversation call
    activeMessages = res.messages;
    activePersona = res.session.persona;
    activeStatus = "loaded";
  } catch {
    if (activeSessionId !== sessionId) return;
    activeStatus = "error";
  }
  refreshActiveSnapshot();
  emit();
}

/**
 * Send one message in the active conversation, creating it first if none
 * is open yet (in which case `persona` is required). Optimistically
 * appends the user's own message immediately — the assistant's reply
 * lands once the (unstreamed, potentially several-seconds) turn
 * completes. Throws on failure (a real backend/network error, not a
 * validation issue — callers should catch and show an inline retry, same
 * pattern as every other store's create/update actions).
 */
export async function sendChatMessage(
  bookId: string,
  text: string,
  persona?: ChatPersona,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const optimisticUserMessage: ChatMessage = {
    id: `pending-${crypto.randomUUID()}`,
    session_id: activeSessionId ?? "",
    role: "user",
    content: trimmed,
    tool_calls: null,
    created_at: new Date().toISOString(),
  };
  activeMessages = [...activeMessages, optimisticUserMessage];
  sending = true;
  refreshActiveSnapshot();
  emit();

  try {
    const res = await apiFetch<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({
        userId: getUserId(),
        bookId,
        sessionId: activeSessionId ?? undefined,
        persona: activeSessionId ? undefined : persona,
        message: trimmed,
      }),
    });

    const isNewSession = activeSessionId !== res.sessionId;
    activeSessionId = res.sessionId;
    if (isNewSession) activePersona = persona ?? "general";
    // Replace the optimistic placeholder with the real saved id, then append the reply.
    activeMessages = [
      ...activeMessages.filter((m) => m.id !== optimisticUserMessage.id),
      { ...optimisticUserMessage, id: `${res.sessionId}-u-${res.message.id}`, session_id: res.sessionId },
      res.message,
    ];
    activeStatus = "loaded";

    // Fold the session into the Recent Conversations list — bump it to
    // the front (most-recently-updated) rather than re-fetching the list.
    if (sessionsBookId === bookId) {
      const nowIso = new Date().toISOString();
      const existing = sessionRows.find((s) => s.id === res.sessionId);
      if (existing) {
        sessionRows = [
          { ...existing, updated_at: nowIso },
          ...sessionRows.filter((s) => s.id !== res.sessionId),
        ];
      } else {
        sessionRows = [
          {
            id: res.sessionId,
            user_id: getUserId(),
            book_id: bookId,
            persona: activePersona ?? "general",
            title: trimmed.length > 60 ? `${trimmed.slice(0, 59)}…` : trimmed,
            created_at: nowIso,
            updated_at: nowIso,
          },
          ...sessionRows,
        ];
      }
    }
  } catch (err) {
    // Roll back the optimistic message so the input can be retried cleanly.
    activeMessages = activeMessages.filter((m) => m.id !== optimisticUserMessage.id);
    sending = false;
    refreshActiveSnapshot();
    emit();
    throw err;
  }

  sending = false;
  refreshActiveSnapshot();
  emit();
}

/** Rename a conversation (title shown in Recent Conversations). */
export async function renameChatSession(sessionId: string, title: string): Promise<void> {
  const res = await apiFetch<SessionResponse>(`/chat/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  sessionRows = sessionRows.map((s) => (s.id === sessionId ? res.session : s));
  emit();
}

/** Delete a conversation and its messages; clears it from the active thread if it was open. */
export async function deleteChatSession(sessionId: string): Promise<void> {
  await apiFetch<void>(`/chat/sessions/${sessionId}`, { method: "DELETE" });
  sessionRows = sessionRows.filter((s) => s.id !== sessionId);
  if (activeSessionId === sessionId) {
    activeSessionId = null;
    activeMessages = [];
    activePersona = null;
    activeStatus = "idle";
    refreshActiveSnapshot();
  }
  emit();
}
