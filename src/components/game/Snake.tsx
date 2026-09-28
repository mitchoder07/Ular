"use client";

import { useMemo } from "react";
import { buildSnakePath, cellToXY } from "@/lib/game/engine";

interface SnakeProps {
  head: number;
  tail: number;
  boardSize: number;
  colors: { body: string; belly: string; outline: string };
  /** deterministic seed for stable wiggle across renders */
  seed: number;
}

/**
 * A hand-drawn feeling snake: tapered segmented body,
 * belly stripe, diamond spots, head with eyes and a flicking tongue.
 */
export function Snake({ head, tail, boardSize, colors, seed }: SnakeProps) {
  const path = useMemo(
    () => buildSnakePath(cellToXY(head, boardSize), cellToXY(tail, boardSize), seed, 96),
    [head, tail, boardSize, seed]
  );

  const { points, segments, headAngle, headPos } = path;

  // spots at every other body point
  const spots = useMemo(() => {
    const out: Array<{ cx: number; cy: number; r: number }> = [];
    for (let i = 2; i < segments.length - 1; i += 2) {
      const s = segments[i];
      out.push({
        cx: (s.a.x + s.b.x) / 2,
        cy: (s.a.y + s.b.y) / 2,
        r: Math.max(2.4, s.width * 0.3),
      });
    }
    return out;
  }, [segments]);

  const stripeD = useMemo(
    () => points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
    [points]
  );

  return (
    <g opacity={0.96}>
      {/* outline pass */}
      {segments.map((s, i) => (
        <line
          key={`o${i}`}
          x1={s.a.x}
          y1={s.a.y}
          x2={s.b.x}
          y2={s.b.y}
          stroke={colors.outline}
          strokeWidth={s.width + 7}
          strokeLinecap="round"
        />
      ))}
      {/* body pass */}
      {segments.map((s, i) => (
        <line
          key={`b${i}`}
          x1={s.a.x}
          y1={s.a.y}
          x2={s.b.x}
          y2={s.b.y}
          stroke={colors.body}
          strokeWidth={s.width}
          strokeLinecap="round"
        />
      ))}
      {/* belly stripe (dashed for scale feel) */}
      <path
        d={stripeD}
        fill="none"
        stroke={colors.belly}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray="9 7"
        opacity={0.85}
      />
      {/* diamond spots */}
      {spots.map((sp, i) => (
        <circle key={`s${i}`} cx={sp.cx} cy={sp.cy} r={sp.r} fill={colors.belly} opacity={0.9} />
      ))}
      {/* head */}
      <g transform={`translate(${headPos.x},${headPos.y}) rotate(${(headAngle * 180) / Math.PI})`}>
        <ellipse
          cx={2}
          cy={0}
          rx={27}
          ry={21}
          fill={colors.body}
          stroke={colors.outline}
          strokeWidth={3.5}
        />
        <ellipse cx={12} cy={0} rx={12} ry={9} fill={colors.belly} opacity={0.55} />
        {/* tongue */}
        <g className="snake-tongue">
          <path
            d="M27,0 q10,-2 13,-8 M27,0 q10,2 13,8"
            stroke="#e11d48"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        </g>
        {/* friendly eyes with soft highlights */}
        <circle cx={8} cy={-9.5} r={6.2} fill="#ffffff" />
        <circle cx={8} cy={9.5} r={6.2} fill="#ffffff" />
        <circle cx={9.9} cy={-9.5} r={3.1} fill="#0f172a" />
        <circle cx={9.9} cy={9.5} r={3.1} fill="#0f172a" />
        <circle cx={7.2} cy={-11.4} r={1.2} fill="#ffffff" />
        <circle cx={7.2} cy={7.6} r={1.2} fill="#ffffff" />
        {/* gentle brows for character */}
        <path
          d="M3,-15 q5,-2.4 10,-1.4"
          stroke={colors.outline}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M3,15 q5,2.4 10,1.4"
          stroke={colors.outline}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}
