"use client";

import {
  Bold,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CornerUpLeft,
  Feather,
  Filter,
  Grip,
  Highlighter,
  History,
  Image as ImageIcon,
  Italic,
  Link2,
  ListChecks,
  ListOrdered,
  List as ListIcon,
  ListTree,
  LockOpen,
  Maximize2,
  MessageSquare,
  Minus,
  MoreVertical,
  Plus,
  Redo2,
  Search,
  Sparkles,
  Strikethrough,
  Table2,
  Type,
  Underline,
  Undo2,
  Wind,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIVE_COLLABORATORS,
  CHAPTER_18_COMMENTS,
  type ChapterParagraph,
  COMMENTER_TONE,
  type CommentThread,
  type Commenter,
  findChapter,
  getChapterBody,
  getManuscript,
  type ManuscriptChapter,
  type ManuscriptPart,
} from "@/lib/manuscript-data";
import { Progress } from "@/components/ui/progress";
import { useProject } from "@/lib/project-store";
import { setFocusModeActive } from "@/lib/ui-store";

/**
 * The manuscript editor — a dedicated, full-bleed workspace distinct from
 * every other page in the app (no standard header; sidebar collapse is a
 * user toggle, see (app)/layout.tsx + ui-store.ts). Three columns: the
 * manuscript outline, the editor itself, and a comments/versions/outline/AI
 * panel. Matches resources/writing-mockup.png.
 *
 * The prose body is a real contentEditable region. Formatting commands
 * (bold/italic/underline/strike/lists/links/color/highlight/font/size/
 * image/table/checklist) all actually apply to the current selection —
 * selection is captured on every mouseup/keyup inside the editor and
 * restored before each command runs, since clicking a toolbar button (or
 * opening a native <select>) steals the browser's live selection otherwise.
 * Word/character counts are computed live from the editable content.
 */

const PANEL_TABS = ["Comments", "Versions", "Outline", "AI"] as const;
type PanelTab = (typeof PANEL_TABS)[number];

type FocusModeKind = "normal" | "typewriter" | "zen" | "typewriterZen";

