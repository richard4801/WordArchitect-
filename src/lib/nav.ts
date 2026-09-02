import type { LucideIcon } from "lucide-react";
import {
  Clock,
  FileText,
  Folder,
  Globe,
  HelpCircle,
  Home,
  LayoutTemplate,
  List,
  Pencil,
  Settings,
  Sparkles,
  User,
  Workflow,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Primary sidebar navigation — the main workspace sections. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Projects", href: "/projects", icon: Folder },
  { label: "Writing", href: "/writing", icon: Pencil },
  { label: "Outliner", href: "/outlines", icon: List },
  { label: "Planning", href: "/planning", icon: Workflow },
  { label: "Characters", href: "/characters", icon: User },
  { label: "Worldbuilding", href: "/worldbuilding", icon: Globe },
  { label: "Timeline", href: "/timeline", icon: Clock },
  { label: "Notes", href: "/notes", icon: FileText },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles },
  { label: "Templates", href: "/templates", icon: LayoutTemplate },
];

/** Secondary/utility nav, set apart from the main list near the bottom. */
export const UTILITY_NAV_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help & Feedback", href: "/help", icon: HelpCircle },
];
