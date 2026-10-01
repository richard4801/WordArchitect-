"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { ApiError } from "@/lib/api-client";
import { LANGUAGE_OPTIONS, languageLabel, type LinkType } from "@/lib/book-links-data";
import { type BookLinkRow, createBookLink, deleteBookLink } from "@/lib/book-links-store";
import { useProjects } from "@/lib/project-store";

/**
 * Add/Change a book link (sequel_of/translation_of) — shared by the
 * Settings tab's Book Links card and the New Project flow's "this book
 * will be linked once created" popup (see `/projects/new`'s `linkFrom`/
 * `linkType` query params). `existing` drives Add vs. Change copy and
 * pre-fills the form; pass `null` for a plain Add (the New Project flow
 * never has an existing link to change).
 */
export function LinkBookModal({
  bookId,
  linkType,
  existing,
  defaultToBookId,
  onClose,
}: {
  bookId: string;
  linkType: LinkType;
  existing: BookLinkRow | null;
  /** Pre-select this project as the link target on a fresh Add (e.g. the
   * project this new book was created from) — ignored once `existing` is
   * set, since a Change always starts from the link's own current target. */
  defaultToBookId?: string;
  onClose: () => void;
}) {
  const projects = useProjects();
  const otherProjects = useMemo(() => projects.filter((p) => p.id !== bookId), [projects, bookId]);

  function labelFor(id: string): string {
    const p = otherProjects.find((x) => x.id === id);
    if (!p) return "";
    // Disambiguate same-titled projects ("Untitled Project" is a common one
    // early on) rather than risk linking to the wrong one — same convention
    // as the Planning Engine's own "Copy prompts from another project" picker.
    const dupes = otherProjects.filter((x) => x.title === p.title);
    return dupes.length > 1 ? `${p.title} (${p.id.slice(0, 8)})` : p.title;
  }

  const [selectedId, setSelectedId] = useState(existing?.to_book_id ?? defaultToBookId ?? otherProjects[0]?.id ?? "");
  const [language, setLanguage] = useState(existing?.language ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fold in whatever this link's own saved `language` already is, in case
  // it's a legacy free-text value from before this was a dropdown — same
  // "don't hide real data behind a fixed list" convention the Planning
  // Engine's own Model dropdown uses for `modelOptions`.
  const languageOptions = useMemo(() => {
    const codes = LANGUAGE_OPTIONS.map((l) => l.code);
    if (existing?.language && !codes.includes(existing.language)) codes.push(existing.language);
    return codes;
  }, [existing]);

  async function handleSubmit() {
    if (!selectedId) return;
    if (linkType === "translation_of" && !language) {
      setError("Select a language.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // No PATCH endpoint exists for book links — "change" is delete the
      // existing link, then create the new one, per the backend's own 409
      // error text ("delete the existing one first if you want to change
      // it").
      if (existing) await deleteBookLink(existing.id);
      await createBookLink({
        fromBookId: bookId,
        toBookId: selectedId,
        linkType,
        language: linkType === "translation_of" ? language : null,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? "That link already exists — try again to replace it."
          : err instanceof Error
            ? err.message
            : "Couldn't save this link.",
      );
      setSubmitting(false);
    }
  }

  if (typeof document === "undefined") return null;

  return (
    <ModalPortal>
      <h2 className="font-display text-lg text-ink">
        {existing ? "Change" : "Add"} {linkType === "sequel_of" ? "Sequel" : "Translation"} Link
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        {linkType === "sequel_of"
          ? "Pick the project this one continues."
          : "Pick the project this one is a translation of, and its language."}
      </p>

      {otherProjects.length === 0 ? (
        <p className="mt-4 text-sm text-ink-faint">You don&rsquo;t have any other projects to link to yet.</p>
      ) : (
        <>
          <div className="mt-4">
            <label className="text-sm text-ink">Project</label>
            <DropdownSelect
              value={labelFor(selectedId)}
              onChange={(label) => {
                const match = otherProjects.find((p) => labelFor(p.id) === label);
                if (match) setSelectedId(match.id);
              }}
              options={otherProjects.map((p) => labelFor(p.id))}
              placeholder="Select a project"
              className="mt-1.5"
            />
          </div>

          {linkType === "translation_of" && (
            <div className="mt-3">
              <label className="text-sm text-ink">Language</label>
              <DropdownSelect
                value={language ? languageLabel(language) : ""}
                onChange={(label) => {
                  const match = languageOptions.find((code) => languageLabel(code) === label);
                  if (match) setLanguage(match);
                }}
                options={languageOptions.map(languageLabel)}
                placeholder="Select a language"
                className="mt-1.5"
              />
            </div>
          )}

          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </>
      )}

      <div className="mt-5 flex items-center justify-end gap-3">
        <button type="button" onClick={onClose} disabled={submitting} className="text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-60">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selectedId}
          className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Save
        </button>
      </div>
    </ModalPortal>
  );
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  // z-30, not the z-[60] other one-off modals in this app use — this one
  // nests a DropdownSelect, whose own panel/close-overlay (both portaled
  // separately to document.body, see dropdown-select.tsx) render at
  // z-50/z-40. A z-60 backdrop would paint on top of both, silently
  // intercepting every click aimed at the open dropdown panel — reproduced
  // directly while building this. z-30 still sits above the sidebar (z-20)
  // and ordinary page content, but stays under the dropdown's own stack.
  return createPortal(
    <div className="fixed inset-0 z-30 grid place-items-center bg-canvas/70 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div className="card w-full max-w-sm p-5">{children}</div>
    </div>,
    document.body,
  );
}
