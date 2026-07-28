"use client";

import { useEffect, useState } from "react";

/**
 * Thin gold circular progress ring with an active loading state: the value arc
 * draws in on mount and a faint "comet" highlight rotates continuously.
 */
export function Ring({
  value,
  size = 168,
  stroke = 6,
  label,
  sublabel,
}: {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setProgress(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const offset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth={stroke}
        />
        {/* value arc (draws in) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 1200ms cubic-bezier(0.22,1,0.36,1)" }}
        />
        {/* rotating comet highlight */}
        <circle
          className="wa-ring-spin"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.06} ${circumference}`}
          style={{ transformOrigin: `${center}px ${center}px`, opacity: 0.9 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="font-num text-3xl leading-none text-ink">
          {label}
        </span>
        {sublabel && <span className="label-caps mt-1">{sublabel}</span>}
      </div>
    </div>
  );
}
