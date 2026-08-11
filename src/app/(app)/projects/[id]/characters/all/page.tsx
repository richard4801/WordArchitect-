"use client";

import {
  ArrowUpDown,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Crown,
  Filter,
  Grid2x2,
  Heart,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CharacterPortrait } from "@/components/ui/character-portrait";
import { characterCounts, type Character, type CharacterRole } from "@/lib/character-data";
import { useCharacters } from "@/lib/character-store";
import { useProject } from "@/lib/project-store";
import { CharactersTopBar, ROLE_META } from "../_shared";

/** Grid view of every character (matches resources/All Characters.png). */

const TABS = ["All", "Main", "Supporting", "Minor", "Extras"] as const;
type Tab = (typeof TABS)[number];
const TAB_ROLE: Partial<Record<Tab, CharacterRole>> = {
  Main: "Main",
  Supporting: "Supporting",
  Minor: "Minor",
  Extras: "Extra",
};
const PAGE_SIZE = 24;

export default function AllCharactersPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const characters = useCharacters();
  const [tab, setTab] = useState<Tab>("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "compact">("grid");
  const [page, setPage] = useState(1);

  const counts = characterCounts(characters);

  const filtered = useMemo(() => {
    return characters.filter((c) => {
      const role = TAB_ROLE[tab];
      if (role && c.role !== role) return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [characters, tab, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const stats: { label: string; value: number; Icon: typeof Users; color: string }[] = [
    { label: "All Characters", value: counts.all, color: "var(--gold)", Icon: Users },
    { label: "Main", value: counts.main, color: "var(--gold)", Icon: Crown },
    { label: "Supporting", value: counts.supporting, color: "var(--success)", Icon: Users },
    { label: "Minor", value: counts.minor, color: "var(--info)", Icon: Users },
    { label: "With Arcs", value: counts.withArcs, color: "var(--gold)", Icon: Bookmark },
    { label: "With Relationships", value: counts.withRelationships, color: "var(--gold)", Icon: Users },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <CharactersTopBar project={project} crumb={["Characters", "All Characters"]} />
      <div className="scroll-slim flex flex-1 flex-col overflow-y-auto px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-ink">All Characters</h1>
            <p className="mt-1 text-sm text-ink-muted">Every person in your story, all in one place.</p>
          </div>
          <Link
            href={`/projects/${project.id}/characters/new`}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            New Character
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="btn-raised flex min-w-[220px] flex-1 items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-ink-faint">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search characters..."
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
          <div className="card-2 flex shrink-0 items-center gap-1 p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`grid size-8 place-items-center rounded-lg transition-colors ${
                view === "grid" ? "bg-gold text-gold-contrast" : "text-ink-muted hover:text-ink"
              }`}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("compact")}
              aria-label="Compact grid view"
              className={`grid size-8 place-items-center rounded-lg transition-colors ${
                view === "compact" ? "bg-gold text-gold-contrast" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Grid2x2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="card mt-5 grid grid-cols-3 gap-4 p-5 sm:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <s.Icon className="size-5 shrink-0" style={{ color: s.color }} />
              <div className="min-w-0">
                <div className="font-num text-xl leading-none text-ink">{s.value}</div>
                <div className="truncate text-xs text-ink-faint">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line text-sm">
          <div className="flex items-center gap-6 overflow-x-auto">
            {TABS.map((t) => {
              const role = TAB_ROLE[t];
              const count = role ? characters.filter((c) => c.role === role).length : counts.all;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setPage(1);
                  }}
                  className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap pb-3 transition-colors ${
                    tab === t ? "text-ink" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t}
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-ink-faint">{count}</span>
                  {tab === t && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold" />}
                </button>
              );
            })}
          </div>
          <div className="pb-3 text-ink-muted">
            Group by: <span className="text-gold">Role</span>
          </div>
        </div>

        <div
          className={`mt-5 grid gap-4 ${
            view === "grid" ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          }`}
        >
          {pageItems.map((c) => (
            <CharacterCard key={c.id} character={c} projectId={project.id} compact={view === "compact"} />
          ))}
          {pageItems.length === 0 && (
            <div className="col-span-full grid place-items-center rounded-xl border border-dashed border-line-strong py-16 text-center">
              <div>
                <Sparkles className="mx-auto size-6 text-ink-faint" />
                <p className="mt-2 text-sm text-ink-muted">No characters match your search.</p>
              </div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm text-ink-muted">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="grid size-8 place-items-center rounded-lg border border-line-strong transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`grid size-8 place-items-center rounded-lg border text-xs transition-colors ${
                    p === page ? "border-gold text-gold" : "border-line-strong hover:text-ink"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="grid size-8 place-items-center rounded-lg border border-line-strong transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterCard({
  character,
  projectId,
  compact,
}: {
  character: Character;
  projectId: string;
  compact: boolean;
}) {
  const meta = ROLE_META[character.role];
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/projects/${projectId}/characters?c=${character.id}`)}
      className="card-2 group block overflow-hidden text-left transition-transform hover:-translate-y-0.5"
    >
      <div className={`relative ${compact ? "aspect-square" : "aspect-[3/4]"}`}>
        <CharacterPortrait seed={character.id} className="size-full" />
        <span
          className="label-caps absolute left-2 top-2 flex items-center gap-1 rounded-md px-2 py-1 text-[0.6rem] backdrop-blur"
          style={{ color: meta.colorVar, background: `color-mix(in srgb, ${meta.colorVar} 20%, rgba(10,10,11,0.55))` }}
        >
          {character.role === "Main" && <Crown className="size-3" />}
          {meta.label}
        </span>
        <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-md bg-canvas/50 text-ink-muted backdrop-blur">
          <MoreHorizontal className="size-3.5" />
        </span>
      </div>
      <div className="p-3.5">
        <h3 className="truncate text-sm font-medium text-ink">{character.name}</h3>
        <p className="truncate text-xs text-ink-faint">{character.epithet}</p>
        {!compact && (
          <div className="mt-3 flex items-center justify-between text-ink-faint">
            <div className="flex items-center gap-2">
              <Users className="size-3.5" />
              <Bookmark className={`size-3.5 ${character.arc ? "text-gold" : ""}`} />
            </div>
            <span className="flex items-center gap-1 text-xs">
              <Heart className="size-3.5" />
              {character.favorites}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
