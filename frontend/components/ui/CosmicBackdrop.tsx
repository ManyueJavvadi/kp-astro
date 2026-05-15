// Phase 15.5 — Landing-page signature: cosmic backdrop.
//
// Pure 2D canvas, no Three.js. ~3KB of logic + zero dependencies.
// Inspired by lusion.co / oryzo.ai "weight & inertia" feel without
// the WebGL bundle cost (~80KB+ for the @react-three/fiber suite).
//
// What you see:
//   - 200 stars at 3 depth layers, slow twinkle (sin-driven alpha)
//   - 3 orbital "planets" at different radii orbiting a central sun
//     at slow drift rates (60s, 95s, 140s per revolution)
//   - Soft gold central glow as the sun
//   - Mouse parallax: cursor position nudges stars by depth (closer
//     stars move more) — adds the spatial-depth signal
//   - Auto-pauses when tab is hidden (visibilitychange) to save battery
//
// Sits BEHIND the existing hero text via absolute positioning + z-index 0.
// Hero text remains at z-index 1+ and reads normally.
//
// Respects prefers-reduced-motion: shows static starfield (no orbital
// motion, no twinkle) so the user gets the visual without the motion.

"use client";

import React, { useEffect, useRef } from "react";

interface CosmicBackdropProps {
  /** Number of stars. Default 200. Lower for perf on mobile. */
  starCount?: number;
  /** Pass-through className for the container (must be positioned). */
  className?: string;
  /** Pass-through style. */
  style?: React.CSSProperties;
}

type Star = { x: number; y: number; r: number; depth: number; phase: number; speed: number };
type Planet = { radius: number; angle: number; speed: number; size: number; color: string };

export function CosmicBackdrop({
  starCount = 200,
  className,
  style,
}: CosmicBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const planetsRef = useRef<Planet[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const reducedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Reduced-motion check — render static frame and stop.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = mq.matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx?.scale(dpr, dpr);
      seedStars();
    }

    function seedStars() {
      const { w, h } = sizeRef.current;
      const arr: Star[] = [];
      for (let i = 0; i < starCount; i++) {
        const depth = Math.random() * 0.7 + 0.3; // 0.3..1 (further to closer)
        arr.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.2 + 0.3,
          depth,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.2,
        });
      }
      starsRef.current = arr;

      // Three orbital planets — gentle, slow, evocative of KP planets
      // around the Sun. Colors picked from the project's palette tokens.
      planetsRef.current = [
        { radius: w * 0.18, angle: 0,    speed: (Math.PI * 2) / 60,  size: 4.5, color: "#e8c98a" }, // bright gold
        { radius: w * 0.28, angle: 1.7,  speed: (Math.PI * 2) / 95,  size: 3.5, color: "#c9a96e" }, // gold
        { radius: w * 0.42, angle: 3.2,  speed: (Math.PI * 2) / 140, size: 5,   color: "#93c5fd" }, // moon-blue
      ];
    }

    function onMove(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
    }

    let lastTime = performance.now();
    let paused = false;

    function draw(now: number) {
      if (paused) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const dt = Math.min(100, now - lastTime) / 1000; // cap dt at 0.1s
      lastTime = now;

      const { w, h } = sizeRef.current;
      const cx = w / 2;
      const cy = h / 2;

      if (!ctx) return;
      ctx.clearRect(0, 0, w * dprRef.current, h * dprRef.current);

      // ── Central sun glow ──
      const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
      sunGrad.addColorStop(0, "rgba(231, 201, 138, 0.18)");
      sunGrad.addColorStop(0.4, "rgba(201, 169, 110, 0.06)");
      sunGrad.addColorStop(1, "rgba(201, 169, 110, 0)");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);

      // Sun core
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#e8c98a";
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#e8c98a";
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── Stars with parallax + twinkle ──
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      for (const s of starsRef.current) {
        const px = s.x + (reducedRef.current ? 0 : mx * 30 * s.depth);
        const py = s.y + (reducedRef.current ? 0 : my * 30 * s.depth);
        const alpha = reducedRef.current
          ? 0.6 * s.depth
          : (0.5 + 0.5 * Math.sin(s.phase + now / 1000 * s.speed * 0.5)) * s.depth;
        ctx.beginPath();
        ctx.arc(px, py, s.r * s.depth, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(231, 230, 224, ${alpha})`;
        ctx.fill();
      }

      // ── Orbital planets ──
      if (!reducedRef.current) {
        for (const p of planetsRef.current) {
          p.angle += p.speed * dt;
          const px = cx + Math.cos(p.angle) * p.radius;
          const py = cy + Math.sin(p.angle) * p.radius * 0.55; // ellipse for 3D feel
          // Faint orbit ring (drawn once per planet, very subtle)
          ctx.beginPath();
          ctx.ellipse(cx, cy, p.radius, p.radius * 0.55, 0, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(201, 169, 110, 0.04)";
          ctx.lineWidth = 1;
          ctx.stroke();
          // Planet body
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else {
        // Reduced-motion: show planets at frozen positions, no orbit motion.
        for (const p of planetsRef.current) {
          const px = cx + Math.cos(p.angle) * p.radius;
          const py = cy + Math.sin(p.angle) * p.radius * 0.55;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    function onVisibility() {
      paused = document.hidden;
      if (!paused) lastTime = performance.now();
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("visibilitychange", onVisibility);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [starCount]);

  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
