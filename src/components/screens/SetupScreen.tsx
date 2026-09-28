"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Compass, Lock, Map, Minus, Plus, Swords, Trophy, User, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGame, type PlayerSetup } from "@/store/game";
import { useOnline } from "@/store/online";
import { useProfile } from "@/store/profile";
import {
  THEMES,
  THEME_LIST,
  AVATARS,
  AI_PERSONAS,
  BOARDS,
  MAP_PRODUCTS,
  MAX_PLAYERS,
  nextFreePersona,
} from "@/lib/game/data";
import type { GameMode, GameRules, ThemeId } from "@/lib/game/types";
import { GameIcon } from "@/components/game/GameIcon";
import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const DEFAULT_SETUP: PlayerSetup[] = [
  { name: "You", avatar: "dog", isAI: false, difficulty: "medium" },
  { name: "Whiskers", avatar: "cat", isAI: true, difficulty: "medium" },
];

const MODE_ICONS: Record<GameMode, React.ComponentType<{ className?: string }>> = {
  classic: Trophy,
  adventure: Compass,
  highstakes: Swords,
  hacker: (props) => <GameIcon id="terminal" size={16} strokeWidth={2.2} {...props} />,
  volcano: (props) => <GameIcon id="flame" size={16} strokeWidth={2.2} {...props} />,
  glacier: (props) => <GameIcon id="snowflake" size={16} strokeWidth={2.2} {...props} />,
};

