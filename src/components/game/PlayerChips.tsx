"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bot, Crown, ShieldCheck, Rocket } from "lucide-react";
import { PLAYER_COLORS } from "@/lib/game/data";
import type { PlayerState } from "@/lib/game/types";
import { GameIcon } from "./GameIcon";
import { cn } from "@/lib/utils";

interface PlayerChipsProps {
  players: PlayerState[];
  turn: number;
  total: number;
  aiBubble: { id: number; playerId: string; text: string } | null;
  winnerId?: string;
  layout?: "row" | "column" | "compact";
}

export function PlayerChips({
  players,
  turn,
  total,
  aiBubble,
  winnerId,
  layout = "row",
}: PlayerChipsProps) {
  return (
    <div
      className={cn(
        "flex gap-1.5",
        layout === "row" && "flex-row overflow-x-auto pb-1 game-scroll",
        layout === "column" && "flex-col",
        layout === "compact" && "flex-row flex-wrap"
      )}
      role="list"
      aria-label="Players"
    >
      {players.map((p, i) => {
        const color = PLAYER_COLORS[p.colorId % PLAYER_COLORS.length];
        const isActive = i === turn && !winnerId;
        const isWinner = winnerId === p.id;
        const progress = Math.min(100, (p.pos / total) * 100);
        const bubble = aiBubble?.playerId === p.id ? aiBubble : null;
        const compact = layout === "compact";
        const ultra = compact && players.length > 4;
        return (
          <div key={p.id} className="relative shrink-0" role="listitem">
            {/* AI speech bubble */}
            <AnimatePresence>
              {bubble && (
                <motion.div
                  key={bubble.id}
                  initial={{ opacity: 0, y: 8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className={cn(
                    "absolute bottom-[calc(100%+10px)] left-1/2 z-30 w-48 -translate-x-1/2",
                    layout === "column" && "left-auto right-[calc(100%+8px)] translate-x-0 bottom-auto top-1/2 -translate-y-1/2 w-44"
                  )}
                >
                  <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[13px] font-medium text-slate-800 shadow-xl border border-slate-200">
                    {bubble.text}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className={cn(
                "flex items-center rounded-2xl border backdrop-blur-md transition-all duration-300",
                ultra
                  ? "gap-1.5 border-white/15 bg-white/10 px-2 py-1"
                  : compact
                    ? "gap-2 border-white/15 bg-white/10 px-2 py-1.5"
                    : "gap-2.5 border-white/15 bg-white/10 px-3 py-2",
                isActive && "bg-white/20 border-white/40 shadow-lg",
                !compact && isActive && "scale-[1.03]",
                isWinner && "bg-amber-400/25 border-amber-300/70"
              )}
            >
              {/* avatar in token color */}
              <div
                className={cn(
                  "relative grid place-items-center rounded-full border-2 shrink-0",
                  ultra ? "h-6 w-6" : compact ? "h-7 w-7" : "h-10 w-10"
                )}
                style={{
                  background: color.main,
                  borderColor: "rgba(255,255,255,0.9)",
                }}
              >
                <GameIcon id={p.avatar} size={ultra ? 13 : compact ? 15 : 22} strokeWidth={2.1} style={{ color: "#ffffff" }} />
                {p.isAI && (
                  <span
                    className={cn(
                      "absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-slate-900/90 border border-white/50",
                      compact ? "h-3.5 w-3.5" : "h-4 w-4"
                    )}
                  >
                    <Bot className={cn("text-white", compact ? "h-2 w-2" : "h-2.5 w-2.5")} />
                  </span>
                )}
              </div>

              {compact ? (
                /* compact: name + position only, wraps to 2 rows with 4 players.
                   ultra mode shrinks chips further so 5-6 players still fit */
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "truncate text-xs font-semibold text-white",
                      ultra && "max-w-[52px] text-[11px]"
                    )}
                  >
                    {p.name}
                  </span>
                  {isWinner && <Crown className="h-3 w-3 shrink-0 text-amber-300" />}
                  {!ultra && p.shield && <ShieldCheck className="h-3 w-3 shrink-0 text-sky-300" />}
                  {!ultra && p.boost > 0 && <Rocket className="h-3 w-3 shrink-0 text-rose-300" />}
                  <span className="text-[11px] font-bold tabular-nums text-white/70">
                    {p.pos}/{total}
                  </span>
                </div>
              ) : (
                /* name + progress */
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-white">{p.name}</span>
                    {isWinner && <Crown className="h-3.5 w-3.5 text-amber-300 shrink-0" />}
                    {p.shield && (
                      <span title="Shield active" className="shrink-0">
                        <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />
                      </span>
                    )}
                    {p.boost > 0 && (
                      <span title="Rocket armed" className="shrink-0">
                        <Rocket className="h-3.5 w-3.5 text-rose-300" />
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/15 sm:w-28">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, background: color.light }}
                      />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums text-white/80">
                      {p.pos}/{total}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
