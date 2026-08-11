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

const STATUS_COLOR: Record<BeatStatus, BeatColor> = {
  completed: "green",
  inProgress: "gold",
  planned: "purple",
  notStarted: "gray",
};

function beat(
  b: Omit<Beat, "color" | "id"> & { id?: string },
): Beat {
  return { id: b.id ?? `beat-${b.number}`, color: STATUS_COLOR[b.status], ...b };
}

export const THREE_ACT_STRUCTURE: Act[] = [
  {
    id: "act-1",
    label: "Act I – Setup",
    shortLabel: "Act I",
    color: "green",
    beats: [
      beat({
        number: 1,
        title: "Opening Image",
        purpose: "Introduce the world and the protagonist in their ordinary life.",
        description:
          "Show the world through the protagonist's eyes. Establish tone, setting, and mood.",
        chapterLabel: "Chapter 1",
        sceneCount: 1,
        status: "completed",
        pov: "Kaelen Duskryn",
        location: "Valenor Castle",
        time: "Day",
        mood: "Calm, Nostalgic",
        characters: ["Kaelen Duskryn"],
        notes: [
          "Kaelen is content but feels there's more beyond the walls.",
          "This scene sets up his longing for adventure.",
        ],
      }),
      beat({
        number: 2,
        title: "Theme Stated",
        purpose: "The theme is hinted at or stated through dialogue or action.",
        description:
          "A minor character voices the story's central question, half in passing — the protagonist doesn't register its weight yet.",
        chapterLabel: "Chapter 1",
        sceneCount: 1,
        status: "completed",
        pov: "Kaelen Duskryn",
        location: "Valenor Castle — Library",
        time: "Day",
        mood: "Reflective",
        characters: ["Kaelen Duskryn", "Seraphine Vale"],
        notes: ["Seraphine's line here should echo again at the finale."],
      }),
      beat({
        number: 3,
        title: "Set-Up",
        purpose: "Build the world, introduce key characters and the status quo.",
        description:
          "Widen the lens: the court, the kingdom's fading light, and the people Kaelen will have to leave behind.",
        chapterLabel: "Chapter 1–2",
        sceneCount: 3,
        status: "completed",
        pov: "Kaelen Duskryn",
        location: "Valenor Castle",
        time: "Day",
        mood: "Uneasy",
        characters: ["Kaelen Duskryn", "Seraphine Vale", "Lord Malachar"],
        notes: ["Plant Malachar's first appearance as merely 'unsettling', not villainous yet."],
      }),
      beat({
        number: 4,
        title: "Catalyst",
        purpose: "An event occurs that changes everything.",
        description:
          "The ancient prophecy stirs and Kaelen's bloodline is exposed — there's no going back to the ordinary life.",
        chapterLabel: "Chapter 2",
        sceneCount: 1,
        status: "completed",
        pov: "Kaelen Duskryn",
        location: "The Sunken Chapel",
        time: "Night",
        mood: "Shaken",
        characters: ["Kaelen Duskryn"],
        notes: ["Keep the prophecy's wording ambiguous — pays off in Act III."],
      }),
      beat({
        number: 5,
        title: "Debate",
        purpose: "The protagonist debates the change, weighing risks and rewards.",
        description:
          "Kaelen argues with Seraphine over whether the bloodline is a gift or a curse. He isn't ready to say yes.",
        chapterLabel: "Chapter 2",
        sceneCount: 2,
        status: "inProgress",
        pov: "Kaelen Duskryn",
        location: "Valenor Castle — Courtyard",
        time: "Dusk",
        mood: "Tense",
        characters: ["Kaelen Duskryn", "Seraphine Vale"],
        notes: ["This is the scene currently being drafted — needs a stronger midpoint beat of doubt."],
      }),
      beat({
        number: 6,
        title: "Break into Two",
        purpose: "The protagonist commits to the journey.",
        description:
          "Kaelen chooses to leave Valenor Castle behind, crossing fully into the story's second world.",
        chapterLabel: "Chapter 3",
        sceneCount: 1,
        status: "notStarted",
        pov: "Kaelen Duskryn",
        location: "Elarion's Gate",
        time: "Dawn",
        mood: "Resolute",
        characters: ["Kaelen Duskryn"],
        notes: [],
      }),
    ],
  },
  {
    id: "act-2",
    label: "Act II – Confrontation",
    shortLabel: "Act II",
    color: "purple",
    beats: [
      beat({
        number: 7,
        title: "B Story",
        purpose: "Introduce the subplot that will run alongside the main plot.",
        description:
          "Rhoswen Ashvale enters, carrying a grudge against the crown that will complicate Kaelen's trust in everyone around him.",
        chapterLabel: "Chapter 3–4",
        sceneCount: 3,
        status: "completed",
        pov: "Kaelen Duskryn",
        location: "Duskwood Forest",
        time: "Day",
        mood: "Wary",
        characters: ["Kaelen Duskryn", "Rhoswen Ashvale"],
        notes: [],
      }),
      beat({
        number: 8,
        title: "Fun and Games",
        purpose: "The protagonist pursues their goal, facing obstacles.",
        description:
          "The 'promise of the premise' — Kaelen tests his growing power against a string of escalating threats across the fractured realm.",
        chapterLabel: "Chapter 4–7",
        sceneCount: 8,
        status: "completed",
        pov: "Kaelen Duskryn",
        location: "Ember Pass",
        time: "Day",
        mood: "Determined",
        characters: ["Kaelen Duskryn", "Rhoswen Ashvale"],
        notes: ["Longest stretch of the outline — watch pacing across 8 scenes."],
      }),
      beat({
        number: 9,
        title: "Midpoint",
        purpose: "A major shift that raises the stakes and changes the direction.",
        description:
          "Kaelen learns Malachar isn't hunting the bloodline — he's protecting the realm from what it wakes.",
        chapterLabel: "Chapter 7",
        sceneCount: 1,
        status: "inProgress",
        pov: "Kaelen Duskryn",
        location: "Ironhold Fortress",
        time: "Night",
        mood: "Reeling",
        characters: ["Kaelen Duskryn", "Lord Malachar"],
        notes: ["The reveal needs to recontextualize every Malachar scene before it — draft carefully."],
      }),
      beat({
        number: 10,
        title: "Bad Guys Close In",
        purpose: "Pressure increases; the antagonist gains ground.",
        description:
          "The realm's true threat closes in faster than expected, and the fellowship starts to fracture under the pressure.",
        chapterLabel: "Chapter 8–10",
        sceneCount: 5,
        status: "notStarted",
        pov: "Kaelen Duskryn",
        location: "The Shattered Bridge",
        time: "Night",
        mood: "Desperate",
        characters: ["Kaelen Duskryn", "Rhoswen Ashvale", "Lord Malachar"],
        notes: [],
      }),
      beat({
        number: 11,
        title: "All Is Lost",
        purpose: "The lowest point; the protagonist seems defeated.",
        description:
          "Kaelen loses someone he can't get back, and the bloodline he was so sure would save Elarion looks like it may doom it.",
        chapterLabel: "Chapter 10",
        sceneCount: 1,
        status: "notStarted",
        pov: "Kaelen Duskryn",
        location: "The Hollow Vale",
        time: "Night",
        mood: "Grief",
        characters: ["Kaelen Duskryn"],
        notes: ["The 'whiff of death' beat — consider what/who is actually lost here."],
      }),
    ],
  },
  {
    id: "act-3",
    label: "Act III – Resolution",
    shortLabel: "Act III",
    color: "blue",
    beats: [
      beat({
        number: 12,
        title: "Dark Night of the Soul",
        purpose: "The protagonist reflects and prepares for the final push.",
        description:
          "Alone with what the prophecy actually costs him, Kaelen has to decide who he's willing to become to finish this.",
        chapterLabel: "Chapter 11",
        sceneCount: 2,
        status: "notStarted",
        pov: "Kaelen Duskryn",
        location: "Ravenspire Keep",
        time: "Night",
        mood: "Somber",
        characters: ["Kaelen Duskryn"],
        notes: [],
      }),
      beat({
        number: 13,
        title: "Break into Three",
        purpose: "The protagonist takes decisive action toward victory.",
        description:
          "Armed with the midpoint's truth, Kaelen chooses the harder, riskier plan over the safe one.",
        chapterLabel: "Chapter 11",
        sceneCount: 1,
        status: "notStarted",
        pov: "Kaelen Duskryn",
        location: "Ravenspire Keep",
        time: "Dawn",
        mood: "Resolute",
        characters: ["Kaelen Duskryn", "Seraphine Vale", "Rhoswen Ashvale"],
        notes: [],
      }),
      beat({
        number: 14,
        title: "Finale",
        purpose: "The final confrontation and climax.",
        description:
          "The fractured kingdoms converge at Valenor Castle for the confrontation the whole outline has been building toward.",
        chapterLabel: "Chapter 11–12",
        sceneCount: 4,
        status: "notStarted",
        pov: "Kaelen Duskryn",
        location: "Valenor Castle",
        time: "Night",
        mood: "Triumphant",
        characters: ["Kaelen Duskryn", "Lord Malachar", "Seraphine Vale", "Rhoswen Ashvale"],
        notes: ["The four-scene climax — outline each scene separately before drafting."],
      }),
      beat({
        number: 15,
        title: "Final Image",
        purpose: "A return to the opening image, changed.",
        description:
          "A mirrored beat of the opening — same castle, same light, but Kaelen (and Elarion) is not who he was on page one.",
        chapterLabel: "Chapter 12",
        sceneCount: 1,
        status: "notStarted",
        pov: "Kaelen Duskryn",
        location: "Valenor Castle",
        time: "Day",
        mood: "Bittersweet",
        characters: ["Kaelen Duskryn"],
        notes: [],
      }),
    ],
  },
];

export function allBeats(): Beat[] {
  return THREE_ACT_STRUCTURE.flatMap((act) => act.beats);
}

export function totalScenes(): number {
  return allBeats().reduce((sum, b) => sum + b.sceneCount, 0);
}
