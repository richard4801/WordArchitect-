"use client";

import { Bell, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Project } from "@/lib/projects-data";

/**
 * Shared chrome for the Worldbuilding workspace (hub, new-category form) —
 * same full-bleed pattern as chapters/outlines/characters: no standard app
 * header, the page builds its own breadcrumb top bar.
 */
export function WorldTopBar({ project, crumb }: { project: Project; crumb: string[] }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3 sm:px-6">
      <Link
        href={`/projects/${project.id}`}
        className="flex shrink-0 items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        Back to Project
      </Link>
      <span className="hidden text-line-strong sm:inline">/</span>
      <div className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
        {crumb.map((label, i) => {
          const isLast = i === crumb.length - 1;
          return (
            <span key={label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="size-3 text-ink-faint" />}
              {isLast ? (
                <span className="truncate font-medium text-ink">{label}</span>
              ) : (
                <Link
                  href={`/projects/${project.id}/world`}
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="btn-raised hidden min-w-0 items-center gap-2 rounded-full px-4 py-2 text-sm text-ink-faint md:flex md:w-64">
          <Search className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Search anything...</span>
          <kbd className="label-caps shrink-0 rounded-md border border-line-strong px-1.5 py-0.5 text-[0.6rem]">
            ⌘K
          </kbd>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="btn-raised grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
        >
          <Bell className="size-4" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
