"use client";

import {
  AlignLeft,
  Bell,
  BookMarked,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Compass,
  ExternalLink,
  FolderTree,
  Frame,
  GanttChartSquare,
  Info,
  Link2,
  List as ListIcon,
  Loader2,
  Mail,
  Maximize2,
  Minimize2,
  Minus,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Snowflake,
  Trash2,
  X,
  LayoutGrid as ThreeActIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Ring } from "@/components/ui/ring";
import {
  createBeat,
  deleteBeat,
  updateBeat,
  useOutline,
  VALID_BEAT_STATUSES,
  type BeatStatus,
  type OutlineBeat,
  type OutlineChapter,
} from "@/lib/outline-store";
import { useProject } from "@/lib/project-store";
import type { Project } from "@/lib/projects-data";
import { setFocusModeActive } from "@/lib/ui-store";

/**
 * The Outliner's Three Act Structure workspace — a dedicated, full-bleed
 * page (same pattern as the manuscript editor at chapters/page.tsx: no
 * standard app header, global Sidebar stays but the page builds its own top
 * bar) rather than living inside the project detail tab chrome, because its
 * two-sidebar + board + detail-panel layout needs the full viewport width.
 *
 * Backed by real `chapter_beats` rows (see outline-store.ts) grouped under
 * real chapters — the backend has no "Act" concept at all, only Parts
 * (optional) -> Chapters -> Beats, so unlike the old mock's Act I/II/III
 * columns, board columns here are real chapters. Only the "Three Act" mode
 * tile stays selectable (matching the mockup's switcher); the other 8 are
 * visible but inert, since nothing else was asked for.
 */

const OUTLINE_MODES = [
  { key: "three-act", label: "Three Act", icon: ThreeActIcon },
  { key: "heros-journey", label: "Hero's Journey", icon: Compass },
  { key: "save-the-cat", label: "Save the Cat", icon: BookMarked },
  { key: "snowflake", label: "Snowflake", icon: Snowflake },
  { key: "beat-sheet", label: "Beat Sheet", icon: AlignLeft },
  { key: "timeline-mode", label: "Timeline", icon: GanttChartSquare },
  { key: "mind-map", label: "Mind Map", icon: Network },
  { key: "nested", label: "Nested", icon: FolderTree },
  { key: "canvas", label: "Canvas", icon: Frame },
] as const;

const STATUS_ORDER: BeatStatus[] = ["completed", "in_progress", "planned", "not_started"];
const STATUS_LABEL: Record<BeatStatus, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  planned: "Planned",
  not_started: "Not Started",
};
const STATUS_BY_LABEL: Record<string, BeatStatus> = Object.fromEntries(
  STATUS_ORDER.map((s) => [STATUS_LABEL[s], s]),
);
const STATUS_COLOR: Record<BeatStatus, string> = {
  completed: "var(--success)",
  in_progress: "var(--warn)",
  planned: "var(--purple)",
  not_started: "#8f8a82",
};
// Chapters have no backend color of their own — a small fixed palette cycled
// by column position gives the board some visual rhythm, purely cosmetic.
const CHAPTER_COLOR_CYCLE = ["var(--success)", "var(--purple)", "var(--info)"];

type ViewMode = "board" | "list" | "timeline";
type Column = { id: string; label: string; beats: OutlineBeat[]; barColor: string; chapterId: string | null };

function chapterLabelFor(chapter: OutlineChapter | undefined): string {
  if (!chapter) return "—";
  return chapter.heading?.trim() || chapter.title;
}

