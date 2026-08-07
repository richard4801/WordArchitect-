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

export const headlineStats = [
  { value: "12", label: "Projects" },
  { value: "436K", label: "Words Written" },
  { value: "89", label: "Days Writing" },
  { value: "24", label: "Achievements" },
] as const;

export const continueWriting = {
  projectId: "shadows-of-elarion",
  title: "Shadows of Elarion",
  chapter: "Chapter 18: The Silence Beyond",
  words: 12450,
  target: 25000,
};

export const statsOverview = {
  goalPercent: 78,
  metrics: [
    { label: "Words Written", value: "24,560", up: true },
    { label: "Chapters", value: "18", up: true },
    { label: "Sessions", value: "42", up: true },
    { label: "Avg. Words / Day", value: "1,125", up: true },
  ],
};

// Single source of truth for project data lives in projects-data.ts (it also
// backs the full /projects page); re-exported here so the dashboard's "Your
// Projects" grid doesn't need a second import path.
export type { Project } from "@/lib/projects-data";
export { projects } from "@/lib/projects-data";

export type Priority = "High" | "Medium" | "Low";

export const tasks: {
  id: string;
  title: string;
  context: string;
  priority: Priority;
}[] = [
  {
    id: "t1",
    title: "Outline Chapter 19",
    context: "Shadows of Elarion",
    priority: "High",
  },
  {
    id: "t2",
    title: "Develop Victarion's Backstory",
    context: "Shadows of Elarion",
    priority: "Medium",
  },
  {
    id: "t3",
    title: "Research Elven Kingdoms",
    context: "Worldbuilding",
    priority: "Low",
  },
  {
    id: "t4",
    title: "Write 1,000 Words Today",
    context: "Daily Goal",
    priority: "High",
  },
];

export type ActivityKind = "wrote" | "character" | "world" | "session";

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
    text: "You wrote 2,450 words",
    context: "Shadows of Elarion",
    time: "2h ago",
  },
  {
    id: "a2",
    kind: "character",
    text: "You created a new character: Lyriana",
    context: "Bound by Stars",
    time: "5h ago",
  },
  {
    id: "a3",
    kind: "world",
    text: "You updated world: Elarion",
    context: "Shadows of Elarion",
    time: "1d ago",
  },
  {
    id: "a4",
    kind: "session",
    text: "You completed a writing session",
    context: "1,125 words",
    time: "1d ago",
  },
];
