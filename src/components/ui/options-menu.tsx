"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Small "..." action menu — trigger button + a themed dropdown of actions.
 * Same portal-to-body + viewport-tracked positioning as DropdownSelect
 * (see that file's comment for why: `.card`/`.card-2` open their own
 * stacking context, so an in-place absolutely-positioned panel can get
 * stuck behind a later sibling card no matter its z-index).
 */

const PANEL_WIDTH = 180;
const PANEL_HEIGHT_ESTIMATE = 160;

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
      const left = Math.min(Math.max(r.right - PANEL_WIDTH, 8), window.innerWidth - PANEL_WIDTH - 8);
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

export type OptionsMenuItem = {
  label: string;
  Icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
};

export function OptionsMenu({
  items,
  ariaLabel = "More options",
  buttonClassName = "grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink",
  iconClassName = "size-4",
}: {
  items: OptionsMenuItem[];
  ariaLabel?: string;
  buttonClassName?: string;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const { containerRef, rect } = usePanelPlacement(open);

  return (
    <>
      <button
        ref={containerRef}
        type="button"
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={buttonClassName}
      >
        <MoreHorizontal className={iconClassName} />
      </button>

      {open &&
        rect &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
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
                    onClick={(e) => {
                      e.stopPropagation();
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
