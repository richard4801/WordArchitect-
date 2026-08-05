"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Feather,
  Filter,
  Flame,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Ring } from "@/components/ui/ring";
import { CoverArt } from "@/components/ui/cover-art";
import {
  achievements,
  activeWordStats,
  type AchievementIcon,
  type Project,
  type ProjectStatus,
  primaryGenre,
  projects,
  projectStatusCounts,
  topGenres,
} from "@/lib/projects-data";

const PER_PAGE = 6;
type StatusFilter = "all" | ProjectStatus;
type SortKey = "recent" | "title" | "progress" | "words";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);

  // Overview stats always reflect the whole roster, independent of the list
  // filters below.
  const counts = projectStatusCounts(projects);
  const wordStats = activeWordStats(projects);
  const genres = topGenres(projects);
  const genreOptions = useMemo(
    () => [...new Set(projects.map((p) => primaryGenre(p.genre)))].sort(),
    [],
  );

  const filtered = useMemo(() => {
    let list = projects;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (genreFilter !== "all") {
      list = list.filter((p) => primaryGenre(p.genre) === genreFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.genre.toLowerCase().includes(q) ||
          p.logline.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "recent":
        sorted.sort((a, b) => a.updatedRank - b.updatedRank);
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "progress":
        sorted.sort((a, b) => b.words / b.target - a.words / a.target);
        break;
      case "words":
        sorted.sort((a, b) => b.words - a.words);
        break;
    }
    return sorted;
  }, [statusFilter, genreFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  const TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All Projects", count: counts.total },
    { key: "active", label: "Active", count: counts.active },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "archived", label: "Archived", count: counts.archived },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink">Projects</h1>
          <p className="mt-1 text-sm text-ink-muted">All your stories in one place.</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          New Project
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search projects..."
            className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </div>

        <div className="relative shrink-0">
          <Filter className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
          <select
            value={genreFilter}
            onChange={(e) => {
              setGenreFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none rounded-xl border border-line bg-surface py-2.5 pl-8 pr-8 text-sm text-ink-muted focus:border-line-strong focus:outline-none"
          >
            <option value="all">All Genres</option>
            {genreOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
        </div>

        <div className="relative shrink-0">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              setPage(1);
            }}
            className="appearance-none rounded-xl border border-line bg-surface py-2.5 pl-4 pr-8 text-sm text-ink-muted focus:border-line-strong focus:outline-none"
          >
            <option value="recent">Recently Updated</option>
            <option value="title">Title (A–Z)</option>
            <option value="progress">Progress</option>
            <option value="words">Words Written</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
        </div>
      </div>

      <div className="flex items-center gap-6 overflow-x-auto border-b border-line text-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`relative shrink-0 whitespace-nowrap pb-3 transition-colors ${
              statusFilter === tab.key
                ? "text-ink"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label} <span className="text-ink-faint">{tab.count}</span>
            {statusFilter === tab.key && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {pageItems.length === 0 ? (
            <div className="card p-10 text-center text-sm text-ink-muted">
              No projects match your search.
            </div>
          ) : (
            pageItems.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))
          )}

          {filtered.length > 0 && (
            <PaginationFooter
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              perPage={PER_PAGE}
              onPage={setPage}
            />
          )}
        </div>

        <aside className="space-y-6">
          <ProjectOverviewCard counts={counts} />
          <WordCountCard stats={wordStats} />
          <TopGenresCard genres={genres} />
          <AchievementsCard />
          <InspirationCard />
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- */

const STATUS_BADGE: Record<string, { label: string; varName: string }> = {
  Active: { label: "ACTIVE", varName: "--gold" },
  Draft: { label: "DRAFT", varName: "--warn" },
  Outline: { label: "OUTLINE", varName: "--info" },
  completed: { label: "COMPLETED", varName: "--success" },
  archived: { label: "ARCHIVED", varName: "--low" },
};

function ProjectRow({ project }: { project: Project }) {
  const percent = Math.round((project.words / project.target) * 100);
  const badgeKey = project.status === "active" ? (project.stage ?? "Active") : project.status;
  const badge = STATUS_BADGE[badgeKey]!;

  return (
    <article className="card card-hover p-4 sm:p-5">
      <div className="flex gap-4">
        <div className="size-24 shrink-0 overflow-hidden rounded-xl border border-line sm:size-28">
          <CoverArt seed={project.id} className="h-full w-full" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate font-display text-xl text-ink">
                {project.title}
              </h3>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold tracking-wider"
                style={{
                  color: `var(${badge.varName})`,
                  background: `color-mix(in srgb, var(${badge.varName}) 16%, transparent)`,
                }}
              >
                {badge.label}
              </span>
            </div>
            <button
              type="button"
              aria-label="Options"
              className="shrink-0 text-ink-faint transition-colors hover:text-ink"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>

          <p className="mt-0.5 text-xs text-ink-muted">{project.genre}</p>
          <p className="mt-2 line-clamp-1 text-sm italic text-ink-muted">
            {project.logline}
          </p>

          <Progress value={percent} className="mt-3" />
          <div className="mt-1.5 flex items-center justify-between text-xs text-ink-faint">
            <span>
              {project.words.toLocaleString()} / {project.target.toLocaleString()}{" "}
              words
            </span>
            <span className="text-gold">{percent}%</span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              {project.chapters} Chapters
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="size-3.5" />
              {project.sessions} Sessions
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Updated {project.updated}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function PaginationFooter({
  page,
  totalPages,
  total,
  perPage,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPage: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-2 text-xs text-ink-faint sm:flex-row">
      <span>
        Showing {start} to {end} of {total} projects
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
          className="grid size-7 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            className={`grid size-7 place-items-center rounded-lg text-xs transition-colors ${
              n === page
                ? "bg-gold text-gold-contrast"
                : "border border-line text-ink-muted hover:text-ink"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
          className="grid size-7 place-items-center rounded-lg border border-line text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Right rail --- */

function ProjectOverviewCard({
  counts,
}: {
  counts: ReturnType<typeof projectStatusCounts>;
}) {
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg text-ink">Project Overview</h2>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <StatBlock value={counts.total} label="Total Projects" />
        <StatBlock value={counts.active} label="Active" />
        <StatBlock value={counts.completed} label="Completed" />
        <StatBlock value={counts.archived} label="Archived" />
      </div>
    </section>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-num text-2xl text-gilded">{value}</div>
      <div className="label-caps mt-0.5 text-[0.62rem]">{label}</div>
    </div>
  );
}

function WordCountCard({ stats }: { stats: ReturnType<typeof activeWordStats> }) {
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg text-ink">Word Count</h2>
      <div className="mt-4 flex justify-center">
        <Ring value={stats.percent} label={`${stats.percent}%`} sublabel="of Goal" size={148} />
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <LegendRow color="var(--gold)" label="Written" value={stats.written.toLocaleString()} />
        <LegendRow
          color="var(--line-strong)"
          label="Remaining"
          value={stats.remaining.toLocaleString()}
        />
        <LegendRow
          color="var(--ink-faint)"
          label="Total Goal"
          value={stats.goal.toLocaleString()}
        />
      </div>
    </section>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-ink-muted">
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function TopGenresCard({ genres }: { genres: ReturnType<typeof topGenres> }) {
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg text-ink">Your Top Genres</h2>
      <div className="mt-4 space-y-3">
        {genres.map((g) => (
          <div key={g.label}>
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{g.label}</span>
              <span className="text-ink">{g.percent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold"
                style={{ width: `${g.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const ACHIEVEMENT_ICON: Record<AchievementIcon, typeof Flame> = {
  flame: Flame,
  feather: Feather,
  compass: Compass,
};

function AchievementsCard() {
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg text-ink">Recent Achievements</h2>
      <ul className="mt-3 divide-y divide-line">
        {achievements.map((a) => {
          const Icon = ACHIEVEMENT_ICON[a.icon] ?? Trophy;
          return (
            <li key={a.id} className="flex items-center gap-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-gold">
                <Icon className="size-4" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{a.title}</p>
                <p className="truncate text-xs text-ink-faint">
                  {a.detail} · {a.time}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function InspirationCard() {
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg text-ink">Need inspiration?</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Use AI to brainstorm ideas or overcome writer&rsquo;s block.
      </p>
      <Link
        href="/assistant"
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gold px-4 py-2.5 text-sm text-gold transition-colors hover:bg-gold hover:text-gold-contrast"
      >
        Open AI Assistant
        <Sparkles className="size-4" />
      </Link>
    </section>
  );
}
