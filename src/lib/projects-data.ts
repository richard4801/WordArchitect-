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

export const projects: Project[] = [
  {
    id: "shadows-of-elarion",
    title: "Shadows of Elarion",
    genre: "Epic Fantasy",
    logline:
      "In a world where light is fading, an ancient prophecy awakens a forgotten bloodline. Kaelen, a reluctant heir, must journey through a fractured realm to unite the kingdoms, uncover long-buried truths, and face the darkness that threatens to consume Elarion.",
    words: 12450,
    target: 25000,
    chapters: 18,
    sessions: 42,
    daysActive: 12,
    updated: "2h ago",
    updatedRank: 1,
    status: "active",
    stage: "Active",
    created: "May 12, 2024",
    pov: "Third Person",
    tense: "Past Tense",
    language: "English",
    deadline: "Dec 31, 2024",
    povCharacters: 6,
    worldEntries: 8,
    tags: ["Epic", "Magic", "Prophecy", "War", "Friendship"],
    chapterList: [
      { number: 18, title: "The Silence Beyond", words: 2450 },
      { number: 17, title: "Whispers in the Dark", words: 2180 },
      { number: 16, title: "Bloodline Awakening", words: 2050 },
      { number: 15, title: "Echoes of the Past", words: 2310 },
      { number: 14, title: "The Veil Thins", words: 2120 },
    ],
    activityLog: [
      { id: "a1", kind: "wrote", text: "You updated Chapter 18: The Silence Beyond", time: "2h ago" },
      { id: "a2", kind: "note", text: "You created a new note: Ancient Runes", time: "5h ago" },
      { id: "a3", kind: "character", text: "You added Kaelen Duskryn to the story", time: "1d ago" },
      { id: "a4", kind: "world", text: "You updated the world entry: Valenor Kingdom", time: "2d ago" },
      { id: "a5", kind: "session", text: "You completed a writing session (1,245 words)", time: "2d ago" },
    ],
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
    daysActive: 9,
    updated: "5h ago",
    updatedRank: 2,
    status: "active",
    stage: "Active",
    created: "Jun 3, 2024",
    pov: "Dual POV",
    tense: "Present Tense",
    language: "English",
    deadline: "Nov 15, 2024",
    povCharacters: 2,
    worldEntries: 3,
    tags: ["Romance", "Fate", "Forbidden Love"],
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
    daysActive: 7,
    updated: "1d ago",
    updatedRank: 3,
    status: "active",
    stage: "Active",
    created: "Jul 20, 2024",
    pov: "First Person",
    tense: "Past Tense",
    language: "English",
    deadline: "Jan 10, 2025",
    povCharacters: 3,
    worldEntries: 4,
    tags: ["Dark Fantasy", "Betrayal", "Revenge"],
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
    daysActive: 5,
    updated: "2d ago",
    updatedRank: 4,
    status: "active",
    stage: "Draft",
    created: "Aug 8, 2024",
    pov: "Third Person Limited",
    tense: "Past Tense",
    language: "English",
    povCharacters: 2,
    worldEntries: 2,
    tags: ["Mystery", "Secrets", "Investigation"],
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
    daysActive: 4,
    updated: "3d ago",
    updatedRank: 5,
    status: "active",
    stage: "Draft",
    created: "Sep 1, 2024",
    pov: "First Person",
    tense: "Present Tense",
    language: "English",
    povCharacters: 1,
    worldEntries: 2,
    tags: ["Adventure", "Sea", "Forgotten Lore"],
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
    daysActive: 0,
    updated: "5d ago",
    updatedRank: 6,
    status: "active",
    stage: "Outline",
    created: "Sep 25, 2024",
    pov: "Third Person",
    tense: "Past Tense",
    language: "English",
    povCharacters: 0,
    worldEntries: 1,
    tags: ["Historical", "Legends"],
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
    daysActive: 21,
    updated: "3w ago",
    updatedRank: 7,
    status: "completed",
    created: "Jan 4, 2024",
    pov: "Third Person",
    tense: "Past Tense",
    language: "English",
    povCharacters: 5,
    worldEntries: 6,
    tags: ["Steampunk", "Gears", "Succession"],
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
    daysActive: 26,
    updated: "1mo ago",
    updatedRank: 8,
    status: "completed",
    created: "Oct 10, 2023",
    pov: "First Person",
    tense: "Present Tense",
    language: "English",
    povCharacters: 4,
    worldEntries: 9,
    tags: ["Sci-Fi", "Archives", "Lost Sun"],
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
    daysActive: 16,
    updated: "2mo ago",
    updatedRank: 9,
    status: "completed",
    created: "Feb 18, 2024",
    pov: "Epistolary",
    tense: "Past Tense",
    language: "English",
    povCharacters: 2,
    worldEntries: 3,
    tags: ["Historical Romance", "Letters", "Court Intrigue"],
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
    daysActive: 4,
    updated: "4mo ago",
    updatedRank: 10,
    status: "archived",
    created: "Mar 2, 2024",
    pov: "Third Person",
    tense: "Past Tense",
    language: "English",
    povCharacters: 1,
    worldEntries: 5,
    tags: ["Adventure", "Memory", "Curse"],
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
    daysActive: 3,
    updated: "5mo ago",
    updatedRank: 11,
    status: "archived",
    created: "Apr 14, 2024",
    pov: "First Person",
    tense: "Present Tense",
    language: "English",
    povCharacters: 1,
    worldEntries: 2,
    tags: ["Gothic Horror", "Choir", "Snow"],
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
    daysActive: 2,
    updated: "6mo ago",
    updatedRank: 12,
    status: "archived",
    created: "May 30, 2024",
    pov: "Third Person",
    tense: "Past Tense",
    language: "English",
    povCharacters: 2,
    worldEntries: 2,
    tags: ["Nautical", "Mutiny", "Curse"],
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
