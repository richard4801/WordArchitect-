"use client";

import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
  Globe,
  Landmark,
  MapPinned,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { WorldMapArt } from "@/components/ui/world-map-art";
import {
  findEntry,
  formatAgo,
  formatWorldYear,
  PINNED_WORLD_ITEMS,
  recentEntries,
  type WorldCategoryKey,
  worldCounts,
  WORLD_OVERVIEW,
  WORLD_TIMELINE,
} from "@/lib/worldbuilding-data";
import { useWorldCategories, useWorldEntries, useWorldError, useWorldLoadStatus } from "@/lib/worldbuilding-store";
import { useProject } from "@/lib/project-store";
import { WorldTopBar } from "./_shared";

/** Worldbuilding hub (matches resources/Worldbuilding.png). */

const QUICK_ACTIONS = [
  { label: "New Location", category: "places" as WorldCategoryKey, Icon: Plus },
  { label: "New Nation", category: "nations" as WorldCategoryKey, Icon: Plus },
  { label: "New Culture", category: "cultures" as WorldCategoryKey, Icon: Plus },
  { label: "New Faction", category: "factions" as WorldCategoryKey, Icon: Plus },
  { label: "New Timeline Event", category: null, Icon: Plus },
  { label: "Import World Data", category: null, Icon: Upload },
];

