/**
 * Placeholder projects data — stands in until the data layer (Prisma) and
 * auth are wired up. `dashboard-data.ts` re-exports `projects`/`Project` from
 * here so the dashboard's "Your Projects" grid and the full /projects page
 * share one source of truth.
 */

export type ProjectStatus = "active" | "completed" | "archived";
export type ProjectStage = "Active" | "Draft" | "Outline";

export type Project = {
  id: string;
  title: string;
  genre: string;
  logline: string;
  words: number;
  target: number;
  chapters: number;
  sessions: number;
  /** Human label for the "Updated …" meta line. */
  updated: string;
  /** Smaller = more recently updated; drives the "Recently Updated" sort. */
  updatedRank: number;
  status: ProjectStatus;
  /** Only meaningful for status "active" — which badge/colour to show. */
  stage?: ProjectStage;
};

export const projects: Project[] = [
  {
    id: "shadows-of-elarion",
    title: "Shadows of Elarion",
    genre: "Epic Fantasy",
    logline:
      "In a world where light is fading, an ancient prophecy awakens a forgotten bloodline.",
    words: 12450,
    target: 25000,
    chapters: 18,
    sessions: 42,
    updated: "2h ago",
    updatedRank: 1,
    status: "active",
    stage: "Active",
  },
  {
    id: "bound-by-stars",
    title: "Bound by Stars",
    genre: "Romance · Fantasy",
    logline: "Two souls from different worlds collide under a sky written with fate.",
    words: 8230,
    target: 20000,
    chapters: 15,
    sessions: 28,
    updated: "5h ago",
    updatedRank: 2,
    status: "active",
    stage: "Active",
  },
  {
    id: "the-last-heir",
    title: "The Last Heir",
    genre: "Dark Fantasy",
    logline: "The crown is not inherited. It is taken.",
    words: 4100,
    target: 15000,
    chapters: 12,
    sessions: 19,
    updated: "1d ago",
    updatedRank: 3,
    status: "active",
    stage: "Active",
  },
  {
    id: "rise-of-the-veil",
    title: "Rise of the Veil",
    genre: "Mystery · Thriller",
    logline: "Secrets buried in the veil. Truths that were never meant to rise.",
    words: 2340,
    target: 10000,
    chapters: 9,
    sessions: 11,
    updated: "2d ago",
    updatedRank: 4,
    status: "active",
    stage: "Draft",
  },
  {
    id: "whispers-of-the-deep",
    title: "Whispers of the Deep",
    genre: "Adventure · Fantasy",
    logline: "Beyond the map lies a world the sea has tried to forget.",
    words: 1125,
    target: 8000,
    chapters: 7,
    sessions: 8,
    updated: "3d ago",
    updatedRank: 5,
    status: "active",
    stage: "Draft",
  },
  {
    id: "ashes-of-a-kingdom",
    title: "Ashes of a Kingdom",
    genre: "Historical Fiction",
    logline: "When kingdoms fall, legends are born from the ashes.",
    words: 0,
    target: 5000,
    chapters: 5,
    sessions: 0,
    updated: "5d ago",
    updatedRank: 6,
    status: "active",
    stage: "Outline",
  },
  {
    id: "the-clockwork-court",
    title: "The Clockwork Court",
    genre: "Steampunk Fantasy",
    logline: "A broken heir and a city of gears must decide who really rules the throne.",
    words: 32000,
    target: 32000,
    chapters: 24,
    sessions: 58,
    updated: "3w ago",
    updatedRank: 7,
    status: "completed",
  },
  {
    id: "beneath-the-iron-moon",
    title: "Beneath the Iron Moon",
    genre: "Sci-Fi Fantasy",
    logline: "On a dying world lit by a metal moon, the last archivist searches for a forgotten sun.",
    words: 41500,
    target: 41500,
    chapters: 30,
    sessions: 71,
    updated: "1mo ago",
    updatedRank: 8,
    status: "completed",
  },
  {
    id: "letters-to-a-vanished-king",
    title: "Letters to a Vanished King",
    genre: "Historical Romance",
    logline: "A court scribe's secret letters outlive the kingdom that burned them.",
    words: 28000,
    target: 28000,
    chapters: 20,
    sessions: 44,
    updated: "2mo ago",
    updatedRank: 9,
    status: "completed",
  },
  {
    id: "the-cartographers-curse",
    title: "The Cartographer's Curse",
    genre: "Adventure Fantasy",
    logline: "Every map she draws erases a piece of her own memory.",
    words: 6200,
    target: 30000,
    chapters: 5,
    sessions: 9,
    updated: "4mo ago",
    updatedRank: 10,
    status: "archived",
  },
  {
    id: "winters-choir",
    title: "Winter's Choir",
    genre: "Gothic Horror",
    logline: "The choir stopped singing the night the snow turned red.",
    words: 3100,
    target: 22000,
    chapters: 3,
    sessions: 6,
    updated: "5mo ago",
    updatedRank: 11,
    status: "archived",
  },
  {
    id: "the-salt-and-the-storm",
    title: "The Salt and the Storm",
    genre: "Nautical Adventure",
    logline:
      "A mutinous crew, a cursed compass, and a captain who won't say why she's really sailing north.",
    words: 1800,
    target: 25000,
    chapters: 2,
    sessions: 4,
    updated: "6mo ago",
    updatedRank: 12,
    status: "archived",
  },
];

