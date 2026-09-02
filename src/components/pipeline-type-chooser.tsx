"use client";

import { PIPELINE_TYPE_META, PIPELINE_TYPES, type PipelineType } from "@/lib/planning-data";

/**
 * The "Main Pipeline vs Contract Pipeline" choice — shared by the
 * top-level `/planning` entry point (pick a type, then a book) and each
 * book's own `/projects/[id]/planning` chooser (book already known, so
 * this is the only step). Two full-width cards, not a dropdown — this is
 * a real fork into two differently-shaped workspaces (Contract's own
 * Platform Craft Notes menu item, its own Run List, etc.), not a minor
 * setting worth burying.
 */
export function PipelineTypeChooser({ onChoose }: { onChoose: (pipelineType: PipelineType) => void }) {
  return (
    <div className="space-y-3">
      {PIPELINE_TYPES.map((pt) => {
        const meta = PIPELINE_TYPE_META[pt];
        return (
          <button
            key={pt}
            type="button"
            onClick={() => onChoose(pt)}
            className="w-full rounded-xl border border-line p-4 text-left transition-colors hover:border-gold/60 hover:bg-gold/5"
          >
            <p className="text-sm font-medium text-ink">{meta.label}</p>
            <p className="mt-1 text-xs text-ink-muted">{meta.description}</p>
          </button>
        );
      })}
    </div>
  );
}
