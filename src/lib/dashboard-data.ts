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
 * Today's word-count ring + writing streak + a month of activity dots.
 * No writing-session tracking exists yet, so this is honestly zeroed —
 * not fabricated activity — until that backend resource exists.
 */
export const todaysProgress = {
  words: 0,
  target: 2000,
  streakDays: 0,
  // Fixed placeholder day-of-month (not real Date math — see MiniCalendar's
  // own doc comment on why: this avoids a server/client hydration mismatch
  // for a cosmetic "today" ring with no real activity data behind it yet).
  today: 18,
  activeDays: [] as number[],
};

/**
 * The five headline stat tiles above the AI Insights / Activity / Goal row.
 * wordsWritten/writingTime have no real time-tracking backend yet, so they
 * stay honestly zeroed rather than showing fabricated numbers.
 */
export const weeklyStats = {
  wordsWritten: { value: 0, trendPercent: 0, sparkline: [0, 0] },
  writingTime: { value: "0h 0m", trendPercent: 0 },
};

export const writingGoal = {
  current: 0,
  target: 50000,
  daysActive: 0,
  consistencyPercent: 0,
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

export type ActivityKind = "wrote" | "character" | "world" | "session" | "note";

export const activity: {
  id: string;
  kind: ActivityKind;
  text: string;
  context: string;
  time: string;
}[] = [];
