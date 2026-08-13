"use client";

/**
 * Real "words written today/this week/this month" tracking — the single
 * source of truth behind the manuscript editor's "Daily Goal" sidebar
 * widget AND the Dashboard's "Today's Progress" ring, "Writing Goal" card,
 * and "Words Written (This Week)" stat tile, so all of them read the exact
 * same number instead of each showing its own always-zero mock.
 *
 * There's no writing-session/activity-tracking backend resource yet (see
 * CLAUDE.md §4.7), so — same tradeoff `writing-goal-store.ts` already makes
 * for goal targets — this is persisted to localStorage: real and
 * per-browser, not synced across devices.
 *
 * Recording model: every successful chapter-body autosave reports that
 * chapter's *current* total word count via `recordChapterWordCount`. Only
 * the positive delta versus that chapter's last-recorded count is credited
 * to today — deleting text never subtracts from a day's tally (matches
 * what a writer means by "words written," not "net change"). A chapter's
 * count is first seeded via `seedChapterBaseline` when its body loads, so
 * opening an existing chapter with pre-existing content never credits its
 * whole word count as one day's work — only words actually added after
 * that point count.
 */

import { useEffect, useState, useSyncExternalStore } from "react";

const HISTORY_KEY = "wordarchitect_daily_progress";
const BASELINE_KEY = "wordarchitect_chapter_word_baselines";

export type DailyHistory = Record<string, number>;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

let history: DailyHistory = {};
let baselines: Record<string, number> = {};
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function ensureHydrated() {
  if (hydrated) return;
  history = loadJson(HISTORY_KEY, {});
  baselines = loadJson(BASELINE_KEY, {});
  hydrated = true;
}
function getHistorySnapshot(): DailyHistory {
  ensureHydrated();
  return history;
}
function getServerHistorySnapshot(): DailyHistory {
  return {};
}
function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  window.localStorage.setItem(BASELINE_KEY, JSON.stringify(baselines));
}

/** Seed a chapter's word-count baseline the first time its body loads — never overwrites an existing baseline. */
export function seedChapterBaseline(chapterId: string, words: number): void {
  ensureHydrated();
  if (baselines[chapterId] !== undefined) return;
  baselines = { ...baselines, [chapterId]: words };
  persist();
}

/** Report a chapter's post-save word count; credits today with the positive delta versus its last-known count, and returns that delta (0 if none/negative). */
export function recordChapterWordCount(chapterId: string, words: number): number {
  ensureHydrated();
  const previous = baselines[chapterId];
  baselines = { ...baselines, [chapterId]: words };
  let delta = 0;
  if (previous !== undefined && words > previous) {
    delta = words - previous;
    const key = dateKey(new Date());
    history = { ...history, [key]: (history[key] ?? 0) + delta };
  }
  persist();
  emit();
  return delta;
}

export function useTodaysWordsWritten(): number {
  const h = useSyncExternalStore(subscribe, getHistorySnapshot, getServerHistorySnapshot);
  return h[dateKey(new Date())] ?? 0;
}

/** Consecutive days with real writing, ending today (if today already has words) or yesterday otherwise — a day that hasn't happened yet never breaks the streak. */
export function useWritingStreak(): number {
  const h = useSyncExternalStore(subscribe, getHistorySnapshot, getServerHistorySnapshot);
  const cursor = new Date();
  if (!h[dateKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (h[dateKey(cursor)] > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Day-of-month values (current calendar month) with any recorded writing — feeds the Dashboard's mini-calendar dots. */
export function useActiveDaysThisMonth(): number[] {
  const h = useSyncExternalStore(subscribe, getHistorySnapshot, getServerHistorySnapshot);
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  return Object.keys(h)
    .filter((k) => k.startsWith(prefix) && h[k] > 0)
    .map((k) => Number(k.slice(prefix.length)))
    .sort((a, b) => a - b);
}

export function useMonthWordsWritten(): number {
  const activeDays = useActiveDaysThisMonth();
  const h = useSyncExternalStore(subscribe, getHistorySnapshot, getServerHistorySnapshot);
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  return activeDays.reduce((sum, day) => sum + (h[`${prefix}${String(day).padStart(2, "0")}`] ?? 0), 0);
}

/** Last 7 days (oldest first) plus a naive week-over-week trend — powers the Dashboard's "Words Written (This Week)" tile. */
export function useWeeklyWordsWritten(): { total: number; trendPercent: number; sparkline: number[] } {
  const h = useSyncExternalStore(subscribe, getHistorySnapshot, getServerHistorySnapshot);
  const sparkline: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    sparkline.push(h[dateKey(d)] ?? 0);
  }
  const total = sparkline.reduce((a, b) => a + b, 0);
  let prevTotal = 0;
  for (let i = 13; i >= 7; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    prevTotal += h[dateKey(d)] ?? 0;
  }
  const trendPercent = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
  return { total, trendPercent, sparkline };
}

/**
 * Today's day-of-month, resolved client-side only after mount (starts at
 * 1 so server and initial client render match, then updates) — mirrors
 * MiniCalendar's own documented reason for never trusting a raw `new
 * Date()` read during the shared server/client render pass.
 */
export function useTodayDayOfMonth(): number {
  const [day, setDay] = useState(1);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDay(new Date().getDate()));
    return () => cancelAnimationFrame(id);
  }, []);
  return day;
}
