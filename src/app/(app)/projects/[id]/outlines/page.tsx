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
  Mail,
  Maximize2,
  Minimize2,
  Minus,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
  Search,
  Shuffle,
  Snowflake,
  Sparkles,
  Trash2,
  X,
  LayoutGrid as ThreeActIcon,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Ring } from "@/components/ui/ring";
import {
  type Act,
  type Beat,
  type BeatColor,
  type BeatStatus,
  THREE_ACT_STRUCTURE,
} from "@/lib/outline-data";
import { useProject } from "@/lib/project-store";
import type { Project } from "@/lib/projects-data";
import { setFocusModeActive } from "@/lib/ui-store";

/**
 * The Outliner's Three Act Structure workspace — a dedicated, full-bleed
 * page (same pattern as the manuscript editor at chapters/page.tsx: no
 * standard app header, global Sidebar stays but the page builds its own top
 * bar) rather than living inside the project detail tab chrome, because its
 * two-sidebar + board + detail-panel layout needs the full viewport width.
 * Matches resources/Outliner Three Act.png. Only the "Three Act" outline
 * mode is actually built — the other 8 mode tiles are visible (matching the
 * mockup's switcher) but inert, since nothing else was asked for.
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

const STATUS_ORDER: BeatStatus[] = ["completed", "inProgress", "planned", "notStarted"];
const STATUS_LABEL: Record<BeatStatus, string> = {
  completed: "Completed",
  inProgress: "In Progress",
  planned: "Planned",
  notStarted: "Not Started",
};
const STATUS_BY_LABEL: Record<string, BeatStatus> = Object.fromEntries(
  STATUS_ORDER.map((s) => [STATUS_LABEL[s], s]),
);
const STATUS_TO_COLOR: Record<BeatStatus, BeatColor> = {
  completed: "green",
  inProgress: "gold",
  planned: "purple",
  notStarted: "gray",
};
const COLOR_ORDER: BeatColor[] = ["green", "gold", "purple", "blue", "rose", "gray"];
const COLOR_HEX: Record<BeatColor, string> = {
  green: "var(--success)",
  gold: "var(--warn)",
  purple: "var(--purple)",
  blue: "var(--info)",
  rose: "#c2668a",
  gray: "#8f8a82",
};
const ACT_COLOR_HEX: Record<Act["color"], string> = {
  green: "var(--success)",
  purple: "var(--purple)",
  blue: "var(--info)",
};

type ViewMode = "board" | "list" | "timeline";
type RightTab = "Details" | "Scenes" | "Notes" | "Links";
type Column = { id: string; label: string; beats: Beat[]; barColor: string };

function cloneStructure(): Act[] {
  return THREE_ACT_STRUCTURE.map((act) => ({ ...act, beats: act.beats.map((b) => ({ ...b })) }));
}

export default function OutlinerPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);

  const [acts, setActs] = useState<Act[]>(cloneStructure);
  const [selectedId, setSelectedId] = useState<string>("beat-1");
  const [rightTab, setRightTab] = useState<RightTab>("Details");
  const [view, setView] = useState<ViewMode>("board");
  const [groupBy, setGroupBy] = useState<"Acts" | "Status">("Acts");
  const [zoom, setZoom] = useState(100);
  const [collapsedActs, setCollapsedActs] = useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);
  const [navOpen, setNavOpen] = useState(true);

  useEffect(() => {
    setFocusModeActive(fullscreen);
    return () => setFocusModeActive(false);
  }, [fullscreen]);

  const allBeats = useMemo(() => acts.flatMap((a) => a.beats), [acts]);
  const selectedBeat = allBeats.find((b) => b.id === selectedId);

  const columns: Column[] = useMemo(() => {
    if (groupBy === "Status") {
      return STATUS_ORDER.map((s) => ({
        id: s,
        label: STATUS_LABEL[s].toUpperCase(),
        beats: allBeats.filter((b) => b.status === s),
        barColor: COLOR_HEX[STATUS_TO_COLOR[s]],
      }));
    }
    return acts.map((act) => ({
      id: act.id,
      label: act.label.toUpperCase(),
      beats: act.beats,
      barColor: ACT_COLOR_HEX[act.color],
    }));
  }, [acts, allBeats, groupBy]);

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

  // A fresh const so the closures below (defined after the guard) keep the
  // narrowed `Project` type — TS's control-flow narrowing of `project`
  // doesn't carry into nested function declarations on its own.
  const proj = project;

  function patchBeat(beatId: string, patch: Partial<Beat>) {
    setActs((prev) =>
      prev.map((act) => ({
        ...act,
        beats: act.beats.map((b) => (b.id === beatId ? { ...b, ...patch } : b)),
      })),
    );
  }

  function selectBeat(beatId: string) {
    setSelectedId(beatId);
    setRightTab("Details");
  }

  function addBeat(actId: string) {
    const newId = `beat-${crypto.randomUUID()}`;
    setActs((prev) =>
      prev.map((act) => {
        if (act.id !== actId) return act;
        const newBeat: Beat = {
          id: newId,
          number: allBeats.length + 1,
          title: "New Beat",
          purpose: "Describe what happens in this beat.",
          description: "",
          chapterLabel: "—",
          sceneCount: 0,
          status: "notStarted",
          color: "gray",
          pov: proj.pov || "—",
          location: "—",
          time: "—",
          mood: "—",
          characters: [],
          notes: [],
        };
        return { ...act, beats: [...act.beats, newBeat] };
      }),
    );
    selectBeat(newId);
  }

  function duplicateBeat(beatId: string) {
    const newId = `beat-${crypto.randomUUID()}`;
    setActs((prev) =>
      prev.map((act) => {
        const idx = act.beats.findIndex((b) => b.id === beatId);
        if (idx === -1) return act;
        const copy: Beat = { ...act.beats[idx], id: newId, title: `${act.beats[idx].title} (Copy)` };
        const beats = [...act.beats];
        beats.splice(idx + 1, 0, copy);
        return { ...act, beats };
      }),
    );
    selectBeat(newId);
  }

  function deleteBeat(beatId: string) {
    setActs((prev) => prev.map((act) => ({ ...act, beats: act.beats.filter((b) => b.id !== beatId) })));
    if (selectedId === beatId) setSelectedId("");
  }

  function toggleAct(actId: string) {
    setCollapsedActs((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) next.delete(actId);
      else next.add(actId);
      return next;
    });
  }

  function autoArrange() {
    setActs((prev) => prev.map((act) => ({ ...act, beats: [...act.beats].sort((a, b) => a.number - b.number) })));
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar project={project} navOpen={navOpen} onToggleNav={() => setNavOpen((o) => !o)} />
      <div className="flex flex-1 overflow-hidden">
        {navOpen && (
          <OutlineNavSidebar
            acts={acts}
            selectedId={selectedId}
            onSelect={selectBeat}
            collapsedActs={collapsedActs}
            onToggleAct={toggleAct}
            onAddBeat={() => addBeat(acts[0].id)}
          />
        )}
        <BoardArea
          acts={acts}
          columns={columns}
          allBeatsCount={allBeats.length}
          view={view}
          setView={setView}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          zoom={zoom}
          setZoom={setZoom}
          selectedId={selectedId}
          onSelect={selectBeat}
          onAddBeat={addBeat}
          fullscreen={fullscreen}
          setFullscreen={setFullscreen}
          onAutoArrange={autoArrange}
        />
        {selectedBeat && (
          <DetailPanel
            beat={selectedBeat}
            project={project}
            tab={rightTab}
            setTab={setRightTab}
            onClose={() => setSelectedId("")}
            onChangeStatus={(status) => patchBeat(selectedBeat.id, { status, color: STATUS_TO_COLOR[status] })}
            onChangeColor={(color) => patchBeat(selectedBeat.id, { color })}
            onDuplicate={() => duplicateBeat(selectedBeat.id)}
            onDelete={() => deleteBeat(selectedBeat.id)}
          />
        )}
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
  acts,
  selectedId,
  onSelect,
  collapsedActs,
  onToggleAct,
  onAddBeat,
}: {
  acts: Act[];
  selectedId: string;
  onSelect: (id: string) => void;
  collapsedActs: Set<string>;
  onToggleAct: (id: string) => void;
  onAddBeat: () => void;
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
        <button
          type="button"
          aria-label="Add act"
          className="grid size-6 place-items-center rounded-md text-ink-faint transition-colors hover:text-gold"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="mt-3 space-y-4">
        {acts.map((act) => {
          const collapsed = collapsedActs.has(act.id);
          return (
            <div key={act.id}>
              <button
                type="button"
                onClick={() => onToggleAct(act.id)}
                className="flex w-full items-center gap-1.5 text-left text-sm font-medium text-gold"
              >
                <ChevronDown className={`size-3.5 shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                <span className="truncate">{act.label}</span>
              </button>
              {!collapsed && (
                <ul className="relative ml-[7px] mt-1 space-y-0.5 border-l border-line-strong pl-4">
                  {act.beats.map((b) => (
                    <li key={b.id} className="relative">
                      <span className="absolute -left-[17px] top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-line-strong" />
                      <button
                        type="button"
                        onClick={() => onSelect(b.id)}
                        className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                          selectedId === b.id ? "bg-surface-2 text-ink" : "text-ink-muted hover:text-ink"
                        }`}
                      >
                        {b.number}. {b.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={onAddBeat}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line-strong py-2.5 text-sm text-gold transition-colors hover:bg-surface-2"
        >
          <Plus className="size-4" />
          Add Beat / Scene
        </button>
        <button
          type="button"
          aria-label="Auto-arrange structure"
          title="Auto-arrange"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-line-strong text-ink-faint transition-colors hover:text-gold"
        >
          <Shuffle className="size-4" />
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
  view,
  setView,
  groupBy,
  setGroupBy,
  zoom,
  setZoom,
  selectedId,
  onSelect,
  onAddBeat,
  fullscreen,
  setFullscreen,
  onAutoArrange,
}: {
  acts: Act[];
  columns: Column[];
  allBeatsCount: number;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  groupBy: "Acts" | "Status";
  setGroupBy: (v: "Acts" | "Status") => void;
  zoom: number;
  setZoom: (fn: (z: number) => number) => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onAddBeat: (actId: string) => void;
  fullscreen: boolean;
  setFullscreen: (fn: (f: boolean) => boolean) => void;
  onAutoArrange: () => void;
}) {
  return (
    <main className="scroll-slim flex min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-line px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-xl">
            <h1 className="flex items-center gap-2 font-display text-2xl text-ink">
              Three Act Structure
              <Info className="size-4 text-ink-faint" />
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              The classic 3-act structure is a timeless framework that builds a compelling story through
              setup, confrontation, and resolution.
            </p>
          </div>
          <Ring
            value={76}
            label="76%"
            sublabel={
              <span className="text-xs leading-snug text-ink-faint">
                Outline Progress
                <br />
                38 of 50 beats
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
              onChange={(v) => setGroupBy(v as "Acts" | "Status")}
              options={["Acts", "Status"]}
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

      {view === "board" && (
        <div className="scroll-slim flex-1 overflow-x-auto px-6 py-6">
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(232px, 1fr))`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top left",
              width: `${10000 / zoom}%`,
            }}
          >
            {columns.map((col) => (
              <BoardColumn
                key={col.id}
                column={col}
                selectedId={selectedId}
                onSelect={onSelect}
                onAddBeat={groupBy === "Acts" ? () => onAddBeat(col.id) : undefined}
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
                    <StatusIcon beat={b} />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {b.number}. {b.title}
                    </span>
                    <span className="hidden shrink-0 rounded-md border border-line-strong px-2 py-0.5 text-xs text-gold sm:inline">
                      {b.chapterLabel}
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs text-ink-faint">
                      {b.sceneCount} Scene{b.sceneCount === 1 ? "" : "s"}
                    </span>
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
          <LegendDot color={COLOR_HEX.green} label="Completed" />
          <LegendDot color={COLOR_HEX.gold} label="In Progress" />
          <LegendDot color={COLOR_HEX.purple} label="Planned" />
          <LegendDot color={COLOR_HEX.gray} label="Not Started" />
          <span className="flex items-center gap-1.5">
            <Link2 className="size-3.5" />
            Linked to Manuscript
          </span>
          <button
            type="button"
            onClick={onAutoArrange}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-gold transition-colors hover:bg-surface-2"
          >
            <Sparkles className="size-3.5" />
            Auto Arrange
          </button>
        </div>
      )}
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
}: {
  column: Column;
  selectedId: string;
  onSelect: (id: string) => void;
  onAddBeat?: () => void;
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
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong py-2.5 text-sm text-gold transition-colors hover:bg-surface-2"
        >
          <Plus className="size-4" />
          Add Beat
        </button>
      )}
    </div>
  );
}

function BeatCard({ beat, selected, onSelect }: { beat: Beat; selected: boolean; onSelect: () => void }) {
  const highlight = selected || beat.status === "inProgress";
  const color = COLOR_HEX[beat.color];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="card-2 block w-full p-4 text-left transition-colors"
      style={highlight ? { borderColor: color } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-ink">
          {beat.number}. {beat.title}
        </h4>
        <StatusIcon beat={beat} />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{beat.purpose}</p>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className="rounded-md border px-2 py-0.5 text-gold"
          style={{ borderColor: "var(--line-strong)" }}
        >
          {beat.chapterLabel}
        </span>
        <span className="text-ink-faint">
          {beat.sceneCount} Scene{beat.sceneCount === 1 ? "" : "s"}
        </span>
      </div>
    </button>
  );
}

function StatusIcon({ beat }: { beat: Beat }) {
  const color = COLOR_HEX[beat.color];
  if (beat.status === "completed") {
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full" style={{ background: color }}>
        <Check className="size-3 text-white" strokeWidth={3} />
      </span>
    );
  }
  if (beat.status === "inProgress") {
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
  project,
  tab,
  setTab,
  onClose,
  onChangeStatus,
  onChangeColor,
  onDuplicate,
  onDelete,
}: {
  beat: Beat;
  project: Project;
  tab: RightTab;
  setTab: (t: RightTab) => void;
  onClose: () => void;
  onChangeStatus: (s: BeatStatus) => void;
  onChangeColor: (c: BeatColor) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const color = COLOR_HEX[beat.color];
  return (
    <aside className="scroll-slim hidden w-[300px] shrink-0 overflow-y-auto border-l border-line p-4 xl:block">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 font-display text-lg leading-snug text-ink">
          {beat.number}. {beat.title}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
            style={{ borderColor: color, color }}
          >
            {beat.status === "completed" && <Check className="size-3" />}
            {STATUS_LABEL[beat.status]}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close beat details"
            className="grid size-6 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-5 border-b border-line text-sm">
        {(["Details", "Scenes", "Notes", "Links"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative pb-3 transition-colors ${tab === t ? "text-gold" : "text-ink-muted hover:text-ink"}`}
          >
            {t}
            {t === "Scenes" ? ` (${beat.sceneCount})` : ""}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold" />}
          </button>
        ))}
      </div>

      {tab === "Details" && (
        <DetailsTab
          beat={beat}
          project={project}
          onChangeStatus={onChangeStatus}
          onChangeColor={onChangeColor}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      )}
      {tab === "Scenes" && <ScenesTab beat={beat} />}
      {tab === "Notes" && <NotesTab beat={beat} />}
      {tab === "Links" && <LinksTab beat={beat} project={project} />}
    </aside>
  );
}

function DetailsTab({
  beat,
  project,
  onChangeStatus,
  onChangeColor,
  onDuplicate,
  onDelete,
}: {
  beat: Beat;
  project: Project;
  onChangeStatus: (s: BeatStatus) => void;
  onChangeColor: (c: BeatColor) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-5 space-y-5 text-sm">
      <div className="grid grid-cols-[84px_1fr] gap-3 border-b border-line pb-5">
        <dt className="text-ink-muted">Purpose</dt>
        <dd className="leading-relaxed text-ink-muted">{beat.purpose}</dd>
      </div>
      <div className="grid grid-cols-[84px_1fr] gap-3 border-b border-line pb-5">
        <dt className="text-ink-muted">Description</dt>
        <dd className="leading-relaxed text-ink-muted">{beat.description || "—"}</dd>
      </div>

      <div>
        <h3 className="text-ink">Linked Chapter</h3>
        <Link
          href={`/projects/${project.id}/chapters`}
          className="card-2 mt-2 flex items-center justify-between gap-2 p-3 text-sm transition-colors hover:bg-surface-2"
        >
          <span className="flex items-center gap-2 text-ink">
            <BookOpen className="size-4 text-gold" />
            {beat.chapterLabel}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-gold">
            Go to Chapter
            <ExternalLink className="size-3.5" />
          </span>
        </Link>
      </div>

      <div>
        <h3 className="text-ink">Key Elements</h3>
        <dl className="card-2 mt-2 divide-y divide-line overflow-hidden">
          <KeyRow label="POV" value={beat.pov} />
          <KeyRow label="Location" value={beat.location} />
          <KeyRow label="Time" value={beat.time} />
          <KeyRow label="Mood" value={beat.mood} />
          <div className="grid grid-cols-[84px_1fr] items-center gap-3 p-3">
            <dt className="text-gold">Characters</dt>
            <dd className="flex items-center gap-1.5">
              {beat.characters.slice(0, 3).map((name) => (
                <InitialsAvatar key={name} name={name} />
              ))}
              {beat.characters.length > 3 && (
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-[0.6rem] text-ink-muted">
                  +{beat.characters.length - 3}
                </span>
              )}
              {beat.characters.length === 0 && <span className="text-ink-faint">—</span>}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card-2 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm text-ink">Notes</h3>
          <PenLine className="size-3.5 text-gold" />
        </div>
        <div className="mt-2 space-y-2 text-ink-muted">
          {beat.notes.length > 0 ? (
            beat.notes.map((n, i) => <p key={i}>{n}</p>)
          ) : (
            <p className="text-ink-faint">No notes yet.</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-ink">Status</h3>
        <DropdownSelect
          value={STATUS_LABEL[beat.status]}
          onChange={(label) => onChangeStatus(STATUS_BY_LABEL[label])}
          options={STATUS_ORDER.map((s) => STATUS_LABEL[s])}
          placeholder="Status"
          className="w-40"
        />
      </div>

      <div>
        <h3 className="text-ink">Color Label</h3>
        <div className="mt-2 flex items-center gap-2.5">
          {COLOR_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChangeColor(c)}
              aria-label={`${c} label`}
              className="size-7 shrink-0 rounded-full transition-transform hover:scale-105"
              style={{
                background: COLOR_HEX[c],
                boxShadow: beat.color === c ? `0 0 0 2px var(--canvas), 0 0 0 4px ${COLOR_HEX[c]}` : undefined,
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className="card-2 flex flex-1 items-center justify-center gap-3 py-2.5 text-ink-muted">
          <button type="button" aria-label="Copy link to beat" className="transition-colors hover:text-ink">
            <Link2 className="size-4" />
          </button>
          <span className="h-4 w-px bg-line-strong" />
          <button type="button" onClick={onDuplicate} aria-label="Duplicate beat" className="transition-colors hover:text-ink">
            <Copy className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="card-2 flex flex-1 items-center justify-center gap-2 py-2.5 text-danger transition-colors hover:bg-danger/10"
        >
          <Trash2 className="size-4" />
          Delete Beat
        </button>
      </div>
    </div>
  );
}

function KeyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-3 p-3">
      <dt className="text-gold">{label}</dt>
      <dd className="truncate text-ink-muted">{value}</dd>
    </div>
  );
}

function hashHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-[0.6rem] font-medium text-white"
      style={{ background: `hsl(${hashHue(name)} 40% 38%)` }}
      title={name}
    >
      {initials}
    </span>
  );
}

function ScenesTab({ beat }: { beat: Beat }) {
  const scenes = Array.from({ length: beat.sceneCount }, (_, i) => i + 1);
  return (
    <div className="mt-5 space-y-2 text-sm">
      {scenes.length === 0 && <p className="text-ink-faint">No scenes yet.</p>}
      {scenes.map((n) => (
        <div key={n} className="card-2 flex items-center justify-between p-3">
          <span className="text-ink">Scene {n}</span>
          <span className="text-xs text-ink-faint">{beat.chapterLabel}</span>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ beat }: { beat: Beat }) {
  return (
    <div className="mt-5 space-y-2 text-sm text-ink-muted">
      {beat.notes.length > 0 ? (
        beat.notes.map((n, i) => (
          <p key={i} className="card-2 p-3">
            {n}
          </p>
        ))
      ) : (
        <p className="text-ink-faint">No notes yet.</p>
      )}
    </div>
  );
}

function LinksTab({ beat, project }: { beat: Beat; project: Project }) {
  return (
    <div className="mt-5 space-y-2 text-sm">
      <Link
        href={`/projects/${project.id}/chapters`}
        className="card-2 flex items-center gap-2 p-3 text-ink transition-colors hover:bg-surface-2"
      >
        <BookOpen className="size-4 text-gold" />
        {beat.chapterLabel}
      </Link>
    </div>
  );
}
