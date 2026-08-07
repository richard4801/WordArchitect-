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
 *
 * Blinking: the PSDs only give an *open* eye — there's no closed-eyelid
 * layer to animate to. Rather than skip it, EYES[].eyeClosed is a
 * clone-stamped variant of the background: the eyelid/brow skin directly
 * above the socket is sampled and feather-blended down over the open
 * socket + iris (see the generation notes above EYES below), producing a
 * plausible "eyes shut" frame using only real pixels from the same
 * artwork. A blink is just a brief opacity crossfade to that frame, timed
 * on a randomized schedule (with an occasional natural-feeling double
 * blink) — see useBlink.
 */

const IMG_W = 1672;
const IMG_H = 941;

type EyeAsset = {
  bg: string;
  iris: string;
  mask: string;
  /**
   * Same canvas as `bg`, but with the eye-opening region (mask bbox + a
   * margin, clone-stamped from the skin directly above it, feathered at
   * the edges) patched shut. Crossfaded in briefly to fake a blink.
   */
  eyeClosed: string;
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
    eyeClosed: "/hero-dark-eye-closed.png",
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
    eyeClosed: "/hero-light-eye-closed.png",
    center: { x: 1424.7, y: 254.2 },
    travel: [
      51, 44, 31, 24, 20, 19, 18, 19, 20, 21, 24, 26, 26, 26, 25, 24, 23, 23, 24, 27, 30, 38, 49,
      54,
    ],
  },
};

/** Cursor distance (CSS px) at which the iris reaches its full clamped travel. */
const FALLOFF_PX = 550;

/**
 * Motion model: a real eye doesn't smoothly chase a moving target — it
 * mostly holds a fixation, then snaps to a new one in a fast saccade. So
 * instead of continuously easing toward wherever the cursor currently is,
 * the iris only picks a new "fixation" point periodically (gated by
 * SACCADE_* below) and then flicks to it over a short, distance-scaled
 * duration — small movements are near-instant, larger ones take a bit
 * longer but are still much quicker than the old constant chase. Between
 * saccades it holds still (plus a hint of idle micro-jitter, like ocular
 * microtremor, so it doesn't read as frozen).
 */
/** Normalized (falloff-space, ~[0,1] per axis) distance the cursor must drift from the current fixation before a new saccade is even considered. */
const SACCADE_DIST_THRESHOLD = 0.05;
/** Above this normalized distance, react almost immediately — a big cursor jump should get a sharp, fast look, not wait out the usual pause. */
const SACCADE_BIG_JUMP = 0.35;
/** Random pause range (ms) between ordinary saccades — the "hold a fixation" feel. */
const SACCADE_INTERVAL_MIN = 260;
const SACCADE_INTERVAL_JITTER = 340;
/** Random reaction pause range (ms) for a big/sharp jump. */
const SACCADE_FAST_MIN = 40;
const SACCADE_FAST_JITTER = 70;
/** Saccade flight duration (ms): DURATION_BASE + distance * DURATION_PER_UNIT. */
const SACCADE_DURATION_BASE = 55;
const SACCADE_DURATION_PER_UNIT = 130;
/** Idle micro-jitter amplitude (normalized units) once a saccade has settled. */
const MICRO_JITTER_AMPLITUDE = 0.012;

/** Blink timing (ms): fast close, a brief hold shut, a slightly slower reopen. */
const BLINK_CLOSE_MS = 55;
const BLINK_HOLD_MS = 90;
const BLINK_OPEN_MS = 110;
/** Gap (ms) before a double-blink's second flutter, when one is rolled. */
const BLINK_DOUBLE_GAP_MS = 100;
/** Chance a blink is immediately followed by a second one, like a real flutter. */
const BLINK_DOUBLE_CHANCE = 0.16;
/** Random pause range (ms) between blinks — natural rate is roughly one every few seconds. */
const BLINK_INTERVAL_MIN = 2600;
const BLINK_INTERVAL_JITTER = 4200;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

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

type Vec2 = { nx: number; ny: number };

/** Per-theme saccade state, all in normalized (falloff-space) units — the actual per-theme travel radius is only applied at the very end, when converting to screen pixels. */
type SaccadeState = {
  raw: Vec2;
  fixation: Vec2;
  animStart: Vec2;
  animStartTime: number;
  animDuration: number;
  nextAllowedAt: number;
  jitterSeed: number;
};

