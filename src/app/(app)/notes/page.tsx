"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useProjects } from "@/lib/project-store";

/**
 * "Notes" as a nav destination has no page of its own — the real notes hub
 * is at /projects/[id]/notes, which needs a project to open. This
 * redirects straight to the most recently active project's notes hub,
 * same pattern as /characters -> /projects/[id]/characters.
 */
export default function NotesRedirectPage() {
  const router = useRouter();
  const projects = useProjects();
  const mostRecent = projects.length
    ? projects.reduce((a, b) => (b.updatedRank < a.updatedRank ? b : a))
    : undefined;

  useEffect(() => {
    if (mostRecent) router.replace(`/projects/${mostRecent.id}/notes`);
  }, [mostRecent, router]);

  if (mostRecent) {
    return (
      <div className="grid h-[70vh] place-items-center text-center">
        <p className="text-sm text-ink-muted">Opening your notes…</p>
      </div>
    );
  }

  return (
    <div className="grid h-[70vh] place-items-center px-6 text-center">
      <div>
        <p className="font-display text-2xl text-ink">No projects yet</p>
        <p className="mt-2 text-sm text-ink-muted">Start a new project to begin capturing notes.</p>
        <Link
          href="/projects/new"
          className="mt-5 inline-block rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
        >
          New Project
        </Link>
      </div>
    </div>
  );
}
