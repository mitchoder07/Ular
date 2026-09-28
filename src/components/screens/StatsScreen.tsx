"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Medal, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGame } from "@/store/game";
import { useProfile } from "@/store/profile";
import { ACHIEVEMENTS, PLAYER_COLORS, THEMES } from "@/lib/game/data";
import { formatTime } from "@/lib/game/engine";
import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { GameIcon } from "@/components/game/GameIcon";
import { sound } from "@/lib/sound";

export function StatsScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const config = useGame((s) => s.config);
  const stats = useProfile((s) => s.stats);
  const achievements = useProfile((s) => s.achievements);
  const resetAll = useProfile((s) => s.resetAll);
  const [justReset, setJustReset] = useState(false);

  const theme = THEMES[config.theme];

  const rows = useMemo(
    () =>
      Object.entries(stats)
        .filter(([, r]) => r.games > 0)
        .sort((a, b) => b[1].wins - a[1].wins || b[1].games - a[1].games)
        .slice(0, 8),
    [stats]
  );

  const totals = useMemo(() => {
    let games = 0,
      wins = 0,
      snakes = 0,
      ladders = 0,
      sixes = 0;
    for (const r of Object.values(stats)) {
      games += r.games;
      wins += r.wins;
      snakes += r.snakes;
      ladders += r.ladders;
      sixes += r.sixes;
    }
    return { games, wins, snakes, ladders, sixes };
  }, [stats]);

  const bestTime = useMemo(() => {
    let best: number | undefined;
    for (const r of Object.values(stats)) {
      if (r.bestTimeMs && (!best || r.bestTimeMs < best)) best = r.bestTimeMs;
    }
    return best;
  }, [stats]);

  const unlockedCount = Object.keys(achievements).length;
  const winRate = totals.games > 0 ? Math.round((totals.wins / totals.games) * 100) : 0;

  return (
    <AnimatedBackground theme={theme}>
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden safe-top">
        {/* header */}
        <div className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-3">
          <button
            onClick={() => setScreen("home")}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: "var(--font-fredoka), sans-serif" }}>
            <GameIcon id="chart" size={22} strokeWidth={2.1} /> Stats
          </h1>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        {/* summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="dice" label="Games played" value={String(totals.games)} />
          <StatCard icon="trophy" label="Wins" value={`${totals.wins} (${winRate}%)`} />
          <StatCard icon="snake" label="Snakes survived" value={String(totals.snakes)} />
          <StatCard icon="ladder" label="Ladders climbed" value={String(totals.ladders)} />
          <StatCard icon="star" label="Sixes rolled" value={String(totals.sixes)} />
          <StatCard icon="timer" label="Best win time" value={bestTime ? formatTime(bestTime) : "Not yet"} />
        </div>

        {/* achievements */}
        <h2 className="mb-3 mt-6 flex items-center gap-2 text-lg font-bold text-white">
          <Medal className="h-5 w-5 text-amber-300" /> Achievements
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/70">
            {unlockedCount}/{ACHIEVEMENTS.length}
          </span>
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {ACHIEVEMENTS.map((a, i) => {
            const unlocked = !!achievements[a.id];
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                title={unlocked ? `${a.title}: ${a.description}` : "Still locked"}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center ${
                  unlocked
                    ? "border-amber-300/50 bg-amber-400/15"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <GameIcon
                  id={a.icon}
                  size={30}
                  strokeWidth={1.9}
                  className={unlocked ? "text-amber-300" : "text-white/30"}
                />
                <span className={`text-[11px] font-bold leading-tight ${unlocked ? "text-amber-100" : "text-white/50"}`}>
                  {a.title}
                </span>
                {!unlocked && (
                  <span className="absolute right-2 top-2 text-white/30">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* per-player table */}
        {rows.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 flex items-center gap-2 text-lg font-bold text-white">
              <Trophy className="h-5 w-5 text-amber-300" /> Hall of Fame
            </h2>
            <div className="space-y-2">
              {rows.map(([name, r], i) => {
                const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                const wr = r.games > 0 ? Math.round((r.wins / r.games) * 100) : 0;
                return (
                  <div
                    key={name}
                    className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.07] p-3 backdrop-blur-md"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                      style={{ background: color.main }}
                    >
                      {r.wins > 0 ? <Trophy className="h-4 w-4" /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-white/55">
                        <span>{r.games} games</span>
                        <span className="flex items-center gap-1">
                          <GameIcon id="snake" size={11} strokeWidth={2.2} /> {r.snakes}
                        </span>
                        <span className="flex items-center gap-1">
                          <GameIcon id="ladder" size={11} strokeWidth={2.2} /> {r.ladders}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-white">{r.wins}W</div>
                      <div className="text-[11px] text-white/55">{wr}% win</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {justReset && (
          <div className="mt-4 rounded-2xl border border-emerald-300/40 bg-emerald-500/15 p-3 text-center text-sm font-semibold text-emerald-200">
            All stats and achievements have been reset
          </div>
        )}

        {/* reset */}
        <div className="pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full rounded-2xl border-white/20 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reset all stats
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset everything?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes all stats, achievements and records stored on this device.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    resetAll();
                    setJustReset(true);
                    sound.play("fail");
                  }}
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.07] p-3.5 backdrop-blur-md">
      <GameIcon id={icon} size={22} strokeWidth={2} className="text-white/70" />
      <div className="mt-1 text-xl font-black text-white tabular-nums">{value}</div>
      <div className="text-[11px] font-medium text-white/55">{label}</div>
    </div>
  );
}
