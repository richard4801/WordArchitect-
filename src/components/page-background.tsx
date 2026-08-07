"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 * a CSS mask-image. bg/iris/mask PNGs were all extracted directly from
 * those PSDs (layer offsets + raster mask), not hand-drawn.
 *
 * IMPORTANT: the background/iris <img> elements and the mask wrapper all
 * get their cover-fit geometry (scale, displayed size, offset) computed
 * *once, in JS* (computeGeometry below) and applied as identical explicit
 * pixel values, rather than relying on `background-size:cover` /
 * `object-fit:cover` / `mask-size:cover` to independently compute the same
 * crop. Those are three different CSS features — nothing guarantees a
 * browser resolves them to bit-identical geometry, and any drift between
 * the mask and the image is exactly what lets the iris visibly spill
 * outside the socket. Driving all three from one shared JS computation
 * removes that risk entirely instead of hoping the keywords agree.
 *
 * Travel is also clamped with a full polar sweep (24 angles, not just the
 * 4 cardinal directions) — an early version scaled the horizontal and
 * vertical max independently, which is safe on-axis but overshoots on a
 * diagonal cursor angle (the combined vector can exceed either axis limit
 * on its own). See EYES[].travel below.
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
   * Max iris travel, in source-image pixels, sampled at 24 angles around a
   * full circle (index 0 = 0°/right, going counter-clockwise... actually
   * clockwise in screen space since +y is down — see angleToRadius).
   * Derived from the PSD assets: for each angle, the furthest the iris can
   * slide in that direction while at least ~90% of its resting
   * visible-through-the-mask area stays visible (motion stays subtle — a
   * sliver of sclera opens up, the iris never clips against the socket
   * edge). Computed by sweeping every angle, not just up/down/left/right,
   * so diagonal motion is bounded just as precisely as cardinal motion.
   */
  travel: number[];
};

const EYES: Record<"dark" | "light", EyeAsset> = {
  dark: {
    bg: "/hero-dark-bg.png",
    iris: "/hero-dark-iris.png",
    mask: "/hero-dark-iris-mask.png",
    center: { x: 1286.7, y: 260.0 },
    travel: [
      50, 47, 38, 31, 27, 25, 25, 25, 27, 28, 31, 32, 32, 31, 29, 28, 28, 28, 29, 33, 38, 45, 50,
      50,
    ],
  },
  light: {
    bg: "/hero-light-bg.png",
    iris: "/hero-light-iris.png",
    mask: "/hero-light-iris-mask.png",
    center: { x: 1424.7, y: 254.2 },
    travel: [
      51, 44, 31, 24, 20, 19, 18, 19, 20, 21, 24, 26, 26, 26, 25, 24, 23, 23, 24, 27, 30, 38, 49,
      54,
    ],
  },
};

/** Cursor distance (CSS px) at which the iris reaches its full clamped travel. */
const FALLOFF_PX = 550;
/** Per-frame easing toward the target offset — lower = lazier, more fluid. */
const EASE = 0.12;

/** Linear-interpolate the safe travel radius at `angle` (radians) from the 24-sample sweep. */
function angleToRadius(travel: number[], angle: number): number {
  const n = travel.length;
  const step = (2 * Math.PI) / n;
  let a = angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  const i0 = Math.floor(a / step);
  const i1 = (i0 + 1) % n;
  const t = (a - i0 * step) / step;
  return travel[i0] * (1 - t) + travel[i1] * t;
}

type Geometry = { scale: number; dispW: number; dispH: number; offX: number; offY: number };

function heroPosFraction(): { x: number; y: number } {
  // SSR / pre-hydration fallback — mirrors --hero-pos in globals.css. Only
  // used for the very first paint; the real value is read from computed
  // CSS the moment ResizeObserver fires client-side.
  if (typeof window === "undefined") return { x: 0.75, y: 0.3 };
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--hero-pos").trim();
  const [xStr, yStr] = raw.split(/\s+/);
  const parse = (v: string | undefined) => (v?.endsWith("%") ? parseFloat(v) / 100 : 0.5);
  return { x: parse(xStr), y: parse(yStr) };
}

function computeGeometry(width: number, height: number): Geometry {
  const pos = heroPosFraction();
  const scale = Math.max(width / IMG_W, height / IMG_H);
  const dispW = IMG_W * scale;
  const dispH = IMG_H * scale;
  return {
    scale,
    dispW,
    dispH,
    offX: (width - dispW) * pos.x,
    offY: (height - dispH) * pos.y,
  };
}

function useCoverGeometry(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [geometry, setGeometry] = useState<Geometry>(() => computeGeometry(IMG_W, IMG_H));
  const geometryRef = useRef(geometry);

  useEffect(() => {
    geometryRef.current = geometry;
  }, [geometry]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      setGeometry(computeGeometry(rect.width, rect.height));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return { geometry, geometryRef };
}

function useIrisTracking(
  containerRef: React.RefObject<HTMLDivElement | null>,
  geometryRef: React.RefObject<Geometry>,
) {
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
      const g = geometryRef.current;
      return {
        x: rect.left + g.offX + asset.center.x * g.scale,
        y: rect.top + g.offY + asset.center.y * g.scale,
        scale: g.scale,
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
        const radius = angleToRadius(asset.travel, angle) * falloff;

        targets.current[theme] = {
          x: Math.cos(angle) * radius * scale,
          y: Math.sin(angle) * radius * scale,
        };
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
  }, [containerRef, geometryRef]);

  return { dark: setDarkIrisRef, light: setLightIrisRef };
}

function EyeStack({
  theme,
  visibilityClass,
  irisRef,
  geometry,
}: {
  theme: "dark" | "light";
  visibilityClass: string;
  irisRef: (el: HTMLImageElement | null) => void;
  geometry: Geometry;
}) {
  const asset = EYES[theme];
  const { dispW, dispH, offX, offY } = geometry;
  const fitStyle = {
    position: "absolute" as const,
    width: `${dispW}px`,
    height: `${dispH}px`,
    left: `${offX}px`,
    top: `${offY}px`,
  };

  return (
    <div className={`absolute inset-0 ${visibilityClass}`}>
      <img src={asset.bg} alt="" style={fitStyle} />
      <div
        className="absolute inset-0"
        style={{
          maskImage: `url(${asset.mask})`,
          WebkitMaskImage: `url(${asset.mask})`,
          maskSize: `${dispW}px ${dispH}px`,
          WebkitMaskSize: `${dispW}px ${dispH}px`,
          maskPosition: `${offX}px ${offY}px`,
          WebkitMaskPosition: `${offX}px ${offY}px`,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      >
        <img ref={irisRef} src={asset.iris} alt="" className="will-change-transform" style={fitStyle} />
      </div>
    </div>
  );
}

export function PageBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { geometry, geometryRef } = useCoverGeometry(containerRef);
  const setIrisRef = useIrisTracking(containerRef, geometryRef);

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
        <EyeStack
          theme="light"
          visibilityClass="dark:hidden"
          irisRef={setIrisRef.light}
          geometry={geometry}
        />
        <EyeStack
          theme="dark"
          visibilityClass="hidden dark:block"
          irisRef={setIrisRef.dark}
          geometry={geometry}
        />
      </div>
    </div>
  );
}
