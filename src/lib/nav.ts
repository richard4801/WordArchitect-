import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Feather,
  Globe2,
  LayoutDashboard,
  ListTree,
  NotebookPen,
  Settings,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Primary sidebar navigation. Mirrors the WordArchitect mockup. Pages beyond
 * the dashboard are stubbed for now and filled in as their mockups arrive.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: BookOpen },
  { label: "Writing", href: "/writing", icon: Feather },
  { label: "Characters", href: "/characters", icon: Users },
  { label: "Worldbuilding", href: "/worldbuilding", icon: Globe2 },
  { label: "Outlines", href: "/outlines", icon: ListTree },
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
