/**
 * Mock data for the Outliner's Three Act Structure board — matches
 * resources/Outliner Three Act.png exactly for beat titles, board
 * descriptions ("purpose"), chapter labels, scene counts, and status. The
 * mockup only ever shows its right-rail detail panel expanded for beat 1
 * ("Opening Image"), so that beat's extended fields (description, POV,
 * location, time, mood, characters, notes) are copied verbatim; every other
 * beat's extended fields are plausible in-world filler consistent with the
 * shadows-of-elarion project's existing cast (Kaelen Duskryn) and tone.
 */

export type BeatStatus = "completed" | "inProgress" | "planned" | "notStarted";
export type BeatColor = "green" | "gold" | "purple" | "blue" | "rose" | "gray";

export type Beat = {
  id: string;
  number: number;
  title: string;
  /** Short line shown on the board card and as "Purpose" in the detail panel. */
  purpose: string;
  /** Longer craft note, detail panel only. */
  description: string;
  chapterLabel: string;
  sceneCount: number;
  status: BeatStatus;
  color: BeatColor;
  pov: string;
  location: string;
  time: string;
  mood: string;
  characters: string[];
  notes: string[];
};

export type Act = {
  id: string;
  label: string;
  shortLabel: string;
  color: "green" | "purple" | "blue";
  beats: Beat[];
};

// The three act containers are structural scaffolding for the board (every
// beat has to live under an act), not seed content — so unlike every beat
// that used to fill them, they stay in place with zero beats rather than
// being purged to an empty array, which would leave the Outliner with
// nowhere to add a first beat to.
export const THREE_ACT_STRUCTURE: Act[] = [
  { id: "act-1", label: "Act I – Setup", shortLabel: "Act I", color: "green", beats: [] },
  { id: "act-2", label: "Act II – Confrontation", shortLabel: "Act II", color: "purple", beats: [] },
  { id: "act-3", label: "Act III – Resolution", shortLabel: "Act III", color: "blue", beats: [] },
];

export function allBeats(): Beat[] {
  return THREE_ACT_STRUCTURE.flatMap((act) => act.beats);
}

export function totalScenes(): number {
  return allBeats().reduce((sum, b) => sum + b.sceneCount, 0);
}