export default function OutlinerPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const outline = useOutline(project?.id);

  const [selectedId, setSelectedId] = useState<string>("");
  const [view, setView] = useState<ViewMode>("board");
  const [groupBy, setGroupBy] = useState<"Chapters" | "Status">("Chapters");
  const [zoom, setZoom] = useState(100);
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);
  const [navOpen, setNavOpen] = useState(true);
  const [creatingChapterId, setCreatingChapterId] = useState<string | null>(null);

  useEffect(() => {
    setFocusModeActive(fullscreen);
    return () => setFocusModeActive(false);
  }, [fullscreen]);

  const chapters = useMemo(() => [...outline.chapters].sort((a, b) => a.number - b.number), [outline.chapters]);
  const beats = outline.beats;
  const selectedBeat = beats.find((b) => b.id === selectedId);
  const chapterById = useMemo(() => new Map(chapters.map((c) => [c.id, c])), [chapters]);

  const columns: Column[] = useMemo(() => {
    if (groupBy === "Status") {
      return STATUS_ORDER.map((s) => ({
        id: s,
        label: STATUS_LABEL[s].toUpperCase(),
        beats: beats.filter((b) => b.status === s),
        barColor: STATUS_COLOR[s],
        chapterId: null,
      }));
    }
    return chapters.map((chapter, i) => ({
      id: chapter.id,
      label: chapterLabelFor(chapter).toUpperCase(),
      beats: beats.filter((b) => b.chapterId === chapter.id).sort((a, b) => a.orderIndex - b.orderIndex),
      barColor: CHAPTER_COLOR_CYCLE[i % CHAPTER_COLOR_CYCLE.length],
      chapterId: chapter.id,
    }));
  }, [chapters, beats, groupBy]);

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

  async function addBeat(chapterId: string) {
    setCreatingChapterId(chapterId);
    try {
      const beat = await createBeat(chapterId, { title: "New Beat" });
      setSelectedId(beat.id);
    } catch {
      // The store already surfaces load errors elsewhere; a failed create
      // just leaves the board as-is — nothing to add.
    } finally {
      setCreatingChapterId(null);
    }
  }

  function toggleChapter(chapterId: string) {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar project={project} navOpen={navOpen} onToggleNav={() => setNavOpen((o) => !o)} />
      <div className="relative flex flex-1 overflow-hidden">
        {navOpen && (
          <OutlineNavSidebar
            chapters={chapters}
            beats={beats}
            selectedId={selectedId}
            onSelect={setSelectedId}
            collapsedChapters={collapsedChapters}
            onToggleChapter={toggleChapter}
            onAddBeat={() => chapters[0] && addBeat(chapters[0].id)}
            addDisabled={chapters.length === 0 || creatingChapterId !== null}
          />
        )}
        <BoardArea
          columns={columns}
          allBeatsCount={beats.length}
          completedBeatsCount={beats.filter((b) => b.status === "completed").length}
          view={view}
          setView={setView}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          zoom={zoom}
          setZoom={setZoom}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddBeat={addBeat}
          creatingChapterId={creatingChapterId}
          fullscreen={fullscreen}
          setFullscreen={setFullscreen}
          selectedBeat={selectedBeat}
          selectedBeatChapterLabel={selectedBeat ? chapterLabelFor(chapterById.get(selectedBeat.chapterId)) : ""}
          project={project}
          onCloseBeat={() => setSelectedId("")}
          outlineStatus={outline.status}
          outlineError={outline.error}
          hasChapters={chapters.length > 0}
        />
      </div>
    </div>
  );
}

/* ======================================================================= */
/*  Top bar — replaces the standard app header for this full-bleed page    */
/* ======================================================================= */

