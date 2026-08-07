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

export const continueWriting = {
  projectId: "shadows-of-elarion",
  title: "Shadows of Elarion",
  chapter: "Chapter 18: The Silence Beyond",
  words: 12450,
  target: 25000,
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
    text: "Possible plot inconsistency detected in Chapter 14.",
    linkLabel: "Review",
    linkHref: "/projects/shadows-of-elarion/chapters",
  },
  {
    id: "i2",
    tone: "purple",
    text: "Kaelen Duskryn hasn't appeared in 5 chapters.",
    linkLabel: "View Character",
    linkHref: "/projects/shadows-of-elarion/characters",
  },
  {
    id: "i3",
    tone: "success",
    text: "Dialogue ratio dropped 18% in your last chapter.",
    linkLabel: "See Analysis",
    linkHref: "/projects/shadows-of-elarion/analytics",
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
}[] = [
  {
    id: "a1",
    kind: "wrote",
    text: "You wrote 2,450 words in Shadows of Elarion",
    context: "Shadows of Elarion",
    time: "2h ago",
  },
  {
    id: "a2",
    kind: "character",
    text: "You created a new character: Lyriana Veyra",
    context: "Bound by Stars",
    time: "5h ago",
  },
  {
    id: "a3",
    kind: "world",
    text: "You updated world entry: Valenor Kingdom",
    context: "Shadows of Elarion",
    time: "1d ago",
  },
  {
    id: "a4",
    kind: "note",
    text: "You added a new note: Ancient Prophecies",
    context: "Shadows of Elarion",
    time: "2d ago",
  },
  {
    id: "a5",
    kind: "session",
    text: "AI Assistant completed a rewrite",
    context: "Shadows of Elarion",
    time: "3d ago",
  },
];
