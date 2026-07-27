import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  FileText,
  Folder,
  Globe,
  Home,
  List,
  Pencil,
  Settings,
  Sparkles,
  Target,
  User,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Primary sidebar navigation. Icons mirror the WordArchitect mockup exactly:
 * house, folder, pencil, single person, globe, list, document, sparkles,
 * target, chart, gear. Pages beyond the dashboard are stubbed for now and
 * filled in as their mockups arrive.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Projects", href: "/projects", icon: Folder },
  { label: "Writing", href: "/writing", icon: Pencil },
  { label: "Characters", href: "/characters", icon: User },
  { label: "Worldbuilding", href: "/worldbuilding", icon: Globe },
  { label: "Outlines", href: "/outlines", icon: List },
  { label: "Notes", href: "/notes", icon: FileText },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
