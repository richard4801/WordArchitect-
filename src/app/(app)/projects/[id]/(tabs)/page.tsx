"use client";

import { ArrowRight, BookCopy, CheckCircle2, Circle, Globe2, PenLine, User, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CoverArt } from "@/components/ui/cover-art";
import { Ring } from "@/components/ui/ring";
import { languageLabel, relationshipLabel } from "@/lib/book-links-data";
import { useBookLinks } from "@/lib/book-links-store";
import { useChapterCount, useManuscript, useManuscriptWordCount } from "@/lib/manuscript-store";
import { useProject, useProjects } from "@/lib/project-store";
import { deriveRecentActivity, type ProjectActivityKind } from "@/lib/projects-data";

const ACTIVITY_ICON: Record<ProjectActivityKind, typeof PenLine> = {
  wrote: PenLine,
  character: User,
  world: Globe2,
  session: PenLine,
  note: PenLine,
};

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const manuscript = useManuscript(id);
  const chapterCount = useChapterCount(id);
  const { total: words, perChapter } = useManuscriptWordCount(id);
  if (!project) return null;

  const percent = project.target > 0 ? Math.round((words / project.target) * 100) : 0;
  const recentChapters = manuscript
    .flatMap((p) => p.chapters)
    .sort((a, b) => b.number - a.number)
    .slice(0, 5)
    .map((c) => ({ number: c.number, title: c.title, words: perChapter[c.id] ?? 0 }));
  const activity = deriveRecentActivity(project);

  return (
    <>
      {/* Project Description */}
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="w-full shrink-0 overflow-hidden rounded-xl border border-line sm:w-48">
            <CoverArt seed={project.id} className="block aspect-[4/3] w-full sm:aspect-[3/4]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg text-ink">Project Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {project.logline}
            </p>
            {project.tags && project.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs text-ink-muted"
                  >
                    {tag}
                  </span>
                ))}
                <button
                  type="button"
                  aria-label="Add tag"
                  className="grid size-7 place-items-center rounded-lg border border-dashed border-line-strong text-ink-faint transition-colors hover:text-ink"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <LinkedBooksCard bookId={project.id} />

      {/* Manuscript Progress */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Manuscript Progress</h2>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Ring
            value={percent}
            label={`${percent}%`}
            sublabel={
              <div className="text-center">
                <div className="text-sm font-medium text-ink">{words.toLocaleString()}</div>
                <div className="mt-0.5 text-xs text-ink-faint">
                  of {project.target.toLocaleString()} words
                </div>
              </div>
            }
            size={148}
          />
          <div className="w-full flex-1">
            <p className="label-caps">Current Status</p>
            <div className="mt-1.5 flex items-center justify-between text-sm text-ink">
              <span>
                {words.toLocaleString()} / {project.target.toLocaleString()} words
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold"
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>

            <div className="mt-5 flex flex-wrap divide-x divide-line">
              <MiniStat value={chapterCount} label="Chapters" className="pr-5" />
              <MiniStat value={project.sessions} label="Sessions" className="px-5" />
              <MiniStat value={project.daysActive} label="Days Active" className="px-5" />
              <MiniStat value={project.updated} label="Last Updated" className="pl-5" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Recent Chapters */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Recent Chapters</h2>
            <Link
              href={`/projects/${project.id}/chapters`}
              className="text-xs text-gold hover:opacity-80"
            >
              View All
            </Link>
          </div>
          {recentChapters.length === 0 ? (
            <p className="mt-4 text-sm text-ink-faint">No chapters yet — start writing to see them here.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {recentChapters.map((c) => (
                <li key={c.number} className="flex items-center gap-3 py-3">
                  <span className="w-6 shrink-0 text-xs text-ink-faint">{c.number}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.title}</span>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {c.words.toLocaleString()} words
                  </span>
                  {c.words > 0 ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-ink-faint" />
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/projects/${project.id}/chapters`}
            className="mt-4 flex items-center justify-center gap-1.5 border-t border-line pt-4 text-sm text-gold hover:opacity-80"
          >
            View All Chapters
            <ArrowRight className="size-3.5" />
          </Link>
        </section>

        {/* Recent Activity */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Recent Activity</h2>
            <Link
              href={`/projects/${project.id}/analytics`}
              className="text-xs text-gold hover:opacity-80"
            >
              View All
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {activity.map((a) => {
              const Icon = ACTIVITY_ICON[a.kind];
              return (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-gold">
                    <Icon className="size-3.5" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{a.text}</span>
                  <span className="shrink-0 text-xs text-ink-faint">{a.time}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}

/**
 * Read-only summary of this project's sequel/translation relationships —
 * surfaced right on Overview (where opening a project actually lands),
 * not buried on the Settings tab where the Add/Change/Remove management
 * UI lives. Renders nothing for an unlinked project (nothing to show);
 * once linked, every relationship shows here, including several incoming
 * links at once (e.g. multiple translations of this same original book),
 * each a real link to that project.
 */
function LinkedBooksCard({ bookId }: { bookId: string }) {
  const { outgoing, incoming } = useBookLinks(bookId);
  const projects = useProjects();

  if (outgoing.length === 0 && incoming.length === 0) return null;

  function titleFor(id: string): string {
    return projects.find((p) => p.id === id)?.title ?? "Unknown project";
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <BookCopy className="size-4 text-gold" />
          Linked Books
        </h2>
        <Link href={`/projects/${bookId}/settings`} className="text-xs text-gold hover:opacity-80">
          Manage
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {outgoing.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="shrink-0 text-ink-faint">
              {l.link_type === "sequel_of" ? "Sequel of" : l.link_type === "translation_of" ? "Translation of" : l.link_type}
            </span>
            <Link href={`/projects/${l.to_book_id}`} className="min-w-0 truncate text-right text-ink hover:text-gold">
              {titleFor(l.to_book_id)}
              {l.language && <span className="text-ink-faint"> · {languageLabel(l.language)}</span>}
            </Link>
          </li>
        ))}
        {incoming.map((l) => (
          <li key={l.id} className="py-2.5 text-sm text-ink-muted">
            <Link href={`/projects/${l.from_book_id}`} className="text-ink hover:text-gold">
              {titleFor(l.from_book_id)}
            </Link>{" "}
            is a {relationshipLabel(l)} of this project.
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiniStat({
  value,
  label,
  className = "",
}: {
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="font-num text-xl text-gilded">{value}</div>
      <div className="label-caps mt-0.5 text-[0.58rem]">{label}</div>
    </div>
  );
}
