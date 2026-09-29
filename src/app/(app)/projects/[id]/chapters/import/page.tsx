"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, CircleCheck, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { extractDocxText } from "@/lib/docx-text";
import {
  createImportJob,
  getImportJob,
  type ImportJobRow,
  invalidateManuscriptCache,
  stepImportJob,
} from "@/lib/manuscript-store";
import { useProject } from "@/lib/project-store";

/**
 * Bulk Manuscript Import — the resumable job flow, per the backend's own
 * `manuscriptImportJob.ts`: create a job (fast, text-only), then advance it
 * one chapter at a time via repeated `.../step` calls, so no single request
 * has to embed more than one chapter's worth of text regardless of how long
 * the pasted manuscript is. `job.id` is persisted in the URL (`?job=`), not
 * just component state, so a reload mid-import resumes via a real GET
 * instead of losing progress — same "id survives in the URL" convention
 * the Planning Engine's own long-running runs already use.
 */
export default function BulkImportPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("job");

  const [rawText, setRawText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJobRow | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only one drive loop should ever be in flight for a given job at once —
  // guards against the resume-on-mount effect and a manual Retry click both
  // racing to step the same job.
  const drivingRef = useRef(false);

  async function driveImport(jobId: string) {
    if (drivingRef.current) return;
    drivingRef.current = true;
    try {
      let current: ImportJobRow;
      do {
        current = await stepImportJob(jobId);
        setJob(current);
      } while (current.status !== "done" && current.status !== "failed");
      if (current.status === "done" && project) invalidateManuscriptCache(project.id);
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : "Couldn't reach the server.");
    } finally {
      drivingRef.current = false;
    }
  }

  // Resume after a reload: a `?job=` in the URL but no local job state yet
  // means this is a fresh mount, not a fresh submit — GET first (never step
  // as a side effect of just looking), then keep driving if it wasn't
  // already finished.
  useEffect(() => {
    if (!jobIdParam || job) return;
    let cancelled = false;
    (async () => {
      try {
        const resumed = await getImportJob(jobIdParam);
        if (cancelled) return;
        setJob(resumed);
        if (resumed.status !== "done" && resumed.status !== "failed") {
          void driveImport(jobIdParam);
        } else if (resumed.status === "done" && project) {
          invalidateManuscriptCache(project.id);
        }
      } catch (err) {
        if (!cancelled) setResolveError(err instanceof Error ? err.message : "Couldn't find that import job.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobIdParam, project?.id]);

  function readTxt(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Couldn't read that file."));
      reader.readAsText(file);
    });
  }

  async function handleFilePick(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    const name = file.name.toLowerCase();
    setReadingFile(true);
    try {
      if (name.endsWith(".docx")) {
        setRawText(await extractDocxText(file));
      } else if (name.endsWith(".txt")) {
        setRawText(await readTxt(file));
      } else if (name.endsWith(".doc")) {
        setFileError("Old .doc files aren't supported — save it as .docx first, or paste the text directly.");
      } else {
        setFileError("Please choose a .docx or .txt file.");
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Couldn't read that file.");
    } finally {
      setReadingFile(false);
    }
  }

  async function handleSubmit() {
    if (!project || !rawText.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createImportJob(project.id, rawText);
      setJob(created);
      router.replace(`/projects/${project.id}/chapters/import?job=${created.id}`);
      void driveImport(created.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to start the import.");
    } finally {
      setCreating(false);
    }
  }

  function handleRetry() {
    if (!job) return;
    setResolveError(null);
    void driveImport(job.id);
  }

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

  const running = job !== null && job.status !== "done" && job.status !== "failed";
  const percent = job && job.chapters_total > 0 ? Math.round((job.chapters_done / job.chapters_total) * 100) : 0;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3 sm:px-6">
        <Link
          href={`/projects/${project.id}/chapters`}
          className="flex shrink-0 items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" />
          Back to Manuscript
        </Link>
        <span className="hidden text-line-strong sm:inline">/</span>
        <div className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
          <ChevronRight className="size-3 text-ink-faint" />
          <span className="truncate font-medium text-ink">Import Manuscript</span>
        </div>
      </header>

      <div className="scroll-slim flex flex-1 flex-col items-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-2xl">
          <h1 className="font-display text-3xl text-ink">Import Manuscript</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Paste your full manuscript below, or upload a Word (.docx) or plain text file. It will be split into
            chapters and imported straight into this project&rsquo;s Manuscript workspace.
          </p>

          {!job && (
            <div className="card mt-6 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-ink" htmlFor="bulk-import-text">
                  Manuscript text
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={readingFile}
                  className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink disabled:opacity-60"
                >
                  {readingFile ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  {readingFile ? "Reading file…" : "Upload .docx or .txt file"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    void handleFilePick(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              <textarea
                id="bulk-import-text"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={"Chapter 1\n\nIt was a dark and stormy night...\n\nChapter 2\n\n..."}
                rows={16}
                className="mt-2 w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
              />
              {fileError && <p className="mt-2 text-xs text-danger">{fileError}</p>}

              <ul className="mt-3 space-y-1 text-xs text-ink-faint">
                <li>Content before the first &ldquo;Chapter N&rdquo; header is dropped.</li>
                <li>No headers found → entire input becomes Chapter 1.</li>
              </ul>

              {createError && <p className="mt-3 text-xs text-danger">{createError}</p>}

              <div className="mt-5 flex items-center justify-between">
                <Link href={`/projects/${project.id}/chapters`} className="text-sm text-ink-muted hover:text-ink">
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={creating || !rawText.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {creating ? "Starting import…" : "Import Manuscript"}
                </button>
              </div>
            </div>
          )}

          {job && running && (
            <div className="card mt-6 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm text-ink">
                <Loader2 className="size-4 animate-spin text-gold" />
                Importing your manuscript…
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {job.chapters_done} / {job.chapters_total} chapters
              </p>
              <Progress value={percent} className="mt-3" />
              {job.last_chapter_title && (
                <p className="mt-3 text-xs text-ink-faint">Last imported: {job.last_chapter_title}</p>
              )}
              {resolveError && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/10 p-3">
                  <p className="text-xs text-danger">{resolveError}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="shrink-0 rounded-lg border border-line-strong px-3 py-1.5 text-xs text-ink transition-colors hover:bg-surface-2"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {job && job.status === "failed" && (
            <div className="card mt-6 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm text-danger">
                <AlertTriangle className="size-4" />
                Import failed
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {job.chapters_done} / {job.chapters_total} chapters imported before this happened.
              </p>
              {job.error && (
                <p className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                  {job.error}
                </p>
              )}
              <button
                type="button"
                onClick={handleRetry}
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}

          {job && job.status === "done" && (
            <div className="card mt-6 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm text-ink">
                <CircleCheck className="size-4 text-gold" />
                Import complete
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {job.chapters_done} chapter{job.chapters_done === 1 ? "" : "s"} imported, {job.chunks_stored} chunks
                stored in AI memory.
              </p>
              <Link
                href={`/projects/${project.id}/chapters`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-gold-contrast transition-opacity hover:opacity-90"
              >
                Go to Chapters
                <ChevronRight className="size-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
