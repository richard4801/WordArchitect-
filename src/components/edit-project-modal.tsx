"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { DropdownSelect, MultiSelectDropdown } from "@/components/ui/dropdown-select";
import { PRIMARY_GENRES, SUBGENRE_OPTIONS, POV_OPTIONS, TENSE_OPTIONS } from "@/app/(app)/projects/new/page";
import { updateProject } from "@/lib/project-store";
import type { Project } from "@/lib/projects-data";

/**
 * "Edit Details" — reuses the New Project form's own genre/POV/tense
 * vocabulary (PRIMARY_GENRES etc., exported from projects/new/page.tsx)
 * so editing offers the exact same choices as creation. Covers every
 * field the backend actually lets a PATCH touch (see updateProject() in
 * project-store.ts) — title, tagline, primary genre, subgenres, POV,
 * tense, target words.
 */
export function EditProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [title, setTitle] = useState(project.title);
  const [tagline, setTagline] = useState(project.logline === "A new story, waiting to be written." ? "" : project.logline);
  const [genre, setGenre] = useState(project.genre.split(" · ")[0] ?? "");
  const [subgenres, setSubgenres] = useState<string[]>(project.genre.split(" · ").slice(1));
  const [pov, setPov] = useState(project.pov ?? "");
  const [tense, setTense] = useState(project.tense ?? "");
  const [targetWords, setTargetWords] = useState(String(project.target));
  const [titleError, setTitleError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSave() {
    const ok = title.trim().length > 0;
    setTitleError(!ok);
    if (!ok) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateProject(project.id, {
        title,
        tagline,
        genre,
        subgenres,
        pov: pov || undefined,
        tense: tense || undefined,
        targetWords: targetWords ? Number(targetWords) : undefined,
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update project.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center bg-canvas/70 p-4 backdrop-blur-sm">
      <div className="card max-h-[90vh] w-full max-w-md overflow-y-auto scroll-slim p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Edit Project</h2>
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
            className={`mt-1.5 w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none ${
              titleError ? "border-danger" : "border-line focus:border-line-strong"
            }`}
          />
        </div>

        <div className="mt-3">
          <label className="text-sm text-ink">Tagline</label>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A short tagline for your story"
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </div>

        <div className="mt-3">
          <label className="text-sm text-ink">Primary Genre</label>
          <DropdownSelect value={genre} onChange={setGenre} options={PRIMARY_GENRES} placeholder="Select primary genre" className="mt-1.5" />
        </div>

        <div className="mt-3">
          <label className="text-sm text-ink">Subgenres</label>
          <MultiSelectDropdown value={subgenres} onChange={setSubgenres} options={SUBGENRE_OPTIONS} placeholder="Select one or more subgenres" className="mt-1.5" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-ink">POV</label>
            <DropdownSelect value={pov} onChange={setPov} options={POV_OPTIONS} placeholder="Select POV" className="mt-1.5" />
          </div>
          <div>
            <label className="text-sm text-ink">Tense</label>
            <DropdownSelect value={tense} onChange={setTense} options={TENSE_OPTIONS} placeholder="Select tense" className="mt-1.5" />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-sm text-ink">Target Words</label>
          <input
            type="number"
            min={0}
            value={targetWords}
            onChange={(e) => setTargetWords(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
        </div>

        {submitError && <p className="mt-3 text-xs text-danger">{submitError}</p>}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm text-ink-muted transition-colors hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="size-3.5 rotate-45" />
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
