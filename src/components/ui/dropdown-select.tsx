"use client";

import { Check, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Custom single/multi-select dropdown: a themed trigger + a `.card-2` panel
 * of option rows. Exists because a native `<select>`'s OPEN state renders
 * the browser's own unstyled OS popup — completely breaking the theme — no
 * matter how the closed trigger is styled. This keeps every dropdown in the
 * app on-brand, open or closed.
 *
 * The panel is rendered through a portal into document.body rather than as
 * a normal absolutely-positioned child. `.card`/`.card-2` set `z-index: 0`
 * on a `position: relative` element to layer their own inner glow/shadow —
 * which also opens a new stacking context. A panel positioned inside one
 * card can never paint above a later sibling card no matter how high its
 * own z-index goes, since stacking is resolved per-context and cards are
 * compared to each other in DOM order. Escaping to body sidesteps that
 * entirely (and any future ancestor `overflow: hidden` too).
 */

const TRIGGER_BASE =
  "flex w-full items-center justify-between gap-2 rounded-xl border bg-surface px-4 py-2.5 text-left text-sm focus:outline-none";

// Panel height estimate (max-h-60 = 240px + the top/bottom margin gap).
const PANEL_HEIGHT_ESTIMATE = 256;

type PanelRect = { top: number; bottom: number; left: number; width: number; openUpward: boolean };

/**
 * Tracks the trigger's viewport position while the panel is open, flipping
 * the panel above the trigger when there isn't enough room below — without
 * this, a trigger low on a long form opens a panel that renders off-screen.
 * Recomputed on open and kept in sync with scroll/resize since the panel
 * is now positioned in fixed/viewport space, independent of the trigger's
 * scrolling ancestor.
 */
function usePanelPlacement(open: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
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
      setRect({ top: r.bottom, bottom: window.innerHeight - r.top, left: r.left, width: r.width, openUpward });
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

function Panel({
  children,
  onClose,
  rect,
}: {
  children: React.ReactNode;
  onClose: () => void;
  rect: PanelRect;
}) {
  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div
        className="fixed z-50"
        style={{
          left: rect.left,
          width: rect.width,
          ...(rect.openUpward ? { bottom: rect.bottom + 6 } : { top: rect.top + 6 }),
        }}
      >
        <div className="card-2 max-h-60 overflow-y-auto p-2">{children}</div>
      </div>
    </>,
    document.body,
  );
}

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  triggerClassName = "",
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
  triggerClassName?: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { containerRef, rect } = usePanelPlacement(open);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${TRIGGER_BASE} ${value ? "text-ink" : "text-ink-faint"} ${
          error ? "border-danger" : "border-line focus:border-line-strong"
        } ${triggerClassName}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && rect && (
        <Panel onClose={() => setOpen(false)} rect={rect}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {o}
              {value === o && <Check className="size-3.5 shrink-0 text-gold" />}
            </button>
          ))}
        </Panel>
      )}
    </div>
  );
}

export function MultiSelectDropdown({
  value,
  onChange,
  options,
  placeholder,
  className = "",
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { containerRef, rect } = usePanelPlacement(open);

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${TRIGGER_BASE} border-line focus:border-line-strong ${
          value.length ? "text-ink" : "text-ink-faint"
        }`}
      >
        <span className="truncate">{value.length ? value.join(", ") : placeholder}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && rect && (
        <Panel onClose={() => setOpen(false)} rect={rect}>
          {options.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <input
                type="checkbox"
                checked={value.includes(s)}
                onChange={() => toggle(s)}
                className="accent-gold"
              />
              {s}
            </label>
          ))}
        </Panel>
      )}
    </div>
  );
}