export default function ChaptersPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);

  const manuscript = useMemo(
    () => (project ? getManuscript(project.id, project.chapters) : []),
    [project],
  );

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusModeKind | null>(null);
  const [showFocusPicker, setShowFocusPicker] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("Comments");
  const [stats, setStats] = useState({ words: 0, characters: 0 });
  const [zoomPercent, setZoomPercent] = useState(100);

  const editableRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editableRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  /** Restore the last selection inside the editor, then run a formatting action against it. */
  function withSelection(fn: () => void) {
    editableRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    fn();
  }

  // Normal and Typewriter modes are meant to be fully immersive (the picker
  // calls them "fullscreen"); Zen strips the chrome down so far that going
  // fullscreen too just completes the effect. All three request it — if the
  // browser denies it (no user gesture, embedded iframe, etc.) the mode
  // still activates, just windowed.
  function activateFocusMode(kind: FocusModeKind) {
    setFocusMode(kind);
    setShowFocusPicker(false);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function exitFocusMode() {
    setFocusMode(null);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  // Escape backs out one layer at a time: close the picker if it's open,
  // otherwise exit whichever focus mode is active. This is the documented
  // way out alongside the corner X button — focus modes hide enough chrome
  // that a keyboard escape hatch matters.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (showFocusPicker) setShowFocusPicker(false);
      else if (focusMode) exitFocusMode();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showFocusPicker, focusMode]);

  // Mirror local focus-mode state into the shared store so (app)/layout.tsx
  // can hide the global Sidebar too — otherwise persistent app nav sits in
  // what's supposed to be a distraction-free view. Reset on unmount so
  // navigating away can never strand it hidden elsewhere.
  useEffect(() => {
    setFocusModeActive(focusMode !== null);
  }, [focusMode]);
  useEffect(() => () => setFocusModeActive(false), []);

  const activeChapter = useMemo(() => {
    if (!manuscript.length) return undefined;
    if (selectedChapterId) return findChapter(manuscript, selectedChapterId);
    // Default to the chapter the mockup opens on if present, else the first.
    return findChapter(manuscript, "ch-18") ?? manuscript[0]?.chapters[0];
  }, [manuscript, selectedChapterId]);

  const body = useMemo(() => {
    if (!project || !activeChapter) return null;
    return getChapterBody(project.id, activeChapter);
  }, [project, activeChapter]);

  const bodyBaseline = useMemo(() => {
    if (!body) return { words: 0, characters: 0 };
    const text = body.paragraphs
      .filter((p) => !p.break)
      .map((p) => p.text)
      .join(" ");
    return countText(text);
  }, [body]);

  // Reset the displayed `stats` whenever the open chapter changes — React's
  // sanctioned "adjust state during render" pattern (not an effect: setting
  // state here is intentional and synchronous with this render, not a
  // cascading update triggered after the fact) — see
  // https://react.dev/learn/you-might-not-need-an-effect.
  const [statsBody, setStatsBody] = useState(body);
  if (body !== statsBody) {
    setStatsBody(body);
    setStats(bodyBaseline);
  }

  if (!project) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-2xl text-ink">Project not found</p>
          <Link href="/projects" className="mt-3 inline-block text-sm text-gold hover:opacity-80">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!activeChapter || !body) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <p className="text-sm text-ink-muted">This project doesn&rsquo;t have any chapters yet.</p>
      </div>
    );
  }

  // Normal and Typewriter both hide the side panels but keep the toolbar
  // and status bar; Zen and Typewriter × Zen strip those too, leaving just
  // the page. Typewriter and Typewriter × Zen both get caret-centering.
  const hidePanels = focusMode !== null;
  const hideChrome = focusMode === "zen" || focusMode === "typewriterZen";
  const typewriter = focusMode === "typewriter" || focusMode === "typewriterZen";

  return (
    <div className="flex h-dvh min-w-0">
      {!hidePanels && (
        <ManuscriptPanel
          manuscript={manuscript}
          activeChapterId={activeChapter.id}
          activeSceneId={selectedSceneId}
          onSelectChapter={(chapterId) => {
            setSelectedChapterId(chapterId);
            setSelectedSceneId(null);
          }}
          onSelectScene={setSelectedSceneId}
        />
      )}

      <div className="@container relative flex min-w-0 flex-1 flex-col border-r border-line">
        {!hideChrome && (
          <TopBar
            project={project}
            chapterTitle={`Chapter ${activeChapter.number} – ${body.title}`}
            onOpenPanel={(tab) => {
              setFocusMode(null);
              setPanelTab(tab);
            }}
            makeRoomForExitButton={hidePanels}
          />
        )}
        {!hideChrome && <FormattingToolbar withSelection={withSelection} />}
        <EditorBody
          key={activeChapter.id}
          body={body}
          editableRef={editableRef}
          onSelect={saveSelection}
          onStatsChange={(deltaWords, deltaCharacters) =>
            setStats({
              words: bodyBaseline.words + deltaWords,
              characters: bodyBaseline.characters + deltaCharacters,
            })
          }
          typewriter={typewriter}
          centered={hideChrome}
          zoomPercent={zoomPercent}
        />
        {!hideChrome && (
          <StatusBar
            words={stats.words}
            characters={stats.characters}
            focusMode={focusMode}
            onOpenPicker={() => setShowFocusPicker(true)}
            onExitFocusMode={exitFocusMode}
            zoomPercent={zoomPercent}
            onZoomChange={setZoomPercent}
          />
        )}

        {hidePanels && !hideChrome && (
          <FocusModeTabStrip
            onSelect={(tab) => {
              setPanelTab(tab);
              setFocusMode(null);
            }}
          />
        )}
      </div>

      {!hidePanels && <CommentsPanel tab={panelTab} onTabChange={setPanelTab} />}

      {hidePanels && <FocusExitButton onClick={exitFocusMode} />}
      {showFocusPicker && (
        <FocusModePickerModal onSelect={activateFocusMode} onClose={() => setShowFocusPicker(false)} />
      )}
    </div>
  );
}

/**
 * Compact icon-only switcher for Comments/Versions/Outline/AI — the full
 * text-labeled tabs live in the comments panel, which Focus Mode hides so
 * the prose isn't crowded. This is what stays reachable while focused:
 * click one and it exits focus mode straight into that tab.
 */
