"use client";

import { ChevronDown, ChevronRight, Moon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { NAV_ITEMS } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();
  const [focus, setFocus] = useState(false);

  return (
    <aside
      className="fixed left-0 top-0 z-20 hidden h-dvh w-[264px] flex-col border-r border-line lg:flex"
      style={{
        position: "fixed",
        background: "linear-gradient(180deg, var(--elevated) 0%, var(--canvas) 100%)",
        boxShadow: "inset -1px 0 0 var(--card-highlight)",
      }}
    >
      {/* Grain texture behind the sidebar content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: -1,
          backgroundImage: "var(--grain-url)",
          backgroundSize: "180px 180px",
          opacity: "var(--grain-opacity)",
          mixBlendMode: "soft-light",
        }}
      />
      {/* Logo */}
      <div className="px-7 pt-8 pb-6">
        <div className="flex flex-col items-start gap-2">
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

      {/* Focus mode */}
      <div className="px-6 py-4">
        <button
          type="button"
          onClick={() => setFocus((f) => !f)}
          className="flex w-full items-center gap-3 text-sm text-ink-muted"
        >
          <Moon className="size-4" strokeWidth={1.7} />
          <span className="flex-1 text-left">Focus Mode</span>
          <span
            className={`relative h-5 w-9 rounded-full border border-line transition-colors ${
              focus ? "bg-gold/30" : "bg-surface-2"
            }`}
          >
            <span
              className={`absolute top-0.5 size-3.5 rounded-full transition-all ${
                focus ? "left-4 bg-gold" : "left-0.5 bg-ink-faint"
              }`}
            />
          </span>
        </button>
      </div>

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
                Level 7 • Storyweaver
              </p>
            </div>
          </div>
          <div className="mt-3.5">
            <Progress value={49} />
            <p className="mt-1.5 text-xs text-ink-faint">2,450 / 5,000 XP</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
