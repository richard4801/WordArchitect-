"use client";

import {
  Ban,
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
import { createPortal } from "react-dom";
import {
  ACTIVE_COLLABORATORS,
  CHAPTER_18_COMMENTS,
  type ChapterParagraph,
  COMMENTER_TONE,
  type CommentThread,
  type Commenter,
  findChapter,
  type ManuscriptChapter,
  type ManuscriptPart,
} from "@/lib/manuscript-data";
import {
  createChapter,
  saveChapterBody,
  type SaveStatus,
  useChapterBody,
  useChapterSaveStatus,
  useManuscript,
} from "@/lib/manuscript-store";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditWritingGoalModal } from "@/components/edit-writing-goal-modal";
import { banTerm, unbanTerm, useBannedTerms, useBannedTermsLoadStatus } from "@/lib/banned-terms-store";
import { logActivity } from "@/lib/activity-log-store";
import {
  recordChapterWordCount,
  seedChapterBaseline,
  useTodaysWordsWritten,
  useWritingStreak,
} from "@/lib/daily-progress-store";
import { useProject } from "@/lib/project-store";
import { setFocusModeActive } from "@/lib/ui-store";
import { useWritingGoals } from "@/lib/writing-goal-store";

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
  const manuscript = useManuscript(project?.id);
  const saveStatus = useChapterSaveStatus();

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusModeKind | null>(null);
  const [showFocusPicker, setShowFocusPicker] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("Comments");
  const [stats, setStats] = useState({ words: 0, characters: 0 });
  const [zoomPercent, setZoomPercent] = useState(100);
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [showBannedWordsPanel, setShowBannedWordsPanel] = useState(false);

  const editableRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const bannedTerms = useBannedTerms(project?.id);

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

  // ---------------------------------------------------------------------
  // Ban-this-selection — highlight any word/phrase/sentence in the prose
  // and ban it for this book right from the editor, no separate settings
  // panel required. Every future AI generation for this book enforces
  // every banned term server-side automatically once it exists — nothing
  // else to wire up here beyond the POST itself.
  // ---------------------------------------------------------------------

  const [selectionMenu, setSelectionMenu] = useState<{ text: string; top: number; left: number } | null>(null);
  const [banStatus, setBanStatus] = useState<"idle" | "banning" | "banned" | "error">("idle");
  const [banErrorMessage, setBanErrorMessage] = useState<string | null>(null);
  const [pendingLongBan, setPendingLongBan] = useState<string | null>(null);
  const selectionMenuRef = useRef<HTMLDivElement>(null);

  function updateSelectionMenu() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !editableRef.current?.contains(sel.anchorNode)) {
      setSelectionMenu(null);
      return;
    }
    const text = sel.toString();
    if (!text.trim()) {
      setSelectionMenu(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setSelectionMenu(null);
      return;
    }
    setBanStatus("idle");
    setBanErrorMessage(null);
    setSelectionMenu({ text, top: rect.top, left: rect.left + rect.width / 2 });
  }

  // Tracks the live selection via the browser's own `selectionchange`
  // event, not onMouseUp/onKeyUp — those fire *before* the browser has
  // necessarily finished collapsing/updating the selection for a given
  // click (confirmed: a plain click landing where a large selection was
  // already active could still read that old, non-collapsed selection at
  // mouseup time, reopening the bubble a beat after it should have
  // closed). `selectionchange` only ever fires once the selection has
  // actually settled, which is what onSelect (savedRangeRef bookkeeping
  // for the formatting toolbar) still uses onMouseUp/onKeyUp for — that's
  // a different, lower-stakes concern than what's shown in the UI here.
  useEffect(() => {
    function onSelectionChange() {
      updateSelectionMenu();
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  // Closes the bubble on a click outside both it and the editor — clicks
  // *inside* the editor already recompute it via selectionchange above,
  // and the bubble's own buttons need to survive their own click without
  // this closing it out from under them first. Suspended entirely while the
  // long-selection confirm dialog is open: that dialog is a separate
  // portaled component this effect's own click target check can't see,
  // so without this guard, clicking its "Ban It"/"Cancel" button (a click
  // outside both the bubble and the editor) would close the bubble the
  // instant it's clicked — banning still succeeds either way, but the
  // "Banned" feedback would never get a bubble left to show up in.
  useEffect(() => {
    if (!selectionMenu || pendingLongBan) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (selectionMenuRef.current?.contains(target)) return;
      if (editableRef.current?.contains(target)) return;
      setSelectionMenu(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectionMenu(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectionMenu, pendingLongBan]);

  async function performBan(term: string) {
    if (!project) return;
    setBanStatus("banning");
    setBanErrorMessage(null);
    try {
      await banTerm(project.id, term);
      setBanStatus("banned");
      const preview = term.trim().length > 40 ? `${term.trim().slice(0, 40)}…` : term.trim();
      logActivity("banned", `Banned "${preview}"`);
      window.setTimeout(() => {
        setSelectionMenu(null);
        setBanStatus("idle");
      }, 1100);
    } catch (err) {
      setBanStatus("error");
      setBanErrorMessage(err instanceof Error ? err.message : "Couldn't ban this term. Try again.");
    }
  }

  // A full sentence (or more) is an unusual, likely-accidental thing to
  // ban outright — everything technically still works (the backend bans
  // the exact string either way), but a quick confirmation catches a
  // misclick before it silently changes how every future generation reads.
  function handleBanClick() {
    if (!selectionMenu) return;
    const term = selectionMenu.text;
    const wordCount = term.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 8) {
      setPendingLongBan(term);
    } else {
      void performBan(term);
    }
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
    return manuscript[0]?.chapters[0];
  }, [manuscript, selectedChapterId]);

  const { row: bodyRow, status: bodyLoadStatus } = useChapterBody(activeChapter?.id);

  const body = useMemo(() => {
    if (!activeChapter || !bodyRow) return null;
    return {
      heading: bodyRow.heading?.trim() || `CHAPTER ${bodyRow.number}`,
      title: bodyRow.title?.trim() || activeChapter.title,
      paragraphs: bodyRow.paragraphs,
    };
  }, [activeChapter, bodyRow]);

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

  // Seed this chapter's word-count baseline the moment its body loads —
  // before any edits happen — so the very first autosave afterward credits
  // only the words actually typed in this session, not the chapter's whole
  // pre-existing content (see daily-progress-store.ts's doc comment).
  useEffect(() => {
    if (activeChapter && body) seedChapterBaseline(activeChapter.id, bodyBaseline.words);
  }, [activeChapter, body, bodyBaseline]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reads the editor's actual DOM paragraphs back into the structured shape
  // the backend stores — a best-effort round-trip (see manuscript-store.ts's
  // doc comment): a paragraph's plain text and its emphasis/break/commenter
  // markers (carried as data-* attributes at render time) survive an edit,
  // but rich inline formatting (bold/italic/links/etc. applied via
  // execCommand) does not, since the backend's ChapterParagraph has no HTML
  // field to hold it.
  function serializeParagraphs(): ChapterParagraph[] {
    const root = editableRef.current;
    if (!root) return [];
    return Array.from(root.children).map((child) => {
      const el = child as HTMLElement;
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[data-commenter-tag="true"]').forEach((tag) => tag.remove());
      const id = el.dataset.paragraphId || crypto.randomUUID();
      const paragraph: ChapterParagraph = { id, text: clone.textContent ?? "" };
      if (el.dataset.break === "true") paragraph.break = true;
      if (el.dataset.emphasis === "true") paragraph.emphasis = true;
      if (el.dataset.commenter) paragraph.commenter = el.dataset.commenter as Commenter;
      return paragraph;
    });
  }

  // Persist a chapter body and, in the same beat, credit the daily-progress
  // tracker with whatever positive word delta this save represents — the
  // single choke point every autosave path (debounced + flushed) goes
  // through, so the Daily Goal widget and Dashboard's Today's Progress can
  // never drift out of sync with what actually got saved.
  function persistChapter(chapterId: string, paragraphs: ChapterParagraph[]) {
    void saveChapterBody(chapterId, paragraphs);
    const words = wordsInParagraphs(paragraphs);
    const delta = recordChapterWordCount(chapterId, words);
    if (delta > 0 && project) {
      logActivity("wrote", `Wrote ${delta.toLocaleString()} word${delta === 1 ? "" : "s"} in "${project.title}"`);
    }
  }

  function scheduleSave() {
    if (!activeChapter) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const chapterId = activeChapter.id;
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      persistChapter(chapterId, serializeParagraphs());
    }, 1200);
  }

  // Flush any pending debounced save immediately, reading the DOM that's
  // live *right now* — this must run synchronously before anything that
  // changes `activeChapter` (switching chapters remounts EditorBody via its
  // `key`, which repoints `editableRef` at the *new* chapter's empty DOM
  // before any effect cleanup could fire, so an effect-cleanup-based flush
  // would silently save the wrong chapter's content under the old id).
  function flushPendingSave() {
    if (!saveTimeoutRef.current || !activeChapter) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = null;
    persistChapter(activeChapter.id, serializeParagraphs());
  }

  // Belt-and-suspenders: flush on genuine unmount too (navigating away from
  // the editor entirely) — safe here since, unlike a chapter switch, the
  // DOM hasn't been torn down yet when this cleanup runs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => flushPendingSave(), []);

  function selectChapter(chapterId: string) {
    flushPendingSave();
    setSelectedChapterId(chapterId);
    setSelectedSceneId(null);
  }

  async function handleCreateChapter() {
    if (!project) return;
    flushPendingSave();
    setCreatingChapter(true);
    try {
      const newChapter = await createChapter(project.id);
      setSelectedChapterId(newChapter.id);
      setSelectedSceneId(null);
    } finally {
      setCreatingChapter(false);
    }
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

  // Normal and Typewriter both hide the side panels but keep the toolbar
  // and status bar; Zen and Typewriter × Zen strip those too, leaving just
  // the page. Typewriter and Typewriter × Zen both get caret-centering.
  const hidePanels = focusMode !== null;
  const hideChrome = focusMode === "zen" || focusMode === "typewriterZen";
  const typewriter = focusMode === "typewriter" || focusMode === "typewriterZen";
  const hasChapters = manuscript.length > 0;

  return (
    <div className="flex h-dvh min-w-0">
      {!hidePanels && (
        <ManuscriptPanel
          manuscript={manuscript}
          activeChapterId={activeChapter?.id ?? null}
          activeSceneId={selectedSceneId}
          onSelectChapter={selectChapter}
          onSelectScene={setSelectedSceneId}
          onAddChapter={handleCreateChapter}
          addingChapter={creatingChapter}
        />
      )}

      <div className="@container relative flex min-w-0 flex-1 flex-col border-r border-line">
        {!hasChapters ? (
          <EmptyManuscriptState onCreate={handleCreateChapter} creating={creatingChapter} />
        ) : !activeChapter || !body ? (
          <>
            {!hideChrome && (
              <TopBar
                project={project}
                chapterTitle={activeChapter ? `Chapter ${activeChapter.number} – ${activeChapter.title}` : "Loading…"}
                onOpenPanel={(tab) => {
                  setFocusMode(null);
                  setPanelTab(tab);
                }}
                makeRoomForExitButton={hidePanels}
                saveStatus={saveStatus}
                bannedCount={bannedTerms.length}
                onOpenBannedWords={() => setShowBannedWordsPanel(true)}
              />
            )}
            <div className="grid flex-1 place-items-center">
              <p className="text-sm text-ink-muted">
                {bodyLoadStatus === "error" ? "Couldn't load this chapter." : "Loading chapter…"}
              </p>
            </div>
          </>
        ) : (
          <>
            {!hideChrome && (
              <TopBar
                project={project}
                chapterTitle={`Chapter ${activeChapter.number} – ${body.title}`}
                onOpenPanel={(tab) => {
                  setFocusMode(null);
                  setPanelTab(tab);
                }}
                makeRoomForExitButton={hidePanels}
                saveStatus={saveStatus}
                bannedCount={bannedTerms.length}
                onOpenBannedWords={() => setShowBannedWordsPanel(true)}
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
              onContentChange={scheduleSave}
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
          </>
        )}

        {hidePanels && !hideChrome && hasChapters && (
          <FocusModeTabStrip
            onSelect={(tab) => {
              setPanelTab(tab);
              setFocusMode(null);
            }}
          />
        )}
      </div>

      {!hidePanels && hasChapters && <CommentsPanel tab={panelTab} onTabChange={setPanelTab} />}

      {hidePanels && <FocusExitButton onClick={exitFocusMode} />}
      {showFocusPicker && (
        <FocusModePickerModal onSelect={activateFocusMode} onClose={() => setShowFocusPicker(false)} />
      )}

      {selectionMenu && (
        <SelectionBubbleMenu
          menuRef={selectionMenuRef}
          top={selectionMenu.top}
          left={selectionMenu.left}
          status={banStatus}
          errorMessage={banErrorMessage}
          onBan={handleBanClick}
        />
      )}
      {pendingLongBan && (
        <ConfirmDialog
          title="Ban this whole selection?"
          description={`"${
            pendingLongBan.trim().length > 200 ? `${pendingLongBan.trim().slice(0, 200)}…` : pendingLongBan.trim()
          }" will be banned exactly as selected. This is unusual for a selection this long — double-check it wasn't a misclick.`}
          confirmLabel="Ban It"
          onConfirm={() => {
            const term = pendingLongBan;
            setPendingLongBan(null);
            void performBan(term);
          }}
          onCancel={() => setPendingLongBan(null)}
        />
      )}
      {showBannedWordsPanel && (
        <BannedWordsPanel bookId={project.id} onClose={() => setShowBannedWordsPanel(false)} />
      )}
    </div>
  );
}

/** Shown in the editor pane when a project genuinely has zero chapters yet — a real, working action, not a dead end. */
function EmptyManuscriptState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-display text-2xl text-ink">Start your manuscript</p>
      <p className="max-w-sm text-sm text-ink-muted">
        This project doesn&rsquo;t have any chapters yet. Create your first one to start writing.
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={creating}
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Plus className="size-4" />
        {creating ? "Creating…" : "Create First Chapter"}
      </button>
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
  onAddChapter,
  addingChapter,
}: {
  manuscript: ManuscriptPart[];
  activeChapterId: string | null;
  activeSceneId: string | null;
  onSelectChapter: (id: string) => void;
  onSelectScene: (id: string) => void;
  onAddChapter: () => void;
  addingChapter: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(manuscript.map((p) => p.id).concat(activeChapterId ?? [])),
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

  // Same source the Dashboard's Today's Progress ring reads from — see
  // daily-progress-store.ts — so the two never show different numbers for
  // the same day's writing.
  const { dailyTarget } = useWritingGoals();
  const current = useTodaysWordsWritten();
  const streak = useWritingStreak();
  const dailyGoal = { current, target: dailyTarget, streak };
  const percent = dailyGoal.target > 0 ? Math.round((dailyGoal.current / dailyGoal.target) * 100) : 0;
  const [editingGoal, setEditingGoal] = useState(false);

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
            onClick={onAddChapter}
            disabled={addingChapter}
            className="grid size-7 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
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
        {manuscript.length === 0 && (
          <p className="px-2 py-3 text-xs text-ink-faint">No chapters yet.</p>
        )}
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
        <div
          role="button"
          tabIndex={0}
          onClick={() => setEditingGoal(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setEditingGoal(true);
          }}
          className="card-2 w-full cursor-pointer p-4 text-left transition-colors hover:border-line-strong"
        >
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

      {editingGoal && <EditWritingGoalModal onClose={() => setEditingGoal(false)} />}
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
  saveStatus,
  bannedCount = 0,
  onOpenBannedWords,
}: {
  project: { id: string; title: string };
  chapterTitle: string;
  onOpenPanel: (tab: PanelTab) => void;
  makeRoomForExitButton?: boolean;
  saveStatus?: SaveStatus;
  bannedCount?: number;
  onOpenBannedWords?: () => void;
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

      <span
        className={`hidden shrink-0 items-center gap-1.5 text-xs @[600px]:flex ${
          saveStatus === "error" ? "text-danger" : "text-success"
        }`}
      >
        <CircleCheck className="size-3.5" />
        {saveStatus === "saving"
          ? "Saving…"
          : saveStatus === "error"
            ? "Couldn't save"
            : "All changes saved"}
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
        <button
          type="button"
          aria-label="Banned words"
          title="Banned words"
          onClick={onOpenBannedWords}
          className="relative grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Ban className="size-4" />
          {bannedCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-danger text-[0.55rem] font-medium text-white">
              {bannedCount > 9 ? "9+" : bannedCount}
            </span>
          )}
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

/**
 * Floating "Ban this" action that appears above any real (non-collapsed,
 * non-whitespace) text selection inside the chapter body — the whole
 * point of the feature: ban a word/phrase/sentence right where you
 * highlighted it, no separate settings panel required. Positioned with
 * `position: fixed` off a measured selection rect, portaled to `<body>`
 * the same way SlashCommandMenu/ColorPickerButton already are in this
 * file, both to escape the toolbar's own `overflow-x-auto` clipping and
 * so its own clicks don't bubble into whatever's underneath.
 */
function SelectionBubbleMenu({
  menuRef,
  top,
  left,
  status,
  errorMessage,
  onBan,
}: {
  menuRef: React.RefObject<HTMLDivElement | null>;
  top: number;
  left: number;
  status: "idle" | "banning" | "banned" | "error";
  errorMessage: string | null;
  onBan: () => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 -translate-x-1/2 -translate-y-full"
      style={{ top: top - 8, left }}
    >
      <div className="card-2 flex items-center px-1.5 py-1.5">
        {status === "banned" ? (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-success">
            <Check className="size-3.5" />
            Banned
          </span>
        ) : status === "error" ? (
          <div className="flex items-center gap-2 px-1">
            <span className="max-w-[180px] truncate text-xs text-danger">
              {errorMessage ?? "Couldn't ban this term."}
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onBan}
              className="shrink-0 text-xs font-medium text-gold hover:opacity-80"
            >
              Retry
            </button>
          </div>
        ) : (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onBan}
            disabled={status === "banning"}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-60"
          >
            <Ban className="size-3.5 text-danger" />
            {status === "banning" ? "Banning…" : "Ban this"}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Lists every term banned for this book, with a way to unban each one —
 * the "full experience" side of banning, not just an add-only trigger.
 * Opened from the TopBar's Ban icon (badge shows the live count). Banning
 * has no other configuration surface: once a term exists here, every
 * future `POST /generate-prose` for this book enforces it automatically,
 * server-side — nothing else to wire up, which is also why the one UX
 * consequence worth surfacing (no live token streaming once a book has
 * any banned term — the backend needs to check/regenerate before it can
 * show you anything) is explained right here rather than in a separate
 * settings screen.
 */
function BannedWordsPanel({ bookId, onClose }: { bookId: string; onClose: () => void }) {
  const terms = useBannedTerms(bookId);
  const status = useBannedTermsLoadStatus();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleRemove(id: string) {
    setRemovingId(id);
    setRemoveError(null);
    try {
      await unbanTerm(id);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Couldn't unban this term.");
    } finally {
      setRemovingId(null);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div className="fixed right-5 top-16 z-50 w-80 max-w-[calc(100vw-2.5rem)]">
        <div className="card-2 max-h-[70vh] overflow-y-auto p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-lg text-ink">Banned Words</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid size-6 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            Banned for this project — every future AI generation avoids these automatically, nothing
            else to set up. One tradeoff worth knowing: once a project has at least one banned term,
            generation loses live streaming — the prose appears once it&rsquo;s done and checked, not
            typed out in real time.
          </p>

          {status === "loading" && terms.length === 0 && (
            <p className="mt-4 text-xs text-ink-faint">Loading…</p>
          )}
          {status === "error" && (
            <p className="mt-4 text-xs text-danger">Couldn&rsquo;t load banned words. Try reopening this panel.</p>
          )}
          {status !== "loading" && status !== "error" && terms.length === 0 && (
            <p className="mt-4 text-xs text-ink-faint">
              No banned words yet. Highlight text in the chapter and choose &ldquo;Ban this&rdquo; to add one.
            </p>
          )}
          {removeError && <p className="mt-3 text-xs text-danger">{removeError}</p>}

          {terms.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {terms.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-2/60 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-ink">{t.term}</span>
                  <button
                    type="button"
                    aria-label={`Unban "${t.term}"`}
                    onClick={() => handleRemove(t.id)}
                    disabled={removingId === t.id}
                    className="shrink-0 text-ink-faint transition-colors hover:text-danger disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body,
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

/**
 * Detects "/" typed as the very first character of an otherwise-empty
 * line — the trigger for the slash-command menu. Only the mechanism: the
 * menu it opens previews commands, it doesn't execute any (see
 * SlashCommandMenu's own comment for why).
 */
function getSlashTrigger(root: HTMLElement): { query: string; top: number; left: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const block = closestBlock(range.startContainer);
  if (!block || !root.contains(block)) return null;
  const text = block.textContent ?? "";
  if (!/^\/\S*$/.test(text)) return null;

  const caretRange = range.cloneRange();
  caretRange.collapse(true);
  let rect = caretRange.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0 && rect.top === 0) {
    rect = block.getBoundingClientRect();
  }
  return { query: text.slice(1), top: rect.bottom + 6, left: rect.left };
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
  onContentChange,
  typewriter = false,
  centered = false,
  zoomPercent = 100,
}: {
  body: { heading: string; title: string; paragraphs: ChapterParagraph[] };
  editableRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onStatsChange: (deltaWords: number, deltaCharacters: number) => void;
  onContentChange: () => void;
  typewriter?: boolean;
  centered?: boolean;
  zoomPercent?: number;
}) {
  const baseline = useRef({ words: 0, characters: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const [slashMenu, setSlashMenu] = useState<{ query: string; top: number; left: number } | null>(null);

  // Captured once at mount, deliberately never re-synced from `body` after
  // that — this contentEditable region is uncontrolled past its initial
  // render, same idea as an <input defaultValue>. Every successful autosave
  // echoes the server's saved paragraphs back into `body` (see
  // saveChapterBody in manuscript-store.ts), and without this, that echo
  // would re-render <EditorParagraph> with that snapshot's text on every
  // save — which, if the user kept typing between the save firing and its
  // response landing, is already stale relative to the live DOM. React
  // would then try to reconcile its believed text content against a DOM
  // the browser's native contentEditable typing had already restructured
  // out from under it, throwing "Failed to execute 'removeChild': the node
  // to be removed is not a child of this node" mid-keystroke — exactly the
  // "editor breaks while writing" crash this fixes. Safe because this
  // component remounts (fresh initial state) via its `key={activeChapter.id}`
  // whenever the open chapter actually changes, and nothing else in this
  // single-user editor ever mutates a chapter's content except this DOM.
  const [initialParagraphs] = useState(() => body.paragraphs);
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

  // Backspacing a paragraph fully empty and continuing to backspace at that
  // point makes the browser delete the block element itself, not just its
  // text — the *last* remaining `<p>` in a contentEditable region gets
  // removed entirely, leaving zero element children. Any further typing at
  // that point still has to land somewhere, so the browser inserts it as a
  // bare text node directly under the contentEditable root, with no `<p>`
  // wrapper at all. That's invisible to serializeParagraphs() (it only
  // reads `root.children`, which — unlike `childNodes` — skips text nodes
  // entirely), so the words the user just typed silently never made it
  // into what gets saved. Restoring the invariant "the editor always has
  // at least one <p>" the instant it's lost, before the next keystroke can
  // land as a stray node, is what closes that gap.
  function normalizeEditableRoot(root: HTMLElement) {
    if (root.children.length > 0) return;
    const p = document.createElement("p");
    p.dataset.paragraphId = crypto.randomUUID();
    p.className = "editor-placeholder min-h-[1.85em]";
    while (root.firstChild) p.appendChild(root.firstChild);
    root.appendChild(p);

    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function updateSlashMenu() {
    const root = editableRef.current;
    setSlashMenu(root ? getSlashTrigger(root) : null);
  }

  // Closes the menu on any click that lands outside both it and the editor
  // itself — clicks *inside* the editor are already handled by handleSelect
  // recomputing the trigger from the new caret position, so this only needs
  // to cover clicks elsewhere on the page (toolbar, sidebar, etc.).
  useEffect(() => {
    if (!slashMenu) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (slashMenuRef.current?.contains(target)) return;
      if (editableRef.current?.contains(target)) return;
      setSlashMenu(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [slashMenu, editableRef]);

  function handleSelect() {
    onSelect();
    centerCaret();
    updateSlashMenu();
  }

  function handleInput() {
    if (editableRef.current) normalizeEditableRoot(editableRef.current);
    const text = editableRef.current?.innerText ?? "";
    const current = countText(text);
    onStatsChange(current.words - baseline.current.words, current.characters - baseline.current.characters);
    onContentChange();
    centerCaret();
    updateSlashMenu();
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
          onKeyUp={(e) => {
            // Escape's own keyup would otherwise immediately undo keydown's
            // close below: updateSlashMenu() re-reads the (unchanged) "/…"
            // text still under the caret and reopens the menu it was just
            // told to dismiss. Every other key still needs this for
            // caret-centering/selection-tracking as usual.
            if (e.key !== "Escape") handleSelect();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && slashMenu) setSlashMenu(null);
          }}
          style={{ fontSize: `${(17 * zoomPercent) / 100}px` }}
          className="mt-8 font-display leading-[1.85] text-ink/90 focus:outline-none [&_p]:mb-5"
        >
          {initialParagraphs.map((p) => (
            <EditorParagraph key={p.id} paragraph={p} />
          ))}
        </div>
      </div>

      {slashMenu && (
        <SlashCommandMenu
          menuRef={slashMenuRef}
          query={slashMenu.query}
          top={slashMenu.top}
          left={slashMenu.left}
          onClose={() => setSlashMenu(null)}
        />
      )}
    </div>
  );
}

const SLASH_COMMAND_PREVIEW: { label: string; description: string; icon: typeof Type }[] = [
  { label: "Heading 1", description: "Big section heading", icon: Type },
  { label: "Heading 2", description: "Medium section heading", icon: Type },
  { label: "Bulleted list", description: "Simple bulleted list", icon: ListIcon },
  { label: "Numbered list", description: "List with numbering", icon: ListOrdered },
  { label: "Checklist", description: "Track tasks with checkboxes", icon: ListChecks },
  { label: "Image", description: "Embed an image", icon: ImageIcon },
  { label: "Table", description: "Insert a table", icon: Table2 },
  { label: "Scene break", description: "Mark a scene transition", icon: Minus },
];

/**
 * Slash-command menu shell — detects the "/" trigger (see getSlashTrigger)
 * and previews what's coming, but doesn't execute anything: deliberately
 * scoped to just the trigger + UI, no command wired to a real action.
 * Every row is inert (no onClick, muted styling, a "Soon" badge) so it
 * reads unmistakably as a preview, not a menu that's silently broken.
 */
function SlashCommandMenu({
  menuRef,
  query,
  top,
  left,
  onClose,
}: {
  menuRef: React.RefObject<HTMLDivElement | null>;
  query: string;
  top: number;
  left: number;
  onClose: () => void;
}) {
  const filtered = SLASH_COMMAND_PREVIEW.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={menuRef} className="fixed z-50 w-72" style={{ top, left }}>
      <div className="card-2 max-h-80 overflow-y-auto p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="label-caps text-[0.6rem]">Slash Commands</p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-5 place-items-center rounded text-ink-faint transition-colors hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-xs text-ink-faint">No matching commands.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5">
            {filtered.map((c) => (
              <li
                key={c.label}
                title="Coming soon"
                className="flex cursor-default items-center gap-2.5 rounded-lg px-2 py-1.5 opacity-60"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-2 text-ink-muted">
                  <c.icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{c.label}</span>
                  <span className="block truncate text-xs text-ink-faint">{c.description}</span>
                </span>
                <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[0.55rem] text-ink-faint">
                  Soon
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-1 border-t border-line px-2 pt-2 text-[0.65rem] text-ink-faint">
          Slash commands aren&rsquo;t wired up yet — this previews what&rsquo;s coming.
        </p>
      </div>
    </div>,
    document.body,
  );
}

function countText(text: string): { words: number; characters: number } {
  const trimmed = text.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    characters: text.replace(/\s/g, "").length,
  };
}

function wordsInParagraphs(paragraphs: ChapterParagraph[]): number {
  const text = paragraphs
    .filter((p) => !p.break)
    .map((p) => p.text)
    .join(" ");
  return countText(text).words;
}

// data-* attributes here aren't styling hooks — they're how
// `serializeParagraphs` (ChaptersPage) reconstructs each paragraph's
// emphasis/break/commenter metadata from the live contentEditable DOM when
// autosaving, since plain `textContent` alone can't distinguish them.
function EditorParagraph({ paragraph }: { paragraph: ChapterParagraph }) {
  if (paragraph.break) {
    return (
      <p data-paragraph-id={paragraph.id} data-break="true" className="my-6 text-center tracking-[0.5em] text-ink-faint">
        {paragraph.text}
      </p>
    );
  }

  const tone = paragraph.commenter ? COMMENTER_TONE[paragraph.commenter] : null;
  const textClass = paragraph.emphasis ? "text-gold" : "";

  if (!paragraph.commenter) {
    return (
      <p
        data-paragraph-id={paragraph.id}
        data-emphasis={paragraph.emphasis ? "true" : undefined}
        className={`editor-placeholder min-h-[1.85em] ${textClass}`}
      >
        {paragraph.text}
      </p>
    );
  }

  return (
    <p
      data-paragraph-id={paragraph.id}
      data-emphasis={paragraph.emphasis ? "true" : undefined}
      data-commenter={paragraph.commenter}
      className={`border-l-2 pl-4 ${textClass}`}
      style={{ borderColor: `var(--${tone})` }}
    >
      {paragraph.text}
      <CommenterTag name={paragraph.commenter!} className="ml-2 align-middle" />
    </p>
  );
}

function CommenterTag({ name, className = "" }: { name: Commenter; className?: string }) {
  const tone = COMMENTER_TONE[name];
  return (
    <span
      data-commenter-tag="true"
      contentEditable={false}
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
