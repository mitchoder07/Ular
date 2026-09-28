"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  shape: "rect" | "circle";
  life: number;
}

const COLORS = ["#f43f5e", "#14b8a6", "#a855f7", "#f59e0b", "#22c55e", "#0ea5e9", "#fbbf24", "#ec4899"];

/** Fullscreen celebratory confetti burst. Mount when active. */
export function Confetti({ durationMs = 4200 }: { durationMs?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width / dpr;
    const H = () => canvas.height / dpr;

    const particles: Particle[] = [];
    const spawn = (
      x: number,
      y: number,
      count: number,
      speedMin: number,
      speedMax: number,
      angleCenter: number,
      spread: number
    ) => {
      for (let i = 0; i < count; i++) {
        const angle = angleCenter + (Math.random() - 0.5) * spread;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.3,
          w: (6 + Math.random() * 7) * dpr,
          h: (9 + Math.random() * 8) * dpr,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          shape: Math.random() < 0.25 ? "circle" : "rect",
          life: 1,
        });
      }
    };

    // initial burst from center top + side cannons
    spawn(W() * 0.5, H() * 0.32, 90, 4, 11, -Math.PI / 2, Math.PI * 1.6);
    spawn(0, H() * 0.55, 45, 6, 13, -Math.PI / 4.5, 0.7);
    spawn(W(), H() * 0.55, 45, 6, 13, Math.PI + Math.PI / 4.5, 0.7);

    const start = performance.now();
    let raf = 0;
    const gravity = 0.22 * dpr;
    const drag = 0.992;

    const frame = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // secondary drops while active
      if (elapsed < durationMs * 0.45 && Math.random() < 0.35) {
        spawn(W() * (0.3 + Math.random() * 0.4), -20, 3, 2, 5, Math.PI / 2, 0.9);
      }

      for (const p of particles) {
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx * dpr * 0.35;
        p.y += p.vy * dpr * 0.35;
        p.rot += p.vr;
        if (p.y > H() * 1.05) p.life = 0;

        if (p.life <= 0) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      // cull
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      if (elapsed < durationMs || particles.length > 0) {
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [durationMs]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[70]"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden
    />
  );
}
