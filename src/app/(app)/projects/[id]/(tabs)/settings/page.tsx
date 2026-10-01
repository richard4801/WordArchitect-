"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LinkBookModal } from "@/components/link-book-modal";
import { LINK_TYPES, languageLabel, relationshipLabel, type LinkType } from "@/lib/book-links-data";
import { type BookLinkRow, deleteBookLink, useBookLinks, useBookLinksLoadStatus } from "@/lib/book-links-store";
import { useProject, useProjects } from "@/lib/project-store";

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
                    {existing.language && <span className="text-ink-faint"> · {languageLabel(existing.language)}</span>}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-ink-faint">{description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {/* Quick-create: skip the "pick from existing projects" step
                    entirely when the other book doesn't exist yet — lands on
                    /projects/new, which shows this same link popup right
                    after creation instead of requiring a separate trip back
                    here afterward. Only offered when nothing's linked yet;
                    "Change" already covers retargeting an existing link. */}
                {!existing && (
                  <Link
                    href={`/projects/new?linkFrom=${bookId}&linkType=${type}`}
                    className="hidden text-xs text-ink-faint underline-offset-2 transition-colors hover:text-ink hover:underline sm:inline"
                  >
                    New project
                  </Link>
                )}
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