function FocusModeTabStrip({ onSelect }: { onSelect: (tab: PanelTab) => void }) {
  const ICONS: Record<PanelTab, typeof MessageSquare> = {
    Comments: MessageSquare,
    Versions: History,
    Outline: ListTree,
    AI: Sparkles,
  };
  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col gap-1 rounded-xl border border-line bg-surface/90 p-1 shadow-lg backdrop-blur">
      {PANEL_TABS.map((tab) => {
        const Icon = ICONS[tab];
        return (
          <button
            key={tab}
            type="button"
            title={tab}
            aria-label={tab}
            onClick={() => onSelect(tab)}
            className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * The way out of any focus mode besides Escape — a subtle, low-opacity X
 * pinned to the corner the side panel used to occupy, so it reads as part
 * of the page rather than another toolbar control.
 */
function FocusExitButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Exit focus mode"
      title="Exit focus mode (Esc)"
      onClick={onClick}
      className="fixed left-4 top-4 z-30 grid size-8 place-items-center rounded-full text-ink-faint opacity-40 transition-opacity hover:bg-surface-2 hover:opacity-100"
    >
      <X className="size-4" />
    </button>
  );
}

const FOCUS_MODE_OPTIONS: {
  key: FocusModeKind;
  label: string;
  icon: typeof Maximize2;
}[] = [
  { key: "normal", label: "Normal Fullscreen", icon: Maximize2 },
  { key: "typewriter", label: "Typewriter Mode", icon: Type },
  { key: "zen", label: "Zen Mode", icon: Feather },
  { key: "typewriterZen", label: "Typewriter × Zen", icon: Wind },
];

/** The picker Focus Mode opens into: pick a mode, or Escape/X/backdrop out. */
function FocusModePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (kind: FocusModeKind) => void;
  onClose: () => void;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`fixed inset-0 z-50 grid place-items-center p-6 transition-all duration-200 ${
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="card-2 w-full max-w-md p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-ink">Choose a focus mode</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {FOCUS_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => onSelect(opt.key)}
                className="flex items-center gap-3 rounded-xl border border-line p-3.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2/60"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-gold">
                  <opt.icon className="size-4" />
                </span>
                <span className="text-sm font-medium text-ink">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ======================================================================= */
/*  Left — manuscript outline                                              */
/* ======================================================================= */

function ManuscriptPanel({
  manuscript,
  activeChapterId,
  activeSceneId,
  onSelectChapter,
  onSelectScene,
}: {
  manuscript: ManuscriptPart[];
  activeChapterId: string;
  activeSceneId: string | null;
  onSelectChapter: (id: string) => void;
  onSelectScene: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(manuscript.map((p) => p.id).concat(activeChapterId)),
  );
  const [query, setQuery] = useState("");

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = query.trim()
    ? manuscript
        .map((part) => ({
          ...part,
          chapters: part.chapters.filter((c) =>
            `${c.number} ${c.title}`.toLowerCase().includes(query.toLowerCase()),
          ),
        }))
        .filter((part) => part.chapters.length > 0)
    : manuscript;

  // No real writing-session tracking exists yet (see CLAUDE.md §4.5/§4.7),
  // so this reads honestly as zero rather than a fabricated number.
  const dailyGoal = { current: 0, target: 1500, streak: 0 };
  const percent = Math.round((dailyGoal.current / dailyGoal.target) * 100);

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-line">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="label-caps text-[0.68rem]">Manuscript</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search manuscript"
            className="grid size-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Add chapter"
            className="grid size-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="px-5 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter chapters…"
          className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
        />
      </div>

      <nav className="scroll-slim flex-1 overflow-y-auto px-3 pb-3">
        <ul className="flex flex-col gap-0.5">
          {filtered.map((part) => (
            <li key={part.id}>
              <button
                type="button"
                onClick={() => toggle(part.id)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-ink hover:bg-surface-2/60"
              >
                {expanded.has(part.id) ? (
                  <ChevronDown className="size-3.5 shrink-0 text-ink-faint" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0 text-ink-faint" />
                )}
                <span className="truncate">{part.title}</span>
              </button>

              {expanded.has(part.id) && (
                <ul className="flex flex-col gap-0.5">
                  {part.chapters.map((chapter) => (
                    <ChapterRow
                      key={chapter.id}
                      chapter={chapter}
                      active={chapter.id === activeChapterId}
                      expanded={expanded.has(chapter.id)}
                      activeSceneId={activeSceneId}
                      onToggle={() => toggle(chapter.id)}
                      onSelect={() => onSelectChapter(chapter.id)}
                      onSelectScene={onSelectScene}
                    />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4">
        <div className="card-2 p-4">
          <p className="label-caps text-[0.6rem]">Daily Goal</p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <p className="text-sm text-ink">
              <span className="font-num">{dailyGoal.current.toLocaleString()}</span>
              <span className="text-ink-faint"> / {dailyGoal.target.toLocaleString()} words</span>
            </p>
            <span className="text-xs text-gold">{percent}%</span>
          </div>
          <Progress value={percent} className="mt-2" />
          <p className="mt-3 text-xs text-ink-muted">
            Writing Streak: <span aria-hidden>🔥</span> {dailyGoal.streak} days
          </p>
        </div>
      </div>
    </aside>
  );
}

function ChapterRow({
  chapter,
  active,
  expanded,
  activeSceneId,
  onToggle,
  onSelect,
  onSelectScene,
}: {
  chapter: ManuscriptChapter;
  active: boolean;
  expanded: boolean;
  activeSceneId: string | null;
  onToggle: () => void;
  onSelect: () => void;
  onSelectScene: (id: string) => void;
}) {
  const hasScenes = !!chapter.scenes?.length;
  return (
    <li>
      <div
        className={`group flex items-center gap-1.5 rounded-lg py-2 pl-6 pr-2 text-sm transition-colors ${
          active ? "bg-surface-2 text-ink" : "text-ink-muted hover:bg-surface-2/60 hover:text-ink"
        }`}
      >
        {hasScenes ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? "Collapse chapter" : "Expand chapter"}
            className="shrink-0 text-ink-faint"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
          Chapter {chapter.number} – {chapter.title}
        </button>
        {chapter.complete ? (
          <Check className="size-3.5 shrink-0 text-success" />
        ) : active ? (
          <span className="size-1.5 shrink-0 rounded-full bg-gold" />
        ) : null}
      </div>

      {hasScenes && expanded && (
        <ul className="flex flex-col gap-0.5">
          {chapter.scenes!.map((scene) => {
            const sceneActive = scene.id === activeSceneId;
            return (
              <li key={scene.id}>
                <button
                  type="button"
                  onClick={() => onSelectScene(scene.id)}
                  className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-12 pr-2 text-left text-sm transition-colors ${
                    sceneActive ? "bg-surface-2 text-ink" : "text-ink-muted hover:bg-surface-2/60 hover:text-ink"
                  }`}
                >
                  {sceneActive && <span className="size-1.5 shrink-0 rounded-full bg-gold" />}
                  <span className="truncate">{scene.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/* ======================================================================= */
/*  Center — top bar, formatting toolbar, editor body, status bar          */
/* ======================================================================= */

function TopBar({
  project,
  chapterTitle,
  onOpenPanel,
  makeRoomForExitButton = false,
}: {
  project: { id: string; title: string };
  chapterTitle: string;
  onOpenPanel: (tab: PanelTab) => void;
  makeRoomForExitButton?: boolean;
}) {
  return (
    <header
      className={`flex h-14 shrink-0 items-center gap-2 border-b border-line text-sm ${
        makeRoomForExitButton ? "pl-14 pr-5" : "px-5"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <Link
          href={`/projects/${project.id}`}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label="Back to project"
        >
          <BookIcon />
        </Link>
        <Link
          href={`/projects/${project.id}`}
          className="hidden max-w-[140px] shrink-0 truncate text-ink-muted hover:text-ink @[480px]:block"
        >
          {project.title}
        </Link>
        <ChevronRight className="hidden size-3.5 shrink-0 text-ink-faint @[480px]:block" />
        <Link
          href={`/projects/${project.id}/chapters`}
          className="hidden shrink-0 text-ink-muted hover:text-ink @[400px]:block"
        >
          Manuscript
        </Link>
        <ChevronRight className="hidden size-3.5 shrink-0 text-ink-faint @[400px]:block" />
        <span className="min-w-0 flex-1 truncate font-medium text-ink">{chapterTitle}</span>
      </div>

      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-success @[600px]:flex">
        <CircleCheck className="size-3.5" />
        All changes saved
      </span>

      <div className="hidden shrink-0 items-center gap-1 @[420px]:flex">
        <button
          type="button"
          aria-label="Undo"
          onClick={() => document.execCommand("undo")}
          className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Undo2 className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Redo"
          onClick={() => document.execCommand("redo")}
          className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Redo2 className="size-4" />
        </button>
      </div>

      <div className="mx-2 hidden shrink-0 items-center -space-x-2 @[500px]:flex">
        {ACTIVE_COLLABORATORS.slice(0, 3).map((c) => (
          <CommenterAvatar key={c.name} name={c.name} tone={c.tone} className="ring-2 ring-canvas" />
        ))}
        <span className="z-10 grid size-7 place-items-center rounded-full bg-surface-2 text-[0.65rem] font-medium text-ink-muted ring-2 ring-canvas">
          +{Math.max(0, ACTIVE_COLLABORATORS.length - 3)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <ShareButton />

        <button
          type="button"
          aria-label="Comments"
          onClick={() => onOpenPanel("Comments")}
          className="ml-1 grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <MessageSquare className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Version history"
          onClick={() => onOpenPanel("Versions")}
          className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <History className="size-4" />
        </button>
        <MoreMenu projectId={project.id} />
      </div>
    </header>
  );
}

function ShareButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ml-1 flex items-center gap-1.5 rounded-xl bg-surface-2 px-3.5 py-2 text-sm text-ink transition-colors hover:bg-surface-2/70"
      >
        <LockOpen className="size-4" />
        Share
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-64">
            <div className="card-2 p-3">
              <p className="text-sm font-medium text-ink">Share this chapter</p>
              <p className="mt-1 text-xs text-ink-muted">
                Anyone with the link and an invite can view or comment. There&rsquo;s no backend here
                yet, so this is a preview of the flow.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 w-full rounded-lg border border-line py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
              >
                Copy link
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MoreMenu({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More"
        onClick={() => setOpen((o) => !o)}
        className="grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-48">
            <div className="card-2 p-1.5">
              <Link
                href={`/projects/${projectId}/settings`}
                className="block rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                Chapter settings
              </Link>
              <Link
                href={`/projects/${projectId}`}
                className="block rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                Export chapter
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" strokeWidth={1.7} stroke="currentColor">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5V4.5Z" strokeLinejoin="round" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" strokeLinejoin="round" />
    </svg>
  );
}

const TOOLBAR_DIVIDER = <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />;

const FONT_OPTIONS = [
  { label: "Lora", value: "Lora, Georgia, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
];
const SIZE_OPTIONS = [10, 12, 14, 16, 18, 24, 32];
const BLOCK_OPTIONS = [
  { label: "Normal Text", value: "P" },
  { label: "Heading 1", value: "H1" },
  { label: "Heading 2", value: "H2" },
  { label: "Quote", value: "BLOCKQUOTE" },
];
const SWATCHES = ["#d4af7a", "#e06a6a", "#6ca8e6", "#3fa46a", "#8868d6", "#f5f1ec"];

function FormattingToolbar({ withSelection }: { withSelection: (fn: () => void) => void }) {
  function exec(command: string, value?: string) {
    withSelection(() => document.execCommand(command, false, value));
  }

  function wrapStyle(styleText: string) {
    withSelection(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);

      // A triple-click selection can extend into the very start of the next
      // paragraph (a common browser quirk). Left alone, extractContents +
      // insertNode would then wrap that whole next <p> inside this inline
      // <span> too, corrupting the document. Clamp the range to the end of
      // the start paragraph so formatting never crosses a block boundary.
      const startBlock = closestBlock(range.startContainer);
      if (startBlock && !startBlock.contains(range.endContainer)) {
        range.setEnd(startBlock, startBlock.childNodes.length);
      }
      if (range.collapsed) return;

      const span = document.createElement("span");
      span.setAttribute("style", styleText);
      try {
        range.surroundContents(span);
      } catch {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }
      sel.removeAllRanges();
      const next = document.createRange();
      next.selectNodeContents(span);
      sel.addRange(next);
    });
  }

  return (
    <div className="scroll-slim flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line px-4 text-sm text-ink-muted">
      <ToolbarSelect
        options={BLOCK_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
        defaultValue="P"
        onChange={(v) => exec("formatBlock", v)}
        className="w-28"
      />
      <ToolbarSelect
        options={FONT_OPTIONS}
        defaultValue={FONT_OPTIONS[0].value}
        onChange={(v) => wrapStyle(`font-family:${v}`)}
        className="w-20"
      />
      <ToolbarSelect
        options={SIZE_OPTIONS.map((n) => ({ label: String(n), value: String(n) }))}
        defaultValue="12"
        onChange={(v) => wrapStyle(`font-size:${v}px`)}
        className="w-14"
      />
      {TOOLBAR_DIVIDER}
      <ToolbarButton label="Bold" onClick={() => exec("bold")}>
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => exec("italic")}>
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Underline" onClick={() => exec("underline")}>
        <Underline className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Strikethrough" onClick={() => exec("strikeThrough")}>
        <Strikethrough className="size-4" />
      </ToolbarButton>
      <ColorPickerButton
        icon={<Baseline className="size-4" />}
        label="Text color"
        onPick={(color) => exec("foreColor", color)}
      />
      <ColorPickerButton
        icon={<Highlighter className="size-4" />}
        label="Highlight"
        onPick={(color) => exec("hiliteColor", color)}
      />
      {TOOLBAR_DIVIDER}
      <ToolbarButton
        label="Link"
        onClick={() =>
          withSelection(() => {
            const url = window.prompt("Link URL");
            if (url) document.execCommand("createLink", false, url);
          })
        }
      >
        <Link2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Image"
        onClick={() =>
          withSelection(() => {
            const url = window.prompt("Image URL");
            if (url) document.execCommand("insertImage", false, url);
          })
        }
      >
        <ImageIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Table"
        onClick={() =>
          exec(
            "insertHTML",
            "<table><tbody>" +
              Array.from(
                { length: 3 },
                () => "<tr>" + "<td>&nbsp;</td>".repeat(3) + "</tr>",
              ).join("") +
              "</tbody></table><p><br></p>",
          )
        }
      >
        <Table2 className="size-4" />
      </ToolbarButton>
      {TOOLBAR_DIVIDER}
      <ToolbarButton label="Bulleted list" onClick={() => exec("insertUnorderedList")}>
        <ListIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Checklist"
        onClick={() =>
          exec(
            "insertHTML",
            '<ul style="list-style:none;padding-left:0"><li><input type="checkbox" style="margin-right:0.5em" />New to-do</li></ul>',
          )
        }
      >
        <ListChecks className="size-4" />
      </ToolbarButton>
    </div>
  );
}

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "BLOCKQUOTE", "LI"]);

function closestBlock(node: Node): HTMLElement | null {
  let el: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el instanceof HTMLElement) {
    if (BLOCK_TAGS.has(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
}

function Baseline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} strokeWidth={1.7} stroke="currentColor">
      <path d="m6 16 4-9 4 9M7.5 12.5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" strokeLinecap="round" />
      <path d="M15 16h4l-4 4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid size-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </button>
  );
}

function ToolbarSelect({
  options,
  defaultValue,
  onChange,
  className = "",
}: {
  options: { label: string; value: string }[];
  defaultValue: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <select
        defaultValue={defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-lg bg-transparent py-1.5 pl-2 pr-6 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
    </div>
  );
}

function ColorPickerButton({
  icon,
  label,
  onPick,
}: {
  icon: React.ReactNode;
  label: string;
  onPick: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  // The toolbar scrolls horizontally (overflow-x-auto), which per the CSS
  // spec forces overflow-y to auto too, clipping any absolutely-positioned
  // popover that extends below it. position:fixed with a measured offset
  // escapes that clipping the same way the close-scrim already does.
  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 8, left: rect.left });
    setOpen(true);
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="grid size-8 place-items-center rounded-lg transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {icon}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-10 cursor-default"
            onMouseDown={() => setOpen(false)}
          />
          <div className="fixed z-20 w-28" style={{ top: pos.top, left: pos.left }}>
            <div className="card-2 grid grid-cols-3 gap-1.5 p-2">
              {SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(color);
                    setOpen(false);
                  }}
                  className="size-6 rounded-full border border-line-strong"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EditorBody({
  body,
  editableRef,
  onSelect,
  onStatsChange,
  typewriter = false,
  centered = false,
  zoomPercent = 100,
}: {
  body: { heading: string; title: string; paragraphs: ChapterParagraph[] };
  editableRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onStatsChange: (deltaWords: number, deltaCharacters: number) => void;
  typewriter?: boolean;
  centered?: boolean;
  zoomPercent?: number;
}) {
  const baseline = useRef({ words: 0, characters: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  // Top/bottom padding for typewriter mode, computed from the scroll
  // container's own measured height (see the effect below) rather than a
  // static vh value. A static value can't work: with box-sizing:border-box
  // an element can never be shorter than its own padding, so a padding pair
  // sized for a full-viewport container (e.g. Zen's, chrome hidden) would
  // by itself exceed a chrome-visible container's smaller height and force
  // it to grow past its flex allocation — no amount of flex-shrink/min-h-0
  // can win against that, it's a hard geometric constraint, not a layout
  // bug. Deriving the padding from each container's own height keeps the
  // pair comfortably under 100% of it in every mode.
  //
  // The split is asymmetric to match centerCaret's 42%-from-top target:
  // reaching that target on the very first line needs top padding of
  // ~42% of the container height, and on the very last line needs bottom
  // padding of ~58% — the two would sum to exactly 100%, leaving no room
  // for actual text, so both are trimmed a bit short of exact. That only
  // costs perfect centering in the (rare, momentary) case of typing at the
  // true start or end of the whole document; anywhere else, real content
  // fills what the padding doesn't.
  const [typewriterPad, setTypewriterPad] = useState({ top: 0, bottom: 0 });

  useEffect(() => {
    const text = editableRef.current?.innerText ?? "";
    baseline.current = countText(text);
  }, [editableRef]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!typewriter || !container) return;
    // Border-box size, not contentRect: contentRect is content-box (outer
    // size minus padding), and since we're the ones setting that padding,
    // reading it back here would create a feedback loop — grow the padding,
    // watch contentRect shrink in response, shrink the padding, repeat.
    // Border-box is what the flex parent actually allocated and stays put
    // regardless of how this element divides that space into padding vs.
    // content.
    const ro = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize?.[0]?.blockSize ?? container.offsetHeight;
      setTypewriterPad({ top: height * 0.35, bottom: height * 0.5 });
    });
    ro.observe(container, { box: "border-box" });
    return () => ro.disconnect();
  }, [typewriter]);

  // Keeps the caret's line pinned near the vertical middle of the viewport
  // as you type, so the page scrolls to you instead of you scrolling to the
  // page — old lines climb off the top edge, new ones arrive from below,
  // and you never have to touch the scrollbar. The padding above is what
  // gives the first and last lines enough room to actually reach that
  // middle position instead of stopping short.
  //
  // This has to be an instant scrollTop assignment, not a smooth/animated
  // one: typing fires an input event per keystroke, and while our
  // correction is still mid-animation the browser's own "keep the caret in
  // view" auto-scroll (which snaps it to just barely inside the viewport,
  // not centered) fires again and wins the fight — net effect, the caret
  // never leaves the bottom edge. Setting scrollTop directly overrides
  // whatever the browser just did, in the same tick, every time.
  function centerCaret() {
    if (!typewriter) return;
    const sel = window.getSelection();
    const container = scrollRef.current;
    if (!sel || sel.rangeCount === 0 || !container) return;
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    let rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0 && rect.top === 0) {
      const node = range.startContainer;
      const el = node instanceof Element ? node : node.parentElement;
      if (!el) return;
      rect = el.getBoundingClientRect();
    }
    const containerRect = container.getBoundingClientRect();
    const target = containerRect.top + containerRect.height * 0.42;
    const delta = rect.top - target;
    if (Math.abs(delta) > 1) container.scrollTop += delta;
  }

  function handleSelect() {
    onSelect();
    centerCaret();
  }

  function handleInput() {
    const text = editableRef.current?.innerText ?? "";
    const current = countText(text);
    onStatsChange(current.words - baseline.current.words, current.characters - baseline.current.characters);
    centerCaret();
    // A second, deferred pass: on a line-wrap the browser's own
    // scroll-into-view can land after this handler runs, nudging the caret
    // back toward the edge between our correction and the next paint. This
    // catches that straggler so fast, continuous typing doesn't drift.
    requestAnimationFrame(centerCaret);
  }

  return (
    <div
      ref={scrollRef}
      className={`scroll-slim min-h-0 flex-1 overflow-y-auto px-10 ${typewriter ? "" : "py-12"}`}
      style={
        typewriter ? { paddingTop: typewriterPad.top, paddingBottom: typewriterPad.bottom } : undefined
      }
    >
      <div className={`mx-auto max-w-[680px] ${centered ? "pt-[8vh]" : ""}`}>
        <p className="label-caps text-purple text-[0.68rem]">{body.heading}</p>
        <h1 className="mt-2 font-display text-4xl text-ink">{body.title}</h1>

        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onMouseUp={handleSelect}
          onKeyUp={handleSelect}
          style={{ fontSize: `${(17 * zoomPercent) / 100}px` }}
          className="mt-8 font-display leading-[1.85] text-ink/90 focus:outline-none [&_p]:mb-5"
        >
          {body.paragraphs.map((p) => (
            <EditorParagraph key={p.id} paragraph={p} />
          ))}
          <p className="text-ink-faint" data-placeholder>
            Type / for commands
          </p>
        </div>
      </div>
    </div>
  );
}

function countText(text: string): { words: number; characters: number } {
  const trimmed = text.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    characters: text.replace(/\s/g, "").length,
  };
}

function EditorParagraph({ paragraph }: { paragraph: ChapterParagraph }) {
  if (paragraph.break) {
    return <p className="my-6 text-center tracking-[0.5em] text-ink-faint">{paragraph.text}</p>;
  }

  const tone = paragraph.commenter ? COMMENTER_TONE[paragraph.commenter] : null;
  const textClass = paragraph.emphasis ? "text-gold" : "";

  if (!paragraph.commenter) {
    return <p className={textClass}>{paragraph.text}</p>;
  }

  return (
    <p className={`border-l-2 pl-4 ${textClass}`} style={{ borderColor: `var(--${tone})` }}>
      {paragraph.text}
      <CommenterTag name={paragraph.commenter!} className="ml-2 align-middle" />
    </p>
  );
}

function CommenterTag({ name, className = "" }: { name: Commenter; className?: string }) {
  const tone = COMMENTER_TONE[name];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium not-italic ${className}`}
      style={{
        color: `var(--${tone})`,
        background: `color-mix(in srgb, var(--${tone}) 20%, transparent)`,
      }}
    >
      {name}
    </span>
  );
}

function StatusBar({
  words,
  characters,
  focusMode,
  onOpenPicker,
  onExitFocusMode,
  zoomPercent,
  onZoomChange,
}: {
  words: number;
  characters: number;
  focusMode: FocusModeKind | null;
  zoomPercent: number;
  onZoomChange: (fn: (z: number) => number) => void;
  onOpenPicker: () => void;
  onExitFocusMode: () => void;
}) {
  const readMinutes = Math.max(1, Math.round(words / 250));
  const active = focusMode !== null;
  return (
    <footer className="flex h-11 shrink-0 items-center gap-4 overflow-hidden border-t border-line px-5 text-xs text-ink-muted">
      <span className="shrink-0 whitespace-nowrap">{words.toLocaleString()} words</span>
      <span className="hidden shrink-0 whitespace-nowrap @[300px]:inline">
        {characters.toLocaleString()} characters
      </span>
      <span className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap @[440px]:flex">
        <History className="size-3.5" />
        Est. read time: {readMinutes} min
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-4">
        <label className="flex shrink-0 items-center gap-2">
          <span className="hidden whitespace-nowrap @[520px]:inline">Focus Mode</span>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label="Focus Mode"
            onClick={active ? onExitFocusMode : onOpenPicker}
            className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
              active ? "bg-gold" : "bg-surface-2"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                active ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </label>

        <div className="hidden shrink-0 items-center gap-2 @[380px]:flex">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => onZoomChange((z) => Math.max(50, z - 10))}
            className="text-ink-muted hover:text-ink"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-9 text-center">{zoomPercent}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => onZoomChange((z) => Math.min(200, z + 10))}
            className="text-ink-muted hover:text-ink"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <button
          type="button"
          aria-label="Fullscreen"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen();
          }}
          className="grid size-7 place-items-center rounded-lg transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>
    </footer>
  );
}

