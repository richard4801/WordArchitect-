"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { useProject } from "@/lib/project-store";

/**
 * The AI Assistant workspace — a dedicated, full-bleed page like Chapters/
 * Characters/World/Notes, not a tab inside the shared project chrome
 * (`(tabs)/layout.tsx`'s tab bar links here, but this route renders its
 * own header, same pattern `world/_shared.tsx`'s WorldTopBar established
 * for that workspace). Full-height so the chat thread gets its own
 * internal scroll region instead of growing the whole page.
 */
export default function AssistantPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);

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

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3 sm:px-6">
        <Link
          href={`/projects/${project.id}`}
          className="flex shrink-0 items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" />
          Back to Project
        </Link>
        <span className="hidden text-line-strong sm:inline">/</span>
        <span className="hidden truncate text-sm font-medium text-ink sm:inline">AI Assistant</span>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden p-5 sm:p-6">
        <ChatPanel bookId={project.id} layout="full" />
      </div>
    </div>
  );
}
