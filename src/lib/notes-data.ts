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

export const NOTES: Note[] = [
  { id: "blackspire-forest", title: "The Blackspire Forest", excerpt: "An ancient forest shrouded in perpetual mist. The trees are towering and twisted, their bark black as obsidian. Whispers roam between the trunks…", category: "World Building", date: "May 23, 2026", dateRank: 1, comments: 12, pinned: true, mine: true },
  { id: "lyrianas-past", title: "Lyriana's Past", excerpt: "Notes on Lyriana Veyra's childhood, her training with the Keepers, and the night that changed everything. Key memories and emotional anchors…", category: "Character", date: "May 23, 2026", dateRank: 2, comments: 8, pinned: true, mine: true },
  { id: "fall-of-house-veyra", title: "The Fall of House Veyra", excerpt: "Outline the key events of the betrayal — who was involved, what really happened that night, and the aftermath that shaped Lyriana's path.", category: "Plot", date: "May 23, 2026", dateRank: 3, comments: 15, pinned: true, mine: true },
  { id: "ancient-languages", title: "Ancient Languages", excerpt: "Research on the ancient tongue spoken by the Keepers. Possible translations, runes, and how it relates to Lyriana's bloodline and abilities.", category: "Research", date: "May 23, 2026", dateRank: 4, comments: 6, pinned: false, mine: true },
  { id: "quote-power-choice", title: "Quote: Power & Choice", excerpt: "\"Power is not given, it is taken. But true strength lies in what you choose to protect.\" — A reminder for Lyriana's arc.", category: "Inspiration", date: "May 21, 2026", dateRank: 5, comments: 3, pinned: false, mine: false },
  { id: "veyran-empire", title: "Veyran Empire", excerpt: "The Veyran Empire — once united under the righteous crown, now divided by greed, ancient bloodlines, and political manipulation.", category: "World Building", date: "May 20, 2026", dateRank: 6, comments: 9, pinned: true, mine: true },
  { id: "kaelen-duskryn", title: "Kaelen Duskryn", excerpt: "The reluctant king. Torn between duty and desire. Notes on his personality, fears, and his bond with Lyriana.", category: "Character", date: "May 19, 2026", dateRank: 7, comments: 11, pinned: false, mine: true },
  { id: "bloodline-magic", title: "Bloodline Magic", excerpt: "How bloodline magic works, limiters, and what makes Lyriana different. Connection to the ancient source.", category: "Magic System", date: "May 18, 2026", dateRank: 8, comments: 7, pinned: false, mine: true },
  { id: "key-plot-twists", title: "Key Plot Twists", excerpt: "A list of major twists to be revealed in Acts 2 and 3. Foreshadowing ideas and red herrings to keep suspense high.", category: "Plot", date: "May 18, 2026", dateRank: 9, comments: 5, pinned: true, mine: true },
  { id: "the-keepers", title: "The Keepers", excerpt: "The ancient order sworn to protect the balance between light and shadow. Their history, ideals, and current state.", category: "World Building", date: "May 17, 2026", dateRank: 10, comments: 6, pinned: false, mine: true },
  { id: "medieval-weapons", title: "Medieval Weapons", excerpt: "Types of swords, daggers, and armor used in the Veyran Empire. Useful for battle scenes realism.", category: "Research", date: "May 16, 2026", dateRank: 11, comments: 4, pinned: false, mine: true },
  { id: "ancient-pendant", title: "Ancient Pendant", excerpt: "The pendant reacts to strong emotion — fear, grief, resolve. Still unclear whether it amplifies power or just responds to it.", category: "Magic System", date: "May 16, 2026", dateRank: 12, comments: 5, pinned: false, mine: true },
  { id: "council-meeting-notes", title: "Council Meeting Notes", excerpt: "Minutes from the war council scene — who spoke, who stayed silent, and what that silence is meant to signal later.", category: "Plot", date: "May 15, 2026", dateRank: 13, comments: 2, pinned: false, mine: false },
  { id: "dream-sequence-ideas", title: "Dream Sequence Ideas", excerpt: "Recurring imagery for Lyriana's dreams — a burning castle, a shadowed figure calling her name. Possible foreshadowing device.", category: "Inspiration", date: "May 14, 2026", dateRank: 14, comments: 4, pinned: false, mine: false },
  { id: "maps-and-locations", title: "Maps & Locations", excerpt: "Working list of named places that still need coordinates on the world map before the next draft pass.", category: "World Building", date: "May 13, 2026", dateRank: 15, comments: 3, pinned: false, mine: true },
  { id: "symbolism-light-shadow", title: "Symbolism in Light & Shadow", excerpt: "Track every instance of light/shadow imagery — it should escalate toward the climax, not just decorate individual scenes.", category: "Inspiration", date: "May 12, 2026", dateRank: 16, comments: 6, pinned: false, mine: false },
  { id: "eldrics-backstory", title: "Eldric's Backstory", excerpt: "What Eldric actually saw during the border wars, and why he's never told Kaelen the full version.", category: "Character", date: "May 11, 2026", dateRank: 17, comments: 5, pinned: false, mine: true },
  { id: "the-silent-oath", title: "The Silent Oath", excerpt: "Seraphina's private vow to protect Kaelen from the court's worst instincts — including his own. Origins and what it costs her.", category: "Character", date: "May 10, 2026", dateRank: 18, comments: 4, pinned: false, mine: true },
  { id: "prophecy-fragments", title: "Prophecy Fragments", excerpt: "Partial transcriptions from the sealed study texts. Missing lines to reconstruct before the reveal in Act 3.", category: "Research", date: "May 9, 2026", dateRank: 19, comments: 7, pinned: false, mine: true },
  { id: "celestial-order-motives", title: "The Celestial Order's Motives", excerpt: "Working theory: they don't want the prophecy stopped, they want it controlled. Needs a scene to confirm on the page.", category: "Plot", date: "May 8, 2026", dateRank: 20, comments: 6, pinned: false, mine: true },
  { id: "naming-conventions", title: "Naming Conventions", excerpt: "House names lean Latinate, place names lean Old English — keep that split consistent for anything new.", category: "Inspiration", date: "May 7, 2026", dateRank: 21, comments: 2, pinned: false, mine: false },
  { id: "light-manipulation-mechanics", title: "Light Manipulation Mechanics", excerpt: "Rules for what Lyriana's power can and can't do — mostly to stop it from quietly solving problems it shouldn't.", category: "Magic System", date: "May 6, 2026", dateRank: 22, comments: 5, pinned: false, mine: true },
  { id: "court-politics-valenor", title: "Court Politics of Valenor", excerpt: "Who owes who what, going into the succession crisis. A quick-reference so the political scenes stay consistent.", category: "World Building", date: "May 5, 2026", dateRank: 23, comments: 3, pinned: false, mine: false },
  { id: "therens-betrayal-draft", title: "Theren's Betrayal (Draft Scene)", excerpt: "First pass at the scene where Theren's true loyalties surface. Needs another pass — currently too on-the-nose.", category: "Plot", date: "May 4, 2026", dateRank: 24, comments: 8, pinned: false, mine: true },
];

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
