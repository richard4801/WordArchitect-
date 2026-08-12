/**
 * Mock notes data for shadows-of-elarion — matches resources/Notes.png.
 *
 * Note Folders' counts don't sum to "All Notes" in the mockup (My Notes 18 +
 * Research 5 + Inspirations 6 + Ideas 9 = 38, not 24) — same kind of
 * internal inconsistency as every other mockup this session. Folders here
 * are simply mapped onto categories (Research/Inspiration/Plot ->
 * Research/Inspirations/Ideas) and counted live, not forced to match.
 *
 * Similarly, the "Pinned Notes" rail (3 items) doesn't match every card
 * that shows a pinned star in the grid — resolved by making the rail
 * genuinely "most-recent pinned, top 3" computed live, so a note can be
 * pinned (and show its star) without appearing in the capped rail.
 */

export type NoteCategory = "World Building" | "Character" | "Plot" | "Research" | "Inspiration" | "Magic System";

export const NOTE_CATEGORY_META: Record<NoteCategory, { color: string }> = {
  "World Building": { color: "var(--success)" },
  Character: { color: "#a06cc7" },
  Plot: { color: "var(--warn)" },
  Research: { color: "var(--info)" },
  Inspiration: { color: "#e0708f" },
  "Magic System": { color: "#4fb8a8" },
};

export type NoteScene = "landscape" | "portrait" | "map" | "book" | "starfield" | "crystal";

const CATEGORY_SCENE: Record<NoteCategory, NoteScene> = {
  "World Building": "landscape",
  Character: "portrait",
  Plot: "map",
  Research: "book",
  Inspiration: "starfield",
  "Magic System": "crystal",
};

export type Note = {
  id: string;
  title: string;
  excerpt: string;
  category: NoteCategory;
  date: string;
  /** Manual chronological rank, 1 = newest. Drives "Sort: Newest". */
  dateRank: number;
  comments: number;
  pinned: boolean;
  mine: boolean;
};

export function sceneFor(note: Note): NoteScene {
  return CATEGORY_SCENE[note.category];
}

export const NOTES: Note[] = [];

export function findNote(id: string): Note | undefined {
  return NOTES.find((n) => n.id === id);
}

export function pinnedNotes(notes: Note[], limit = 3): Note[] {
  return [...notes].filter((n) => n.pinned).sort((a, b) => a.dateRank - b.dateRank).slice(0, limit);
}

export function recentNotes(notes: Note[], limit = 5): Note[] {
  return [...notes].sort((a, b) => a.dateRank - b.dateRank).slice(0, limit);
}

export type NoteFolderKey = "all" | "my-notes" | "research" | "inspirations" | "ideas" | "deleted";

export function folderCount(notes: Note[], folder: NoteFolderKey): number {
  switch (folder) {
    case "all":
      return notes.length;
    case "my-notes":
      return notes.filter((n) => n.mine).length;
    case "research":
      return notes.filter((n) => n.category === "Research").length;
    case "inspirations":
      return notes.filter((n) => n.category === "Inspiration").length;
    case "ideas":
      return notes.filter((n) => n.category === "Plot").length;
    case "deleted":
      return 0;
  }
}

export function notesInFolder(notes: Note[], folder: NoteFolderKey): Note[] {
  switch (folder) {
    case "all":
      return notes;
    case "my-notes":
      return notes.filter((n) => n.mine);
    case "research":
      return notes.filter((n) => n.category === "Research");
    case "inspirations":
      return notes.filter((n) => n.category === "Inspiration");
    case "ideas":
      return notes.filter((n) => n.category === "Plot");
    case "deleted":
      return [];
  }
}
