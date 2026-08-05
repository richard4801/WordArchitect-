"use client";

import { Bell, Search } from "lucide-react";
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
        <header className="flex items-center justify-end gap-2 px-5 py-4 sm:px-8">
          <button
            type="button"
            aria-label="Search"
            className="btn-raised grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="btn-raised grid size-9 place-items-center rounded-full text-ink-muted transition-all hover:text-gold"
          >
            <Bell className="size-4" />
          </button>
          <ThemeToggle />
        </header>
        <main className="flex-1 px-5 pb-12 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
