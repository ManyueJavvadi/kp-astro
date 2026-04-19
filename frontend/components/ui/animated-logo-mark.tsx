"use client";
/**
 * AnimatedLogoMark — canvas-rendered rotating Saturn with tilted rings.
 *
 * Adapted from the reference animation (Fibonacci-sphere planet particles +
 * ring particles with Cassini gap, Lambert shading, subtle twinkle). React
 * component so we can drop it into <Logo /> / <LogoMark />.
 *
 * Performance guardrails:
 * - Particle counts scale with `size` so small tiles (32px nav) don't waste
 *   the 1800 + 2600 particles the full 240px demo uses.
 * - Pauses animation when the tab is hidden.
 * - Respects `prefers-reduced-motion`: falls back to the static SVG.
 */
import { useEffect, useRef, useState } from "react";

type Props = { size: number };

type PlanetPt = {
  x: number; y: number; z: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
};
type RingPt = {
  r: number; theta: number; h: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
  band: number;
  colorIdx: number; // deterministic per particle
};

const TILT = (-18 * Math.PI) / 180;
const COS_T = Math.cos(TILT);
const SIN_T = Math.sin(TILT);
const PALETTE = ["#f5e6c0", "#ead5a3", "#d4b87a", "#b89456", "#8a6a3f"];

function fibonacciSphere(n: number): PlanetPt[] {
  const pts: PlanetPt[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;
    let x = Math.cos(theta) * radiusAtY;
    let z = Math.sin(theta) * radiusAtY;
    let ny = y;
    // tiny jitter
    x += (Math.random() - 0.5) * 0.02;
    ny += (Math.random() - 0.5) * 0.02;
    z += (Math.random() - 0.5) * 0.02;
    const mag = Math.sqrt(x * x + ny * ny + z * z);
    pts.push({
      x: x / mag,
      y: ny / mag,
      z: z / mag,
      size: 0.8 + Math.random() * 0.9,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.0015 + Math.random() * 0.0025,
    });
  }
  return pts;
}

function ringParticles(n: number, innerR: number, outerR: number): RingPt[] {
  const pts: RingPt[] = [];
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    const r = Math.sqrt(innerR * innerR + u * (outerR * outerR - innerR * innerR));
    const band = (r - innerR) / (outerR - innerR);
    const bandIdx = Math.floor(band * 3);
    pts.push({
      r,
      theta: Math.random() * Math.PI * 2,
      h: (Math.random() - 0.5) * 0.008,
      size: 0.5 + Math.random() * 0.6,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.002 + Math.random() * 0.003,
      band,
      colorIdx: Math.min(3, bandIdx + (i % 2)),
    });
  }
  return pts;
}

function colorFromBrightness(b: number): string {
  if (b > 0.72) return PALETTE[0];
  if (b > 0.52) return PALETTE[1];
  if (b > 0.32) return PALETTE[2];
  if (b > 0.18) return PALETTE[3];
  return PALETTE[4];
}

/**
 * Scale particle counts by size. At 32px (nav), ~220 planet / ~330 ring is
 * more than dense enough. At 240px we match the reference demo.
 */
function particleCounts(size: number) {
  const ratio = Math.min(1, Math.max(0.12, size / 240));
  return {
    planet: Math.round(1800 * ratio),
    ring: Math.round(2600 * ratio),
  };
}

export function AnimatedLogoMark({ size }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Check prefers-reduced-motion once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    // Size the backing store to crisp on DPR; CSS controls display size.
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { planet: planetN, ring: ringN } = particleCounts(size);
    const planetPts = fibonacciSphere(planetN);
    const ringPts = ringParticles(ringN, 1.3, 2.1);

    let t = 0;
    let rafId = 0;
    let visible = typeof document !== "undefined" ? !document.hidden : true;
    const onVis = () => {
      visible = !document.hidden;
      if (visible) rafId = requestAnimationFrame(frame);
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }

    // Light direction in world space (upper-left-front, fixed).
    const lx = -0.3, ly = -0.4, lz = 0.87;
    const lmag = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const Lx = lx / lmag, Ly = ly / lmag, Lz = lz / lmag;

    // Reusable item buffer for depth-sort, sized for worst case.
    type Item = { px: number; py: number; z: number; size: number; color: string; opacity: number };
    const items: Item[] = new Array(planetN + ringN);
    for (let i = 0; i < items.length; i++) {
      items[i] = { px: 0, py: 0, z: 0, size: 0, color: "", opacity: 0 };
    }

    function frame() {
      if (!visible) return;
      const W = size;
      const H = size;
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const scale = Math.min(W, H) * 0.21;
      const spin = t * 0.00025;
      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);

      let idx = 0;

      // Planet particles
      for (let i = 0; i < planetPts.length; i++) {
        const p = planetPts[i];
        // rotate around local Y: (x*c + z*s, y, -x*s + z*c)
        const sx = p.x * cosS + p.z * sinS;
        const sy = p.y;
        const sz = -p.x * sinS + p.z * cosS;
        // tilt around X: (x, y*cosT - z*sinT, y*sinT + z*cosT)
        const wx = sx;
        const wy = sy * COS_T - sz * SIN_T;
        const wz = sy * SIN_T + sz * COS_T;
        const dot = Math.max(0, wx * Lx + wy * Ly + wz * Lz);
        let brightness = 0.22 + 0.78 * dot;
        const tw = 0.92 + 0.08 * Math.sin(t * p.twinkleSpeed + p.twinklePhase);
        brightness *= tw;
        const it = items[idx++];
        it.px = cx + wx * scale;
        it.py = cy + wy * scale;
        it.z = wz * 0.85;
        it.size = p.size;
        it.color = colorFromBrightness(brightness);
        it.opacity = 0.4 + brightness * 0.6;
      }

      // Ring particles — fixed in world frame, tiny drift for life
      const ringDrift = t * 0.00004;
      for (let i = 0; i < ringPts.length; i++) {
        const p = ringPts[i];
        const th = p.theta + ringDrift;
        const rx = Math.cos(th) * p.r;
        const rz = Math.sin(th) * p.r;
        const ry = p.h;
        const wy = ry * COS_T - rz * SIN_T;
        const wz = ry * SIN_T + rz * COS_T;
        const isFront = wz > 0;
        const tw = 0.85 + 0.15 * Math.sin(t * p.twinkleSpeed + p.twinklePhase);
        let opacity = (isFront ? 0.88 : 0.42) * tw;
        // Cassini gap
        if (p.r > 1.7 && p.r < 1.78) opacity *= 0.15;
        const it = items[idx++];
        it.px = cx + rx * scale;
        it.py = cy + wy * scale;
        it.z = wz;
        it.size = p.size;
        it.color = PALETTE[p.colorIdx];
        it.opacity = opacity;
      }

      // Depth sort (back to front). items array length already matches idx.
      items.sort((a, b) => a.z - b.z);
      for (let i = 0; i < idx; i++) {
        const it = items[i];
        ctx.globalAlpha = it.opacity < 0 ? 0 : it.opacity > 1 ? 1 : it.opacity;
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.arc(it.px, it.py, it.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      t += 16;
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }, [size, reduceMotion]);

  // Static fallback for reduced-motion users.
  if (reduceMotion) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/saturn-logo.svg"
        alt=""
        width={size}
        height={size}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transform: "scale(1.08)",
        }}
        draggable={false}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        display: "block",
      }}
      aria-hidden="true"
    />
  );
}
