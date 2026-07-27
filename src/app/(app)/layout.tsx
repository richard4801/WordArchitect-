import { Bell, Search } from "lucide-react";
import { PageBackground } from "@/components/page-background";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Shared application shell: full-bleed hero background + fixed sidebar + a
 * scrollable main column with a slim top bar. Every authenticated page
 * renders inside this group.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <PageBackground />
      <Sidebar />
      <div className="relative flex min-h-dvh min-w-0 flex-col lg:pl-[264px]">
        <header className="flex items-center justify-end gap-2 px-5 py-4 sm:px-8">
          <button
            type="button"
            aria-label="Search"
            className="grid size-9 place-items-center rounded-full border border-line text-ink-muted transition-colors hover:text-gold hover:border-line-strong"
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="grid size-9 place-items-center rounded-full border border-line text-ink-muted transition-colors hover:text-gold hover:border-line-strong"
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