function TopBar({
  project,
  navOpen,
  onToggleNav,
}: {
  project: Project;
  navOpen: boolean;
  onToggleNav: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3 sm:px-6">
      <button
        type="button"
        onClick={onToggleNav}
        aria-label={navOpen ? "Hide outline modes & structure" : "Show outline modes & structure"}
        title={navOpen ? "Hide outline sidebar" : "Show outline sidebar"}
        className="hidden shrink-0 items-center justify-center rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink lg:flex"
      >
        {navOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
      </button>
      <Link
        href={`/projects/${project.id}`}
        className="flex shrink-0 items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        Back to Project
      </Link>
      <span className="hidden text-line-strong sm:inline">/</span>
      <div className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
        <span className="truncate text-ink-muted">{project.title}</span>
        <span className="text-ink-faint">›</span>
        <span className="text-ink-muted">Outliner</span>
        <span className="text-ink-faint">›</span>
        <span className="truncate font-medium text-ink">Three Act Structure</span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="btn-raised hidden min-w-0 items-center gap-2 rounded-full px-4 py-2 text-sm text-ink-faint md:flex md:w-64">
          <Search className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Search anything...</span>
          <kbd className="label-caps shrink-0 rounded-md border border-line-strong px-1.5 py-0.5 text-[0.6rem]">
            ⌘K
          </kbd>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="btn-raised grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
        >
          <Bell className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Messages"
          className="btn-raised grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
        >
          <Mail className="size-4" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}

/* ======================================================================= */
/*  Left-of-board sidebar — OUTLINE MODES + OUTLINE STRUCTURE tree         */
/* ======================================================================= */

function OutlineNavSidebar({
  chapters,
  beats,
  selectedId,
  onSelect,
  collapsedChapters,
  onToggleChapter,
  onAddBeat,
  addDisabled,
}: {
  chapters: OutlineChapter[];
  beats: OutlineBeat[];
  selectedId: string;
  onSelect: (id: string) => void;
  collapsedChapters: Set<string>;
  onToggleChapter: (id: string) => void;
  onAddBeat: () => void;
  addDisabled: boolean;
}) {
  return (
    <aside className="scroll-slim hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line px-3.5 py-5 lg:flex">
      <div className="flex items-center justify-between">
        <h2 className="label-caps text-ink-faint">Outline Modes</h2>
        <ListIcon className="size-4 text-ink-faint" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OUTLINE_MODES.map((mode) => {
          const Icon = mode.icon;
          const active = mode.key === "three-act";
          return (
            <button
              key={mode.key}
              type="button"
              disabled={!active}
              title={active ? undefined : `${mode.label} — coming soon`}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-1.5 py-3 text-center text-[0.65rem] leading-tight transition-colors ${
                active
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-line text-ink-faint hover:border-line-strong hover:text-ink-muted disabled:cursor-not-allowed"
              }`}
            >
              <Icon className="size-4" />
              {mode.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="label-caps text-ink-faint">Outline Structure</h2>
      </div>

      <div className="mt-3 space-y-4">
        {chapters.length === 0 && <p className="text-sm text-ink-faint">No chapters yet.</p>}
        {chapters.map((chapter) => {
          const collapsed = collapsedChapters.has(chapter.id);
          const chapterBeats = beats.filter((b) => b.chapterId === chapter.id).sort((a, b) => a.orderIndex - b.orderIndex);
          return (
            <div key={chapter.id}>
              <button
                type="button"
                onClick={() => onToggleChapter(chapter.id)}
                className="flex w-full items-center gap-1.5 text-left text-sm font-medium text-gold"
              >
                <ChevronDown className={`size-3.5 shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                <span className="truncate">{chapterLabelFor(chapter)}</span>
              </button>
              {!collapsed && (
                <ul className="relative ml-[7px] mt-1 space-y-0.5 border-l border-line-strong pl-4">
                  {chapterBeats.length === 0 && (
                    <li className="py-1.5 text-sm text-ink-faint">No beats yet.</li>
                  )}
                  {chapterBeats.map((b, i) => (
                    <li key={b.id} className="relative">
                      <span className="absolute -left-[17px] top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-line-strong" />
                      <button
                        type="button"
                        onClick={() => onSelect(b.id)}
                        className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                          selectedId === b.id ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"
                        }`}
                      >
                        {i + 1}. {b.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onAddBeat}
          disabled={addDisabled}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line-strong py-2.5 text-sm text-gold transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" />
          Add Beat
        </button>
      </div>
    </aside>
  );
}

/* ======================================================================= */
/*  Main board area                                                        */
/* ======================================================================= */

function BoardArea({
  columns,
  allBeatsCount,
  completedBeatsCount,
  view,
  setView,
  groupBy,
  setGroupBy,
  zoom,
  setZoom,
  selectedId,
  onSelect,
  onAddBeat,
  creatingChapterId,
  fullscreen,
  setFullscreen,
  selectedBeat,
  selectedBeatChapterLabel,
  project,
  onCloseBeat,
  outlineStatus,
  outlineError,
  hasChapters,
}: {
  columns: Column[];
  allBeatsCount: number;
  completedBeatsCount: number;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  groupBy: "Chapters" | "Status";
  setGroupBy: (v: "Chapters" | "Status") => void;
  zoom: number;
  setZoom: (fn: (z: number) => number) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onAddBeat: (chapterId: string) => void;
  creatingChapterId: string | null;
  fullscreen: boolean;
  setFullscreen: (fn: (f: boolean) => boolean) => void;
  selectedBeat: OutlineBeat | undefined;
  selectedBeatChapterLabel: string;
  project: Project;
  onCloseBeat: () => void;
  outlineStatus: "idle" | "loading" | "loaded" | "error";
  outlineError: string | null;
  hasChapters: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [panning, setPanning] = useState(false);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== scrollRef.current && e.target !== gridRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    panState.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    setPanning(true);
    el.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = panState.current;
    const el = scrollRef.current;
    if (!start || !el) return;
    el.scrollLeft = start.left - (e.clientX - start.x);
    el.scrollTop = start.top - (e.clientY - start.y);
  }
  function onPointerUp() {
    panState.current = null;
    setPanning(false);
  }

  const progress = allBeatsCount > 0 ? Math.round((completedBeatsCount / allBeatsCount) * 100) : 0;

  return (
    <main className="scroll-slim flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <h1 className="flex items-center gap-2 font-display text-2xl text-ink">
              Three Act Structure
              <Info className="size-4 text-ink-faint" />
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              Beats are grouped by real chapter — the classic Act I/II/III framing is a planning lens you apply
              yourself, not a stored structure.
            </p>
          </div>
          <Ring
            value={progress}
            label={`${progress}%`}
            sublabel={
              <span className="text-xs leading-snug text-ink-faint">
                Outline Progress
                <br />
                {completedBeatsCount} of {allBeatsCount} beats
              </span>
            }
            size={124}
            stroke={7}
            labelClassName="text-2xl"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-3">
        <div className="card-2 inline-flex items-center gap-1 p-1">
          {(
            [
              { key: "board", label: "Board", icon: ThreeActIcon },
              { key: "list", label: "List", icon: ListIcon },
              { key: "timeline", label: "Timeline", icon: GanttChartSquare },
            ] as const
          ).map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                view === v.key ? "bg-gold text-gold-contrast" : "text-ink-muted hover:text-ink"
              }`}
            >
              <v.icon className="size-3.5" />
              {v.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-ink-muted">
            <span>Group:</span>
            <DropdownSelect
              value={groupBy}
              onChange={(v) => setGroupBy(v as "Chapters" | "Status")}
              options={["Chapters", "Status"]}
              placeholder="Group"
              className="w-28"
              triggerClassName="py-1.5"
            />
          </div>
          {view === "board" && (
            <div className="flex items-center gap-1 text-sm text-ink-muted">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="grid size-7 place-items-center rounded-md transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-9 text-center text-xs tabular-nums">{zoom}%</span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(150, z + 10))}
                className="grid size-7 place-items-center rounded-md transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}
          <button
            type="button"
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => setFullscreen((f) => !f)}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-line-strong text-ink-muted transition-colors hover:text-ink"
          >
            {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {outlineStatus === "loading" && (
          <div className="grid flex-1 place-items-center">
            <Loader2 className="size-6 animate-spin text-ink-faint" />
          </div>
        )}

        {outlineStatus === "error" && (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div>
              <p className="font-display text-lg text-ink">Couldn&apos;t load the outline</p>
              <p className="mt-1 text-sm text-ink-muted">{outlineError}</p>
            </div>
          </div>
        )}

        {outlineStatus !== "error" && outlineStatus !== "loading" && !hasChapters && (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div>
              <BookOpen className="mx-auto size-8 text-ink-faint" />
              <p className="mt-3 font-display text-lg text-ink">No chapters yet</p>
              <p className="mt-1 text-sm text-ink-muted">Create a chapter in the manuscript editor before adding beats.</p>
              <Link
                href={`/projects/${project.id}/chapters`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
              >
                Go to Chapters
              </Link>
            </div>
          </div>
        )}

        {outlineStatus !== "error" && hasChapters && (
          <>
            {view === "board" && (
              <div
                ref={scrollRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`scroll-slim flex-1 overflow-auto px-6 py-6 ${panning ? "cursor-grabbing" : "cursor-grab"}`}
              >
                <div
                  ref={gridRef}
                  className={`grid gap-5 pb-[320px] ${panning ? "select-none" : ""}`}
                  style={{
                    gridTemplateColumns: `repeat(${columns.length}, minmax(232px, 1fr))`,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "top left",
                    width: `calc(${10000 / zoom}% + 320px)`,
                  }}
                >
                  {columns.map((col) => (
                    <BoardColumn
                      key={col.id}
                      column={col}
                      selectedId={selectedId}
                      onSelect={onSelect}
                      onAddBeat={groupBy === "Chapters" && col.chapterId ? () => onAddBeat(col.chapterId!) : undefined}
                      adding={col.chapterId !== null && col.chapterId === creatingChapterId}
                    />
                  ))}
                </div>
              </div>
            )}

            {view === "list" && (
              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                {columns.map((col) => (
                  <div key={col.id}>
                    <h3 className="label-caps text-ink-faint">{col.label}</h3>
                    <div className="card-2 mt-2 divide-y divide-line overflow-hidden">
                      {col.beats.length === 0 && <p className="p-3 text-sm text-ink-faint">No beats yet.</p>}
                      {col.beats.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => onSelect(b.id)}
                          className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${
                            selectedId === b.id ? "bg-surface-2" : "hover:bg-surface-2/60"
                          }`}
                        >
                          <StatusIcon status={b.status} />
                          <span className="min-w-0 flex-1 truncate text-sm text-ink">{b.title}</span>
                          {b.linkedToManuscript && <Link2 className="size-3.5 shrink-0 text-gold" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === "timeline" && (
              <div className="grid flex-1 place-items-center px-6 text-center">
                <div>
                  <GanttChartSquare className="mx-auto size-8 text-ink-faint" />
                  <p className="mt-3 font-display text-lg text-ink">Timeline view is coming soon</p>
                  <p className="mt-1 text-sm text-ink-muted">Switch back to Board to keep editing beats.</p>
                </div>
              </div>
            )}

            {view === "board" && (
              <div className="flex flex-wrap items-center gap-5 border-t border-line px-6 py-3 text-xs text-ink-muted">
                <LegendDot color={STATUS_COLOR.completed} label="Completed" />
                <LegendDot color={STATUS_COLOR.in_progress} label="In Progress" />
                <LegendDot color={STATUS_COLOR.planned} label="Planned" />
                <LegendDot color={STATUS_COLOR.not_started} label="Not Started" />
                <span className="flex items-center gap-1.5">
                  <Link2 className="size-3.5" />
                  Linked to Manuscript
                </span>
              </div>
            )}
          </>
        )}

        {selectedBeat && (
          <DetailPanel
            key={selectedBeat.id}
            beat={selectedBeat}
            chapterLabel={selectedBeatChapterLabel}
            project={project}
            onClose={onCloseBeat}
          />
        )}
      </div>
      <span className="sr-only">{allBeatsCount} beats total</span>
    </main>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function BoardColumn({
  column,
  selectedId,
  onSelect,
  onAddBeat,
  adding,
}: {
  column: Column;
  selectedId: string;
  onSelect: (id: string) => void;
  onAddBeat?: () => void;
  adding: boolean;
}) {
  return (
    <div className="card flex min-h-[240px] flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="label-caps truncate text-xs text-ink">{column.label}</h3>
        <span className="shrink-0 text-xs text-ink-faint">
          {column.beats.length} beat{column.beats.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full w-[92%] rounded-full" style={{ background: column.barColor }} />
      </div>
      <div className="mt-4 flex-1 space-y-3">
        {column.beats.map((b) => (
          <BeatCard key={b.id} beat={b} selected={b.id === selectedId} onSelect={() => onSelect(b.id)} />
        ))}
      </div>
      {onAddBeat && (
        <button
          type="button"
          onClick={onAddBeat}
          disabled={adding}
          className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong py-2.5 text-sm text-gold transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {adding ? "Adding…" : "Add Beat"}
        </button>
      )}
    </div>
  );
}

function BeatCard({ beat, selected, onSelect }: { beat: OutlineBeat; selected: boolean; onSelect: () => void }) {
  const highlight = selected || beat.status === "in_progress";
  const color = STATUS_COLOR[beat.status];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="card-2 block w-full cursor-pointer p-4 text-left transition-colors"
      style={highlight ? { borderColor: color } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-ink">{beat.title}</h4>
        <StatusIcon status={beat.status} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">
        {beat.outlineText || "No outline text yet."}
      </p>
      {beat.linkedToManuscript && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gold">
          <Link2 className="size-3.5" />
          Linked to Manuscript
        </div>
      )}
    </button>
  );
}

function StatusIcon({ status }: { status: BeatStatus }) {
  const color = STATUS_COLOR[status];
  if (status === "completed") {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full" style={{ background: color }}>
        <Check className="size-3 text-white" strokeWidth={3} />
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span
        className="grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]"
        style={{ borderColor: color, color }}
      >
        <Info className="size-3" />
      </span>
    );
  }
  return <span className="size-5 shrink-0 rounded-full border-[1.5px]" style={{ borderColor: color }} />;
}

/* ======================================================================= */
/*  Right detail panel                                                     */
/* ======================================================================= */

function DetailPanel({
  beat,
  chapterLabel,
  project,
  onClose,
}: {
  beat: OutlineBeat;
  chapterLabel: string;
  project: Project;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(beat.title);
  const [outlineText, setOutlineText] = useState(beat.outlineText);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function saveField(patch: { title?: string; outlineText?: string }) {
    setSaveState("saving");
    try {
      await updateBeat(beat.id, patch);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function handleStatusChange(status: BeatStatus) {
    setSaveState("saving");
    try {
      await updateBeat(beat.id, { status });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  const color = STATUS_COLOR[beat.status];

  return (
    <aside className="scroll-slim absolute inset-y-0 right-0 z-30 hidden w-[300px] animate-[wa-slide-in-right_180ms_ease-out] overflow-y-auto border-l border-line bg-canvas p-4 shadow-2xl lg:block">
      <div className="flex items-start justify-between gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const trimmed = title.trim();
            if (!trimmed) {
              setTitle(beat.title);
              return;
            }
            if (trimmed !== beat.title) void saveField({ title: trimmed });
          }}
          className="min-w-0 flex-1 bg-transparent font-display text-lg leading-snug text-ink focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close beat details"
          className="grid size-6 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: color, color }}>
          {beat.status === "completed" && <Check className="size-3" />}
          {STATUS_LABEL[beat.status]}
        </span>
        {saveState === "saving" && <span className="text-xs text-ink-faint">Saving…</span>}
        {saveState === "saved" && <span className="text-xs text-ink-faint">Saved</span>}
        {saveState === "error" && <span className="text-xs text-danger">Couldn&apos;t save</span>}
      </div>

      <div className="mt-5 space-y-5 text-sm">
        <div>
          <h3 className="text-ink">Outline</h3>
          <textarea
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            onBlur={() => {
              if (outlineText !== beat.outlineText) void saveField({ outlineText });
            }}
            placeholder="Describe what happens in this beat…"
            rows={6}
            className="card-2 mt-2 w-full resize-none p-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        <div>
          <h3 className="text-ink">Linked Chapter</h3>
          <Link
            href={`/projects/${project.id}/chapters`}
            className="card-2 mt-2 flex items-center justify-between gap-2 p-3 text-sm transition-colors hover:bg-surface-2"
          >
            <span className="flex items-center gap-2 truncate text-ink">
              <BookOpen className="size-4 shrink-0 text-gold" />
              <span className="truncate">{chapterLabel}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-gold">
              Go to Chapter
              <ExternalLink className="size-3.5" />
            </span>
          </Link>
        </div>

        {beat.linkedToManuscript && (
          <div className="card-2 flex items-center gap-2 p-3 text-xs text-gold">
            <Link2 className="size-3.5 shrink-0" />
            This beat&apos;s outline has been generated into the manuscript.
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-ink">Status</h3>
          <DropdownSelect
            value={STATUS_LABEL[beat.status]}
            onChange={(label) => void handleStatusChange(STATUS_BY_LABEL[label])}
            options={VALID_BEAT_STATUSES.map((s) => STATUS_LABEL[s])}
            placeholder="Status"
            className="w-40"
          />
        </div>

        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="card-2 flex w-full items-center justify-center gap-2 py-2.5 text-danger transition-colors hover:bg-danger/10"
        >
          <Trash2 className="size-4" />
          Delete Beat
        </button>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this beat?"
          description={`"${beat.title}" will be permanently removed.`}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            await deleteBeat(beat.id);
            setConfirmingDelete(false);
            onClose();
          }}
        />
      )}
    </aside>
  );
}
