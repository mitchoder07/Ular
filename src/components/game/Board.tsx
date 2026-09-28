"use client";

import { useMemo } from "react";
import { BOARD_PX, CELL, PAD, cellToTopLeft, cellToXY } from "@/lib/game/engine";
import { PLAYER_COLORS, POWER_META } from "@/lib/game/data";
import type { BoardDef, PlayerState, PowerType, ThemeDef } from "@/lib/game/types";
import type { MoveInfo } from "@/store/game";
import { GameIcon } from "./GameIcon";
import { Snake } from "./Snake";
import { Ladder } from "./Ladder";

interface BoardProps {
  board: BoardDef;
  theme: ThemeDef;
  players: PlayerState[];
  turn: number;
  move: MoveInfo | null;
  powerTiles: Record<number, PowerType>;
  showTokenPos: boolean;
  speedFactor: number;
}

const MOVE_EASE: Record<MoveInfo["kind"], string> = {
  step: "cubic-bezier(0.4, 0, 0.6, 1)",
  snake: "cubic-bezier(0.55, 0.06, 0.35, 1)",
  ladder: "cubic-bezier(0.3, 1.25, 0.5, 1)",
  teleport: "cubic-bezier(0.4, 0, 0.2, 1)",
  enter: "cubic-bezier(0.2, 1.2, 0.4, 1)",
};

const MOVE_MS: Record<MoveInfo["kind"], number> = {
  step: 150,
  snake: 780,
  ladder: 660,
  teleport: 460,
  enter: 420,
};

