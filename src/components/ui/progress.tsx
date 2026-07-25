/** Hairline gold progress bar on a dark track. */
export function Progress({
  value,
  className = "",
}: {
  value: number; // 0–100
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-1 overflow-hidden rounded-full bg-surface-2 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
