"use client";

import { motion } from "framer-motion";
import { BarChart3, HelpCircle, Globe, Play, RotateCcw, Settings, ShoppingBag, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useGame } from "@/store/game";
import { useOnline } from "@/store/online";
import { useProfile } from "@/store/profile";
import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { GameIcon } from "@/components/game/GameIcon";
import { THEMES, PLAYER_COLORS } from "@/lib/game/data";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function HomeScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const resumeGame = useGame((s) => s.resumeGame);
  const resumable = useGame((s) => s.resumable);
  const config = useGame((s) => s.config);
  const theme = THEMES[config.theme];

  const me = useOnline((s) => s.me);
  const wallet = useProfile((s) => s.wallet);
  const coins = me ? me.coins : wallet.coins;

  return (
    <AnimatedBackground theme={theme}>
      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-between px-6 pb-8 safe-bottom"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 28px)" }}
      >
        {/* top bar: wallet pill on the left, settings well below the notch */}
        <div className="flex w-full items-center justify-between gap-2">
          <button
            onClick={() => {
              sound.play("click");
              setScreen("shop");
            }}
            aria-label="Open the map shop"
            className="flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3.5 py-2 text-sm font-bold text-amber-200 backdrop-blur-md transition-transform active:scale-95 no-select"
          >
            <GameIcon id="coin" size={16} strokeWidth={2.2} />
            {coins}
            <ShoppingBag className="ml-0.5 h-3.5 w-3.5 text-amber-200/70" />
          </button>
          <SettingsSheet />
        </div>

        {/* hero */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 14 }}
            className="relative mb-5"
          >
            {/* hand-drawn mini board */}
            <svg
              viewBox="0 0 240 240"
              className="h-44 w-44 drop-shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
              role="img"
              aria-label="Snakes and ladders board illustration"
            >
              {/* frame */}
              <rect x="4" y="4" width="232" height="232" rx="26" fill={theme.frame} />
              <rect x="12" y="12" width="216" height="216" rx="20" fill={theme.boardBg} />

              {/* cells (5×5 checker) */}
              {Array.from({ length: 25 }, (_, i) => {
                const row = Math.floor(i / 5);
                const col = row % 2 === 0 ? i % 5 : 4 - (i % 5);
                const x = 12 + col * 43.2;
                const y = 12 + (4 - row) * 43.2;
                const isFinish = i === 24;
                return (
                  <rect
                    key={i}
                    x={x + 1.5}
                    y={y + 1.5}
                    width={40.2}
                    height={40.2}
                    rx={6}
                    fill={isFinish ? "#fbbf24" : (i + row) % 2 === 0 ? theme.cellA : theme.cellB}
                    stroke={theme.cellStroke}
                    strokeWidth={1}
                  />
                );
              })}

              {/* ladder: cell 8 → cell 19 */}
              <g opacity={0.95}>
                <line x1={122.5} y1={171.5} x2={82.5} y2={91.5} stroke={theme.ladder.outline} strokeWidth={9} strokeLinecap="round" />
                <line x1={105.5} y1={179} x2={65.5} y2={99} stroke={theme.ladder.outline} strokeWidth={9} strokeLinecap="round" />
                <line x1={122.5} y1={171.5} x2={82.5} y2={91.5} stroke={theme.ladder.rail} strokeWidth={5.5} strokeLinecap="round" />
                <line x1={105.5} y1={179} x2={65.5} y2={99} stroke={theme.ladder.rail} strokeWidth={5.5} strokeLinecap="round" />
                {[0.22, 0.42, 0.62, 0.82].map((t) => (
                  <line
                    key={t}
                    x1={122.5 + (105.5 - 122.5) * t}
                    y1={171.5 + (179 - 171.5) * t}
                    x2={105.5 + (82.5 - 105.5) * t}
                    y2={179 + (99 - 179) * t}
                    stroke={theme.ladder.rung}
                    strokeWidth={4.5}
                    strokeLinecap="round"
                  />
                ))}
              </g>

              {/* snake: head at cell 22 → tail near cell 3 */}
              <g opacity={0.96}>
                <path
                  d="M85,60 C 50,100 160,105 120,145 C 85,180 145,190 122,205"
                  fill="none"
                  stroke={theme.snakes[0].outline}
                  strokeWidth={15}
                  strokeLinecap="round"
                />
                <path
                  d="M85,60 C 50,100 160,105 120,145 C 85,180 145,190 122,205"
                  fill="none"
                  stroke={theme.snakes[0].body}
                  strokeWidth={10}
                  strokeLinecap="round"
                />
                <path
                  d="M85,60 C 50,100 160,105 120,145 C 85,180 145,190 122,205"
                  fill="none"
                  stroke={theme.snakes[0].belly}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeDasharray="7 6"
                  opacity={0.9}
                />
                {/* head */}
                <g transform="translate(85,60) rotate(35)">
                  <ellipse cx={0} cy={0} rx={13} ry={10} fill={theme.snakes[0].body} stroke={theme.snakes[0].outline} strokeWidth={2.5} />
                  <circle cx={4} cy={-4} r={2.6} fill="#fff" />
                  <circle cx={4} cy={4} r={2.6} fill="#fff" />
                  <circle cx={4.9} cy={-4} r={1.3} fill="#0f172a" />
                  <circle cx={4.9} cy={4} r={1.3} fill="#0f172a" />
                  <path d="M12,0 q6,-1 8,-4 M12,0 q6,1 8,4" stroke="#e11d48" strokeWidth={1.8} fill="none" strokeLinecap="round" />
                </g>
              </g>

              {/* tokens */}
              <g>
                <ellipse cx={185} cy={200} rx={10} ry={3.5} fill="rgba(0,0,0,0.25)" />
                <circle cx={185} cy={192} r={11.5} fill={PLAYER_COLORS[0].main} stroke="#fff" strokeWidth={3} />
              </g>
              <g>
                <ellipse cx={150} cy={132} rx={10} ry={3.5} fill="rgba(0,0,0,0.25)" />
                <circle cx={150} cy={124} r={11.5} fill={PLAYER_COLORS[2].main} stroke="#fff" strokeWidth={3} />
              </g>

              {/* finish trophy */}
              <GameIcon id="trophy" x={172} y={24} width={22} height={22} strokeWidth={2.1} style={{ color: "#7c2d12" }} />
            </svg>

            {/* floating accents */}
            <div className="animate-float-slow absolute -right-7 -top-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md">
              <GameIcon id="dice" size={26} strokeWidth={2} style={{ color: "#fff" }} />
            </div>
            <div className="animate-float absolute -left-8 top-9 grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md [animation-delay:0.8s]">
              <GameIcon id="ladder" size={20} strokeWidth={2.1} style={{ color: "#fff" }} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="text-5xl font-bold leading-[1.05] tracking-tight text-white"
            style={{
              fontFamily: "var(--font-fredoka), var(--font-geist-sans), sans-serif",
              textShadow: "0 12px 40px rgba(0,0,0,0.35)",
            }}
          >
            Snakes
            <span className="mx-2 inline-block align-middle text-4xl text-amber-300">&amp;</span>
            <br />
            Ladders
          </motion.h1>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.16 }}
            className="mt-3 rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur-md"
          >
            Deluxe
          </motion.div>
          <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-white/75">
            The race you grew up loving, now with gorgeous boards, online rooms and AI rivals with real personality.
          </p>
        </div>

        {/* menu */}
        <div className="flex w-full flex-col items-stretch gap-3">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              sound.play("click");
              setScreen("setup");
            }}
            className="rounded-3xl bg-amber-500 px-6 py-5 text-xl font-bold text-white shadow-lg transition-transform active:scale-[0.98] no-select"
            style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
          >
            <span className="flex items-center justify-center gap-3">
              <Play className="h-6 w-6 fill-current" /> Play
            </span>
          </motion.button>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.26 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              sound.play("click");
              setScreen("online");
            }}
            className="rounded-3xl border border-violet-300/40 bg-violet-500/25 px-6 py-4 text-lg font-bold text-white shadow-lg backdrop-blur-md transition-transform active:scale-[0.98] no-select"
            style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
          >
            <span className="flex items-center justify-center gap-3">
              <Globe className="h-5.5 w-5.5" /> Play Online
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold tracking-wide text-violet-100/80">
              Rooms with friends, ranked matches, ular coins
            </span>
          </motion.button>

          <AnimatePresenceForResume show={resumable} onResume={resumeGame} />

          <div className="grid grid-cols-2 gap-3">
            <MenuButton icon={BarChart3} label="Stats" onClick={() => setScreen("stats")} />
            <MenuButton icon={HelpCircle} label="How to Play" onClick={() => setScreen("howto")} />
          </div>
        </div>

        {/* footer */}
        <div className="mt-2 flex flex-col items-center gap-1 text-[11px] text-white/50">
          <span>No ads · No real-money purchases · Works offline</span>
          <span>Snakes &amp; Ladders Deluxe v1.3</span>
        </div>
      </div>
    </AnimatedBackground>
  );
}

