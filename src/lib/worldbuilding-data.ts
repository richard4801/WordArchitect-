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
export const WORLD_ENTRIES: WorldEntry[] = [];

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

export const WORLD_TIMELINE: WorldTimelineEvent[] = [];

export function formatWorldYear(year: number): string {
  return `${year === 0 ? 0 : Math.abs(year)}`;
}

export const WORLD_OVERVIEW = {
  name: "",
  description: "",
  regions: 0,
  keyLocations: 0,
  majorNations: 0,
  yearsOfHistory: 0,
};

export type PinnedWorldItem = {
  entryId: string;
  note: string;
};

export const PINNED_WORLD_ITEMS: PinnedWorldItem[] = [];

export function findEntry(id: string): WorldEntry | undefined {
  return WORLD_ENTRIES.find((e) => e.id === id);
}
