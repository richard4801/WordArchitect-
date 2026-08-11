"use client";

import { Bell, Mail, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PageBackground } from "@/components/page-background";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { hydrateSidebarCollapsed, useFocusModeActive, useSidebarCollapsed } from "@/lib/ui-store";

/**
 * Shared application shell: fixed sidebar + a scrollable main column with a
 * slim top bar. Every authenticated page renders inside this group. The
 * oracle-face hero background is dashboard-only (per design: it "should only
 * exist in the home"), so it's gated on the route here rather than living in
 * every page.
 *
 * The sidebar's collapsed/expanded state is a user-initiated toggle (see
 * ui-store.ts), not tied to any particular route — it applies everywhere,
 * so the content column's own left padding has to track it here too or a
 * collapsed sidebar leaves a dead gap.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === "/";
  // The manuscript editor, the outliner, and the characters workspace are
  // all full-bleed pages with their own top bar — they replace the standard
  // header entirely, same as their mockups (too much horizontal content —
  // mode/structure sidebar, multi-column board, list+detail rail — to fit
  // the standard tab-chrome + right-rail project layout).
  const isFullBleedWorkspace = /^\/projects\/[^/]+\/(chapters|outlines|characters)/.test(pathname);
  const [collapsed] = useSidebarCollapsed();
  const focusModeActive = useFocusModeActive();

  useEffect(() => {
    hydrateSidebarCollapsed();
  }, []);

  if (isFullBleedWorkspace) {
    return (
      <div className="relative h-dvh overflow-hidden">
        {!focusModeActive && <Sidebar />}
        <div
          className={`relative h-dvh min-w-0 ${
            focusModeActive ? "" : collapsed ? "lg:pl-[72px]" : "lg:pl-[264px]"
          }`}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      {isDashboard && <PageBackground />}
      <Sidebar />
      <div
        className={`relative flex min-h-dvh min-w-0 flex-col overflow-x-clip ${
          collapsed ? "lg:pl-[72px]" : "lg:pl-[264px]"
        }`}
      >
        <header className="flex items-center gap-3 px-5 py-4 sm:px-8">
          <div className="btn-raised flex min-w-0 flex-1 items-center gap-2 rounded-full px-4 py-2 text-sm text-ink-faint sm:max-w-sm">
            <Search className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">Search anything...</span>
            <kbd className="label-caps shrink-0 rounded-md border border-line-strong px-1.5 py-0.5 text-[0.6rem]">
              ⌘K
            </kbd>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              className="btn-raised relative grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-gold" />
            </button>
            <button
              type="button"
              aria-label="Messages"
              className="btn-raised grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
            >
              <Mail className="size-4" />
            </button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-5 pb-12 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
