"use client";

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2],
  ],
  5: [
    [0, 0],
    [0, 2],
    [1, 1],
    [2, 0],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 2],
  ],
};

/** transform that brings each face to the front */
const FACE_TRANSFORM: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(90deg) rotateY(0deg)",
  3: "rotateX(0deg) rotateY(-90deg)",
  4: "rotateX(0deg) rotateY(90deg)",
  5: "rotateX(-90deg) rotateY(0deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

/** deterministic extra spins per face value */
const SPINS: Record<number, [number, number]> = {
  1: [360, 720],
  2: [720, 360],
  3: [360, 1080],
  4: [1080, 360],
  5: [720, 720],
  6: [360, 360],
};

const FACES: Array<{ value: number; transform: string }> = [
  { value: 1, transform: "rotateY(0deg)" },
  { value: 3, transform: "rotateY(90deg)" },
  { value: 6, transform: "rotateY(180deg)" },
  { value: 4, transform: "rotateY(-90deg)" },
  { value: 5, transform: "rotateX(90deg)" },
  { value: 2, transform: "rotateX(-90deg)" },
];

const REST_TRANSFORM = "rotateX(-24deg) rotateY(28deg)";

interface Dice3DProps {
  value: number | null;
  rolling: boolean;
  size?: number;
  onTap?: () => void;
}

export function Dice3D({ value, rolling, size = 84, onTap }: Dice3DProps) {
  const transform =
    value !== null && !rolling
      ? `${FACE_TRANSFORM[value]} rotateX(${SPINS[value][0]}deg) rotateY(${SPINS[value][1]}deg)`
      : REST_TRANSFORM;

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={onTap ? "Roll dice" : "Dice"}
      className="dice-scene cursor-pointer"
      style={{ width: size, height: size }}
    >
      <div
        className={`dice-cube${rolling ? " rolling" : ""}`}
        style={{ transform: rolling ? undefined : transform }}
      >
        {FACES.map((face) => (
          <div
            key={face.value}
            className="dice-face"
            style={{
              transform: `${face.transform} translateZ(${size / 2}px)`,
            }}
          >
            {renderPips(face.value)}
          </div>
        ))}
      </div>
    </button>
  );
}

function renderPips(value: number) {
  const pips = PIPS[value] ?? [];
  return pips.map(([row, col], i) => (
    <span
      key={i}
      className="pip"
      style={{
        gridColumn: col + 1,
        gridRow: row + 1,
      }}
    />
  ));
}

/** Mini dice for roll history strip */
export function MiniDice({ value }: { value: number }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 shadow-inner border border-slate-300/60">
      <span className="text-slate-800 text-sm font-bold">{value}</span>
    </span>
  );
}
