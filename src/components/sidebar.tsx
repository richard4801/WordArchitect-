"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Progress } from "@/components/ui/progress";
import { NAV_ITEMS, UTILITY_NAV_ITEMS } from "@/lib/nav";
import { useProjects } from "@/lib/project-store";

export function Sidebar() {
  const pathname = usePathname();
  const isNewUser = useProjects().length === 0;

  return (
    <aside
      // Forced to the dark palette regardless of the app's light/dark toggle:
      // the artwork below is a dark, gold-inked panel, so the sidebar's own
      // text/border/card colours must stay the dark-theme values to read on
      // it. `.dark` here re-applies every `--var` the dark theme block sets,
      // scoped to this subtree only (see globals.css `.dark { ... }`).
      className="dark fixed left-0 top-0 z-20 hidden h-dvh w-[264px] flex-col border-r border-line lg:flex"
      style={{
        position: "fixed",
        // The ornate astrolabe/constellation panel (resources/sidebar-bg.webp)
        // was authored to the sidebar's proportions: corner flourishes anchor
        // to the four corners, and its near-black fill matches the app canvas.
        // Stretched 100%/100% so those corners always land exactly on the
        // sidebar's actual corners regardless of viewport height.
        backgroundImage: "url(/sidebar-bg.webp)",
        backgroundSize: "100% 100%",
        backgroundPosition: "top left",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0a0a0b",
      }}
    >
      {/* Darkening overlay: a flat black wash over the artwork so the sidebar
          reads darker while the gold constellation linework still shows
          through (plain opacity, not a blend mode, so it stays a true tint
          rather than crushing the gold to grey). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: -1, backgroundColor: "#000000", opacity: 0.45 }}
      />

      {/* Logo */}
      <div className="px-7 pt-8 pb-6">
        <div className="flex flex-col items-start gap-2">
          <BrandMark className="size-6 text-gold" />
          <div className="font-display text-2xl leading-none tracking-wide text-ink">
            WORD<span className="text-gold">ARCHITECT</span>
          </div>
          <p className="label-caps text-[0.6rem]">Write. Craft. Conquer.</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="scroll-slim flex-1 overflow-y-auto px-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-surface-2 text-ink"
                      : "text-ink-muted hover:bg-surface-2/60 hover:text-ink"
                  }`}
                >
                  <Icon
                    className={`size-[18px] ${active ? "text-gold" : ""}`}
                    strokeWidth={1.7}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="size-4 text-gold" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Utility nav — Settings, Help & Feedback */}
      <nav className="px-4 pb-2">
        <ul className="flex flex-col gap-1">
          {UTILITY_NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-surface-2 text-ink"
                      : "text-ink-muted hover:bg-surface-2/60 hover:text-ink"
                  }`}
                >
                  <Icon className={`size-[18px] ${active ? "text-gold" : ""}`} strokeWidth={1.7} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile — a clean, self-contained panel */}
      <div className="px-4 pb-5 pt-3">
        <div className="card-2 p-4">
          <div className="flex items-center gap-3">
            <span
              className="size-10 shrink-0 rounded-full border border-line-strong bg-cover"
              style={{ backgroundImage: "var(--hero)", backgroundPosition: "60% 36%" }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-medium text-ink"
              >
                <span className="truncate">Jessica</span>
                <ChevronDown className="size-3.5 shrink-0 text-ink-muted" />
              </button>
              <p className="truncate text-xs text-ink-muted">
                {isNewUser ? "New Writer" : "Level 7 • Storyweaver"}
              </p>
            </div>
          </div>
          {isNewUser ? (
            <Link
              href="/settings"
              className="mt-3.5 block w-full rounded-lg bg-gold py-2 text-center text-xs font-medium text-gold-contrast transition-opacity hover:opacity-90"
            >
              Upgrade
            </Link>
          ) : (
            <div className="mt-3.5">
              <Progress value={49} />
              <p className="mt-1.5 text-xs text-ink-faint">2,450 / 5,000 XP</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
