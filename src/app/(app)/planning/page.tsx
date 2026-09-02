"use client";

import { BookOpen, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PipelineTypeChooser } from "@/components/pipeline-type-chooser";
import { PIPELINE_TYPE_META, type PipelineType } from "@/lib/planning-data";
import { useProjects, useProjectsLoadStatus } from "@/lib/project-store";

/**
 * The global entry point into the Planning Engine, reachable from the
 * sidebar without already being inside a project. Two steps: pick Main or
 * Contract Pipeline, then pick which book — landing on that book's own
 * dedicated section (`/projects/[id]/planning/main` or `.../contract`).
 * The book-scoped chooser at `/projects/[id]/planning` is the same fork
 * minus this book-picking step, since the book's already known there.
 */
export default function PlanningEntryPage() {
  const router = useRouter();
  const [pipelineType, setPipelineType] = useState<PipelineType | null>(null);
  const projects = useProjects();
  const projectsLoadStatus = useProjectsLoadStatus();

  function handleSelectBook(bookId: string) {
    if (!pipelineType) return;
    router.push(`/projects/${bookId}/planning/${pipelineType === "contract" ? "contract" : "main"}`);
  }

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="mb-6 text-center">
        <Sparkles className="mx-auto size-6 text-gold" />
        <h1 className="mt-3 font-display text-2xl text-ink">Planning Engine</h1>
        <p className="mt-2 text-sm text-ink-muted">
          A pre-writing pipeline — Core Summary, then either a full Act/Part/Beats plan or a short contract-submission
          hook plan. Never writes manuscript prose; Generate/drafting stays exactly as it is.
        </p>
      </div>

      {!pipelineType ? (
        <PipelineTypeChooser onChoose={setPipelineType} />
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setPipelineType(null)}
            className="flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-3.5" />
            Choose a different pipeline
          </button>

          <div className="rounded-xl border border-gold/40 bg-gold/5 p-3.5">
            <p className="text-sm font-medium text-ink">{PIPELINE_TYPE_META[pipelineType].label}</p>
            <p className="mt-1 text-xs text-ink-muted">{PIPELINE_TYPE_META[pipelineType].description}</p>
          </div>

          <p className="label-caps text-[0.6rem] text-ink-faint">Pick a book</p>

          {projectsLoadStatus === "loading" && projects.length === 0 ? (
            <p className="text-sm text-ink-muted">Loading your projects…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-ink-muted">
              You don&apos;t have any projects yet — create one first from{" "}
              <Link href="/projects/new" className="text-gold hover:opacity-80">
                New Project
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleSelectBook(project.id)}
                  className="card-2 flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:border-gold/40"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-faint">
                    <BookOpen className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{project.title}</p>
                    <p className="truncate text-xs text-ink-faint">{project.genre}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-ink-faint" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
