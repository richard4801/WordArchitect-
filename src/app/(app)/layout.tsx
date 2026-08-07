"use client";

import { Bell, ChevronDown, Mail, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { PageBackground } from "@/components/page-background";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Shared application shell: fixed sidebar + a scrollable main column with a
 * slim top bar. Every authenticated page renders inside this group. The
 * oracle-face hero background is dashboard-only (per design: it "should only
 * exist in the home"), so it's gated on the route here rather than living in
 * every page.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === "/";

  return (
    <div className="relative min-h-dvh">
      {isDashboard && <PageBackground />}
      <Sidebar />
      <div className="relative flex min-h-dvh min-w-0 flex-col overflow-x-clip lg:pl-[264px]">
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
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" />
            </button>
            <button
              type="button"
              aria-label="Messages"
              className="btn-raised relative grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
            >
              <Mail className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" />
            </button>
            <ThemeToggle />
            <button
              type="button"
              aria-label="Account"
              className="btn-raised flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5"
            >
              <span
                className="size-7 shrink-0 rounded-full border border-line-strong bg-cover"
                style={{ backgroundImage: "var(--hero)", backgroundPosition: "60% 36%" }}
                aria-hidden
              />
              <ChevronDown className="size-3.5 text-ink-muted" />
            </button>
          </div>
        </header>
        <main className="flex-1 px-5 pb-12 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
