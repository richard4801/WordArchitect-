"use client";

import {
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleDot,
  Clock,
  FileText,
  Globe2,
  ListTree,
  MoreHorizontal,
  PenLine,
  Plus,
  Settings as SettingsIcon,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useState } from "react";
import { CoverArt } from "@/components/ui/cover-art";
import { updateProjectTarget, useProject } from "@/lib/project-store";
import type { Project } from "@/lib/projects-data";

const TABS = [
  { key: "", label: "Overview", icon: CircleDot },
  { key: "chapters", label: "Chapters", icon: FileText },
  { key: "characters", label: "Characters", icon: Users },
  { key: "world", label: "World", icon: Globe2 },
  { key: "outlines", label: "Outlines", icon: ListTree },
  { key: "notes", label: "Notes", icon: FileText },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

const STATUS_BADGE: Record<string, { label: string; varName: string }> = {
  Active: { label: "ACTIVE", varName: "--gold" },
  Draft: { label: "DRAFT", varName: "--warn" },
  Outline: { label: "OUTLINE", varName: "--info" },
  completed: { label: "COMPLETED", varName: "--success" },
  archived: { label: "ARCHIVED", varName: "--low" },
};

/**
 * Persistent chrome for a single project: back link, title/status/meta row,
 * the 7-tab nav, and the right rail (cover, details, stats, quick actions).
 * Each tab's page.tsx renders only the main-column content into {children}.
 */
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const project = useProject(id);

  if (!project) {
    return (
      <div className="mx-auto max-w-[1180px] py-24 text-center">
        <p className="font-display text-2xl text-ink">Project not found</p>
        <p className="mt-2 text-sm text-ink-muted">
          It may have been removed, or the link is out of date.
        </p>
        <Link
          href="/projects"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-gold hover:opacity-80"
        >
          <ChevronLeft className="size-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  const base = `/projects/${id}`;
  const badgeKey = project.status === "active" ? (project.stage ?? "Active") : project.status;
  const badge = STATUS_BADGE[badgeKey]!;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pt-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        Back to Projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl text-ink">{project.title}</h1>
            <span
              className="rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tracking-wider"
              style={{
                color: `var(${badge.varName})`,
                background: `color-mix(in srgb, var(${badge.varName}) 16%, transparent)`,
              }}
            >
              {badge.label}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-faint">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5" />
              {project.genre}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Created {project.created}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Updated {project.updated}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Options"
            className="grid size-9 place-items-center rounded-xl border border-line text-ink-muted transition-colors hover:text-ink"
          >
            <MoreHorizontal className="size-4" />
          </button>
          <Link
            href={`${base}/chapters`}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
          >
            <PenLine className="size-4" />
            Write Now
            <ChevronDown className="size-3.5" />
          </Link>
        </div>
      </div>

      <nav className="flex items-center gap-6 overflow-x-auto border-b border-line text-sm">
        {TABS.map((tab) => {
          const href = tab.key ? `${base}/${tab.key}` : base;
          const active = pathname === href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key || "overview"}
              href={href}
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap pb-3 transition-colors ${
                active ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-gold" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-6">{children}</div>

        <aside className="scroll-slim space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pr-1">
          <CoverCard project={project} />
          <DetailsCard project={project} />
          <StatsCard project={project} />
          <QuickActionsCard base={base} />
        </aside>
      </div>
    </div>
  );
}

function CoverCard({ project }: { project: Project }) {
  return (
    <section className="card relative overflow-hidden">
      <CoverArt seed={project.id} className="block aspect-[3/4] w-full" />
      <button
        type="button"
        aria-label="Edit cover"
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-canvas/60 text-ink-muted backdrop-blur transition-colors hover:text-ink"
      >
        <PenLine className="size-3.5" />
      </button>
    </section>
  );
}

function DetailsCard({ project }: { project: Project }) {
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg text-ink">Project Details</h2>
      <dl className="mt-3 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">Genre</dt>
          <dd className="truncate text-ink">{project.genre}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">POV</dt>
          <dd className="truncate text-ink">{project.pov ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">Tense</dt>
          <dd className="truncate text-ink">{project.tense ?? "—"}</dd>
        </div>
        <TargetWordsRow project={project} />
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">Language</dt>
          <dd className="truncate text-ink">{project.language ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-muted">Deadline</dt>
          <dd className="truncate text-ink">{project.deadline ?? "Not set"}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="mt-4 w-full rounded-xl border border-line py-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        Edit Details
      </button>
    </section>
  );
}

/**
 * The one detail meant to change over the life of a project: if actual
 * words end up exceeding the original goal, bump the target right here
 * instead of it staying a fixed, uneditable number forever.
 */
function TargetWordsRow({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(project.target));
  const [saving, setSaving] = useState(false);

  async function save() {
    const next = Number(draft);
    if (!(next > 0)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateProjectTarget(project.id, next);
    } catch {
      // Optimistic cache is untouched on failure — the displayed value
      // just reverts to project.target on the next render, no separate
      // rollback needed.
    }
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <dt className="text-ink-muted">Target Words</dt>
        <dd className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-24 rounded-lg border border-line-strong bg-surface px-2 py-1 text-right text-sm text-ink focus:outline-none"
          />
          <button
            type="button"
            aria-label="Save target words"
            onClick={save}
            disabled={saving}
            className="grid size-6 shrink-0 place-items-center rounded-md text-success transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setEditing(false)}
            className="grid size-6 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </dd>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">Target Words</dt>
      <dd>
        <button
          type="button"
          onClick={() => {
            setDraft(String(project.target));
            setEditing(true);
          }}
          className="rounded-md text-ink transition-colors hover:text-gold"
        >
          {project.target.toLocaleString()}
        </button>
      </dd>
    </div>
  );
}

function StatsCard({ project }: { project: Project }) {
  const percent = Math.round((project.words / project.target) * 100);
  const stats = [
    { value: `${percent}%`, label: "Manuscript" },
    { value: project.words.toLocaleString(), label: "Total Words" },
    { value: project.povCharacters ?? 0, label: "POV Characters" },
    { value: project.worldEntries ?? 0, label: "World Entries" },
  ];
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg text-ink">Project Stats</h2>
      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-line">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`aspect-square p-4 text-center ${
              i % 2 === 0 ? "border-r border-line" : ""
            } ${i < 2 ? "border-b border-line" : ""} flex flex-col items-center justify-center`}
          >
            <div className="font-num text-2xl text-gilded">{s.value}</div>
            <div className="label-caps mt-0.5 text-[0.6rem]">{s.label}</div>
          </div>
        ))}
      </div>
      <Link
        href="analytics"
        className="mt-4 flex items-center justify-center gap-1.5 text-sm text-gold hover:opacity-80"
      >
        View Full Analytics
        <ChevronLeft className="size-3.5 rotate-180" />
      </Link>
    </section>
  );
}

function QuickActionsCard({ base }: { base: string }) {
  const actions = [
    { icon: PenLine, label: "Write New Chapter", href: `${base}/chapters` },
    { icon: FileText, label: "New Note", href: `${base}/notes` },
    { icon: Users, label: "Add Character", href: `${base}/characters` },
    { icon: Globe2, label: "Add World Entry", href: `${base}/world` },
    { icon: Plus, label: "Import Content", href: `${base}/chapters` },
  ];
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg text-ink">Quick Actions</h2>
      <ul className="mt-3 space-y-1">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.label}>
              <Link
                href={a.href}
                className="flex items-center gap-2.5 rounded-lg px-1.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2/60 hover:text-ink"
              >
                <Icon className="size-4" strokeWidth={1.7} />
                {a.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
