"use client";

import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Same portal-to-body + viewport-tracked positioning as `OptionsMenu`
 * (`ui/options-menu.tsx`) — a `.card`/`.card-2` ancestor opens its own
 * stacking context, so an in-place absolutely-positioned panel can get
 * stuck behind a later sibling card no matter its z-index. Not shared
 * with `OptionsMenu` itself since that component's trigger is a fixed
 * "..." icon button; this one needs an arbitrary trigger (the sidebar's
 * own name+chevron), which its API doesn't support.
 */

const PANEL_WIDTH = 200;
const PANEL_HEIGHT_ESTIMATE = 120;

type PanelRect = { top: number; bottom: number; left: number; openUpward: boolean };

function usePanelPlacement(open: boolean) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<PanelRect | null>(null);

  useLayoutEffect(() => {
    if (!open || !containerRef.current) {
      setRect(null);
      return;
    }
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      const openUpward = spaceBelow < PANEL_HEIGHT_ESTIMATE && spaceAbove > spaceBelow;
      const left = Math.min(Math.max(r.left, 8), window.innerWidth - PANEL_WIDTH - 8);
      setRect({ top: r.bottom, bottom: window.innerHeight - r.top, left, openUpward });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  return { containerRef, rect };
}

export type UserMenuItem = { label: string; Icon?: LucideIcon; onClick: () => void; danger?: boolean };

export function UserMenu({ trigger, items }: { trigger: ReactNode; items: UserMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const { containerRef, rect } = usePanelPlacement(open);

  return (
    <>
      <button ref={containerRef} type="button" onClick={() => setOpen((o) => !o)} className="block w-full text-left">
        {trigger}
      </button>

      {open &&
        rect &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              className="fixed z-50"
              style={{
                left: rect.left,
                width: PANEL_WIDTH,
                ...(rect.openUpward ? { bottom: rect.bottom + 6 } : { top: rect.top + 6 }),
              }}
            >
              <div className="card-2 overflow-hidden p-1.5">
                {items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      item.onClick();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      item.danger ? "text-danger hover:bg-danger/10" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {item.Icon && <item.Icon className="size-3.5 shrink-0" />}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