/* ======================================================================= */
/*  Right — comments / versions / outline / AI                             */
/* ======================================================================= */

type CommentFilter = "All" | "Open" | "Resolved";

function CommentsPanel({ tab, onTabChange }: { tab: PanelTab; onTabChange: (tab: PanelTab) => void }) {
  const [comments, setComments] = useState<CommentThread[]>(CHAPTER_18_COMMENTS);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<CommentFilter>("All");
  const draftInputRef = useRef<HTMLInputElement>(null);

  function submitComment() {
    const text = draft.trim();
    if (!text) return;
    setComments((prev) => [
      { id: `c-${Date.now()}`, author: "Jessica", time: "Just now", text },
      ...prev,
    ]);
    setDraft("");
  }

  function toggleResolved(id: string) {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c)));
  }

  function resolveAll() {
    setComments((prev) => prev.map((c) => ({ ...c, resolved: true })));
  }

  function replyTo(author: string) {
    setDraft(`@${author} `);
    draftInputRef.current?.focus();
  }

  const visible = comments.filter((c) =>
    filter === "All" ? true : filter === "Resolved" ? c.resolved : !c.resolved,
  );

  return (
    <aside className="flex w-[360px] shrink-0 flex-col">
      <div className="flex items-center gap-5 border-b border-line px-5 pt-4 text-sm">
        {PANEL_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={`relative pb-3 transition-colors ${
              tab === t ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold" />}
          </button>
        ))}
      </div>

      {tab === "Comments" ? (
        <>
          <div className="flex items-center gap-1 px-5 py-3">
            <FilterDropdown value={filter} onChange={setFilter} />
            <button
              aria-label="Filter"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Filter className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Mark all resolved"
              title="Mark all resolved"
              onClick={resolveAll}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <CircleCheck className="size-4" />
            </button>
            <button
              aria-label="Options"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Grip className="size-4" />
            </button>
          </div>

          <ul className="scroll-slim flex-1 space-y-3 overflow-y-auto px-5 pb-3">
            {visible.length === 0 && (
              <p className="pt-8 text-center text-sm text-ink-faint">No {filter.toLowerCase()} comments.</p>
            )}
            {visible.map((c) => (
              <CommentCard key={c.id} comment={c} onToggleResolved={() => toggleResolved(c.id)} onReply={() => replyTo(c.author)} />
            ))}
          </ul>

          <div className="border-t border-line p-4">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
              <input
                ref={draftInputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitComment();
                }}
                placeholder="Add a comment or @mention…"
                className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <button
                type="button"
                aria-label="Send comment"
                onClick={submitComment}
                className="grid size-7 shrink-0 place-items-center rounded-lg bg-gold text-gold-contrast transition-opacity hover:opacity-90"
              >
                <SendIcon />
              </button>
            </div>
          </div>

          <div className="border-t border-line p-4">
            <div className="flex items-center justify-between">
              <h3 className="label-caps text-[0.65rem]">Active Collaborators</h3>
              <span className="text-xs text-ink-faint">{ACTIVE_COLLABORATORS.length}</span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {ACTIVE_COLLABORATORS.map((c) => (
                <li key={c.name} className="flex items-center gap-2.5">
                  <CommenterAvatar name={c.name} tone={c.tone} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {c.name}
                    {c.you && <span className="text-ink-muted"> (You)</span>}
                  </span>
                  <span className="shrink-0 text-xs text-ink-faint">{c.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-ink-faint">
          {tab === "Versions" && "Version history isn't wired up yet."}
          {tab === "Outline" && "A live outline of this chapter's beats will live here."}
          {tab === "AI" && "Ask the AI Assistant about this chapter here."}
        </div>
      )}
    </aside>
  );
}

function FilterDropdown({
  value,
  onChange,
}: {
  value: CommentFilter;
  onChange: (v: CommentFilter) => void;
}) {
  return (
    <div className="relative flex-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CommentFilter)}
        className="w-full cursor-pointer appearance-none rounded-lg border border-line bg-transparent py-1.5 pl-2.5 pr-7 text-xs text-ink-muted transition-colors hover:text-ink focus:outline-none"
      >
        <option className="bg-surface text-ink" value="All">
          All
        </option>
        <option className="bg-surface text-ink" value="Open">
          Open
        </option>
        <option className="bg-surface text-ink" value="Resolved">
          Resolved
        </option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
    </div>
  );
}

function CommentCard({
  comment,
  onToggleResolved,
  onReply,
}: {
  comment: CommentThread;
  onToggleResolved: () => void;
  onReply: () => void;
}) {
  const tone = COMMENTER_TONE[comment.author];
  return (
    <li className={`card-2 relative p-4 ${comment.resolved ? "opacity-50" : ""}`}>
      <span
        className="absolute right-3 top-3 size-2 rounded-full"
        style={{ backgroundColor: `var(--${tone})` }}
        aria-hidden
      />
      <div className="flex items-center gap-2.5">
        <CommenterAvatar name={comment.author} tone={comment.author} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{comment.author}</p>
        </div>
        <span className="shrink-0 text-xs text-ink-faint">{comment.time}</span>
        <button
          type="button"
          aria-label="More"
          className="shrink-0 text-ink-faint transition-colors hover:text-ink"
        >
          <MoreVertical className="size-3.5" />
        </button>
      </div>
      <p className="mt-2.5 text-sm text-ink-muted">
        {comment.text}
        {comment.resolved && <span className="ml-2 text-xs text-success">Resolved</span>}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onReply}
          className="flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink"
        >
          <CornerUpLeft className="size-3.5" />
          Reply
        </button>
        <div className="flex items-center gap-2 text-ink-faint">
          <button type="button" aria-label="Mark as question" className="hover:text-ink">
            <MessageSquare className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={comment.resolved ? "Reopen" : "Resolve"}
            title={comment.resolved ? "Reopen" : "Resolve"}
            onClick={onToggleResolved}
            className={comment.resolved ? "text-success" : "hover:text-success"}
          >
            <Check className="size-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

function CommenterAvatar({
  name,
  tone,
  className = "",
}: {
  name: string;
  tone: Commenter;
  className?: string;
}) {
  const toneVar = COMMENTER_TONE[tone];
  return (
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${className}`}
      style={{
        color: `var(--${toneVar})`,
        background: `color-mix(in srgb, var(--${toneVar}) 25%, transparent)`,
      }}
      aria-hidden
    >
      {name[0]}
    </span>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-3.5" strokeWidth={2} stroke="currentColor">
      <path d="M22 2 11 13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
