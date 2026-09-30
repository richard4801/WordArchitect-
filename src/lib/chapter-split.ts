/**
 * Client-side port of the real backend's `splitIntoChapters`
 * (`manuscriptIngest.ts` on `richard4801/WordArchitect-Backend-`) — ported
 * line-for-line (regex, number-word table, header-length cap all
 * identical), confirmed against the backend source directly rather than
 * re-derived from guesswork, same discipline this repo's own CLAUDE.md
 * documents for every backend integration.
 *
 * Used by the Bulk Manuscript Import screen to continue chapter numbering
 * on a project that already has chapters: this file's `splitIntoChapters`
 * detects the source document's own "Chapter N" headers exactly the way
 * the backend eventually will, `renumberSequentially` throws those source
 * numbers away and assigns fresh ones starting after the book's current
 * highest chapter, and `chaptersToRawText` reconstructs a rawText string
 * with the new headers so the backend's own splitter (which the frontend
 * has no way to skip or override remotely) parses it into exactly the
 * chapters/numbers already decided here — no backend change needed, and
 * no risk of colliding with a `(book_id, number)` chapter that already
 * exists.
 */

export type ParsedChapter = {
  chapterNumber: number;
  title: string | null;
  text: string;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

const CHAPTER_HEADER_RE = /^chapter\s+([a-z]+|\d+)\s*[:.\-–—]?\s*(.*)$/i;
const MAX_HEADER_LINE_LENGTH = 100;

function resolveChapterNumber(token: string): number | null {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  return NUMBER_WORDS[token.toLowerCase()] ?? null;
}

/** Splits rawText into chapters by detecting "Chapter N" header lines — identical rules to the backend's own splitter (see module comment). Content before the first header is dropped; if no header is found at all, the whole input becomes a single Chapter 1. */
export function splitIntoChapters(rawText: string): ParsedChapter[] {
  const lines = rawText.split(/\r?\n/);
  const chapters: ParsedChapter[] = [];

  let currentNumber: number | null = null;
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (currentNumber === null) return;
    const text = currentBody.join("\n").trim();
    if (text) chapters.push({ chapterNumber: currentNumber, title: currentTitle, text });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length <= MAX_HEADER_LINE_LENGTH) {
      const match = trimmed.match(CHAPTER_HEADER_RE);
      const chapterNumber = match ? resolveChapterNumber(match[1] ?? "") : null;
      if (match && chapterNumber !== null) {
        flush();
        currentNumber = chapterNumber;
        currentTitle = match[2]?.trim() || null;
        currentBody = [];
        continue;
      }
    }
    currentBody.push(line);
  }
  flush();

  if (chapters.length === 0) {
    const text = rawText.trim();
    if (text) chapters.push({ chapterNumber: 1, title: null, text });
  }
  return chapters;
}

/** Reassigns chapterNumber sequentially, in the parsed chapters' own order, starting at `startNumber` — throws away whatever numbers the source document's own headers used (which is the whole point: continuing an existing book's numbering, not trusting a freshly-uploaded document to know where the book already left off). */
export function renumberSequentially(chapters: ParsedChapter[], startNumber: number): ParsedChapter[] {
  return chapters.map((chapter, index) => ({ ...chapter, chapterNumber: startNumber + index }));
}

/** Builds a single "Chapter N: Title" header line, clamped to the same MAX_HEADER_LINE_LENGTH the splitter itself requires of a header line — a title long enough to push the whole line past that cap wouldn't be recognized as a header at all on the next parse (by this file's own splitter or the backend's), silently merging that chapter into whatever came before it. */
function formatChapterHeader(chapterNumber: number, title: string | null): string {
  const base = `Chapter ${chapterNumber}`;
  if (!title) return base;
  const prefix = `${base}: `;
  const maxTitleLength = Math.max(0, MAX_HEADER_LINE_LENGTH - prefix.length);
  return `${prefix}${title.slice(0, maxTitleLength)}`;
}

/** Reconstructs a plain rawText string from parsed chapters — real headers the backend's own splitter will detect identically, so submitting this instead of the original upload is what actually makes the new chapter numbers stick. */
export function chaptersToRawText(chapters: ParsedChapter[]): string {
  return chapters.map((c) => `${formatChapterHeader(c.chapterNumber, c.title)}\n\n${c.text}`).join("\n\n");
}
