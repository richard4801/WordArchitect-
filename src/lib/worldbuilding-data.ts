import {
  Drama,
  Flag,
  Gem,
  Hourglass,
  Mountain,
  Shield,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";

/**
 * Mock worldbuilding data for shadows-of-elarion — matches resources/
 * Worldbuilding.png and resources/Create New Category (Worldbuilding).png.
 *
 * The mockup's own numbers don't add up (tab row sums to 24, but the
 * Categories grid's 8 cards sum to 31) — same kind of internal
 * inconsistency as the earlier Characters mockups. Rather than reproduce
 * the bug, every count here is derived live from the actual seed data
 * below, which mirrors the Categories grid's per-category counts exactly
 * (8+4+3+4+3+2+2+5 = 31 entries).
 */

export type WorldCategoryKey =
  | "places"
  | "nations"
  | "cultures"
  | "history"
  | "magic"
  | "factions"
  | "religion"
  | "items";

export type WorldCategoryMeta = {
  key: WorldCategoryKey;
  label: string;
  description: string;
  Icon: LucideIcon;
  color: string;
};

export const WORLD_CATEGORIES: WorldCategoryMeta[] = [
  { key: "places", label: "Places", description: "Towns, cities, landmarks, dungeons, and more.", Icon: Mountain, color: "var(--success)" },
  { key: "nations", label: "Nations", description: "Kingdoms, empires, alliances, and states.", Icon: Flag, color: "var(--info)" },
  { key: "cultures", label: "Cultures", description: "Races, traditions, customs, and beliefs.", Icon: Drama, color: "#a06cc7" },
  { key: "history", label: "History", description: "Historical events, wars, and timelines.", Icon: Hourglass, color: "var(--warn)" },
  { key: "magic", label: "Magic", description: "Magic systems, abilities, and rules.", Icon: Sparkles, color: "#4fb8a8" },
  { key: "factions", label: "Factions", description: "Groups, organizations, and secret orders.", Icon: Shield, color: "var(--danger)" },
  { key: "religion", label: "Religion", description: "Deities, temples, and spiritual beliefs.", Icon: Sun, color: "var(--gold)" },
  { key: "items", label: "Items & Artifacts", description: "Legendary items, relics, and artifacts.", Icon: Gem, color: "#6c7bcf" },
];

export function findCategory(key: WorldCategoryKey): WorldCategoryMeta {
  return WORLD_CATEGORIES.find((c) => c.key === key)!;
}

export type WorldEntry = {
  id: string;
  name: string;
  category: WorldCategoryKey;
  summary: string;
  /** Hours ago, authoritative for sorting — "updated" is derived, not stored. */
  updatedHours: number;
};

export function formatAgo(hours: number): string {
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

// Ordered so the top 5 by updatedHours match the mockup's "Recent Entries"
// exactly: Blackspire Forest (Places), Kingdom of Valenor (Nations), The
// Eclipse War (History), The Veilborn (Cultures), The Celestial Order
// (Factions) — everything else is deliberately further out.
export const WORLD_ENTRIES: WorldEntry[] = [
  // Places (8)
  { id: "blackspire-forest", name: "Blackspire Forest", category: "places", summary: "A misted, ancient wood where the trees are said to remember the Age of Myths.", updatedHours: 2 },
  { id: "valenor-castle", name: "Valenor Castle", category: "places", summary: "Seat of House Duskryn, its towers visible from three days' ride in any direction.", updatedHours: 80 },
  { id: "the-frostmarches", name: "The Frostmarches", category: "places", summary: "A frozen borderland of clan-holds, glaciers, and half-forgotten watchtowers.", updatedHours: 90 },
  { id: "eldoria", name: "Eldoria", category: "places", summary: "A loose confederation of free cities, each governed by its own merchant council.", updatedHours: 95 },
  { id: "the-shattered-sea", name: "The Shattered Sea", category: "places", summary: "Named for the reef of broken islands said to be the wreckage of a fallen god.", updatedHours: 100 },
  { id: "the-great-wastes", name: "The Great Wastes", category: "places", summary: "A scorched southern expanse left behind by the Eclipse War, still unsettled.", updatedHours: 105 },
  { id: "the-sunken-chapel", name: "The Sunken Chapel", category: "places", summary: "A half-submerged shrine where Maelis Brightwraith keeps her vigil.", updatedHours: 110 },
  { id: "ashvale-village", name: "Ashvale Village", category: "places", summary: "A quiet border settlement, and Theren Blackwood's last known home.", updatedHours: 115 },

  // Nations (4)
  { id: "kingdom-of-valenor", name: "Kingdom of Valenor", category: "nations", summary: "The realm Kaelen now stands to inherit, built on a prophecy older than its throne.", updatedHours: 5 },
  { id: "veyran-empire", name: "The Veyran Empire", category: "nations", summary: "A once-revered lineage fallen from grace the night House Veyra was betrayed.", updatedHours: 85 },
  { id: "frostmarch-clans", name: "The Frostmarch Clans", category: "nations", summary: "Loosely allied clan-holds bound more by survival than by any crown.", updatedHours: 120 },
  { id: "free-cities-of-eldoria", name: "The Free Cities of Eldoria", category: "nations", summary: "Independent merchant-cities that answer to no king, only to trade.", updatedHours: 125 },

  // Cultures (3)
  { id: "the-veilborn", name: "The Veilborn", category: "cultures", summary: "Those said to be born under a solar eclipse — watched closely, trusted rarely.", updatedHours: 48 },
  { id: "the-keepers", name: "The Keepers", category: "cultures", summary: "A secretive order that trains the gifted in secret, Lyriana among them.", updatedHours: 130 },
  { id: "the-ashvale-folk", name: "The Ashvale Folk", category: "cultures", summary: "Border villagers whose oral histories preserve what the capital forgot.", updatedHours: 135 },

  // History (4)
  { id: "the-eclipse-war", name: "The Eclipse War", category: "history", summary: "A brutal war three centuries past that reshaped the world forever.", updatedHours: 24 },
  { id: "age-of-myths", name: "The Age of Myths", category: "history", summary: "The rise of the gods and the first civilizations of Elarion.", updatedHours: 140 },
  { id: "great-unification", name: "The Great Unification", category: "history", summary: "The forging of the first alliance between the fractured early nations.", updatedHours: 145 },
  { id: "fall-of-house-veyra", name: "The Fall of House Veyra", category: "history", summary: "The betrayal that left Lyriana the sole survivor of her line.", updatedHours: 150 },

  // Magic (3)
  { id: "ancient-prophecy", name: "The Ancient Prophecy", category: "magic", summary: "The bloodline prophecy Kaelen was never meant to inherit — or so he thought.", updatedHours: 155 },
  { id: "light-manipulation", name: "Light Manipulation", category: "magic", summary: "An ancient power tied to House Veyra's bloodline, and Lyriana's to command.", updatedHours: 160 },
  { id: "blood-bound-magic", name: "Blood Bound Magic", category: "magic", summary: "Magic that answers only to lineage — the reason bloodlines matter at all.", updatedHours: 165 },

  // Factions (2)
  { id: "the-celestial-order", name: "The Celestial Order", category: "factions", summary: "A shadowy order whose interest in the prophecy predates Kaelen's birth.", updatedHours: 72 },
  { id: "royal-guard-of-valenor", name: "The Royal Guard of Valenor", category: "factions", summary: "Sworn protectors of the crown, commanded by Eldric Thorne.", updatedHours: 170 },

  // Religion (2)
  { id: "cult-of-the-eclipse", name: "The Cult of the Eclipse", category: "religion", summary: "Zealots who believe the Eclipse War was a mercy, not a tragedy.", updatedHours: 175 },
  { id: "old-gods-of-elarion", name: "The Old Gods of Elarion", category: "religion", summary: "Deities largely unworshipped now, but never quite forgotten.", updatedHours: 180 },

  // Items & Artifacts (5)
  { id: "the-elarion-map", name: "The Elarion Map", category: "items", summary: "The only known complete map of the continent, redrawn after the Eclipse War.", updatedHours: 185 },
  { id: "the-silver-pendant", name: "The Silver Pendant", category: "items", summary: "Given to Lyriana by her mother — it reacts, faintly, to her emotions.", updatedHours: 190 },
  { id: "signet-ring", name: "Kaelen's Signet Ring", category: "items", summary: "His father's ring, worn on a chain rather than his hand.", updatedHours: 195 },
  { id: "prophecy-scrolls", name: "The Prophecy Scrolls", category: "items", summary: "Sealed texts found in Kaelen's father's private study.", updatedHours: 200 },
  { id: "ancient-pendant", name: "The Ancient Pendant", category: "items", summary: "A companion piece to the Silver Pendant, its whereabouts unknown.", updatedHours: 205 },
];

export function worldCounts(entries: WorldEntry[] = WORLD_ENTRIES) {
  const byCategory = Object.fromEntries(
    WORLD_CATEGORIES.map((c) => [c.key, entries.filter((e) => e.category === c.key).length]),
  ) as Record<WorldCategoryKey, number>;
  return { all: entries.length, byCategory };
}

/** Entries sorted most-recently-updated first — what "Recent Entries" shows. */
export function recentEntries(entries: WorldEntry[] = WORLD_ENTRIES): WorldEntry[] {
  return [...entries].sort((a, b) => a.updatedHours - b.updatedHours);
}

export type WorldTimelineEvent = {
  year: number;
  title: string;
  description: string;
};

export const WORLD_TIMELINE: WorldTimelineEvent[] = [
  { year: -3000, title: "The Age of Myths", description: "Rise of the gods and the first civilizations." },
  { year: -1842, title: "The Great Unification", description: "Nations form and the first alliance is forged." },
  { year: -423, title: "The Eclipse War", description: "A brutal war that reshaped the world forever." },
  { year: 0, title: "The Present Age", description: "A fragile peace in a world on the edge." },
];

export function formatWorldYear(year: number): string {
  return `${year === 0 ? 0 : Math.abs(year)}`;
}

export const WORLD_OVERVIEW = {
  name: "Elarion",
  description:
    "Elarion is a vast and ancient world shaped by forgotten gods, lost empires, and the endless struggle between light and shadow. From the towering spires of Valenor to the misty depths of the Blackspire Forest, every corner holds secrets—and dangers.",
  regions: 7,
  keyLocations: 12,
  majorNations: 4,
  yearsOfHistory: 3842,
};

export type PinnedWorldItem = {
  entryId: string;
  note: string;
};

export const PINNED_WORLD_ITEMS: PinnedWorldItem[] = [
  { entryId: "valenor-castle", note: "The heart of the kingdom." },
  { entryId: "ancient-prophecy", note: "A prophecy that shapes the main plot." },
  { entryId: "the-elarion-map", note: "The complete world map." },
];

export function findEntry(id: string): WorldEntry | undefined {
  return WORLD_ENTRIES.find((e) => e.id === id);
}