export type AchievementIcon = "flame" | "feather" | "compass";

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: AchievementIcon;
};

export const achievements: Achievement[] = [
  { id: "ach1", title: "Consistent Writer", detail: "7 days in a row", time: "2d ago", icon: "flame" },
  { id: "ach2", title: "Wordsmith", detail: "Wrote 10,000 words", time: "5d ago", icon: "feather" },
  { id: "ach3", title: "Plot Architect", detail: "Created 10 chapters", time: "1w ago", icon: "compass" },
];

/** Counts by lifecycle status, used for the tab bar and overview stats. */
export function projectStatusCounts(list: Project[]) {
  return {
    total: list.length,
    active: list.filter((p) => p.status === "active").length,
    completed: list.filter((p) => p.status === "completed").length,
    archived: list.filter((p) => p.status === "archived").length,
  };
}

/** Word-count progress across the currently-active projects only. */
export function activeWordStats(list: Project[]) {
  const active = list.filter((p) => p.status === "active");
  const written = active.reduce((sum, p) => sum + p.words, 0);
  const goal = active.reduce((sum, p) => sum + p.target, 0);
  const remaining = Math.max(goal - written, 0);
  const percent = goal > 0 ? Math.round((written / goal) * 100) : 0;
  return { written, goal, remaining, percent };
}

const GENRE_BUCKETS: [needle: string, label: string][] = [
  ["fantasy", "Fantasy"],
  ["romance", "Romance"],
  ["adventure", "Adventure"],
  ["mystery", "Mystery"],
  ["thriller", "Mystery"],
  ["historical", "Historical"],
  ["horror", "Horror"],
  ["gothic", "Horror"],
  ["sci-fi", "Sci-Fi"],
  ["steampunk", "Sci-Fi"],
];

export function primaryGenre(genre: string): string {
  const first = genre.split("·")[0]!.trim().toLowerCase();
  for (const [needle, label] of GENRE_BUCKETS) {
    if (first.includes(needle)) return label;
  }
  return genre.split("·")[0]!.trim();
}

/** Top genres by share of the project list, derived from each project's tag. */
export function topGenres(list: Project[], take = 5) {
  const counts = new Map<string, number>();
  for (const p of list) {
    const label = primaryGenre(p.genre);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = list.length || 1;
  return [...counts.entries()]
    .map(([label, count]) => ({ label, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, take);
}
