"use client";

import {
  Bell,
  Bold,
  Filter,
  FolderOpen,
  Image as ImageIcon,
  Italic,
  LayoutGrid,
  List,
  ListTree,
  Lightbulb,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { NoteCoverArt } from "@/components/ui/note-cover-art";
import { OptionsMenu } from "@/components/ui/options-menu";
import {
  folderCount,
  type Note,
  NOTE_CATEGORY_META,
  type NoteCategory,
  type NoteFolderKey,
  notesInFolder,
  pinnedNotes,
  recentNotes,
  sceneFor,
} from "@/lib/notes-data";
import { createNote, deleteNote, togglePinned, useNotes, useNotesError, useNotesLoadStatus } from "@/lib/notes-store";
import { useProject } from "@/lib/project-store";
import { ThemeToggle } from "@/components/theme-toggle";

/** Notes hub (matches resources/Notes.png). No breadcrumb in the mockup —
 * just three icon buttons top-right — so this page skips the shared
 * WorldTopBar/CharactersTopBar breadcrumb pattern the other workspaces use. */

const TOP_TABS = ["All Notes", "Pinned", "My Notes", "Shared"] as const;
type TopTab = (typeof TOP_TABS)[number];

const FOLDERS: { key: NoteFolderKey; label: string; Icon: typeof FolderOpen }[] = [
  { key: "all", label: "All Notes", Icon: FolderOpen },
  { key: "my-notes", label: "My Notes", Icon: User },
  { key: "research", label: "Research", Icon: Search },
  { key: "inspirations", label: "Inspirations", Icon: Lightbulb },
  { key: "ideas", label: "Ideas", Icon: ListTree },
  { key: "deleted", label: "Deleted", Icon: Trash2 },
];

const CATEGORY_OPTIONS = Object.keys(NOTE_CATEGORY_META) as NoteCategory[];

export default function NotesPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const notes = useNotes(project?.id);
  const notesLoadStatus = useNotesLoadStatus();
  const notesError = useNotesError();

  const [topTab, setTopTab] = useState<TopTab>("All Notes");
  const [folder, setFolder] = useState<NoteFolderKey>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "compact">("grid");
  const [showComposer, setShowComposer] = useState(false);
  const [quickDraft, setQuickDraft] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const base = useMemo(() => notesInFolder(notes, folder), [notes, folder]);
  const filtered = useMemo(() => {
    return base.filter((n) => {
      if (topTab === "Pinned" && !n.pinned) return false;
      if (topTab === "My Notes" && !n.mine) return false;
      if (topTab === "Shared" && n.mine) return false;
      if (query && !n.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [base, topTab, query]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => a.dateRank - b.dateRank), [filtered]);
  const pinned = useMemo(() => pinnedNotes(notes), [notes]);
  const recent = useMemo(() => recentNotes(notes), [notes]);

  async function submitQuickNote() {
    const text = quickDraft.trim();
    if (!text || !project) return;
    setQuickSubmitting(true);
    setQuickError(null);
    try {
      await createNote(project.id, { title: text.slice(0, 40), excerpt: text, category: "Inspiration" });
      setQuickDraft("");
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setQuickSubmitting(false);
    }
  }

  if (!project) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <p className="text-sm text-ink-muted">Project not found.</p>
      </div>
    );
  }

  if (notesLoadStatus === "error") {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-xl text-ink">Couldn&rsquo;t reach the server</p>
          <p className="mt-2 text-sm text-ink-muted">{notesError ?? "Something went wrong loading your notes."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-end gap-2 px-5 py-3 sm:px-6">
        <button
          type="button"
          aria-label="Search"
          className="btn-raised grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
        >
          <Search className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="btn-raised relative grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
        >
          <Bell className="size-4" />
          <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-gold text-[0.6rem] font-medium text-gold-contrast">
            3
          </span>
        </button>
        <ThemeToggle />
      </header>

      <div className="scroll-slim flex flex-1 flex-col overflow-y-auto px-6 py-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
              Notes
              <FolderOpen className="size-6 text-gold" />
            </h1>
            <p className="mt-1 text-sm text-ink-muted">Capture ideas, research, and anything that inspires your story.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="btn-raised flex min-w-[220px] flex-1 items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-ink-faint">
            <Search className="size-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes..."
              className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <kbd className="label-caps shrink-0 rounded-md border border-line-strong px-1.5 py-0.5 text-[0.6rem] text-ink-faint">
              ⌘K
            </kbd>
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <Filter className="size-3.5" />
            Filter
          </button>
          <DropdownSelect
            value="Sort: Newest"
            onChange={() => {}}
            options={["Sort: Newest"]}
            placeholder="Sort: Newest"
            triggerClassName="w-auto"
            className="w-40"
          />
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            New Note
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="card-2 flex flex-wrap items-center gap-1 p-1 text-sm">
            {TOP_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopTab(t)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                  topTab === t ? "bg-gold text-gold-contrast" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t === "Pinned" && <Star className="size-3.5" />}
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="card-2 flex items-center gap-1 p-1">
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
                aria-label="List view"
                className={`grid size-8 place-items-center rounded-lg transition-colors ${
                  view === "compact" ? "bg-gold text-gold-contrast" : "text-ink-muted hover:text-ink"
                }`}
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-ink-faint">{sorted.length} notes</p>

        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
          <div
            className={`grid gap-4 ${
              view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
            }`}
          >
            {sorted.map((note) => (
              <NoteCard key={note.id} note={note} compact={view === "compact"} onTogglePin={() => void togglePinned(note.id)} />
            ))}
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong p-6 text-center transition-colors hover:border-gold"
            >
              <span className="grid size-10 place-items-center rounded-full border border-gold/40 text-gold">
                <Pencil className="size-5" />
              </span>
              <span className="font-display text-lg text-gold">New Note</span>
              <span className="text-sm text-ink-muted">Capture a new idea, thought, or inspiration.</span>
              <span className="mt-2 flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-contrast">
                <Plus className="size-3.5" />
                New Note
              </span>
            </button>
            {sorted.length === 0 && (
              <div className="col-span-full grid place-items-center rounded-xl border border-dashed border-line-strong py-16 text-center">
                <p className="text-sm text-ink-muted">No notes match.</p>
              </div>
            )}
          </div>

          <aside className="space-y-5 pb-8">
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">Note Folders</h2>
                <Plus className="size-4 text-gold" />
              </div>
              <ul className="mt-3 space-y-1">
                {FOLDERS.map((f) => (
                  <li key={f.key}>
                    <button
                      type="button"
                      onClick={() => setFolder(f.key)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        folder === f.key ? "bg-gold/15 text-gold" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      <f.Icon className="size-4 shrink-0" />
                      <span className="flex-1 text-left">{f.label}</span>
                      <span className="text-xs text-ink-faint">{folderCount(notes, f.key)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <h2 className="flex items-center gap-1.5 font-display text-lg text-ink">
                <Star className="size-4 text-gold" />
                Pinned Notes
              </h2>
              <ul className="mt-3 space-y-3">
                {pinned.map((n) => (
                  <li key={n.id} className="flex items-start gap-2.5">
                    <span className="size-10 shrink-0 overflow-hidden rounded-lg border border-line-strong">
                      <NoteCoverArt seed={n.id} scene={sceneFor(n)} className="size-full" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{n.title}</p>
                      <p className="text-xs text-ink-faint">{n.date}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{n.excerpt}</p>
                    </div>
                  </li>
                ))}
                {pinned.length === 0 && <p className="text-sm text-ink-faint">No pinned notes yet.</p>}
              </ul>
              <button type="button" onClick={() => setTopTab("Pinned")} className="mt-3 text-sm text-gold hover:opacity-80">
                View all pinned →
              </button>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg text-ink">Recent Notes</h2>
              <ul className="mt-3 space-y-3">
                {recent.map((n) => (
                  <li key={n.id} className="flex items-start gap-2.5">
                    <span className="size-10 shrink-0 overflow-hidden rounded-lg border border-line-strong">
                      <NoteCoverArt seed={n.id} scene={sceneFor(n)} className="size-full" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{n.title}</p>
                      <p className="text-xs text-ink-faint">{n.date}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setTopTab("All Notes")} className="mt-3 text-sm text-gold hover:opacity-80">
                View all recent →
              </button>
            </section>

            <section className="card p-5">
              <h2 className="flex items-center gap-1.5 font-display text-lg text-ink">
                <Pencil className="size-4 text-gold" />
                Quick Notes
              </h2>
              <textarea
                value={quickDraft}
                onChange={(e) => setQuickDraft(e.target.value)}
                placeholder="Jot down a quick thought..."
                rows={4}
                className="mt-3 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
              />
              <div className="mt-2 flex items-center gap-1 text-ink-faint">
                <button type="button" tabIndex={-1} className="grid size-7 place-items-center rounded-md hover:bg-surface-2 hover:text-ink">
                  <Bold className="size-3.5" />
                </button>
                <button type="button" tabIndex={-1} className="grid size-7 place-items-center rounded-md hover:bg-surface-2 hover:text-ink">
                  <Italic className="size-3.5" />
                </button>
                <button type="button" tabIndex={-1} className="grid size-7 place-items-center rounded-md hover:bg-surface-2 hover:text-ink">
                  <List className="size-3.5" />
                </button>
                <button type="button" tabIndex={-1} className="ml-auto grid size-7 place-items-center rounded-md hover:bg-surface-2 hover:text-ink">
                  <ImageIcon className="size-3.5" />
                </button>
              </div>
              {quickError && <p className="mt-2 text-xs text-danger">{quickError}</p>}
              <button
                type="button"
                onClick={submitQuickNote}
                disabled={quickSubmitting}
                className="mt-3 w-full rounded-xl bg-gold py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {quickSubmitting ? "Saving…" : "Save Note"}
              </button>
            </section>
          </aside>
        </div>
      </div>

      {showComposer && <NewNoteModal bookId={project.id} onClose={() => setShowComposer(false)} />}
    </div>
  );
}

function NoteCard({ note, compact, onTogglePin }: { note: Note; compact: boolean; onTogglePin: () => void }) {
  const meta = NOTE_CATEGORY_META[note.category];
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <div className={`card-2 overflow-hidden ${compact ? "flex items-center gap-4 p-3" : ""}`}>
      <div className={`relative shrink-0 overflow-hidden ${compact ? "size-20 rounded-lg" : "aspect-[4/3]"}`}>
        <NoteCoverArt seed={note.id} scene={sceneFor(note)} className="size-full" />
        {note.pinned && (
          <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-canvas/60 text-gold backdrop-blur">
            <Star className="size-4 fill-gold" />
          </span>
        )}
        {!compact && (
          <OptionsMenu
            ariaLabel="More options"
            buttonClassName="absolute right-2 top-11 grid size-7 place-items-center rounded-full bg-canvas/60 text-ink-muted backdrop-blur transition-colors hover:text-ink"
            items={[
              { label: "Delete Note", Icon: Trash2, danger: true, onClick: () => setConfirmingDelete(true) },
            ]}
          />
        )}
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this note?"
          description={`"${note.title}" will be permanently deleted. This can't be undone.`}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            await deleteNote(note.id);
            setConfirmingDelete(false);
          }}
        />
      )}
      <div className={compact ? "min-w-0 flex-1" : "p-4"}>
        <div className="flex items-center justify-between gap-2">
          <span
            className="label-caps rounded-md border px-2 py-0.5 text-[0.6rem]"
            style={{ color: meta.color, borderColor: `color-mix(in srgb, ${meta.color} 45%, transparent)`, background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}
          >
            {note.category}
          </span>
          <button type="button" onClick={onTogglePin} aria-label={note.pinned ? "Unpin note" : "Pin note"}>
            <Star className={`size-4 transition-colors ${note.pinned ? "fill-gold text-gold" : "text-ink-faint hover:text-gold"}`} />
          </button>
        </div>
        <h3 className="mt-2.5 truncate font-display text-lg text-ink">{note.title}</h3>
        <p className={`mt-1 text-sm leading-relaxed text-ink-muted ${compact ? "line-clamp-1" : "line-clamp-3"}`}>{note.excerpt}</p>
        <div className="mt-3 flex items-center justify-between text-ink-faint">
          <span className="text-xs">{note.date}</span>
          <span className="flex items-center gap-1 text-xs">
            <MessageSquare className="size-3.5" />
            {note.comments}
          </span>
        </div>
      </div>
    </div>
  );
}

function NewNoteModal({ bookId, onClose }: { bookId: string; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NoteCategory>("Inspiration");
  const [body, setBody] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCreate() {
    const ok = title.trim().length > 0;
    setTitleError(!ok);
    if (!ok) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createNote(bookId, { title, excerpt: body, category });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create note.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-canvas/70 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">New Note</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-faint hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4">
          <label className="text-sm text-ink">
            Title <span className="text-danger">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleError(false);
            }}
            placeholder="e.g. Council Meeting Notes"
            className={`mt-1.5 w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
              titleError ? "border-danger" : "border-line focus:border-line-strong"
            }`}
          />
        </div>

        <div className="mt-3">
          <label className="text-sm text-ink">Category</label>
          <DropdownSelect
            value={category}
            onChange={(v) => setCategory(v as NoteCategory)}
            options={CATEGORY_OPTIONS}
            placeholder="Select category"
            className="mt-1.5"
          />
        </div>

        <div className="mt-3">
          <label className="text-sm text-ink">Content</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your note..."
            rows={4}
            className="mt-1.5 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </div>

        {submitError && <p className="mt-3 text-xs text-danger">{submitError}</p>}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm text-ink-muted transition-colors hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="size-3.5" />
            {submitting ? "Creating…" : "Create Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
