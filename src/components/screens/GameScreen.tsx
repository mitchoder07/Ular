"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dices,
  History,
  Home,
  Loader2,
  MessageCircle,
  Pause,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGame } from "@/store/game";
import { useProfile } from "@/store/profile";
import { useOnline } from "@/store/online";
import { THEMES, getBoard, PLAYER_COLORS } from "@/lib/game/data";
import { formatTime } from "@/lib/game/engine";
import { sound } from "@/lib/sound";
import { Board } from "@/components/game/Board";
import { Dice3D, MiniDice } from "@/components/game/Dice3D";
import { PlayerChips } from "@/components/game/PlayerChips";
import { GameIcon } from "@/components/game/GameIcon";
import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { WinOverlay } from "./WinOverlay";
import { cn } from "@/lib/utils";

export function GameScreen() {
  const config = useGame((s) => s.config);
  const players = useGame((s) => s.players);
  const turn = useGame((s) => s.turn);
  const dice = useGame((s) => s.dice);
  const diceRolling = useGame((s) => s.diceRolling);
  const phase = useGame((s) => s.phase);
  const toasts = useGame((s) => s.toasts);
  const aiBubble = useGame((s) => s.aiBubble);
  const winnerId = useGame((s) => s.winnerId);
  const diceHistory = useGame((s) => s.diceHistory);
  const log = useGame((s) => s.log);
  const powerTiles = useGame((s) => s.powerTiles);
  const move = useGame((s) => s.move);
  const startedAt = useGame((s) => s.startedAt);
  const onlineMeta = useGame((s) => s.online);
  const roll = useGame((s) => s.roll);
  const setScreen = useGame((s) => s.setScreen);

  const onlineStatus = useOnline((s) => s.status);
  const onlineRoom = useOnline((s) => s.room);
  const chat = useOnline((s) => s.chat);
  const sendChat = useOnline((s) => s.sendChat);
  const leaveRoom = useOnline((s) => s.leaveRoom);

  const settings = useProfile((s) => s.settings);
  const setSettings = useProfile((s) => s.setSettings);

  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const board = getBoard(config.mode);
  const theme = THEMES[config.theme];

  const current = players[turn];
  const isOnline = onlineMeta.active;
  const myOnlineTurn = isOnline && !!current && current.id === onlineMeta.myId;
  const humanTurn = phase === "awaitRoll" && !current?.isAI && !winnerId && (!isOnline || myOnlineTurn);
  const spd = settings.speed === "fast" ? 1.7 : settings.speed === "instant" ? 3.4 : 1;

  /* elapsed timer */
  useEffect(() => {
    if (winnerId) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [startedAt, winnerId]);

  /* toast auto-dismiss */
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => useGame.getState().dismissToast(t.id), t.tone === "win" ? 3600 : 2300)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  /* AI bubble auto-clear */
  useEffect(() => {
    if (!aiBubble) return;
    const t = setTimeout(() => useGame.getState().clearAiBubble(), 3000);
    return () => clearTimeout(t);
  }, [aiBubble]);

  /* keyboard: space/enter to roll */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.code === "Enter") && humanTurn) {
        e.preventDefault();
        void roll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [humanTurn, roll]);

  const turnHeadline = winnerId
    ? "Game over!"
    : isOnline && !myOnlineTurn && current
      ? `${current.name}'s turn`
      : phase === "awaitRoll"
        ? current?.isAI
          ? `${current.name} is thinking…`
          : isOnline
            ? "Your turn!"
            : `${current?.name ?? ""}, your turn!`
        : phase === "rolling"
          ? "Rolling the dice…"
          : "On the move…";

  const turnSub = winnerId
    ? "See how it all played out"
    : isOnline && !myOnlineTurn
      ? "Their dice, your nerves of steel"
      : humanTurn
        ? "Tap ROLL or tap the dice"
        : current?.isAI
          ? `Playing at ${current.difficulty} skill`
          : "Watch out for snakes";

  return (
    <AnimatedBackground theme={theme}>
      <div className="flex h-dvh w-full flex-col overflow-hidden no-select safe-top safe-bottom">
        {/* ---------- header ---------- */}
        <header className="flex shrink-0 items-center justify-between gap-2 px-3 pb-1 pt-2">
          <button
            onClick={() => setPaused(true)}
            aria-label="Pause menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
          >
            <Pause className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            {isOnline && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet-300/40 bg-violet-500/20 px-2.5 py-1.5 text-xs font-bold text-violet-100 backdrop-blur-md">
                <GameIcon id={onlineMeta.ranked ? "swords" : "globe"} size={13} strokeWidth={2.3} />
                <span className="truncate">{onlineMeta.ranked ? `Ranked ${onlineMeta.stake}` : onlineMeta.roomCode}</span>
              </span>
            )}
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
              <GameIcon id={theme.icon} size={14} strokeWidth={2.2} />
              <span className="truncate">{board.name} · {board.totalCells}</span>
            </span>
            {config.rules.arcadePowerTiles && (
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/20 px-2.5 py-1.5 text-xs font-bold text-fuchsia-200 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" /> Arcade
              </span>
            )}
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-bold tabular-nums text-white backdrop-blur-md">
              <Timer className="h-3.5 w-3.5" /> {formatTime(elapsed)}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isOnline && <QuickChat chat={chat} onSend={sendChat} />}
            <div className="lg:hidden">
              <LogDrawer log={log} />
            </div>
            <button
              onClick={() => setSettings({ music: !settings.music })}
              aria-label={settings.music ? "Mute music" : "Unmute music"}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
            >
              {settings.music ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* ---------- reconnect banner (online only) ---------- */}
        {isOnline && onlineStatus !== "online" && (
          <div className="flex shrink-0 items-center justify-center gap-2 bg-amber-500/90 px-4 py-1.5 text-xs font-bold text-white">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connection wobbled, reconnecting...
          </div>
        )}

        {/* ---------- player strip (mobile) ---------- */}
        <div className="shrink-0 px-3 pb-1 lg:hidden">
          <PlayerChips players={players} turn={turn} total={board.totalCells} aiBubble={aiBubble} winnerId={winnerId} layout="compact" />
        </div>

        {/* ---------- main area ---------- */}
        <div className="flex min-h-0 flex-1 gap-3 px-2 pb-2 lg:px-4">
          {/* board column */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <main className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
              <Board
                board={board}
                theme={theme}
                players={players}
                turn={turn}
                move={move}
                powerTiles={powerTiles}
                showTokenPos={settings.showTokenPos}
                speedFactor={spd}
              />
            </main>

            {/* ---------- dice dock (thumb zone) ---------- */}
            <div className="shrink-0 px-1 pt-1">
              <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-3xl border border-white/15 bg-white/10 p-2.5 backdrop-blur-md shadow-xl">
                <Dice3D
                  value={dice}
                  rolling={diceRolling}
                  size={72}
                  onTap={humanTurn ? () => void roll() : undefined}
                />
                <div className="min-w-0 flex-1" aria-live="polite">
                  <div className="flex items-center gap-2">
                    {current && (
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-white/70"
                        style={{ background: PLAYER_COLORS[current.colorId % PLAYER_COLORS.length].main }}
                      >
                        {phase === "awaitRoll" ? (
                          <GameIcon id={current.avatar} size={17} strokeWidth={2.1} style={{ color: "#fff" }} />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                        )}
                      </span>
                    )}
                    <span className="truncate text-[15px] font-bold text-white">{turnHeadline}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-white/60">{turnSub}</span>
                    <div className="flex shrink-0 -space-x-1.5">
                      {diceHistory.slice(0, 4).map((v, i) => (
                        <MiniDice key={i} value={v} />
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  disabled={!humanTurn}
                  onClick={() => void roll()}
                  className={cn(
                    "h-14 w-24 shrink-0 rounded-2xl bg-amber-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-amber-500",
                    humanTurn && "animate-roll-pulse"
                  )}
                  style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
                  aria-label="Roll the dice"
                >
                  {winnerId ? (
                    <Trophy className="h-6 w-6" />
                  ) : humanTurn ? (
                    <span className="flex items-center gap-1.5">
                      <Dices className="h-5 w-5" /> ROLL
                    </span>
                  ) : current?.isAI ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Rolling"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* ---------- side panel (desktop) ---------- */}
          <aside className="hidden w-[340px] shrink-0 flex-col gap-3 lg:flex">
            <PlayerChips
              players={players}
              turn={turn}
              total={board.totalCells}
              aiBubble={aiBubble}
              winnerId={winnerId}
              layout="column"
            />
            <div className="game-scroll min-h-0 flex-1 overflow-y-auto rounded-3xl border border-white/15 bg-black/20 p-4 backdrop-blur-md">
              <LogList log={log} />
            </div>
          </aside>
        </div>
      </div>

      {/* ---------- floating toasts ---------- */}
      <div className="pointer-events-none fixed inset-x-0 top-14 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-2xl backdrop-blur-md",
                t.tone === "snake" && "border-emerald-300/50 bg-emerald-950/80",
                t.tone === "ladder" && "border-amber-300/50 bg-amber-950/80",
                t.tone === "power" && "border-fuchsia-300/50 bg-fuchsia-950/80",
                t.tone === "six" && "border-orange-300/50 bg-orange-950/80",
                t.tone === "win" && "border-yellow-300/60 bg-yellow-950/85",
                t.tone === "info" && "border-white/30 bg-slate-900/80"
              )}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
                <GameIcon id={t.icon} size={22} strokeWidth={2} className="text-white" />
              </span>
              <div>
                <div className="text-sm font-bold text-white">{t.title}</div>
                {t.subtitle && <div className="text-xs text-white/70">{t.subtitle}</div>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ---------- win overlay ---------- */}
      <AnimatePresence>{winnerId && <WinOverlay />}</AnimatePresence>

      {/* ---------- pause dialog ---------- */}
      <PauseDialog
        open={paused}
        onOpenChange={(o) => setPaused(o)}
        isOnline={isOnline}
        onQuit={() => {
          setPaused(false);
          if (isOnline) {
            leaveRoom();
          } else {
            useGame.setState({ screen: "home", resumable: !winnerId });
          }
        }}
      />
    </AnimatedBackground>
  );
}

/* ---------------- quick chat (online) ---------------- */

const CHAT_PRESETS = [
  "Nice roll!",
  "So close!",
  "Lucky snake...",
  "Ouch!",
  "Good luck!",
  "Well played!",
  "Watch this!",
  "Got you!",
];

function QuickChat({
  chat,
  onSend,
}: {
  chat: Array<{ id: number; name: string; text: string; at: number }>;
  onSend: (text: string) => void;
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          aria-label="Quick chat"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[68dvh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 text-left">
            <MessageCircle className="h-5 w-5" /> Table Talk
          </DrawerTitle>
          <DrawerDescription className="sr-only">Quick messages for your table</DrawerDescription>
        </DrawerHeader>
        <div className="px-5 pb-3">
          <div className="game-scroll max-h-[28dvh] space-y-1.5 overflow-y-auto pb-2">
            {chat.length === 0 && (
              <p className="py-3 text-center text-xs text-slate-400">Say hello with a quick tap below</p>
            )}
            {chat.map((m) => (
              <div key={m.id} className="flex items-baseline gap-2 text-[13px]">
                <span className="shrink-0 font-bold text-slate-600">{m.name}:</span>
                <span className="text-slate-800">{m.text}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {CHAT_PRESETS.map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant="outline"
                onClick={() => {
                  onSend(preset);
                  sound.play("chat");
                }}
                className="h-9 rounded-xl text-xs font-semibold"
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------------- log ---------------- */

const LOG_KIND_COLOR: Record<string, string> = {
  snake: "text-emerald-300",
  ladder: "text-amber-300",
  power: "text-fuchsia-300",
  six: "text-orange-300",
  win: "text-yellow-300",
  ai: "text-violet-300",
  start: "text-sky-300",
  info: "text-white/80",
};

function LogList({ log }: { log: ReturnType<typeof useGame.getState>["log"] }) {
  return (
    <div className="space-y-1.5">
      {[...log].reverse().map((e) => (
        <div key={e.id} className="flex items-start gap-2 text-[13px] leading-snug">
          <GameIcon id={e.icon} size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-white/60" />
          <span className={LOG_KIND_COLOR[e.kind] ?? "text-white/80"}>{e.text}</span>
        </div>
      ))}
    </div>
  );
}

function LogDrawer({ log }: { log: ReturnType<typeof useGame.getState>["log"] }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          aria-label="Open game log"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
        >
          <History className="h-5 w-5" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[70dvh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2 text-left">
            <History className="h-5 w-5" /> Game Log
          </DrawerTitle>
          <DrawerDescription className="sr-only">Everything that happened in this game, newest first</DrawerDescription>
        </DrawerHeader>
        <div className="game-scroll max-h-[52dvh] overflow-y-auto px-5 pb-8">
          <LogList log={log} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------------- pause ---------------- */

function PauseDialog({
  open,
  onOpenChange,
  onQuit,
  isOnline,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onQuit: () => void;
  isOnline: boolean;
}) {
  const restart = useGame((s) => s.restart);
  const settings = useProfile((s) => s.settings);
  const setSettings = useProfile((s) => s.setSettings);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-center text-2xl" style={{ fontFamily: "var(--font-fredoka), sans-serif" }}>
            <Pause className="h-6 w-6" /> Paused
          </DialogTitle>
          <DialogDescription className="text-center">Take a breather. The snakes will wait.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Volume2 className="h-4 w-4" /> Sound effects
              </Label>
              <Switch checked={settings.sfx} onCheckedChange={(v) => setSettings({ sfx: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <span className="grid h-4 w-4 place-items-center"><GameIcon id="music" size={14} strokeWidth={2.2} /></span> Music
              </Label>
              <Switch checked={settings.music} onCheckedChange={(v) => setSettings({ music: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <GameIcon id="vibrate" size={16} strokeWidth={2.2} /> Haptics
              </Label>
              <Switch checked={settings.haptics} onCheckedChange={(v) => setSettings({ haptics: v })} />
            </div>
          </div>

          <div className="grid gap-2">
            <Button
              onClick={() => {
                sound.play("click");
                onOpenChange(false);
              }}
              className="h-12 rounded-2xl bg-emerald-500 text-base font-bold hover:bg-emerald-500"
            >
              <span className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center"><GameIcon id="play" size={14} strokeWidth={2.4} /></span> Resume
              </span>
            </Button>
            {!isOnline && (
              <Button
                variant="outline"
                onClick={() => {
                  sound.play("click");
                  onOpenChange(false);
                  restart();
                }}
                className="h-11 rounded-2xl"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Restart Game
              </Button>
            )}
            <Button variant="ghost" onClick={onQuit} className="h-11 rounded-2xl text-slate-500">
              <Home className="mr-2 h-4 w-4" /> {isOnline ? "Leave the room" : "Save & Quit to Home"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
