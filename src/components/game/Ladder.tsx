"use client";

import { useMemo } from "react";
import { buildLadder, cellToXY } from "@/lib/game/engine";

interface LadderProps {
  bottom: number;
  top: number;
  boardSize: number;
  colors: { rail: string; rung: string; outline: string };
}

export function Ladder({ bottom, top, boardSize, colors }: LadderProps) {
  const geom = useMemo(
    () => buildLadder(cellToXY(bottom, boardSize), cellToXY(top, boardSize)),
    [bottom, top, boardSize]
  );

  const [r1a, r1b, r2a, r2b] = geom.rails;

  return (
    <g opacity={0.97}>
      {/* rail outlines */}
      <line x1={r1a.x} y1={r1a.y} x2={r1b.x} y2={r1b.y} stroke={colors.outline} strokeWidth={11.5} strokeLinecap="round" />
      <line x1={r2a.x} y1={r2a.y} x2={r2b.x} y2={r2b.y} stroke={colors.outline} strokeWidth={11.5} strokeLinecap="round" />
      {/* rails */}
      <line x1={r1a.x} y1={r1a.y} x2={r1b.x} y2={r1b.y} stroke={colors.rail} strokeWidth={7.5} strokeLinecap="round" />
      <line x1={r2a.x} y1={r2a.y} x2={r2b.x} y2={r2b.y} stroke={colors.rail} strokeWidth={7.5} strokeLinecap="round" />
      {/* rail inner highlight */}
      <line
        x1={r1a.x}
        y1={r1a.y}
        x2={r1b.x}
        y2={r1b.y}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={2.4}
        strokeLinecap="round"
        transform="translate(-1.5,-1.5)"
      />
      <line
        x1={r2a.x}
        y1={r2a.y}
        x2={r2b.x}
        y2={r2b.y}
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={2.4}
        strokeLinecap="round"
        transform="translate(1.5,-1.5)"
      />
      {/* rungs */}
      {geom.rungs.map(([a, b], i) => (
        <g key={i}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.outline} strokeWidth={8.5} strokeLinecap="round" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.rung} strokeWidth={5.2} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}
