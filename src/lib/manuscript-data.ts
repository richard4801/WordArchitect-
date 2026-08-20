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
  /** ISO timestamp of the last successful sync-to-memory, or null if never synced — see manuscript-store.ts's syncChapterToMemory(). */
  syncedToMemoryAt: string | null;
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
