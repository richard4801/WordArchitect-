"use client";

/**
 * Personal writing goals (daily word target, monthly word target) shown on
 * the Dashboard's "Today's Progress" ring and "Writing Goal" card. Unlike
 * every other domain in this app, these are deliberately NOT backed by the
 * real backend — there is no writing-session/goal-tracking table (see
 * CLAUDE.md §4.7, "Dashboard-only data"), so building a real endpoint for
 * two numbers wasn't worth a new resource. But hardcoding them forever
 * (the old `todaysProgress.target: 2000` / `writingGoal.target: 50000` in
 * dashboard-data.ts) meant there was no way to ever change them, which is
 * the actual complaint this fixes — so they're persisted to localStorage
 * instead: a real, user-settable value, just not a synced one (same
 * "single stable value per browser install" tradeoff `getUserId()` in
 * api-client.ts already makes for identity).
 */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "wordarchitect_writing_goals";

export type WritingGoals = {
  dailyTarget: number;
  monthlyTarget: number;
};

const DEFAULTS: WritingGoals = { dailyTarget: 2000, monthlyTarget: 50000 };

function loadFromStorage(): WritingGoals {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<WritingGoals>;
    return {
      dailyTarget: Number(parsed.dailyTarget) > 0 ? Number(parsed.dailyTarget) : DEFAULTS.dailyTarget,
      monthlyTarget: Number(parsed.monthlyTarget) > 0 ? Number(parsed.monthlyTarget) : DEFAULTS.monthlyTarget,
    };
  } catch {
    return DEFAULTS;
  }
}

let goals: WritingGoals = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot(): WritingGoals {
  if (!hydrated) {
    goals = loadFromStorage();
    hydrated = true;
  }
  return goals;
}
function getServerSnapshot(): WritingGoals {
  return DEFAULTS;
}

/** Live writing goals for this browser — defaults until the user sets their own. */
export function useWritingGoals(): WritingGoals {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setWritingGoals(next: Partial<WritingGoals>): void {
  const current = getSnapshot();
  goals = {
    dailyTarget: next.dailyTarget && next.dailyTarget > 0 ? Math.round(next.dailyTarget) : current.dailyTarget,
    monthlyTarget: next.monthlyTarget && next.monthlyTarget > 0 ? Math.round(next.monthlyTarget) : current.monthlyTarget,
  };
  hydrated = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }
  emit();
}
