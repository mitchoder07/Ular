/* ============================================================
   Snakes & Ladders Deluxe: Board Geometry & Path Builders
   Pure functions, no React. Also usable if ported to React Native.
   ============================================================ */

export interface Point {
  x: number;
  y: number;
}

/** SVG board is always 1000x1000 logical px */
export const BOARD_PX = 1000;
export const CELL = 96;
export const PAD = 20;

/**
 * Convert a cell number (1-based, boustrophedon from bottom-left)
 * to its { row, col }. Row 0 is the bottom row.
 */
export function cellToRC(cell: number, size: number): { row: number; col: number } {
  const idx = Math.max(0, cell - 1);
  const row = Math.floor(idx / size);
  const col = row % 2 === 0 ? idx % size : size - 1 - (idx % size);
  return { row, col };
}

/** Center of a cell in board pixel coords */
export function cellToXY(cell: number, size: number): Point {
  const { row, col } = cellToRC(cell, size);
  return {
    x: PAD + col * CELL + CELL / 2,
    y: BOARD_PX - (PAD + row * CELL + CELL / 2),
  };
}

/** Top-left corner of a cell in board pixel coords */
export function cellToTopLeft(cell: number, size: number): Point {
  const { row, col } = cellToRC(cell, size);
  return {
    x: PAD + col * CELL,
    y: PAD + (size - 1 - row) * CELL,
  };
}

/* ------------------------------------------------------------
   SNAKE PATH BUILDER
   ------------------------------------------------------------ */

export interface SnakeSegment {
  a: Point;
  b: Point;
  width: number;
}

export interface SnakePath {
  /** polyline points from head to tail */
  points: Point[];
  /** tapered segments */
  segments: SnakeSegment[];
  /** head direction angle (radians) */
  headAngle: number;
  headPos: Point;
}

/**
 * Build an organic wavy snake path between head cell center and tail cell center.
 * `seed` makes the wobble deterministic per-snake (stable across renders).
 */
export function buildSnakePath(
  head: Point,
  tail: Point,
  seed: number,
  cell: number
): SnakePath {
  const dx = tail.x - head.x;
  const dy = tail.y - head.y;
  const len = Math.hypot(dx, dy);
  const nx = len === 0 ? 0 : -dy / len;
  const ny = len === 0 ? 0 : dx / len;

  const wiggle = Math.min(48, Math.max(18, len * 0.13));
  const waves = 1.8 + ((seed * 37) % 3) * 0.2; // 1.8 to 2.0 wave cycles
  const phase = (seed * 2.399) % (Math.PI * 2);
  const drift = ((seed * 53) % 100) / 100 - 0.5; // gentle C-curve

  const N = 16;
  const points: Point[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // shrink toward head so head ellipse covers cell center
    const startTrim = 24;
    const tt = t * (len - startTrim) / len;
    const px = head.x + dx * tt;
    const py = head.y + dy * tt;
    const envelope = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.65);
    const offset =
      Math.sin(t * Math.PI * waves + phase) * wiggle * envelope +
      Math.sin(t * Math.PI) * drift * wiggle * 0.8;
    points.push({ x: px + nx * offset, y: py + ny * offset });
  }

  // taper widths 26 -> 7 relative to cell scale
  const headW = cell * 0.27;
  const tailW = cell * 0.075;
  const segments: SnakeSegment[] = [];
  for (let i = 0; i < N; i++) {
    const w = headW + (tailW - headW) * (i / (N - 1));
    segments.push({ a: points[i], b: points[i + 1], width: w });
  }

  const headAngle = Math.atan2(points[0].y - points[1].y, points[0].x - points[1].x);
  return { points, segments, headAngle, headPos: { x: head.x, y: head.y } };
}

/* ------------------------------------------------------------
   LADDER GEOMETRY
   ------------------------------------------------------------ */

export interface LadderGeom {
  /** rail endpoints: [bottomLeft, topLeft, bottomRight, topRight] */
  rails: [Point, Point, Point, Point];
  /** rung lines */
  rungs: Array<[Point, Point]>;
}

export function buildLadder(bottom: Point, top: Point): LadderGeom {
  const dx = top.x - bottom.x;
  const dy = top.y - bottom.y;
  const len = Math.hypot(dx, dy);
  const ux = len === 0 ? 0 : dx / len;
  const uy = len === 0 ? 0 : dy / len;
  const nx = -uy;
  const ny = ux;
  const halfW = 13;
  const overhang = 26;

  const bx = bottom.x - ux * overhang;
  const by = bottom.y - uy * overhang;
  const tx = top.x + ux * overhang;
  const ty = top.y + uy * overhang;

  const rails: [Point, Point, Point, Point] = [
    { x: bx + nx * halfW, y: by + ny * halfW },
    { x: tx + nx * halfW, y: ty + ny * halfW },
    { x: bx - nx * halfW, y: by - ny * halfW },
    { x: tx - nx * halfW, y: ty - ny * halfW },
  ];

  const rungs: Array<[Point, Point]> = [];
  const rungStep = 52;
  const rungCount = Math.max(2, Math.floor((len + overhang * 1.6) / rungStep));
  for (let i = 1; i <= rungCount; i++) {
    const t = i / (rungCount + 1);
    const cx = bx + (tx - bx) * t;
    const cy = by + (ty - by) * t;
    rungs.push([
      { x: cx + nx * halfW, y: cy + ny * halfW },
      { x: cx - nx * halfW, y: cy - ny * halfW },
    ]);
  }

  return { rails, rungs };
}

/* ------------------------------------------------------------
   MISC HELPERS
   ------------------------------------------------------------ */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
