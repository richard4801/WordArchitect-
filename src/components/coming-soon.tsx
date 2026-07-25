import { Sparkle } from "@/components/brand-mark";

/**
 * Placeholder shown for pages whose mockups haven't landed yet. Keeps the
 * navigation coherent and on-theme until each screen is designed and built.
 */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-center py-32 text-center">
      <Sparkle className="size-8 text-gold" />
      <h1 className="mt-6 font-display text-4xl text-ink">{title}</h1>
      <p className="mt-3 max-w-md text-sm text-ink-muted">
        This chapter is still being written. The {title} workspace arrives once
        its design is ready.
      </p>
    </div>
  );
}
