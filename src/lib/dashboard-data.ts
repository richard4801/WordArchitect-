/**
 * Placeholder dashboard data. This stands in until the data layer (Prisma)
 * and auth are wired up — shape it however the real models end up.
 */

export const user = {
  name: "Jessica",
  quote: {
    text: "Every great story begins with a single word.",
    attribution: "Keep writing.",
  },
};

/**
 * "Words Written (This Week)" and the Writing Goal card's "Days
 * Active"/"Consistency"/monthly total are all real now — see
 * `daily-progress-store.ts`, which derives them from actual autosaved
 * word-count deltas. `writingTime` has no real time-tracking backend at
 * all (not even a localStorage-derivable proxy), so it stays honestly
 * zeroed rather than showing a fabricated number.
 */
export const weeklyStats = {
  writingTime: { value: "0h 0m" },
};

export const writingGoal = {
  writingTime: "0h 0m",
};

export type AiInsightTone = "warn" | "purple" | "success";

/**
 * No real AI plot/pacing analysis runs yet, so this stays empty rather than
 * showing fabricated findings — AiInsightsCard renders a proper empty state
 * for it, same treatment as `activity` below.
 */
export const aiInsights: {
  id: string;
  tone: AiInsightTone;
  text: string;
  linkLabel: string;
  linkHref: string;
}[] = [];

// Single source of truth for project data lives in projects-data.ts (it also
// backs the full /projects page); re-exported here so the dashboard's "Your
// Projects" grid doesn't need a second import path.
export type { Project } from "@/lib/projects-data";
export { projects } from "@/lib/projects-data";

// Recent Activity is real now — see activity-log-store.ts.
