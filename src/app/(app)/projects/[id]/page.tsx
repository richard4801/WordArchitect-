"use client";

import { CheckCircle2, Circle, Globe2, PenLine, User, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CoverArt } from "@/components/ui/cover-art";
import { Ring } from "@/components/ui/ring";
import { useProject } from "@/lib/project-store";
import {
  deriveRecentActivity,
  deriveRecentChapters,
  type ProjectActivityKind,
} from "@/lib/projects-data";

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
  if (!project) return null;

  const percent = Math.round((project.words / project.target) * 100);
  const chapters = deriveRecentChapters(project);
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

      {/* Manuscript Progress */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink">Manuscript Progress</h2>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Ring
            value={percent}
            label={`${percent}%`}
            sublabel={`${project.words.toLocaleString()} of ${project.target.toLocaleString()} words`}
            size={148}
          />
          <div className="w-full flex-1">
            <p className="label-caps">Current Status</p>
            <div className="mt-1.5 flex items-center justify-between text-sm text-ink">
              <span>
                {project.words.toLocaleString()} / {project.target.toLocaleString()} words
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold"
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MiniStat value={project.chapters} label="Chapters" />
              <MiniStat value={project.sessions} label="Sessions" />
              <MiniStat value={project.povCharacters ?? 0} label="POV Characters" />
              <MiniStat value={project.updated} label="Last Updated" />
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
          {chapters.length === 0 ? (
            <p className="mt-4 text-sm text-ink-faint">No chapters yet — start writing to see them here.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {chapters.map((c) => (
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
        </section>

        {/* Recent Activity */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Recent Activity</h2>
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

function MiniStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="font-num text-xl text-gilded">{value}</div>
      <div className="label-caps mt-0.5 text-[0.58rem]">{label}</div>
    </div>
  );
}