function AnimatePresenceForResume({ show, onResume }: { show: boolean; onResume: () => void }) {
  if (!show) return null;
  return (
    <motion.button
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      whileTap={{ scale: 0.97 }}
      onClick={onResume}
      className="flex items-center justify-center gap-2.5 rounded-2xl border border-emerald-300/40 bg-emerald-500/20 px-5 py-3.5 font-semibold text-emerald-100 backdrop-blur-md transition-transform active:scale-[0.98] no-select"
    >
      <RotateCcw className="h-5 w-5" /> Resume Game
    </motion.button>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="h-[52px] rounded-2xl border border-white/15 bg-white/10 text-white text-[15px] font-semibold backdrop-blur-md hover:bg-white/20 active:scale-[0.97] transition-all no-select"
    >
      <Icon className="mr-2 h-5 w-5" /> {label}
    </Button>
  );
}

/* ---------------- settings sheet ---------------- */

export function SettingsSheet({ trigger }: { trigger?: React.ReactNode }) {
  const settings = useProfile((s) => s.settings);
  const setSettings = useProfile((s) => s.setSettings);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <button
            aria-label="Settings"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95 no-select"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-10 pt-6 max-h-[85dvh] overflow-y-auto">
        <SheetHeader className="px-0 pb-2">
          <SheetTitle className="flex items-center gap-2 text-left text-xl" style={{ fontFamily: "var(--font-fredoka), sans-serif" }}>
            <Settings className="h-5 w-5" /> Settings
          </SheetTitle>
          <SheetDescription className="sr-only">Sound, haptics and animation preferences</SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          <SettingRow
            icon={settings.sfx ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            label="Sound effects"
            description="Dice, snakes, ladders, coins and more"
          >
            <Switch checked={settings.sfx} onCheckedChange={(v) => setSettings({ sfx: v })} aria-label="Toggle sound effects" />
          </SettingRow>

          <SettingRow
            icon={<GameIcon id="music" size={20} strokeWidth={2} />}
            label="Background music"
            description="Gentle generative melody"
          >
            <Switch checked={settings.music} onCheckedChange={(v) => setSettings({ music: v })} aria-label="Toggle music" />
          </SettingRow>

          <SettingRow
            icon={<GameIcon id="vibrate" size={20} strokeWidth={2} />}
            label="Haptic feedback"
            description="Vibration on rolls and events"
          >
            <Switch checked={settings.haptics} onCheckedChange={(v) => setSettings({ haptics: v })} aria-label="Toggle haptics" />
          </SettingRow>

          <SettingRow
            icon={<GameIcon id="tag" size={20} strokeWidth={2} />}
            label="Position labels"
            description="Show numbers above tokens"
          >
            <Switch
              checked={settings.showTokenPos}
              onCheckedChange={(v) => setSettings({ showTokenPos: v })}
              aria-label="Toggle position labels"
            />
          </SettingRow>

          <div>
            <Label className="text-sm font-semibold text-slate-700">Animation speed</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["normal", "fast", "instant"] as const).map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSettings({ speed: sp })}
                  className={cn(
                    "flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold capitalize transition-all active:scale-95",
                    settings.speed === sp
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-slate-200 bg-white text-slate-600"
                  )}
                >
                  <GameIcon id={sp === "instant" ? "zap" : sp === "fast" ? "rabbit" : "turtle"} size={15} strokeWidth={2.2} />
                  {sp}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-slate-800">{label}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}
