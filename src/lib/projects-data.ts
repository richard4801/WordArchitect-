/**
 * Placeholder projects data — stands in until the data layer (Prisma) and
 * auth are wired up. `dashboard-data.ts` re-exports `projects`/`Project` from
 * here so the dashboard's "Your Projects" grid and the full /projects page
 * share one source of truth. `project-store.ts` wraps this array in a
 * reactive, fake-create-capable store for the /projects and /projects/[id]
 * pages.
 */

export type ProjectStatus = "active" | "completed" | "archived";
export type ProjectStage = "Active" | "Draft" | "Outline";

export type ChapterEntry = {
  number: number;
  title: string;
  words: number;
};

export type ProjectActivityKind = "wrote" | "character" | "world" | "session" | "note";

export type ProjectActivityEntry = {
  id: string;
  kind: ProjectActivityKind;
  text: string;
  time: string;
};

export type Project = {
  id: string;
  title: string;
  genre: string;
  logline: string;
  words: number;
  target: number;
  chapters: number;
  sessions: number;
  /** Distinct calendar days with at least one writing session. */
  daysActive: number;
  /** Human label for the "Updated …" meta line. */
  updated: string;
  /** Smaller = more recently updated; drives the "Recently Updated" sort. */
  updatedRank: number;
  status: ProjectStatus;
  /** Only meaningful for status "active" — which badge/colour to show. */
  stage?: ProjectStage;

  // ---- Detail-page-only fields (optional; the list/rail views ignore them) ----
  /** Human label for "Created …" — projects-data's own dates, not real timestamps. */
  created: string;
  pov?: string;
  tense?: string;
  language?: string;
  deadline?: string;
  povCharacters?: number;
  worldEntries?: number;
  tags?: string[];
  /** Explicit chapter list for the Overview tab; derived generically if absent. */
  chapterList?: ChapterEntry[];
  /** Explicit activity log for the Overview tab; derived generically if absent. */
  activityLog?: ProjectActivityEntry[];
};

export const projects: Project[] = [];

export type AchievementIcon = "flame" | "feather" | "compass";

export type Achievement = {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: AchievementIcon;
};

export const achievements: Achievement[] = [];

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

/** The project's chapter list for the Overview tab — explicit if set, else a
 *  generic countdown from its chapter count with an even word-count split. */
export function deriveRecentChapters(project: Project, take = 5): ChapterEntry[] {
  if (project.chapterList) return project.chapterList;
  const count = Math.min(take, project.chapters);
  if (count <= 0) return [];
  const avgWords = Math.max(1, Math.round(project.words / project.chapters));
  return Array.from({ length: count }, (_, i) => {
    const number = project.chapters - i;
    return { number, title: `Chapter ${number}`, words: avgWords };
  });
}

/** The project's activity feed for the Overview tab — explicit if set, else a
 *  small generic feed built from the project's own fields. */
export function deriveRecentActivity(project: Project): ProjectActivityEntry[] {
  if (project.activityLog) return project.activityLog;
  const entries: ProjectActivityEntry[] = [];
  if (project.words > 0) {
    entries.push({
      id: "d1",
      kind: "wrote",
      text: `You wrote in ${project.title}`,
      time: project.updated,
    });
  }
  if (project.sessions > 0) {
    entries.push({
      id: "d2",
      kind: "session",
      text: "You completed a writing session",
      time: project.updated,
    });
  }
  entries.push({ id: "d3", kind: "wrote", text: "Project created", time: project.created });
  return entries;
}