export function Board({
  board,
  theme,
  players,
  turn,
  move,
  powerTiles,
  showTokenPos,
  speedFactor: spd,
}: BoardProps) {
  const size = board.size;

  // group players by cell for token offsets
  const occupancy = useMemo(() => {
    const map = new Map<number, PlayerState[]>();
    for (const p of players) {
      if (p.pos <= 0) continue;
      const arr = map.get(p.pos) ?? [];
      arr.push(p);
      map.set(p.pos, arr);
    }
    return map;
  }, [players]);

  const snakeEntries = useMemo(
    () => Object.entries(board.snakes).map(([head, tail]) => ({ head: Number(head), tail })),
    [board.snakes]
  );
  const ladderEntries = useMemo(
    () => Object.entries(board.ladders).map(([bottom, top]) => ({ bottom: Number(bottom), top })),
    [board.ladders]
  );

  // tokens sorted so the moving/active one renders last (on top)
  const orderedPlayers = useMemo(() => {
    const idxs = players.map((p, i) => ({ p, i }));
    const activeId = move?.playerId ?? players[turn]?.id;
    return idxs
      .slice()
      .sort((a, b) => {
        const aActive = a.p.id === activeId ? 1 : 0;
        const bActive = b.p.id === activeId ? 1 : 0;
        return aActive - bActive;
      });
  }, [players, turn, move]);

  return (
    <svg
      viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full min-h-0 min-w-0 w-full select-none"
      role="img"
      aria-label={`Game board, ${board.totalCells} cells`}
    >
      <defs>
        <filter id="boardShadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="7" stdDeviation="12" floodOpacity="0.32" />
        </filter>
      </defs>

      {/* frame */}
      <rect
        x={6}
        y={6}
        width={BOARD_PX - 12}
        height={BOARD_PX - 12}
        rx={30}
        fill={theme.frame}
        filter="url(#boardShadow)"
      />
      <rect
        x={13}
        y={13}
        width={BOARD_PX - 26}
        height={BOARD_PX - 26}
        rx={24}
        fill="none"
        stroke={theme.frameInner}
        strokeWidth={4}
      />
      <rect
        x={PAD - 10}
        y={PAD - 10}
        width={CELL * size + 20}
        height={CELL * size + 20}
        rx={16}
        fill={theme.boardBg}
      />

      {/* cells */}
      {Array.from({ length: board.totalCells }, (_, i) => i + 1).map((cell) => {
        const tl = cellToTopLeft(cell, size);
        const isStart = cell === 1;
        const isFinish = cell === board.totalCells;
        return (
          <g key={cell}>
            <rect
              x={tl.x + 3.5}
              y={tl.y + 3.5}
              width={CELL - 7}
              height={CELL - 7}
              rx={14}
              fill={
                isFinish ? "#fbbf24" : (cell + Math.floor((cell - 1) / size)) % 2 === 0 ? theme.cellA : theme.cellB
              }
              stroke={isFinish ? "#b45309" : theme.cellStroke}
              strokeWidth={isFinish ? 2.5 : 1.2}
            />
            <text
              x={tl.x + 11}
              y={tl.y + 26}
              fontSize={24}
              fontWeight={700}
              fill={isFinish ? "#7c2d12" : theme.numberColor}
              fontFamily="var(--font-geist-sans), system-ui, sans-serif"
              opacity={isFinish ? 0.95 : 0.72}
              stroke={isFinish ? "#fbbf24" : theme.cellA}
              strokeWidth={4.5}
              strokeLinejoin="round"
              paintOrder="stroke"
            >
              {cell}
            </text>
            {isStart && (
              <GameIcon
                id="flag"
                x={tl.x + CELL / 2 - 16}
                y={tl.y + CELL - 43}
                width={32}
                height={32}
                strokeWidth={2.2}
                style={{ color: theme.numberColor, opacity: 0.9 }}
              />
            )}
            {isFinish && (
              <g>
                {/* soft flat ring around the trophy cell */}
                <circle cx={tl.x + CELL / 2} cy={tl.y + CELL / 2} r={40} fill="none" stroke="#b45309" strokeWidth={2} opacity={0.35} />
                <GameIcon
                  id="trophy"
                  x={tl.x + CELL / 2 - 22}
                  y={tl.y + CELL / 2 - 13}
                  width={44}
                  height={44}
                  strokeWidth={2}
                  style={{ color: "#7c2d12" }}
                />
              </g>
            )}
          </g>
        );
      })}

      {/* ladders */}
      {ladderEntries.map(({ bottom, top }) => (
        <Ladder key={`l${bottom}`} bottom={bottom} top={top} boardSize={size} colors={theme.ladder} />
      ))}

      {/* snakes */}
      {snakeEntries.map(({ head, tail }, i) => (
        <Snake
          key={`s${head}`}
          head={head}
          tail={tail}
          boardSize={size}
          colors={theme.snakes[i % theme.snakes.length]}
          seed={i * 7 + head}
        />
      ))}

      {/* power tiles */}
      {Object.entries(powerTiles).map(([cell, type]) => {
        const { x, y } = cellToXY(Number(cell), size);
        const meta = POWER_META[type];
        return (
          <g key={`p${cell}`} opacity={0.98}>
            <circle cx={x} cy={y} r={30} fill="rgba(255,255,255,0.92)" stroke={meta.color} strokeWidth={3.5} />
            <circle cx={x} cy={y} r={35} fill="none" stroke={meta.color} strokeWidth={1.5} opacity={0.4} />
            <GameIcon
              id={meta.icon}
              x={x - 16}
              y={y - 16}
              width={32}
              height={32}
              strokeWidth={2.1}
              style={{ color: meta.color }}
            />
          </g>
        );
      })}

      {/* tokens */}
      {orderedPlayers.map(({ p }) => {
        if (p.pos <= 0) return null;
        const cellMates = occupancy.get(p.pos) ?? [p];
        const mateIdx = cellMates.findIndex((m) => m.id === p.id);
        const offs = TOKEN_OFFSETS[cellMates.length > 4 ? 4 : cellMates.length] ?? TOKEN_OFFSETS[4];
        const off = offs[mateIdx % offs.length];
        const { x, y } = cellToXY(p.pos, size);
        const tx = x + off[0];
        const ty = y + off[1];
        const color = PLAYER_COLORS[p.colorId % PLAYER_COLORS.length];
        const isActive = move?.playerId === p.id || players[turn]?.id === p.id;
        const kind = move?.playerId === p.id ? move.kind : "step";
        const dur = (MOVE_MS[kind] ?? 200) / spd;
        const ease = MOVE_EASE[kind];

        return (
          <g
            key={p.id}
            style={{
              transform: `translate(${tx}px, ${ty}px)`,
              transition: `transform ${dur}ms ${ease}`,
            }}
          >
            {/* shadow */}
            <ellipse cx={0} cy={26} rx={19} ry={6.5} fill="rgba(0,0,0,0.28)" />
            <g className={isActive ? "token-active-inner" : undefined}>
              <circle r={24.5} fill={color.main} stroke="#ffffff" strokeWidth={4} />
              <circle r={29} fill="none" stroke={color.light} strokeWidth={1.6} opacity={0.75} />
            </g>
            <GameIcon
              id={p.avatar}
              x={-14}
              y={-14}
              width={28}
              height={28}
              strokeWidth={2.1}
              style={{ color: "#ffffff" }}
            />
            {/* shield badge */}
            {p.shield && (
              <g transform="translate(20,-20)">
                <circle r={10.5} fill="#0ea5e9" stroke="#fff" strokeWidth={2.5} />
                <GameIcon id="shield" x={-5.5} y={-5.5} width={11} height={11} strokeWidth={2.4} style={{ color: "#fff" }} />
              </g>
            )}
            {/* rocket badge */}
            {p.boost > 0 && (
              <g transform="translate(-20,-20)">
                <circle r={10.5} fill="#ef4444" stroke="#fff" strokeWidth={2.5} />
                <GameIcon id="rocket" x={-5.5} y={-5.5} width={11} height={11} strokeWidth={2.4} style={{ color: "#fff" }} />
              </g>
            )}
            {/* position bubble */}
            {showTokenPos && (
              <g transform="translate(0,-38)">
                <rect x={-17} y={-14} width={34} height={22} rx={7} fill="rgba(15,23,42,0.82)" />
                <text
                  x={0}
                  y={2.5}
                  fontSize={15}
                  fontWeight={700}
                  fill="#fff"
                  textAnchor="middle"
                  fontFamily="var(--font-geist-sans), system-ui, sans-serif"
                >
                  {p.pos}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* offsets for tokens sharing a cell */
const TOKEN_OFFSETS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [
    [-15, -15],
    [15, 15],
  ],
  3: [
    [-16, -14],
    [16, -14],
    [0, 16],
  ],
  4: [
    [-15, -15],
    [15, -15],
    [-15, 15],
    [15, 15],
  ],
};