function newSaccadeState(): SaccadeState {
  return {
    raw: { nx: 0, ny: 0 },
    fixation: { nx: 0, ny: 0 },
    animStart: { nx: 0, ny: 0 },
    animStartTime: 0,
    animDuration: 1,
    nextAllowedAt: 0,
    jitterSeed: Math.random() * 1000,
  };
}

/** Per-theme blink state — a scheduled, time-driven opacity crossfade to the eyeClosed frame. */
type BlinkState = {
  /** Timestamp the current blink (close→hold→open) started, or null when idle/waiting. */
  activeSince: number | null;
  nextBlinkAt: number;
  doubleBlinkPending: boolean;
};

function newBlinkState(): BlinkState {
  return {
    activeSince: null,
    nextBlinkAt: performance.now() + BLINK_INTERVAL_MIN + Math.random() * BLINK_INTERVAL_JITTER,
    doubleBlinkPending: false,
  };
}

/** Opacity of the eyeClosed frame at `elapsed` ms into an active blink (0 = fully open, 1 = fully shut). */
function blinkOpacityAt(elapsed: number): number {
  if (elapsed < BLINK_CLOSE_MS) return easeInOutQuad(elapsed / BLINK_CLOSE_MS);
  if (elapsed < BLINK_CLOSE_MS + BLINK_HOLD_MS) return 1;
  const openElapsed = elapsed - BLINK_CLOSE_MS - BLINK_HOLD_MS;
  if (openElapsed < BLINK_OPEN_MS) return 1 - easeInOutQuad(openElapsed / BLINK_OPEN_MS);
  return 0;
}

