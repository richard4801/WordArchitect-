import Link from "next/link";

/** Serif section title with an optional right-aligned gold action link. */
export function SectionHeading({
  title,
  actionLabel,
  actionHref = "#",
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {actionLabel && (
        <Link
          href={actionHref}
          className="text-sm text-gold transition-opacity hover:opacity-80"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
