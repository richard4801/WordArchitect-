"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Themed confirm modal for destructive actions (delete, etc.) — the app
 * avoids native `window.confirm`/browser dialogs everywhere else (see
 * DropdownSelect's own comment on why native controls break the theme),
 * so deletes get the same on-brand treatment rather than an OS popup.
 *
 * Rendered through a portal into document.body rather than in place: some
 * call sites (e.g. a card whose whole body is a click-to-navigate button)
 * would otherwise have clicks inside this dialog bubble up to that
 * ancestor's own click handler — escaping to body sidesteps that
 * regardless of where this component gets rendered from.
 *
 * The card is capped at `85vh` with only the description area scrolling —
 * title and the Cancel/Confirm row stay pinned in place. A real production
 * bug caught this: a caller passed a description enumerating hundreds of
 * items (a large chapter-renumber plan), which grew the card taller than
 * the viewport with nothing scrollable, pushing both buttons off-screen
 * with no way to reach them at all (not even Escape, which this component
 * didn't handle either at the time) — a dialog the user could neither
 * confirm nor cancel. Escape-to-cancel is now also wired for the same
 * reason: a second way out that doesn't depend on the buttons being
 * reachable.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, submitting]);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-canvas/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="card flex max-h-[85vh] w-full max-w-sm flex-col p-5">
        <h2 className="shrink-0 font-display text-lg text-ink">{title}</h2>
        <div className="scroll-slim mt-2 min-h-0 flex-1 overflow-y-auto">
          <p className="whitespace-pre-wrap text-sm text-ink-muted">{description}</p>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
        <div className="mt-5 flex shrink-0 items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
