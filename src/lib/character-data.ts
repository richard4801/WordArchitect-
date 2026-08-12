/**
 * Mock character roster for shadows-of-elarion — matches the "All
 * Characters" / "Characters" / "+ New Character" mockups (resources/
 * All Characters.png, Characters.png, + New Character.png) for structure,
 * roles, counts, and card content.
 *
 * One adaptation from the mockup: the mockup's example data features
 * "Lyriana Veyra" as the default-selected hero. This project's protagonist
 * is already established elsewhere in the app (dashboard, project logline,
 * the Outliner) as Kaelen Duskryn, "a reluctant heir" — which the mockup's
 * OWN second Main character happens to match almost exactly ("Kaelen
 * Duskryn — The Reluctant King"). So Kaelen is the default-selected
 * character here instead of Lyriana, and carries the mockup's full level of
 * profile detail (physical description, traits, motivations, arc,
 * relationships); Lyriana stays in the roster as a fellow Main character.
 * Every other name/role/count is taken directly from the mockup's visible
 * page 1 grid (page 2 isn't shown, so the roster is the 16 characters that
 * actually appear rather than padded to the mockup's on-screen "18").
 */

export type CharacterRole = "Main" | "Supporting" | "Minor" | "Extra";

/**
 * The backend's `codex_relationships.bond_type` is a freeform
 * VARCHAR(100) with no CHECK constraint (unlike `strength` below) — no
 * creation UI exists for relationships yet, so this stays a plain
 * `string` rather than the fixed set `BOND_META` happens to have art for
 * today. `BOND_META` lookups fall back to a default color for any bond
 * text outside that set.
 */
export type RelationshipBond = string;

export type Relationship = {
  characterId: string;
  bond: RelationshipBond;
  description: string;
  strength: "Strong" | "Moderate" | "Tense" | "Weak";
};

export type CharacterArc = {
  beginning: string;
  middle: string;
  climax: string;
  end: string;
};

export type LifeEventType = "milestone" | "personal" | "conflict" | "achievement" | "discovery";

export type LifeEvent = {
  year: number;
  title: string;
  description: string;
  type: LifeEventType;
};

export type CulturalBackground = {
  origin: string;
  upbringing: string;
  education: string;
  beliefs: string;
  languages: string;
};

export type CharacterNote = {
  title: string;
  body: string;
  date: string;
  pinned?: boolean;
};

export type Character = {
  id: string;
  name: string;
  nickname?: string;
  epithet: string;
  role: CharacterRole;
  age: number;
  gender: string;
  occupation: string;
  location: string;
  status: string;
  alignment: string;
  roleInStory: string;
  povCharacter: boolean;
  archetype?: string;
  quote?: string;
  favorites: number;
  overview: string;
  physicalDescription: string[];
  personalityTraits: string[];
  motivations: string[];
  motivation?: string;
  goal?: string;
  fear?: string;
  secret?: string;
  arc?: CharacterArc;
  relationships: Relationship[];
  background?: string[];
  lifeEvents?: LifeEvent[];
  culturalBackground?: CulturalBackground;
  strengths?: string[];
  weaknesses?: string[];
  internalConflict?: string;
  notes?: CharacterNote[];
};

export const CHARACTERS: Character[] = [];

export function findCharacter(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

export function characterCounts(list: Character[] = CHARACTERS) {
  return {
    all: list.length,
    main: list.filter((c) => c.role === "Main").length,
    supporting: list.filter((c) => c.role === "Supporting").length,
    minor: list.filter((c) => c.role === "Minor").length,
    extra: list.filter((c) => c.role === "Extra").length,
    withArcs: list.filter((c) => c.arc).length,
    withRelationships: list.filter((c) => c.relationships.length > 0).length,
  };
}
