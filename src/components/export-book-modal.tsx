"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, FileType2, Loader2 } from "lucide-react";
import { exportBook, type ExportFormat } from "@/lib/book-export";

/** Portaled modal: pick PDF or DOCX, export the whole manuscript. */
export function ExportBookModal({
  bookId,
  title,
  subtitle,
  onClose,
}: {
  bookId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("docx");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function handleExport() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await exportBook({
        bookId,
        title,
        subtitle,
        format,
        onProgress: (d, t) => setProgress({ done: d, total: t }),
      });
      setDone(res.chapters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  const options: { key: ExportFormat; label: string; hint: string; Icon: typeof FileText }[] = [
    { key: "docx", label: "Word (.docx)", hint: "Editable, manuscript format", Icon: FileText },
    { key: "pdf", label: "PDF", hint: "Fixed layout, ready to read or print", Icon: FileType2 },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (!busy) onClose();
      }}
    >
      <div className="card flex max-h-[85vh] w-full max-w-md flex-col p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-ink">Export Book</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Exports every chapter of “{title}” in order, with a title page and each chapter starting on a new page.
        </p>
        <div className="mt-4 grid gap-2">
          {options.map(({ key, label, hint, Icon }) => (
            <button
              key={key}
              type="button"
              disabled={busy}
              onClick={() => setFormat(key)}
              className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                format === key ? "border-gold bg-gold/10" : "border-line hover:bg-surface-2"
              }`}
            >
              <Icon className="size-5 text-gold" />
              <span>
                <span className="block text-sm font-medium text-ink">{label}</span>
                <span className="block text-xs text-ink-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Note: only plain text and scene breaks are saved for chapters, so bold/italic formatting won&apos;t appear in the export.
        </p>
        {busy && (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="size-4 animate-spin" />
            {progress && progress.total > 0
              ? `Fetching chapters… ${progress.done} / ${progress.total}`
              : "Preparing…"}
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {done !== null && <p className="mt-3 text-sm text-green-400">Exported {done} chapters.</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            {done !== null ? "Close" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleExport}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
