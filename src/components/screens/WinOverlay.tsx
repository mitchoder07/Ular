"use client";

import { motion } from "framer-motion";
import { Home, RotateCcw, Settings2, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/store/game";
import { useOnline } from "@/store/online";
import { ACHIEVEMENTS, PLAYER_COLORS, THEMES, getBoard } from "@/lib/game/data";
import { formatTime } from "@/lib/game/engine";
import { Confetti } from "@/components/game/Confetti";
import { GameIcon } from "@/components/game/GameIcon";
import { sound } from "@/lib/sound";

export function WinOverlay() {
  const players = useGame((s) => s.players);
  const winnerId = useGame((s) => s.winnerId);
  const startedAt = useGame((s) => s.startedAt);
  const endedAt = useGame((s) => s.endedAt);
  const newUnlocks = useGame((s) => s.newUnlocks);
  const restart = useGame((s) => s.restart);
  const setScreen = useGame((s) => s.setScreen);
  const config = useGame((s) => s.config);
  const onlineMeta = useGame((s) => s.online);

  const onlineRoom = useOnline((s) => s.room);
  const lastRanked = useOnline((s) => s.lastRanked);
  const rematch = useOnline((s) => s.rematch);
  const leaveRoom = useOnline((s) => s.leaveRoom);
  const queueRanked = useOnline((s) => s.queueRanked);
  const searchStake = useOnline((s) => s.searchStake);

  const board = getBoard(config.mode);
  const total = board.totalCells;

  const isOnline = onlineMeta.active;
  const isHost = isOnline && onlineRoom ? onlineRoom.hostId === onlineMeta.myId : false;

  const winner = players.find((p) => p.id === winnerId);
  if (!winner) return null;

  const timeMs = (endedAt ?? Date.now()) - startedAt;
  const standings = [...players]
    .filter((p) => p.id !== winnerId)
    .sort((a, b) => b.pos - a.pos);
  const unlockDefs = newUnlocks
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md"
    >
      <Confetti />
      <motion.div
        initial={{ scale: 0.8, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="relative my-auto w-full max-w-sm rounded-[2rem] border border-white/20 bg-slate-900/95 p-6 shadow-2xl"
      >
        {/* trophy: one gentle pop, no looping up-and-down */}
        <div className="mb-1 flex justify-center">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center justify-center rounded-3xl bg-amber-500/15 p-4"
          >
            <GameIcon id="trophy" size={56} strokeWidth={1.8} style={{ color: "#fbbf24" }} />
          </motion.span>
        </div>
        <h2
          className="text-center text-3xl font-bold text-white"
          style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
        >
          {winner.name === "You" ? "You win!" : `${winner.name} wins!`}
        </h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-white/60">
          <span className="flex items-center gap-1.5">
            <GameIcon id={THEMES[config.theme].icon} size={14} strokeWidth={2.2} /> {board.name}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon id="timer" size={14} strokeWidth={2.2} /> {formatTime(timeMs)}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon id="snake" size={14} strokeWidth={2.2} /> {winner.snakesHit}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon id="ladder" size={14} strokeWidth={2.2} /> {winner.laddersClimbed}
          </span>
          <span className="flex items-center gap-1.5">
            <GameIcon id="dice" size={14} strokeWidth={2.2} /> {winner.sixesRolled}
          </span>
        </div>

        {/* ranked payout card */}
        {isOnline && onlineMeta.ranked && lastRanked && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className={
              "mt-3 flex items-center gap-3 rounded-2xl border p-3 " +
              (lastRanked.youWon
                ? "border-emerald-300/40 bg-emerald-500/15"
                : "border-rose-300/40 bg-rose-500/15")
            }
          >
            <span
              className={
                "grid h-11 w-11 shrink-0 place-items-center rounded-full " +
                (lastRanked.youWon ? "bg-emerald-400/25 text-emerald-200" : "bg-rose-400/25 text-rose-200")
              }
            >
              <GameIcon id="coin" size={24} strokeWidth={2} />
            </span>
            <div className="flex-1">
              <div className={"text-base font-bold " + (lastRanked.youWon ? "text-emerald-200" : "text-rose-200")}>
                {lastRanked.youWon
                  ? `You won the pot, +${lastRanked.delta} ular`
                  : `You lost the stake, ${lastRanked.delta} ular`}
              </div>
              <div className="text-xs text-white/55">Ranked duel against {lastRanked.opponentName}</div>
            </div>
          </motion.div>
        )}

        {/* winner card */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-400/15 p-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-full border-2 border-white/80"
            style={{ background: PLAYER_COLORS[winner.colorId % PLAYER_COLORS.length].main }}
          >
            <GameIcon id={winner.avatar} size={24} strokeWidth={2} style={{ color: "#fff" }} />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-amber-100">
              <GameIcon id="crown" size={15} strokeWidth={2.2} /> {winner.name}
            </div>
            <div className="text-xs text-amber-100/70">Made it to cell 100 in {formatTime(timeMs)}</div>
          </div>
        </div>

        {/* standings */}
        <div className="mt-3 space-y-2">
          {standings.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-white/70">
                {i + 2}
              </span>
              <span
                className="grid h-9 w-9 place-items-center rounded-full border border-white/50"
                style={{ background: PLAYER_COLORS[p.colorId % PLAYER_COLORS.length].main }}
              >
                <GameIcon id={p.avatar} size={18} strokeWidth={2} style={{ color: "#fff" }} />
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-white">{p.name}</span>
              <span className="text-xs font-bold tabular-nums text-white/60">
                {p.pos}/{total}
              </span>
            </div>
          ))}
        </div>

        {/* new achievements */}
        {unlockDefs.length > 0 && (
          <div className="mt-4 rounded-2xl border border-fuchsia-300/30 bg-fuchsia-500/10 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-fuchsia-200">
              <GameIcon id="medal" size={14} strokeWidth={2.2} /> New achievements
            </div>
            <div className="flex flex-wrap gap-1.5">
              {unlockDefs.map((a) => (
                <span
                  key={a!.id}
                  className="flex items-center gap-1.5 rounded-full border border-fuchsia-300/40 bg-fuchsia-400/20 px-2.5 py-1 text-xs font-semibold text-fuchsia-100"
                >
                  <GameIcon id={a!.icon} size={13} strokeWidth={2.2} /> {a!.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* actions */}
        <div className="mt-5 grid gap-2">
          {isOnline ? (
            onlineMeta.ranked ? (
              <Button
                onClick={() => {
                  leaveRoom();
                  queueRanked(searchStake);
                }}
                className="h-13 rounded-2xl bg-violet-500 py-3.5 text-base font-bold text-white hover:bg-violet-500"
                style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
              >
                <Swords className="mr-2 h-5 w-5" /> Queue another duel
              </Button>
            ) : isHost ? (
              <Button
                onClick={() => {
                  sound.play("click");
                  rematch();
                }}
                className="h-13 rounded-2xl bg-amber-500 py-3.5 text-base font-bold text-white hover:bg-amber-500"
                style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
              >
                <RotateCcw className="mr-2 h-5 w-5" /> Rematch in this room
              </Button>
            ) : (
              <Button
                onClick={() => {
                  sound.play("click");
                  leaveRoom();
                }}
                className="h-13 rounded-2xl bg-amber-500 py-3.5 text-base font-bold text-white hover:bg-amber-500"
                style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
              >
                <RotateCcw className="mr-2 h-5 w-5" /> Back to the room
              </Button>
            )
          ) : (
            <Button
              onClick={() => {
                restart();
              }}
              className="h-13 rounded-2xl bg-amber-500 py-3.5 text-base font-bold text-white hover:bg-amber-500"
              style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
            >
              <RotateCcw className="mr-2 h-5 w-5" /> Play Again
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {!isOnline && (
              <Button
                variant="outline"
                onClick={() => setScreen("setup")}
                className="rounded-2xl border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <Settings2 className="mr-2 h-4 w-4" /> Change Setup
              </Button>
            )}
            <Button
              variant={isOnline ? "outline" : "ghost"}
              onClick={() => {
                if (isOnline) leaveRoom();
                setScreen("home");
              }}
              className={
                isOnline
                  ? "rounded-2xl border-white/25 bg-white/10 text-white hover:bg-white/20"
                  : "rounded-2xl text-white/70 hover:text-white"
              }
            >
              <Home className="mr-2 h-4 w-4" /> {isOnline ? "Leave to Home" : "Home"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
