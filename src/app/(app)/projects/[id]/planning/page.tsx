"use client";

import { Sparkles, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PipelineTypeChooser } from "@/components/pipeline-type-chooser";
import type { PipelineType } from "@/lib/planning-data";
import { useProject } from "@/lib/project-store";

/**
 * Book already known (it's in the URL) — this is just the Main/Contract
 * fork, skipping the book-picker step the top-level `/planning` entry
 * point needs. Picking either navigates into that pipeline's own
 * dedicated section (`./planning/main` or `./planning/contract`), each
 * with its own sidebar menu — see PlanningWorkspace.tsx's own comment for
 * why these are two separate sections rather than one mixed workspace.
 */
export default function PlanningChooserPage() {
  const { id: bookId } = useParams<{ id: string }>();
  const router = useRouter();
  const project = useProject(bookId);

  if (!project) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-display text-2xl text-ink">Project not found</p>
          <Link href="/projects" className="mt-3 inline-block text-sm text-gold hover:opacity-80">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  function handleChoose(pipelineType: PipelineType) {
    router.push(`/projects/${bookId}/planning/${pipelineType === "contract" ? "contract" : "main"}`);
  }

  return (
    <div className="grid h-dvh place-items-center p-6">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href={`/projects/${bookId}`}
          className="mb-5 flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          Back to Project
        </Link>
        <div className="card p-8 text-center">
          <Sparkles className="mx-auto size-6 text-gold" />
          <h2 className="mt-3 font-display text-xl text-ink">Planning Engine</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Which pipeline for <span className="text-ink">{project.title}</span>?
          </p>
          <div className="mt-5">
            <PipelineTypeChooser onChoose={handleChoose} />
          </div>
        </div>
      </div>
    </div>
  );
}
