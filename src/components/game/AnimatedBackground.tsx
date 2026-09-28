"use client";

import { useMemo } from "react";
import type { ThemeDef } from "@/lib/game/types";

interface AnimatedBackgroundProps {
  theme: ThemeDef;
  children: React.ReactNode;
}

/** Theme-tinted flat page background with rising particles. */
export function AnimatedBackground({ theme, children }: AnimatedBackgroundProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 53 + 7) % 100}%`,
        size: 6 + ((i * 31) % 18),
        delay: `${-(i * 1.7) % 14}s`,
        duration: `${11 + ((i * 41) % 12)}s`,
        color: theme.particles[i % theme.particles.length],
        opacity: 0.14 + ((i * 17) % 20) / 100,
      })),
    [theme.particles]
  );

  return (
    <>
      <div
        className="fixed inset-0 -z-10 overflow-hidden"
        style={{ background: theme.pageBg }}
        aria-hidden
      >
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-[-40px]"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: p.opacity,
              borderRadius: theme.particleShape === "circle" || theme.particleShape === "bubble" ? "50%" : "2px",
              border: theme.particleShape === "bubble" ? `2px solid ${p.color}` : undefined,
              animation: `bubble-rise ${p.duration} linear infinite`,
              animationDelay: p.delay,
              boxShadow: theme.particleShape === "star" ? `0 0 12px 3px ${p.color}` : undefined,
              transform: theme.particleShape === "leaf" ? "rotate(45deg)" : undefined,
            }}
          />
        ))}
      </div>
      {children}
    </>
  );
}
