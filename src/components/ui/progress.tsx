"use client";

import { useEffect, useState } from "react";

/**
 * Gold progress bar with an active loading state: the fill animates in from 0
 * on mount and a light streak sweeps across it continuously.
 */
export function Progress({
  value,
  className = "",
}: {
  value: number; // 0–100
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  return (
    <div
      className={`h-1 overflow-hidden rounded-full bg-surface-2 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="wa-fill h-full rounded-full" style={{ width: `${width}%` }}>
        <span className="wa-shimmer" />
      </div>
    </div>
  );
}
