/**
 * Manuscript outline (parts -> chapters -> scenes) and chapter body content
 * for the writing editor (/projects/[id]/chapters). Separate from the
 * `chapters` count on Project in projects-data.ts (a simple stat used
 * elsewhere) — this is the richer structure the editor's left rail needs.
 * Explicit, detailed data for shadows-of-elarion (matches the mockup
 * exactly); every other project gets a lighter generic outline built from
 * its own chapter count.
 */

export type Scene = {
  id: string;
  title: string;
};

export type ManuscriptChapter = {
  id: string;
  number: number;
  title: string;
  complete: boolean;
  scenes?: Scene[];
};

export type ManuscriptPart = {
  id: string;
  title: string;
  chapters: ManuscriptChapter[];
};

export type Commenter = "Jessica" | "Michael" | "Sarah" | "Daniel";

export const COMMENTER_TONE: Record<Commenter, string> = {
  Jessica: "purple",
  Michael: "info",
  Sarah: "gold",
  Daniel: "success",
};

/** A paragraph of chapter body text, optionally tagged with an inline reviewer comment anchor. */
export type ChapterParagraph = {
  id: string;
  text: string;
  /** Renders as a colored, italic "foreshadowing" line rather than plain prose. */
  emphasis?: boolean;
  /** Scene-break marker ("* * *") instead of prose. */
  break?: boolean;
  commenter?: Commenter;
};

export type ChapterBody = {
  heading: string;
  title: string;
  paragraphs: ChapterParagraph[];
};

function genericManuscript(chapterCount: number): ManuscriptPart[] {
  const perPart = Math.max(1, Math.ceil(chapterCount / 3));
  const parts: ManuscriptPart[] = [];
  let n = 1;
  for (let p = 0; p < 3 && n <= chapterCount; p++) {
    const chapters: ManuscriptChapter[] = [];
    for (let i = 0; i < perPart && n <= chapterCount; i++, n++) {
      chapters.push({ id: `ch-${n}`, number: n, title: `Chapter ${n}`, complete: p < 2 });
    }
    parts.push({ id: `part-${p + 1}`, title: `Part ${["I", "II", "III"][p]}`, chapters });
  }
  return parts;
}

function genericChapterBody(chapter: ManuscriptChapter): ChapterBody {
  return {
    heading: `CHAPTER ${chapter.number}`,
    title: chapter.title,
    paragraphs: [
      {
        id: "placeholder",
        text: "This chapter hasn't been written yet. Click here and start typing, or use the AI Assistant to help draft your opening scene.",
      },
    ],
  };
}

export function getManuscript(projectId: string, chapterCount: number): ManuscriptPart[] {
  return genericManuscript(chapterCount);
}

export function getChapterBody(projectId: string, chapter: ManuscriptChapter): ChapterBody {
  return genericChapterBody(chapter);
}

export function findChapter(
  parts: ManuscriptPart[],
  chapterId: string,
): ManuscriptChapter | undefined {
  for (const part of parts) {
    const found = part.chapters.find((c) => c.id === chapterId);
    if (found) return found;
  }
  return undefined;
}

export type CommentThread = {
  id: string;
  author: Commenter;
  time: string;
  text: string;
  resolved?: boolean;
};

export const CHAPTER_18_COMMENTS: CommentThread[] = [];

export type CollaboratorStatus = "Editing" | "Viewing" | "Commenting";

export const ACTIVE_COLLABORATORS: { name: string; you?: boolean; status: CollaboratorStatus; tone: Commenter }[] = [];
