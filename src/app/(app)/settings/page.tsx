"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { changePassword, useAuthUser } from "@/lib/auth-store";
import {
  clearWritingVoice,
  reanalyzeWritingVoice,
  saveWritingVoice,
  useWritingVoice,
  useWritingVoiceActionError,
  useWritingVoiceActionStatus,
  useWritingVoiceLoadError,
  useWritingVoiceLoadStatus,
  type WritingVoiceProfile,
} from "@/lib/writing-voice-store";

export default function SettingsPage() {
  const user = useAuthUser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(password);
      setPassword("");
      setConfirm("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">Account details and security.</p>
      </div>

      <div className="card space-y-3 p-6">
        <h2 className="label-caps text-[0.65rem] text-ink-faint">Account</h2>
        <div>
          <p className="text-xs text-ink-faint">Email</p>
          <p className="text-sm text-ink">{user?.email}</p>
        </div>
        {user?.displayName && (
          <div>
            <p className="text-xs text-ink-faint">Display name</p>
            <p className="text-sm text-ink">{user.displayName}</p>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="label-caps text-[0.65rem] text-ink-faint">Change password</h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-4" noValidate>
          <div>
            <label className="label-caps text-[0.6rem]" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            />
          </div>
          <div>
            <label className="label-caps text-[0.6rem]" htmlFor="confirm-password">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat the new password"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            />
          </div>

          {error && <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Update password
            </button>
            {saved && <span className="text-xs text-success">Password updated.</span>}
          </div>
        </form>
      </div>

      <WritingVoiceSection />
    </div>
  );
}

/**
 * Scoped by `userId` alone (no `bookId` anywhere in its request/response
 * shapes) — a standing preference applied silently to every
 * `/generate-prose` call once a sample exists, not a per-project setting,
 * so it lives here on Settings rather than inside any book's workspace.
 */
function WritingVoiceSection() {
  const profile = useWritingVoice();
  const loadStatus = useWritingVoiceLoadStatus();
  const loadError = useWritingVoiceLoadError();

  if (loadStatus === "idle" || loadStatus === "loading") {
    return (
      <div className="card p-6">
        <h2 className="label-caps text-[0.65rem] text-ink-faint">Writing Voice</h2>
        <p className="mt-3 text-xs text-ink-faint">Loading…</p>
      </div>
    );
  }

  if (loadStatus === "error") {
    return (
      <div className="card p-6">
        <h2 className="label-caps text-[0.65rem] text-ink-faint">Writing Voice</h2>
        <p className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
          {loadError ?? "Couldn't load your writing voice."}
        </p>
      </div>
    );
  }

  // No key-based remount here on purpose: the parent above already gates
  // rendering until the load has resolved, so a plain lazy `useState`
  // initializer on first mount seeds correctly either way (an existing
  // sample or none). Remounting on every profile change (e.g. the id
  // appearing for the first time after a save) would wipe this
  // component's own `notice`/`warning` state the instant it's set — the
  // async save handler calls `setNotice` *after* the store's `emit()`
  // has already triggered the remount, so that call would land on an
  // already-unmounted instance and the "Saved." message would never show.
  return <WritingVoiceCard profile={profile} />;
}

function WritingVoiceCard({ profile }: { profile: WritingVoiceProfile | null }) {
  // Only the draft textarea needs local state (the user edits it before
  // saving) — style_profile/extraction_error/hasSample read live from
  // `profile` below instead of freezing a copy, so a second save never
  // goes stale.
  const [sampleDraft, setSampleDraft] = useState(profile?.sample_text ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const actionStatus = useWritingVoiceActionStatus();
  const actionError = useWritingVoiceActionError();

  const styleProfile = profile?.style_profile ?? null;
  const extractionError = profile?.extraction_error ?? null;
  const hasSample = Boolean(profile);

  async function handleSave() {
    setNotice(null);
    setWarning(null);
    try {
      const { extractionFailed } = await saveWritingVoice(sampleDraft);
      if (extractionFailed) {
        setWarning("Saved, but analysis failed — try Re-analyze.");
      } else {
        setNotice("Saved.");
      }
    } catch {
      // actionError below already shows the real failure text.
    }
  }

  async function handleReanalyze() {
    setNotice(null);
    setWarning(null);
    await reanalyzeWritingVoice();
    setNotice("Re-analyzed.");
  }

  async function handleClear() {
    await clearWritingVoice();
    setSampleDraft("");
    setConfirmingClear(false);
    setNotice("Cleared.");
    setWarning(null);
  }

  const submitting = actionStatus === "saving";
  const analyzing = actionStatus === "analyzing";
  const clearing = actionStatus === "clearing";

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="label-caps text-[0.65rem] text-ink-faint">Writing Voice</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Paste a sample of your own prose and every future generation leans toward your voice —
          applies across all your projects automatically, nothing to turn on per book.
        </p>
      </div>

      <div>
        <label className="label-caps text-[0.6rem]" htmlFor="writing-voice-sample">
          Writing sample
        </label>
        <textarea
          id="writing-voice-sample"
          value={sampleDraft}
          onChange={(e) => setSampleDraft(e.target.value)}
          placeholder="Paste a few paragraphs of your own writing…"
          rows={8}
          className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
        />
      </div>

      {(styleProfile || extractionError) && (
        <div className="space-y-2">
          {styleProfile && (
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <p className="label-caps text-[0.6rem] text-ink-faint">Here&rsquo;s what we learned from your sample</p>
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-ink-muted">{styleProfile}</p>
            </div>
          )}
          {extractionError && (
            <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
              Analysis error: {extractionError}
            </p>
          )}
        </div>
      )}

      {actionError && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">{actionError}</p>
      )}
      {warning && (
        <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-gold">{warning}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting || !sampleDraft.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Save sample
        </button>
        {hasSample && (
          <button
            type="button"
            onClick={handleReanalyze}
            disabled={analyzing || !sampleDraft.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Re-analyze
          </button>
        )}
        {hasSample && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            disabled={clearing}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {clearing && <Loader2 className="size-4 animate-spin" />}
            Clear
          </button>
        )}
        {notice && !warning && <span className="text-xs text-success">{notice}</span>}
      </div>

      {confirmingClear && (
        <ConfirmDialog
          title="Clear your writing voice?"
          description="This removes your saved sample and everything learned from it. There's no undo — future generations fall back to the default voice immediately. Your sample text and the summary above will be gone."
          confirmLabel="Clear"
          onConfirm={handleClear}
          onCancel={() => setConfirmingClear(false)}
        />
      )}
    </div>
  );
}
