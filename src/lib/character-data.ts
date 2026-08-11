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

export type Relationship = {
  characterId: string;
  bond: string;
  description: string;
  strength: "Strong" | "Moderate" | "Tense";
};

export type CharacterArc = {
  beginning: string;
  middle: string;
  climax: string;
  end: string;
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
};

export const CHARACTERS: Character[] = [
  {
    id: "kaelen-duskryn",
    name: "Kaelen Duskryn",
    epithet: "The Reluctant King",
    role: "Main",
    age: 24,
    gender: "Male",
    occupation: "Heir of Valenor",
    location: "Valenor Castle",
    status: "Alive",
    alignment: "Lawful Good",
    roleInStory: "Hero",
    povCharacter: true,
    archetype: "The Reluctant Hero",
    quote: "I never asked for the crown. I asked for the truth — the crown is just what came with it.",
    favorites: 18,
    overview:
      "Kaelen is steady and dutiful but privately terrified of what his bloodline demands of him. He carries a prophecy he never asked for, and a kingdom's hope he isn't sure he can bear.",
    physicalDescription: [
      "Dark hair kept short, storm-grey eyes",
      "Tall, broad-shouldered, carries himself like he's used to being watched",
      "A thin scar along his jaw from a sparring match gone wrong as a boy",
      "Wears his father's signet ring on a chain, hidden rather than worn openly",
    ],
    personalityTraits: ["Dutiful", "Guarded", "Compassionate", "Stubborn", "Self-doubting", "Loyal"],
    motivations: [
      "Protect Elarion's people even at personal cost",
      "Uncover the truth behind the prophecy before it's used against him",
      "Live up to — or escape — his bloodline's legacy",
    ],
    motivation: "The weight of a bloodline he never chose and can't put down.",
    goal: "Unite the fractured kingdoms before the darkness consumes what's left of them.",
    fear: "That the power in his blood will cost him everyone he loves, the way it cost his father.",
    secret: "He's begun to suspect the prophecy isn't a gift at all — that it was built as a weapon.",
    arc: {
      beginning: "A dutiful heir clinging to the ordinary life he knows, avoiding the weight of prophecy.",
      middle: "Confronts the cost of power as the realm's true threat reveals itself.",
      climax: "Chooses between the safety of secrecy and the harder truth that could save Elarion.",
      end: "Steps into the crown not as an escape from who he was, but as who he's chosen to become.",
    },
    relationships: [
      {
        characterId: "lyriana-veyra",
        bond: "Ally",
        description: "A fellow traveler bound by fate. She challenges his walls and stands by his side through everything.",
        strength: "Strong",
      },
      {
        characterId: "eldric-thorne",
        bond: "Mentor",
        description: "Taught him to fight and to lead — the closest thing to a father Kaelen has left.",
        strength: "Strong",
      },
      {
        characterId: "seraphina-vale",
        bond: "Confidante",
        description: "The only person he tells the truth to when the crown gets too heavy.",
        strength: "Strong",
      },
      {
        characterId: "theren-blackwood",
        bond: "Rival",
        description: "Their opposing beliefs about what the bloodline is for clash often, but both seek the same truth.",
        strength: "Tense",
      },
    ],
  },
  {
    id: "lyriana-veyra",
    name: "Lyriana Veyra",
    epithet: "The Last Heir",
    role: "Main",
    age: 22,
    gender: "Female",
    occupation: "Wayfarer",
    location: "Blackspire Forest",
    status: "Alive",
    alignment: "Neutral Good",
    roleInStory: "Hero",
    povCharacter: true,
    archetype: "The Chosen One",
    quote: "Some truths are buried for a reason. But silence has a cost.",
    favorites: 12,
    overview:
      "Lyriana is a quiet but determined young woman with a mysterious past. She carries a fragment of an ancient power that many would kill to possess.",
    physicalDescription: [
      "Silver hair, always tied in a loose braid",
      "Piercing grey eyes with a hint of gold",
      "5'6\", lean and agile",
      "Faint moon-shaped birthmark on her left collarbone",
      "Wears a silver pendant given by her mother",
    ],
    personalityTraits: ["Determined", "Introspective", "Compassionate", "Observant", "Stubborn", "Loyal"],
    motivations: [
      "Discover the truth about her past",
      "Protect those she cares about",
      "Prevent an ancient prophecy from coming true",
    ],
    motivation: "A past she can't remember, and a power she never asked to carry.",
    goal: "Find out who she really is before the fragment she carries destroys her.",
    fear: "That the power inside her isn't hers to control — and never was.",
    arc: {
      beginning: "A lost wayfarer running from a past she can't remember.",
      middle: "Uncovers hidden truths and embraces the power within her.",
      climax: "Faces the choice between sacrifice, power, or breaking the cycle.",
      end: "Becomes the light the world needs — on her own terms.",
    },
    relationships: [
      {
        characterId: "kaelen-duskryn",
        bond: "Allies",
        description: "A fellow traveler bound by fate. He challenges her walls and stands by her side through everything.",
        strength: "Strong",
      },
      {
        characterId: "eldric-thorne",
        bond: "Mentor",
        description: "Teaches her to control her power. Sees the potential in her that others fear.",
        strength: "Moderate",
      },
      {
        characterId: "seraphina-vale",
        bond: "Friend",
        description: "A childhood friend who knows her secrets and remains fiercely loyal.",
        strength: "Strong",
      },
      {
        characterId: "theren-blackwood",
        bond: "Rival",
        description: "Their opposing beliefs clash often, but both seek the same truth.",
        strength: "Tense",
      },
    ],
  },
  {
    id: "eldric-thorne",
    name: "Eldric Thorne",
    epithet: "The Commander",
    role: "Supporting",
    age: 41,
    gender: "Male",
    occupation: "Captain of the Valenor Guard",
    location: "Valenor Castle",
    status: "Alive",
    alignment: "Lawful Good",
    roleInStory: "Mentor",
    povCharacter: false,
    quote: "A blade is only as steady as the hand that's learned to be afraid and move anyway.",
    favorites: 8,
    overview:
      "A war-hardened commander who served Kaelen's father and now trains the next generation — including Kaelen and Lyriana — whether they want the lesson or not.",
    physicalDescription: ["Broad-built, close-cropped beard going grey at the edges", "A long scar across one forearm from the border wars"],
    personalityTraits: ["Disciplined", "Gruff", "Protective", "Plainspoken"],
    motivations: ["Keep the heirs he's sworn to protect alive long enough to matter"],
    relationships: [],
  },
  {
    id: "seraphina-vale",
    name: "Seraphina Vale",
    epithet: "The Silent Oath",
    role: "Supporting",
    age: 23,
    gender: "Female",
    occupation: "Court Scribe",
    location: "Valenor Castle",
    status: "Alive",
    alignment: "Neutral Good",
    roleInStory: "Confidante",
    povCharacter: false,
    quote: "I keep everyone's secrets. It's easier than deciding which ones matter.",
    favorites: 9,
    overview:
      "Kaelen's childhood friend and the castle's quietest source of real information — she reads every letter that crosses the court and forgets none of it.",
    physicalDescription: ["Dark hair often ink-stained at the fingertips", "Keeps a small dagger she's never had to use"],
    personalityTraits: ["Perceptive", "Loyal", "Guarded", "Dry-witted"],
    motivations: ["Protect Kaelen from the court's worst instincts, including his own"],
    relationships: [],
  },
  {
    id: "theren-blackwood",
    name: "Theren Blackwood",
    epithet: "The Shadow",
    role: "Supporting",
    age: 29,
    gender: "Male",
    occupation: "Former Royal Spy",
    location: "Ashvale Village",
    status: "Alive",
    alignment: "Chaotic Neutral",
    roleInStory: "Rival",
    povCharacter: false,
    favorites: 6,
    overview:
      "Once loyal to the crown, Theren broke from Valenor when he learned what the bloodline prophecy actually costs — and he's convinced Kaelen is next.",
    physicalDescription: ["Lean, moves without a sound", "Always in dark, unmarked traveling clothes"],
    personalityTraits: ["Cynical", "Sharp", "Distrustful", "Principled, in his own way"],
    motivations: ["Stop the prophecy from being used again, whatever it takes"],
    relationships: [],
  },
  {
    id: "maelis-brightwraith",
    name: "Maelis Brightwraith",
    epithet: "The Mystic",
    role: "Supporting",
    age: 35,
    gender: "Female",
    occupation: "Hedge Mage",
    location: "The Sunken Chapel",
    status: "Alive",
    alignment: "True Neutral",
    roleInStory: "Guide",
    povCharacter: false,
    favorites: 7,
    overview:
      "A wandering mystic who reads the old omens better than anyone left alive. She speaks in riddles because the truth rarely survives being said plainly.",
    physicalDescription: ["Silver-streaked hair, sharp pale eyes", "Wears charms that chime softly when she walks"],
    personalityTraits: ["Cryptic", "Patient", "Unshakeable", "Kind, underneath it"],
    motivations: ["Guide the bloodline heir to the truth before the old omens run out of time"],
    relationships: [],
  },
  {
    id: "ravik-stonefist",
    name: "Ravik Stonefist",
    epithet: "The Scout",
    role: "Supporting",
    age: 27,
    gender: "Male",
    occupation: "Ranger",
    location: "Ember Pass",
    status: "Alive",
    alignment: "Neutral Good",
    roleInStory: "Ally",
    povCharacter: false,
    favorites: 5,
    overview: "Grew up in Ember Pass and knows every safe crossing in the fractured realm — invaluable when the direct roads aren't safe anymore.",
    physicalDescription: ["Weathered, sun-browned, built for long marches"],
    personalityTraits: ["Practical", "Easygoing", "Fiercely loyal once earned"],
    motivations: ["Get the people he's guiding home in one piece"],
    relationships: [],
  },
  {
    id: "ilyra-moonwhisper",
    name: "Ilyra Moonwhisper",
    epithet: "The Dreamer",
    role: "Minor",
    age: 16,
    gender: "Female",
    occupation: "Apprentice Healer",
    location: "Duskwood Forest",
    status: "Alive",
    alignment: "Chaotic Good",
    roleInStory: "Minor Ally",
    povCharacter: false,
    favorites: 4,
    overview: "A young healer whose dreams have started matching events before they happen — a gift she's not sure she wants.",
    physicalDescription: ["Elven-featured, dark curling hair"],
    personalityTraits: ["Curious", "Anxious", "Kind"],
    motivations: ["Understand what her dreams are trying to warn her about"],
    relationships: [],
  },
  {
    id: "captain-varek",
    name: "Captain Varek",
    epithet: "The Loyal",
    role: "Minor",
    age: 45,
    gender: "Male",
    occupation: "Garrison Captain",
    location: "Ironhold Fortress",
    status: "Alive",
    alignment: "Lawful Good",
    roleInStory: "Minor Ally",
    povCharacter: false,
    favorites: 3,
    overview: "Commands Ironhold's garrison and has never once broken an oath, even when it would have been easier to.",
    physicalDescription: ["Grizzled, iron-grey beard, old armor kept spotless"],
    personalityTraits: ["Steadfast", "Blunt", "Dependable"],
    motivations: ["Hold the fortress until reinforcements — or the end — arrives"],
    relationships: [],
  },
  {
    id: "the-oracle",
    name: "The Oracle",
    epithet: "The Seer",
    role: "Minor",
    age: 0,
    gender: "Unknown",
    occupation: "Keeper of the Sunken Chapel",
    location: "The Sunken Chapel",
    status: "Alive",
    alignment: "True Neutral",
    roleInStory: "Prophet",
    povCharacter: false,
    favorites: 3,
    overview: "No one remembers the Oracle's real name, or how long they've kept vigil at the Sunken Chapel. They speak only when the prophecy shifts.",
    physicalDescription: ["Face always hidden beneath a hooded veil"],
    personalityTraits: ["Enigmatic", "Detached", "Unnervingly calm"],
    motivations: ["Preserve the truth of the prophecy, no matter who it burns"],
    relationships: [],
  },
  {
    id: "high-priest-malgor",
    name: "High Priest Malgor",
    epithet: "The Keeper",
    role: "Minor",
    age: 58,
    gender: "Male",
    occupation: "High Priest of Valenor",
    location: "Valenor Castle",
    status: "Alive",
    alignment: "Lawful Neutral",
    roleInStory: "Gatekeeper",
    povCharacter: false,
    favorites: 2,
    overview: "Guards the old rites and older secrets of the bloodline prophecy — and decides, often alone, which ones anyone else gets to know.",
    physicalDescription: ["Stooped with age, sharp watchful eyes"],
    personalityTraits: ["Devout", "Secretive", "Rigid"],
    motivations: ["Protect the old rites, even from the heir they were written for"],
    relationships: [],
  },
  {
    id: "lady-valora",
    name: "Lady Valora",
    epithet: "The Diplomat",
    role: "Minor",
    age: 38,
    gender: "Female",
    occupation: "Emissary of the Southern Courts",
    location: "Valenor Castle",
    status: "Alive",
    alignment: "True Neutral",
    roleInStory: "Political Foil",
    povCharacter: false,
    favorites: 2,
    overview: "Arrives at Valenor to negotiate an alliance, and quietly makes clear that the Southern Courts' patience has a price.",
    physicalDescription: ["Impeccably dressed, never without a fan concealing her expression"],
    personalityTraits: ["Composed", "Calculating", "Charming"],
    motivations: ["Secure the Southern Courts' advantage, whoever ends up on the throne"],
    relationships: [],
  },
  {
    id: "jonas",
    name: "Jonas",
    epithet: "Town Guard",
    role: "Extra",
    age: 26,
    gender: "Male",
    occupation: "Town Guard",
    location: "Ashvale Village",
    status: "Alive",
    alignment: "Lawful Neutral",
    roleInStory: "Extra",
    povCharacter: false,
    favorites: 1,
    overview: "Stands watch at Ashvale's gate and knows every piece of gossip that passes through it.",
    physicalDescription: [],
    personalityTraits: ["Chatty", "Easily distracted"],
    motivations: [],
    relationships: [],
  },
  {
    id: "mira",
    name: "Mira",
    epithet: "Tavern Keeper",
    role: "Extra",
    age: 34,
    gender: "Female",
    occupation: "Tavern Keeper",
    location: "Ashvale Village",
    status: "Alive",
    alignment: "Neutral Good",
    roleInStory: "Extra",
    povCharacter: false,
    favorites: 1,
    overview: "Runs the only tavern in Ashvale worth stopping at, and hears more true rumors than the guard ever will.",
    physicalDescription: [],
    personalityTraits: ["Warm", "Shrewd"],
    motivations: [],
    relationships: [],
  },
  {
    id: "old-harn",
    name: "Old Harn",
    epithet: "Village Elder",
    role: "Extra",
    age: 71,
    gender: "Male",
    occupation: "Village Elder",
    location: "Ashvale Village",
    status: "Alive",
    alignment: "Lawful Good",
    roleInStory: "Extra",
    povCharacter: false,
    favorites: 1,
    overview: "Remembers the last time the bloodline prophecy stirred, and isn't shy about saying it didn't end well.",
    physicalDescription: [],
    personalityTraits: ["Superstitious", "Stubborn"],
    motivations: [],
    relationships: [],
  },
  {
    id: "selin",
    name: "Selin",
    epithet: "Street urchin",
    role: "Extra",
    age: 11,
    gender: "Female",
    occupation: "Street urchin",
    location: "Valenor Castle",
    status: "Alive",
    alignment: "Chaotic Good",
    roleInStory: "Extra",
    povCharacter: false,
    favorites: 1,
    overview: "Knows every alley and rooftop in the lower city, and sells that knowledge to whoever pays best — usually Seraphina.",
    physicalDescription: [],
    personalityTraits: ["Quick", "Fearless"],
    motivations: [],
    relationships: [],
  },
];

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