export function SetupScreen() {
  const startGame = useGame((s) => s.startGame);
  const setScreen = useGame((s) => s.setScreen);
  const prevConfig = useGame((s) => s.config);
  const prevPlayers = useGame((s) => s.players);

  const me = useOnline((s) => s.me);
  const status = useOnline((s) => s.status);
  const buyMapOnline = useOnline((s) => s.buyMap);
  const wallet = useProfile((s) => s.wallet);
  const spendCoins = useProfile((s) => s.spendCoins);
  const unlockMapLocal = useProfile((s) => s.unlockMap);

  const online = status === "online" && !!me;
  const unlockedMaps = online ? me!.unlockedMaps : wallet.unlockedMaps;
  const coins = online ? me!.coins : wallet.coins;

  const [mode, setMode] = useState<GameMode>(
    BOARDS.some((b) => b.id === prevConfig.mode) ? prevConfig.mode : "classic"
  );
  const [theme, setTheme] = useState<ThemeId>(prevConfig.theme);
  const [rules, setRules] = useState<GameRules>(prevConfig.rules);
  const [players, setPlayers] = useState<PlayerSetup[]>(() =>
    prevPlayers.length >= 2
      ? prevPlayers.map((p) => ({ name: p.name, avatar: p.avatar, isAI: p.isAI, difficulty: p.difficulty }))
      : DEFAULT_SETUP
  );
  const [avatarPicker, setAvatarPicker] = useState<number | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<{ mapId: string; price: number; name: string } | null>(null);

  // if the saved mode/theme is locked (wallet reset), fall back to free picks
  const modeUnlocked = (() => {
    const product = MAP_PRODUCTS.find((m) => m.id === mode);
    return !product || product.price === 0 || unlockedMaps.includes(product.id);
  })();
  const activeMode: GameMode = modeUnlocked ? mode : "classic";

  const themeDef = THEMES[theme];

  const updatePlayer = (idx: number, patch: Partial<PlayerSetup>) => {
    setPlayers((ps) => ps.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return;
    const persona = nextFreePersona(new Set(players.map((p) => p.avatar)));
    setPlayers((ps) => [
      ...ps,
      { name: persona.name, avatar: persona.avatar, isAI: true, difficulty: persona.id },
    ]);
    sound.play("join");
  };

  const removePlayer = () => {
    if (players.length <= 2) return;
    setPlayers((ps) => ps.slice(0, -1));
    sound.play("click");
  };

  const tryUnlock = (mapId: string) => {
    const product = MAP_PRODUCTS.find((m) => m.id === mapId);
    if (!product || product.price === 0 || unlockedMaps.includes(mapId)) return;
    setUnlockTarget({ mapId, price: product.price, name: product.name });
    sound.play("click");
  };

  const confirmUnlock = () => {
    if (!unlockTarget) return;
    if (online) {
      buyMapOnline(unlockTarget.mapId);
      sound.play("unlock");
    } else if (spendCoins(unlockTarget.price)) {
      unlockMapLocal(unlockTarget.mapId);
      sound.play("unlock");
    } else {
      sound.play("fail");
    }
    setUnlockTarget(null);
  };

  const handleStart = () => {
    startGame({ mode: activeMode, theme, rules }, players);
  };

  const renderModeButton = (boardId: string) => {
    const b = BOARDS.find((bd) => bd.id === boardId)!;
    const product = MAP_PRODUCTS.find((m) => m.id === boardId);
    const owned = !product || product.price === 0 || unlockedMaps.includes(boardId);
    const ModeIcon = MODE_ICONS[boardId as GameMode] ?? Map;
    const active = activeMode === boardId;
    return (
      <button
        key={boardId}
        onClick={() => {
          if (!owned) {
            tryUnlock(boardId);
            return;
          }
          setMode(boardId as GameMode);
          sound.play("click");
        }}
        className={cn(
          "rounded-2xl border-2 p-2.5 text-left transition-all active:scale-[0.97]",
          active ? "border-amber-400 bg-amber-400/15 shadow-lg" : "border-white/15 bg-white/5",
          !owned && "border-white/10"
        )}
      >
        <div className="flex items-center justify-between">
          <ModeIcon className={cn("h-5 w-5", active ? "text-amber-300" : owned ? "text-white/60" : "text-white/35")} />
          {!owned && (
            <span className="flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
              <GameIcon id="coin" size={9} strokeWidth={2.6} />
              {product?.price}
            </span>
          )}
        </div>
        <div className={cn("mt-1.5 text-[13px] font-bold", owned ? "text-white" : "text-white/60")}>
          {b.name}
        </div>
        <div className="text-[10px] leading-tight text-white/55">{b.tagline}</div>
      </button>
    );
  };

  return (
    <AnimatedBackground theme={themeDef}>
      {/* Fixed-height shell: header and start button always visible, only the middle scrolls. */}
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden safe-top">
        {/* header */}
        <div className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-3">
          <button
            onClick={() => setScreen("home")}
            aria-label="Back"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
          >
            New Game
          </h1>
          <div className="ml-auto flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold text-amber-200">
            <GameIcon id="coin" size={12} strokeWidth={2.4} />
            {coins}
          </div>
        </div>

        {/* scrollable middle (native scrolling: smooth on every phone) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          <div className="space-y-4 pb-5">
            {/* ---------- board layout ---------- */}
            <SectionCard title="Board map" icon={<Map className="h-5 w-5 text-amber-300" />}>
              <div className="grid grid-cols-3 gap-2">
                {BOARDS.map((b) => renderModeButton(b.id))}
              </div>
              <p className="mt-2 text-center text-[10px] text-white/40">
                Locked maps unlock with ular from the shop
              </p>
            </SectionCard>

            {/* ---------- players ---------- */}
            <SectionCard title="Players" icon={<Users className="h-5 w-5 text-amber-300" />}>
              <div className="space-y-2.5">
                {players.map((p, i) => (
                  <div key={i} className="rounded-2xl border border-white/15 bg-white/5 p-2.5">
                    <div className="flex items-center gap-2.5">
                      {/* avatar */}
                      <button
                        onClick={() => {
                          setAvatarPicker(avatarPicker === i ? null : i);
                          sound.play("click");
                        }}
                        aria-label={`Change avatar for player ${i + 1}`}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-white/60 bg-white/15 transition-transform active:scale-95"
                      >
                        <GameIcon id={p.avatar} size={22} strokeWidth={2} style={{ color: "#fff" }} />
                      </button>
                      <Input
                        value={p.name}
                        onChange={(e) => updatePlayer(i, { name: e.target.value.slice(0, 12) })}
                        placeholder={p.isAI ? AI_PERSONAS[p.difficulty].name : "Your name"}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/40"
                      />
                      {/* human / ai */}
                      <div className="flex shrink-0 overflow-hidden rounded-xl border border-white/20">
                        <button
                          onClick={() => updatePlayer(i, { isAI: false })}
                          aria-label="Human player"
                          className={cn(
                            "grid h-10 w-10 place-items-center transition-colors",
                            !p.isAI ? "bg-emerald-500 text-white" : "bg-white/5 text-white/50"
                          )}
                        >
                          <User className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => updatePlayer(i, { isAI: true })}
                          aria-label="AI player"
                          className={cn(
                            "grid h-10 w-10 place-items-center transition-colors",
                            p.isAI ? "bg-violet-500 text-white" : "bg-white/5 text-white/50"
                          )}
                        >
                          <Bot className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>

                    {/* difficulty */}
                    {p.isAI && (
                      <div className="mt-2 flex gap-1.5">
                        {(["easy", "medium", "hard"] as const).map((d) => (
                          <button
                            key={d}
                            onClick={() => {
                              updatePlayer(i, { difficulty: d, name: AI_PERSONAS[d].name, avatar: AI_PERSONAS[d].avatar });
                              sound.play("click");
                            }}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-1.5 text-xs font-bold transition-all active:scale-95",
                              p.difficulty === d
                                ? "border-violet-400 bg-violet-500/25 text-white"
                                : "border-white/15 bg-white/5 text-white/55"
                            )}
                          >
                            <GameIcon id={AI_PERSONAS[d].avatar} size={14} strokeWidth={2.2} />
                            {AI_PERSONAS[d].name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* avatar picker */}
                    {avatarPicker === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2.5 grid grid-cols-8 gap-1 rounded-xl bg-black/25 p-2">
                          {AVATARS.map((a) => (
                            <button
                              key={a}
                              onClick={() => {
                                updatePlayer(i, { avatar: a });
                                setAvatarPicker(null);
                                sound.play("click");
                              }}
                              className={cn(
                                "grid h-9 place-items-center rounded-lg transition-all active:scale-90",
                                p.avatar === a ? "bg-white/25 ring-2 ring-amber-400" : "hover:bg-white/10"
                              )}
                            >
                              <GameIcon id={a} size={18} strokeWidth={2} style={{ color: "#fff" }} />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={removePlayer}
                  disabled={players.length <= 2}
                  className="h-9 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/15"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold text-white/60">{players.length} / {MAX_PLAYERS} players</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addPlayer}
                  disabled={players.length >= MAX_PLAYERS}
                  className="h-9 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/15"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </SectionCard>

            {/* ---------- theme ---------- */}
            <SectionCard title="Board theme" icon={<GameIcon id="gem" size={18} strokeWidth={2.2} className="text-amber-300" />}>
              <div className="grid grid-cols-2 gap-2.5">
                {THEME_LIST.map((t) => {
                  const product = MAP_PRODUCTS.find((m) => m.themeId === t.id && m.price > 0);
                  const owned = !product || unlockedMaps.includes(product.id);
                  const active = theme === t.id;
                  const canUse = owned || active;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (!owned) {
                          tryUnlock(product!.id);
                          return;
                        }
                        setTheme(t.id);
                        sound.play("click");
                      }}
                      className={cn(
                        "overflow-hidden rounded-2xl border-2 text-left transition-all active:scale-[0.97]",
                        active ? "border-amber-400 shadow-lg" : owned ? "border-white/15" : "border-white/10"
                      )}
                    >
                      <div className="relative flex items-center gap-3 p-2.5">
                        <div
                          className="grid shrink-0 grid-cols-4 gap-[3px] rounded-lg p-[7px]"
                          style={{ background: t.pageBg }}
                        >
                          {Array.from({ length: 12 }, (_, ci) => (
                            <div
                              key={ci}
                              className="aspect-square w-1.5 rounded-[3px]"
                              style={{ background: ci % 2 === 0 ? t.cellA : t.cellB } as React.CSSProperties}
                            />
                          ))}
                        </div>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <GameIcon id={t.icon} size={14} strokeWidth={2.2} style={{ color: canUse ? "#fff" : "rgba(255,255,255,0.5)" }} />
                          <span className="truncate text-[13px] font-bold leading-tight text-white">{t.name}</span>
                        </div>
                        {!owned && (
                          <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-amber-400/25 px-1.5 py-0.5 text-[9px] font-bold text-amber-100">
                            <GameIcon id="coin" size={9} strokeWidth={2.6} />
                            {product?.price}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {/* ---------- rules ---------- */}
            <SectionCard title="Rules" icon={<GameIcon id="landmark" size={18} strokeWidth={2.2} className="text-amber-300" />}>
              <div className="space-y-3.5">
                <RuleToggle
                  label="Bounce back at finish"
                  desc="Land past 100 and you bounce back the extra steps"
                  checked={rules.bounceBack}
                  onChange={(v) => setRules((r) => ({ ...r, bounceBack: v }))}
                />
                <RuleToggle
                  label="Extra roll on a 6"
                  desc="Roll a six and you get to roll again"
                  checked={rules.extraTurnOnSix}
                  onChange={(v) => setRules((r) => ({ ...r, extraTurnOnSix: v }))}
                />
                <RuleToggle
                  label="Three 6s forfeit turn"
                  desc="Three sixes in a row and the turn is lost"
                  checked={rules.threeSixesForfeit}
                  onChange={(v) => setRules((r) => ({ ...r, threeSixesForfeit: v }))}
                />
                <RuleToggle
                  label="Must roll a 6 to start"
                  desc="The old-school way to join the race"
                  checked={rules.rollSixToStart}
                  onChange={(v) => setRules((r) => ({ ...r, rollSixToStart: v }))}
                />
                <div className="rounded-2xl border-2 border-dashed border-fuchsia-400/50 bg-fuchsia-500/10 p-3">
                  <RuleToggle
                    label={
                      <span className="flex items-center gap-1.5">
                        Arcade power tiles <Zap className="h-3.5 w-3.5 text-fuchsia-300" />
                      </span>
                    }
                    desc="Stars, shields, rockets and swaps on the board"
                    checked={rules.arcadePowerTiles}
                    onChange={(v) => setRules((r) => ({ ...r, arcadePowerTiles: v }))}
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* start (always fully visible above the home bar) */}
        <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-2">
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleStart}
              className="h-16 w-full rounded-3xl bg-emerald-500 text-xl font-bold text-white shadow-lg hover:bg-emerald-500 no-select"
              style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
            >
              Start Game
            </Button>
          </motion.div>
        </div>

        {/* map unlock dialog */}
        <Dialog open={!!unlockTarget} onOpenChange={(open) => !open && setUnlockTarget(null)}>
          <DialogContent className="max-w-[340px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-left text-lg">
                <Lock className="h-5 w-5 text-amber-500" />
                Unlock {unlockTarget?.name}?
              </DialogTitle>
              <DialogDescription className="text-left text-sm leading-relaxed">
                This map comes with its own matching theme. You have{" "}
                <span className="font-bold text-amber-600">{coins} ular</span> and the price is{" "}
                <span className="font-bold text-amber-600">{unlockTarget?.price} ular</span>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setUnlockTarget(null)}
                className="flex-1 rounded-2xl"
              >
                Later
              </Button>
              <Button
                onClick={confirmUnlock}
                disabled={coins < (unlockTarget?.price ?? 0)}
                className="flex-1 rounded-2xl bg-amber-500 font-bold text-white hover:bg-amber-500"
              >
                <GameIcon id="coin" size={15} strokeWidth={2.2} className="mr-1.5" />
                {coins < (unlockTarget?.price ?? 0) ? "Not enough" : "Unlock"}
              </Button>
            </DialogFooter>
            {coins < (unlockTarget?.price ?? 0) && (
              <p className="text-center text-xs text-slate-500">
                Win ranked matches or grab the daily gift to earn more
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AnimatedBackground>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md">
      <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function RuleToggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-[11px] leading-snug text-white/55">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={typeof label === "string" ? label : "rule"} />
    </div>
  );
}