function useIrisTracking(
  containerRef: React.RefObject<HTMLDivElement | null>,
  geometryRef: React.RefObject<Geometry>,
) {
  const irisRefs = useRef<Record<"dark" | "light", HTMLImageElement | null>>({
    dark: null,
    light: null,
  });
  const blinkRefs = useRef<Record<"dark" | "light", HTMLImageElement | null>>({
    dark: null,
    light: null,
  });
  const saccades = useRef<Record<"dark" | "light", SaccadeState>>({
    dark: newSaccadeState(),
    light: newSaccadeState(),
  });
  const blinks = useRef<Record<"dark" | "light", BlinkState>>({
    dark: newBlinkState(),
    light: newBlinkState(),
  });

  const setDarkIrisRef = useCallback((el: HTMLImageElement | null) => {
    irisRefs.current.dark = el;
  }, []);
  const setLightIrisRef = useCallback((el: HTMLImageElement | null) => {
    irisRefs.current.light = el;
  }, []);
  const setDarkBlinkRef = useCallback((el: HTMLImageElement | null) => {
    blinkRefs.current.dark = el;
  }, []);
  const setLightBlinkRef = useCallback((el: HTMLImageElement | null) => {
    blinkRefs.current.light = el;
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
        const { x: ex, y: ey } = eyeScreenCenter(asset);
        const dx = e.clientX - ex;
        const dy = e.clientY - ey;
        const dist = Math.hypot(dx, dy);
        const falloff = Math.min(1, dist / FALLOFF_PX);
        const angle = Math.atan2(dy, dx);
        saccades.current[theme].raw = { nx: Math.cos(angle) * falloff, ny: Math.sin(angle) * falloff };
      });
    }

    let raf = 0;
    function tick() {
      const now = performance.now();

      (Object.keys(EYES) as (keyof typeof EYES)[]).forEach((theme) => {
        const asset = EYES[theme];
        const s = saccades.current[theme];

        const dx = s.raw.nx - s.fixation.nx;
        const dy = s.raw.ny - s.fixation.ny;
        const dist = Math.hypot(dx, dy);

        if (dist > SACCADE_DIST_THRESHOLD && now >= s.nextAllowedAt) {
          // Snapshot wherever the eye visually is right now as the new
          // flight's start, so an interrupted saccade blends into the next
          // one instead of jump-cutting.
          const t = s.animDuration > 0 ? Math.min(1, (now - s.animStartTime) / s.animDuration) : 1;
          const eased = easeOutCubic(t);
          s.animStart = {
            nx: s.animStart.nx + (s.fixation.nx - s.animStart.nx) * eased,
            ny: s.animStart.ny + (s.fixation.ny - s.animStart.ny) * eased,
          };
          s.fixation = { ...s.raw };
          s.animStartTime = now;
          s.animDuration = SACCADE_DURATION_BASE + Math.min(dist, 1.4) * SACCADE_DURATION_PER_UNIT;
          s.nextAllowedAt =
            dist > SACCADE_BIG_JUMP
              ? now + SACCADE_FAST_MIN + Math.random() * SACCADE_FAST_JITTER
              : now + SACCADE_INTERVAL_MIN + Math.random() * SACCADE_INTERVAL_JITTER;
        }

        const t = Math.min(1, (now - s.animStartTime) / s.animDuration);
        const eased = easeOutCubic(t);
        let nx = s.animStart.nx + (s.fixation.nx - s.animStart.nx) * eased;
        let ny = s.animStart.ny + (s.fixation.ny - s.animStart.ny) * eased;

        if (t >= 1) {
          // Fixation reached — add a faint, slow wander so the eye doesn't
          // read as frozen while holding still between saccades.
          const time = now / 1000 + s.jitterSeed;
          nx += Math.sin(time * 1.3) * MICRO_JITTER_AMPLITUDE;
          ny += Math.sin(time * 1.7 + 1.5) * MICRO_JITTER_AMPLITUDE;
        }

        const angle = Math.atan2(ny, nx);
        const magnitude = Math.hypot(nx, ny);
        const radius = angleToRadius(asset.travel, angle) * magnitude;
        const g = geometryRef.current;

        const el = irisRefs.current[theme];
        if (el) {
          const px = Math.cos(angle) * radius * g.scale;
          const py = Math.sin(angle) * radius * g.scale;
          el.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
        }

        const b = blinks.current[theme];
        if (b.activeSince === null && now >= b.nextBlinkAt) {
          b.activeSince = now;
          b.doubleBlinkPending = Math.random() < BLINK_DOUBLE_CHANCE;
        }
        let blinkOpacity = 0;
        if (b.activeSince !== null) {
          const elapsed = now - b.activeSince;
          const blinkTotal = BLINK_CLOSE_MS + BLINK_HOLD_MS + BLINK_OPEN_MS;
          if (elapsed < blinkTotal) {
            blinkOpacity = blinkOpacityAt(elapsed);
          } else if (b.doubleBlinkPending && elapsed < blinkTotal + BLINK_DOUBLE_GAP_MS) {
            blinkOpacity = 0;
          } else if (b.doubleBlinkPending) {
            b.activeSince = now;
            b.doubleBlinkPending = false;
            blinkOpacity = blinkOpacityAt(0);
          } else {
            b.activeSince = null;
            b.nextBlinkAt = now + BLINK_INTERVAL_MIN + Math.random() * BLINK_INTERVAL_JITTER;
            blinkOpacity = 0;
          }
        }
        const blinkEl = blinkRefs.current[theme];
        if (blinkEl) blinkEl.style.opacity = blinkOpacity.toFixed(3);
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

  return {
    iris: { dark: setDarkIrisRef, light: setLightIrisRef },
    blink: { dark: setDarkBlinkRef, light: setLightBlinkRef },
  };
}

function EyeStack({
  theme,
  visibilityClass,
  irisRef,
  blinkRef,
  geometry,
}: {
  theme: "dark" | "light";
  visibilityClass: string;
  irisRef: (el: HTMLImageElement | null) => void;
  blinkRef: (el: HTMLImageElement | null) => void;
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
      <img
        ref={blinkRef}
        src={asset.eyeClosed}
        alt=""
        className="will-change-[opacity]"
        style={{ ...fitStyle, opacity: 0 }}
      />
    </div>
  );
}

export function PageBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { geometry, geometryRef } = useCoverGeometry(containerRef);
  const { iris, blink } = useIrisTracking(containerRef, geometryRef);

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
          irisRef={iris.light}
          blinkRef={blink.light}
          geometry={geometry}
        />
        <EyeStack
          theme="dark"
          visibilityClass="hidden dark:block"
          irisRef={iris.dark}
          blinkRef={blink.dark}
          geometry={geometry}
        />
      </div>
    </div>
  );
}
