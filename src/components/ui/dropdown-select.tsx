"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

/**
 * Custom single/multi-select dropdown: a themed trigger + a `.card-2` panel
 * of option rows. Exists because a native `<select>`'s OPEN state renders
 * the browser's own unstyled OS popup — completely breaking the theme — no
 * matter how the closed trigger is styled. This keeps every dropdown in the
 * app on-brand, open or closed.
 */

const TRIGGER_BASE =
  "flex w-full items-center justify-between gap-2 rounded-xl border bg-surface px-4 py-2.5 text-left text-sm focus:outline-none";

function Panel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-10 cursor-default"
      />
      <div className="card-2 absolute inset-x-0 top-full z-20 mt-1.5 max-h-60 overflow-y-auto p-2">
        {children}
      </div>
    </>
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

  return (
    <div className={`relative ${className}`}>
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

      {open && (
        <Panel onClose={() => setOpen(false)}>
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

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  return (
    <div className={`relative ${className}`}>
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

      {open && (
        <Panel onClose={() => setOpen(false)}>
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
