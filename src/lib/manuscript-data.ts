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

const SHADOWS_OF_ELARION_MANUSCRIPT: ManuscriptPart[] = [
  {
    id: "part-1",
    title: "Part I – The Awakening",
    chapters: [
      { id: "ch-1", number: 1, title: "Embers", complete: true },
      { id: "ch-2", number: 2, title: "The Call", complete: true },
      { id: "ch-3", number: 3, title: "Into the Wild", complete: true },
    ],
  },
  {
    id: "part-2",
    title: "Part II – Shadows Rise",
    chapters: [
      { id: "ch-15", number: 15, title: "Whispers", complete: true },
      { id: "ch-16", number: 16, title: "The Betrayal", complete: true },
      { id: "ch-17", number: 17, title: "Fractured Trust", complete: true },
      {
        id: "ch-18",
        number: 18,
        title: "The Silence Beyond",
        complete: false,
        scenes: [
          { id: "ch-18-s1", title: "Scene 1" },
          { id: "ch-18-s2", title: "Scene 2" },
          { id: "ch-18-s3", title: "Scene 3" },
          { id: "ch-18-s4", title: "Scene 4" },
          { id: "ch-18-s5", title: "Scene 5" },
        ],
      },
    ],
  },
  {
    id: "part-3",
    title: "Part III – The Reckoning",
    chapters: [
      { id: "ch-19", number: 19, title: "Broken Oaths", complete: false },
      { id: "ch-20", number: 20, title: "Blood and Stone", complete: false },
      { id: "ch-21", number: 21, title: "Ashes", complete: false },
      { id: "ch-22", number: 22, title: "The Crown", complete: false },
      { id: "ch-23", number: 23, title: "The Last Stand", complete: false },
    ],
  },
];

const CHAPTER_18_BODY: ChapterBody = {
  heading: "CHAPTER 18",
  title: "The Silence Beyond",
  paragraphs: [
    {
      id: "p1",
      commenter: "Jessica",
      text: "The wind howled through the broken arches of the ancient bridge, carrying with it the scent of rain and something darker—something old. Lyriana pulled her cloak tighter, her fingers brushing against the pendant at her throat.",
    },
    {
      id: "p2",
      commenter: "Michael",
      text: "“Are you sure this is the right way?” Kael’s voice was barely above a whisper.",
    },
    {
      id: "p3",
      text: "Lyriana didn’t answer. She couldn’t. The weight of the silence pressed against her, thick and unforgiving. Ahead, the ruins of Elarion loomed like a dead thing, waiting.",
    },
    {
      id: "p4",
      emphasis: true,
      commenter: "Sarah",
      text: "Some doors should never be opened.",
    },
    { id: "break-1", break: true, text: "* * *" },
    {
      id: "p5",
      text: "The closer they got, the colder the air became. Shadows clung to the stones, twisting into shapes that almost—almost—looked like eyes.",
    },
    { id: "p6", text: "Kael stopped. “Do you feel that?”" },
    { id: "p7", text: "Lyriana nodded slowly. “The city remembers us.”" },
  ],
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
  if (projectId === "shadows-of-elarion") return SHADOWS_OF_ELARION_MANUSCRIPT;
  return genericManuscript(chapterCount);
}

export function getChapterBody(projectId: string, chapter: ManuscriptChapter): ChapterBody {
  if (projectId === "shadows-of-elarion" && chapter.id === "ch-18") return CHAPTER_18_BODY;
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

export const CHAPTER_18_COMMENTS: CommentThread[] = [
  {
    id: "c1",
    author: "Jessica",
    time: "2 min ago",
    text: "Maybe we can make this more evocative? What about: “The wind screamed through the shattered arches...”",
  },
  {
    id: "c2",
    author: "Michael",
    time: "5 min ago",
    text: "I like this line! Maybe add more hesitation here.",
  },
  { id: "c3", author: "Sarah", time: "8 min ago", text: "This feels powerful 🔥" },
  {
    id: "c4",
    author: "Daniel",
    time: "15 min ago",
    text: "Should we foreshadow what's behind these doors a bit more?",
  },
];

export type CollaboratorStatus = "Editing" | "Viewing" | "Commenting";

export const ACTIVE_COLLABORATORS: { name: string; you?: boolean; status: CollaboratorStatus; tone: Commenter }[] = [
  { name: "Jessica", you: true, status: "Editing", tone: "Jessica" },
  { name: "Michael", status: "Editing", tone: "Michael" },
  { name: "Sarah", status: "Viewing", tone: "Sarah" },
  { name: "Daniel", status: "Commenting", tone: "Daniel" },
];
