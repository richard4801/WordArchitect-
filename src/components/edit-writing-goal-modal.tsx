"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { setWritingGoals, useWritingGoals } from "@/lib/writing-goal-store";

/**
 * Shared daily/monthly word-goal editor — opened from both the Dashboard's
 * Today's Progress / Writing Goal cards and the manuscript editor's Daily
 * Goal sidebar widget, so there's one edit surface instead of two forks of
 * the same form. Portaled to <body>: several callers make their *entire*
 * trigger card clickable to open this, and a portal keeps the modal's own
 * clicks (inputs, Save/Cancel) out of the React tree those cards' onClick
 * handlers sit in — see options-menu.tsx for the same reasoning.
 */
export function EditWritingGoalModal({ onClose }: { onClose: () => void }) {
  const { dailyTarget, monthlyTarget } = useWritingGoals();
  const [daily, setDaily] = useState(String(dailyTarget));
  const [monthly, setMonthly] = useState(String(monthlyTarget));

  function handleSave() {
    setWritingGoals({
      dailyTarget: daily ? Number(daily) : undefined,
      monthlyTarget: monthly ? Number(monthly) : undefined,
    });
    onClose();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-canvas/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="card w-full max-w-sm p-5">
        <h2 className="font-display text-lg text-ink">Edit Writing Goals</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Saved on this device — there&rsquo;s no writing-session tracking backend yet, so these are personal targets, not synced.
        </p>

        <div className="mt-4">
          <label className="text-sm text-ink">Daily Word Goal</label>
          <input
            type="number"
            min={1}
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </div>

        <div className="mt-3">
          <label className="text-sm text-ink">Monthly Word Goal</label>
          <input
            type="number"
            min={1}
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm text-ink-muted transition-colors hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
