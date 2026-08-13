import {
  Anchor,
  BookOpen,
  Building2,
  Coins,
  Compass,
  Crown,
  Drama,
  Eye,
  Feather,
  Flag,
  Flame,
  FlaskConical,
  Gem,
  Hourglass,
  Key,
  Landmark,
  Layers,
  Map as MapIcon,
  Mountain,
  Package,
  Scale,
  Scroll,
  Shield,
  Skull,
  Sparkles,
  Sun,
  Swords,
  TreePine,
  Users,
  Wand2,
  Waves,
  type LucideIcon,
  Castle,
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

/**
 * Name -> component lookup for the icons the "New Category" form's icon
 * picker offers (`ICON_LIBRARY` in `world/new-category/page.tsx`) — the
 * backend stores the picked icon as a plain string (`world_categories.icon`,
 * nullable), matching this repo's own long-standing note that "backend
 * should store an icon identifier string instead" of a component reference.
 * These names must match `ICON_LIBRARY`'s `name` field exactly.
 */
export const WORLD_ICON_REGISTRY: Record<string, LucideIcon> = {
  Castle,
  Mountain,
  Building: Building2,
  Tree: TreePine,
  Landmark,
  Map: MapIcon,
  Users,
  Crown,
  Drama,
  Skull,
  Feather,
  Eye,
  Sparkles,
  Wand: Wand2,
  Flame,
  Waves,
  Compass,
  Key,
  Shield,
  Flag,
  Book: BookOpen,
  Scroll,
  Gem,
  Potion: FlaskConical,
  Anchor,
  Swords,
  Chest: Package,
  Hourglass,
  Coins,
  Scale,
};

export const DEFAULT_WORLD_ICON: LucideIcon = Layers;

export function iconForKey(name: string | null | undefined): LucideIcon {
  return (name && WORLD_ICON_REGISTRY[name]) || DEFAULT_WORLD_ICON;
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

export function worldCounts(entries: WorldEntry[]) {
  const byCategory = Object.fromEntries(
    WORLD_CATEGORIES.map((c) => [c.key, entries.filter((e) => e.category === c.key).length]),
  ) as Record<WorldCategoryKey, number>;
  return { all: entries.length, byCategory };
}

/** Entries sorted most-recently-updated first — what "Recent Entries" shows. */
export function recentEntries(entries: WorldEntry[]): WorldEntry[] {
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

export function findEntry(entries: WorldEntry[], id: string): WorldEntry | undefined {
  return entries.find((e) => e.id === id);
}
