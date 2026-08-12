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

/** Today's word-count ring + writing streak + a month of activity dots. */
export const todaysProgress = {
  words: 1250,
  target: 2000,
  streakDays: 12,
  today: 18,
  // Days of the mock month with at least one writing session (deterministic
  // mock pattern — no real Date math, so server/client render identically).
  activeDays: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 16, 17, 18, 20, 21, 23, 24, 25, 27, 28],
};

/** The five headline stat tiles above the AI Insights / Activity / Goal row. */
export const weeklyStats = {
  wordsWritten: { value: 24560, trendPercent: 18, sparkline: [12, 18, 15, 22, 19, 27, 24] },
  writingTime: { value: "8h 45m", trendPercent: 12 },
};

export const writingGoal = {
  current: 24560,
  target: 50000,
  daysActive: 18,
  consistencyPercent: 78,
  writingTime: "8h 45m",
};

export type AiInsightTone = "warn" | "purple" | "success";

// linkHref points at the top-level workspace redirects (/writing,
// /characters — see the writing|characters|.../page.tsx redirect pages),
// never a hardcoded project id: those redirects always resolve to whatever
// the user's own most-recently-active real project is, so these stay
// functional no matter which project(s) actually exist.
export const aiInsights: {
  id: string;
  tone: AiInsightTone;
  text: string;
  linkLabel: string;
  linkHref: string;
}[] = [
  {
    id: "i1",
    tone: "warn",
    text: "Possible plot inconsistency detected in your latest chapter.",
    linkLabel: "Review",
    linkHref: "/writing",
  },
  {
    id: "i2",
    tone: "purple",
    text: "A POV character hasn't appeared in 5 chapters.",
    linkLabel: "View Character",
    linkHref: "/characters",
  },
  {
    id: "i3",
    tone: "success",
    text: "Dialogue ratio dropped 18% in your last chapter.",
    linkLabel: "See Analysis",
    linkHref: "/writing",
  },
];

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
