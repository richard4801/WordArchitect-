"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Hero background — a landscape "eye reflecting a distant castle" piece,
 * generated wide (16:9-ish) so background-size: cover fills its band with
 * no cropping into either the eye or the castle. Positioned `absolute` at
 * the top of the page (not `fixed`) so it scrolls away with the content
 * like a normal banner, rather than staying pinned to the viewport.
 *
 * The band has an explicit height (`h-[100vh]`) rather than stretching to
 * the page's full scroll height — `cover` needs a sane, fixed box to size
 * against, or a tall dashboard would scale/crop the image unpredictably.
 * Since the band necessarily ends somewhere, its bottom is masked into a
 * fade so that termination isn't a visible hard edge; the fade is on the
 * image alone (no separate wash/overlay layer, no color, just alpha).
 *
 * The eye's iris tracks the cursor. The source PSDs
 * (resources/Live eye {dark,light}.psd) keep the iris as its own layer,
 * clipped by a raster mask that defines the visible socket opening — the
 * same mask Photoshop uses to composite it is exported here and reused as
 * a CSS mask-image, so the iris can slide underneath it via a JS-driven
 * transform while the mask (not JS) is what guarantees it never spills
 * outside the eye. bg/iris/mask PNGs below were all extracted directly
 * from those PSDs (see the layer offsets + raster mask), not hand-drawn.
 *
 * Light and dark are matched compositions, so one position works for both
 * and the eye never moves on theme toggle. Both theme stacks are mounted
 * (toggled via the `dark:` variant, same as the rest of the app's
 * light/dark handling) rather than JS-selected, so there's no
 * theme-resolution hydration flash — the browser only fetches the
 * currently-visible stack's images since the other is `display: none`.
 */

const IMG_W = 1672;
const IMG_H = 941;

type EyeAsset = {
  bg: string;
  iris: string;
  mask: string;
  /** Iris rest position, in source-image pixel space (from the PSD's raster mask center). */
  center: { x: number; y: number };
  /**
   * Max iris travel per direction, in source-image pixels. Derived from the
   * PSD assets themselves: for each direction, the furthest the iris can
   * slide while at least ~90% of its resting visible-through-the-mask area
   * stays visible (i.e. motion stays subtle — a sliver of sclera opens up,
   * the iris never gets clipped in half against the socket edge).
   */
  travel: { left: number; right: number; up: number; down: number };
};

const EYES: Record<"dark" | "light", EyeAsset> = {
  dark: {
    bg: "/hero-dark-bg.png",
    iris: "/hero-dark-iris.png",
    mask: "/hero-dark-iris-mask.png",
    center: { x: 1286.7, y: 260.0 },
    travel: { left: 32, right: 50, up: 29, down: 25 },
  },
  light: {
    bg: "/hero-light-bg.png",
    iris: "/hero-light-iris.png",
    mask: "/hero-light-iris-mask.png",
    center: { x: 1424.7, y: 254.2 },
    travel: { left: 26, right: 51, up: 24, down: 18 },
  },
};

/** Cursor distance (CSS px) at which the iris reaches its full clamped travel. */
const FALLOFF_PX = 550;
/** Per-frame easing toward the target offset — lower = lazier, more fluid. */
const EASE = 0.12;

function heroPosFraction(): { x: number; y: number } {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--hero-pos").trim();
  const [xStr, yStr] = raw.split(/\s+/);
  const parse = (v: string | undefined) => (v?.endsWith("%") ? parseFloat(v) / 100 : 0.5);
  return { x: parse(xStr), y: parse(yStr) };
}

function useIrisTracking(containerRef: React.RefObject<HTMLDivElement | null>) {
  const irisRefs = useRef<Record<"dark" | "light", HTMLImageElement | null>>({
    dark: null,
    light: null,
  });
  const targets = useRef({ dark: { x: 0, y: 0 }, light: { x: 0, y: 0 } });
  const current = useRef({ dark: { x: 0, y: 0 }, light: { x: 0, y: 0 } });

  const setDarkIrisRef = useCallback((el: HTMLImageElement | null) => {
    irisRefs.current.dark = el;
  }, []);
  const setLightIrisRef = useCallback((el: HTMLImageElement | null) => {
    irisRefs.current.light = el;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function eyeScreenCenter(asset: EyeAsset) {
      const rect = container!.getBoundingClientRect();
      const pos = heroPosFraction();
      const scale = Math.max(rect.width / IMG_W, rect.height / IMG_H);
      const dispW = IMG_W * scale;
      const dispH = IMG_H * scale;
      const offX = (rect.width - dispW) * pos.x;
      const offY = (rect.height - dispH) * pos.y;
      return {
        x: rect.left + offX + asset.center.x * scale,
        y: rect.top + offY + asset.center.y * scale,
        scale,
      };
    }

    function onMouseMove(e: MouseEvent) {
      (Object.keys(EYES) as (keyof typeof EYES)[]).forEach((theme) => {
        const asset = EYES[theme];
        const { x: ex, y: ey, scale } = eyeScreenCenter(asset);
        const dx = e.clientX - ex;
        const dy = e.clientY - ey;
        const dist = Math.hypot(dx, dy);
        const falloff = Math.min(1, dist / FALLOFF_PX);
        const angle = Math.atan2(dy, dx);
        const nx = Math.cos(angle) * falloff;
        const ny = Math.sin(angle) * falloff;

        const maxX = nx >= 0 ? asset.travel.right : asset.travel.left;
        const maxY = ny >= 0 ? asset.travel.down : asset.travel.up;

        targets.current[theme] = { x: nx * maxX * scale, y: ny * maxY * scale };
      });
    }

    let raf = 0;
    function tick() {
      (Object.keys(EYES) as (keyof typeof EYES)[]).forEach((theme) => {
        const cur = current.current[theme];
        const tgt = targets.current[theme];
        cur.x += (tgt.x - cur.x) * EASE;
        cur.y += (tgt.y - cur.y) * EASE;
        const el = irisRefs.current[theme];
        if (el) el.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMouseMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf);
    };
  }, [containerRef]);

  return { dark: setDarkIrisRef, light: setLightIrisRef };
}

function EyeStack({
  theme,
  visibilityClass,
  irisRef,
}: {
  theme: "dark" | "light";
  visibilityClass: string;
  irisRef: (el: HTMLImageElement | null) => void;
}) {
  const asset = EYES[theme];
  return (
    <div className={`absolute inset-0 ${visibilityClass}`}>
      <img
        src={asset.bg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "var(--hero-pos)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          maskImage: `url(${asset.mask})`,
          WebkitMaskImage: `url(${asset.mask})`,
          maskSize: "cover",
          WebkitMaskSize: "cover",
          maskPosition: "var(--hero-pos)",
          WebkitMaskPosition: "var(--hero-pos)",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      >
        <img
          ref={irisRef}
          src={asset.iris}
          alt=""
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          style={{ objectPosition: "var(--hero-pos)" }}
        />
      </div>
    </div>
  );
}

export function PageBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const setIrisRef = useIrisTracking(containerRef);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-50 h-[100vh] overflow-hidden"
      style={{ backgroundColor: "var(--canvas)" }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          maskImage: "linear-gradient(to bottom, #000 0%, #000 78%, transparent 98%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 78%, transparent 98%)",
        }}
      >
        <EyeStack theme="light" visibilityClass="dark:hidden" irisRef={setIrisRef.light} />
        <EyeStack theme="dark" visibilityClass="hidden dark:block" irisRef={setIrisRef.dark} />
      </div>
    </div>
  );
}