export default function WorldbuildingPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const categories = useWorldCategories(project?.id);
  const entries = useWorldEntries(project?.id);
  const worldLoadStatus = useWorldLoadStatus();
  const worldError = useWorldError();
  const [filter, setFilter] = useState<"all" | WorldCategoryKey>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => worldCounts(entries), [entries]);
  const sorted = useMemo(() => recentEntries(entries), [entries]);

  const filtered = useMemo(() => {
    return sorted.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [sorted, filter, query]);

  if (!project) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-2xl text-ink">Project not found</p>
          <Link href="/projects" className="mt-4 inline-flex items-center gap-1.5 text-sm text-gold hover:opacity-80">
            <ChevronLeft className="size-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (worldLoadStatus === "error") {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-xl text-ink">Couldn&rsquo;t reach the server</p>
          <p className="mt-2 text-sm text-ink-muted">{worldError ?? "Something went wrong loading your world."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <WorldTopBar project={project} crumb={["Worldbuilding"]} />
      <div className="scroll-slim flex flex-1 flex-col overflow-y-auto px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-ink">Worldbuilding</h1>
            <p className="mt-1 text-sm text-ink-muted">Build a rich, immersive world for your story to live in.</p>
          </div>
          <Link
            href={`/projects/${project.id}/world/new-category`}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            New Category
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="btn-raised flex min-w-[220px] flex-1 items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-ink-faint">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search worldbuilding..."
              className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <Filter className="size-3.5" />
            Filter
          </button>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowUpDown className="size-3.5" />
            Sort
          </button>
        </div>

        <div className="mt-5 flex items-center gap-6 overflow-x-auto border-b border-line text-sm">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap pb-3 transition-colors ${
              filter === "all" ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            All
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-ink-faint">{counts.all}</span>
            {filter === "all" && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold" />}
          </button>
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap pb-3 transition-colors ${
                filter === c.key ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {c.label}
              <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-ink-faint">
                {counts.byCategory[c.key] ?? 0}
              </span>
              {filter === c.key && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold" />}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="min-w-0 space-y-5">
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">World Overview</h2>
                <button type="button" className="flex items-center gap-1.5 text-sm text-gold hover:opacity-80">
                  <Pencil className="size-3.5" />
                  Edit
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border border-line-strong sm:w-64">
                  <WorldOverviewArt />
                </div>
                <p className="text-sm leading-relaxed text-ink-muted">{WORLD_OVERVIEW.description}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Regions", value: WORLD_OVERVIEW.regions, Icon: Globe },
                  { label: "Key Locations", value: WORLD_OVERVIEW.keyLocations, Icon: MapPinned },
                  { label: "Major Nations", value: WORLD_OVERVIEW.majorNations, Icon: Landmark },
                  { label: "Years of History", value: WORLD_OVERVIEW.yearsOfHistory.toLocaleString(), Icon: Flag },
                ].map((s) => (
                  <div key={s.label} className="card-2 flex items-start gap-2.5 p-3.5">
                    <s.Icon className="size-4 shrink-0 text-gold" />
                    <div className="min-w-0">
                      <div className="font-num text-lg leading-none text-ink">{s.value}</div>
                      <div className="truncate text-xs text-ink-faint">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">World Map</h2>
                <button type="button" className="text-sm text-gold hover:opacity-80">
                  View Full Map
                </button>
              </div>
              <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-xl border border-line-strong">
                <WorldMapArt className="size-full" />
              </div>
            </section>

            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">Categories</h2>
                <Link href={`/projects/${project.id}/world/new-category`} className="text-sm text-gold hover:opacity-80">
                  Manage Categories
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {categories.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setFilter(c.key)}
                    className={`card-2 flex flex-col items-start gap-2.5 p-4 text-left transition-colors hover:bg-surface-2 ${
                      filter === c.key ? "ring-1 ring-gold" : ""
                    }`}
                  >
                    <span
                      className="grid size-10 place-items-center rounded-lg"
                      style={{ color: c.color, background: `color-mix(in srgb, ${c.color} 16%, transparent)` }}
                    >
                      <c.Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-ink">{c.label}</p>
                      <p className="text-xs text-ink-faint">{counts.byCategory[c.key] ?? 0} items</p>
                    </div>
                    <p className="text-xs leading-relaxed text-ink-muted">{c.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">
                  {filter === "all" ? "Recent Entries" : categories.find((c) => c.key === filter)?.label}
                </h2>
                {filter !== "all" && (
                  <button type="button" onClick={() => setFilter("all")} className="text-sm text-gold hover:opacity-80">
                    View All
                  </button>
                )}
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-ink-faint">
                      <th className="pb-2 font-normal">Name</th>
                      <th className="pb-2 font-normal">Category</th>
                      <th className="pb-2 font-normal">Last Updated</th>
                      <th className="pb-2 font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {(filter === "all" ? filtered.slice(0, 5) : filtered).map((entry) => {
                      const cat = categories.find((c) => c.key === entry.category);
                      if (!cat) return null;
                      return (
                        <tr key={entry.id} className="border-b border-line last:border-0">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="grid size-7 shrink-0 place-items-center rounded-lg"
                                style={{ color: cat.color, background: `color-mix(in srgb, ${cat.color} 16%, transparent)` }}
                              >
                                <cat.Icon className="size-3.5" />
                              </span>
                              <span className="text-ink">{entry.name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => setFilter(cat.key)}
                              className="label-caps rounded-md px-2 py-1 text-[0.65rem]"
                              style={{ color: cat.color, background: `color-mix(in srgb, ${cat.color} 14%, transparent)` }}
                            >
                              {cat.label}
                            </button>
                          </td>
                          <td className="py-3 pr-3 text-ink-faint">{formatAgo(entry.updatedHours)}</td>
                          <td className="py-3 text-right">
                            <MoreHorizontal className="ml-auto size-4 text-ink-faint" />
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-ink-faint">
                          No entries match.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="card p-5">
              <h2 className="font-display text-lg text-ink">Timeline Overview</h2>
              <ol className="mt-4 space-y-4 border-l border-line pl-4">
                {WORLD_TIMELINE.map((e) => (
                  <li key={e.title} className="relative text-sm">
                    <span className="absolute -left-[1.15rem] top-1 size-2 rounded-full bg-gold" />
                    <p className="text-ink-faint">{formatWorldYear(e.year)}</p>
                    <p className="font-medium text-ink">{e.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{e.description}</p>
                  </li>
                ))}
              </ol>
              <button type="button" className="mt-4 flex items-center gap-1 text-sm text-gold hover:opacity-80">
                View Full Timeline
                <ChevronRight className="size-3.5" />
              </button>
            </section>

            <WorldStatsCard categories={categories} counts={counts} />

            <section className="card p-5">
              <h2 className="font-display text-lg text-ink">Quick Actions</h2>
              <ul className="mt-3 space-y-1">
                {QUICK_ACTIONS.map((a) => (
                  <li key={a.label}>
                    <button
                      type="button"
                      onClick={() => a.category && setFilter(a.category)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-sm text-gold transition-colors hover:bg-surface-2"
                    >
                      <a.Icon className="size-4" />
                      {a.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">Pinned Items</h2>
                <button type="button" className="text-sm text-gold hover:opacity-80">
                  Manage
                </button>
              </div>
              <ul className="mt-3 space-y-3.5">
                {PINNED_WORLD_ITEMS.map((p) => {
                  const entry = findEntry(entries, p.entryId);
                  const cat = entry && categories.find((c) => c.key === entry.category);
                  if (!entry || !cat) return null;
                  return (
                    <li key={p.entryId} className="flex items-start gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-lg border"
                        style={{ borderColor: cat.color, color: cat.color }}
                      >
                        <cat.Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">{entry.name}</p>
                        <p className="text-xs text-ink-faint">{p.note}</p>
                      </div>
                      <Pin className="mt-1 size-3.5 shrink-0 text-gold" />
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function WorldOverviewArt() {
  return (
    <svg viewBox="0 0 300 225" className="size-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="wo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a3a" />
          <stop offset="60%" stopColor="#1b1a24" />
          <stop offset="100%" stopColor="#0e0d12" />
        </linearGradient>
        <radialGradient id="wo-glow" cx="50%" cy="30%" r="45%">
          <stop offset="0%" stopColor="#d4af7a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#d4af7a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="225" fill="url(#wo-sky)" />
      <circle cx="150" cy="70" r="70" fill="url(#wo-glow)" />
      <circle cx="150" cy="65" r="18" fill="#f0e6c8" opacity="0.85" />
      <path d="M 0 190 L 40 120 L 80 170 L 130 90 L 170 160 L 220 100 L 260 150 L 300 130 L 300 225 L 0 225 Z" fill="#1a1a26" />
      <path d="M 0 210 L 60 160 L 120 195 L 190 150 L 260 190 L 300 175 L 300 225 L 0 225 Z" fill="#100f16" />
    </svg>
  );
}

function WorldStatsCard({
  categories,
  counts,
}: {
  categories: ReturnType<typeof useWorldCategories>;
  counts: { all: number; byCategory: Record<string, number> };
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const segments = categories.reduce<{ key: string; color: string; dasharray: string; dashoffset: number }[]>(
    (acc, c) => {
      const count = counts.byCategory[c.key] ?? 0;
      if (count === 0) return acc;
      const fraction = counts.all > 0 ? count / counts.all : 0;
      const length = fraction * circumference;
      const offsetSoFar = acc.reduce((sum, s) => sum + Number(s.dasharray.split(" ")[0]), 0);
      acc.push({ key: c.key, color: c.color, dasharray: `${length} ${circumference - length}`, dashoffset: -offsetSoFar });
      return acc;
    },
    [],
  );

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg text-ink">World Stats</h2>
      <div className="relative mx-auto mt-4 size-36">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--line)" strokeWidth="10" />
          {segments.map((s) => (
            <circle
              key={s.key}
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="10"
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-num text-3xl leading-none text-ink">{counts.all}</div>
            <div className="mt-1 text-xs text-ink-faint">Total Entries</div>
          </div>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {categories.map((c) => (
          <li key={c.key} className="flex items-center justify-between text-ink-muted">
            <span className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
            <span className="text-ink">{counts.byCategory[c.key] ?? 0}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
