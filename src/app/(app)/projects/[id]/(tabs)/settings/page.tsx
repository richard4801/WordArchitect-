"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { ApiError } from "@/lib/api-client";
import {
  type BookLinkRow,
  createBookLink,
  deleteBookLink,
  useBookLinks,
  useBookLinksLoadStatus,
} from "@/lib/book-links-store";
import { useProject, useProjects } from "@/lib/project-store";

type LinkType = "sequel_of" | "translation_of";

const LINK_TYPES: { type: LinkType; label: string; description: string }[] = [
  { type: "sequel_of", label: "Sequel of", description: "This project continues another one you've already written." },
  { type: "translation_of", label: "Translation of", description: "This project is a translation of another one." },
];

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);

  if (!project) return null;

  return (
    <div className="space-y-6">
      <BookLinksSection bookId={project.id} />
    </div>
  );
}

function relationshipLabel(l: BookLinkRow): string {
  if (l.link_type === "sequel_of") return "sequel";
  if (l.link_type === "translation_of") return `translation${l.language ? ` (${l.language})` : ""}`;
  return l.link_type;
}

function BookLinksSection({ bookId }: { bookId: string }) {
  const { outgoing, incoming } = useBookLinks(bookId);
  const loadStatus = useBookLinksLoadStatus(bookId);
  const projects = useProjects();
  const [editingType, setEditingType] = useState<LinkType | null>(null);
  const [removing, setRemoving] = useState<BookLinkRow | null>(null);

  function titleFor(id: string): string {
    return projects.find((p) => p.id === id)?.title ?? "Unknown project";
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-lg text-ink">Book Links</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Connect this project to another one you&rsquo;ve written — a sequel, or a translation.
      </p>
      {loadStatus === "loading" && <p className="mt-4 text-xs text-ink-faint">Loading…</p>}
      {loadStatus === "error" && (
        <p className="mt-4 text-xs text-danger">Couldn&rsquo;t load this project&rsquo;s book links.</p>
      )}

      <div className="mt-4 space-y-3">
        {LINK_TYPES.map(({ type, label, description }) => {
          const existing = outgoing.find((l) => l.link_type === type);
          return (
            <div key={type} className="card-2 flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{label}</p>
                {existing ? (
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {titleFor(existing.to_book_id)}
                    {existing.language && <span className="text-ink-faint"> · {existing.language}</span>}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-ink-faint">{description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingType(type)}
                  className="rounded-lg border border-line-strong px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
                >
                  {existing ? "Change" : "Add"}
                </button>
                {existing && (
                  <button
                    type="button"
                    aria-label={`Remove ${label} link`}
                    onClick={() => setRemoving(existing)}
                    className="grid size-7 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {incoming.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="label-caps text-[0.65rem]">Linked from other projects</p>
          <ul className="mt-2 space-y-1.5">
            {incoming.map((l) => (
              <li key={l.id} className="text-xs text-ink-muted">
                <span className="text-ink">{titleFor(l.from_book_id)}</span> is a {relationshipLabel(l)} of this project.
              </li>
            ))}
          </ul>
        </div>
      )}

      {editingType && (
        <LinkBookModal
          bookId={bookId}
          linkType={editingType}
          existing={outgoing.find((l) => l.link_type === editingType) ?? null}
          onClose={() => setEditingType(null)}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Remove this link?"
          description={`This project will no longer be linked to "${titleFor(removing.to_book_id)}".`}
          confirmLabel="Remove"
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            await deleteBookLink(removing.id);
            setRemoving(null);
          }}
        />
      )}
    </section>
  );
}

function LinkBookModal({
  bookId,
  linkType,
  existing,
  onClose,
}: {
  bookId: string;
  linkType: LinkType;
  existing: BookLinkRow | null;
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

  const [selectedId, setSelectedId] = useState(existing?.to_book_id ?? otherProjects[0]?.id ?? "");
  const [language, setLanguage] = useState(existing?.language ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedId) return;
    if (linkType === "translation_of" && !language.trim()) {
      setError('Enter a language code, e.g. "es".');
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
        language: linkType === "translation_of" ? language.trim() : null,
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
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. es"
                className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
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
