"use client";

import { ArrowLeft, HelpCircle } from "lucide-react";
import { useGame } from "@/store/game";
import { THEMES, POWER_META } from "@/lib/game/data";
import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { GameIcon } from "@/components/game/GameIcon";

const STEPS: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: "target",
    title: "The goal",
    body: "Be the first player to reach cell 100 at the top of the board. Everything else is the rollercoaster ride getting there!",
  },
  {
    icon: "dice",
    title: "Taking a turn",
    body: "Tap the big ROLL button or the dice itself. Your token hops forward one cell per pip. Roll a 6 and, with the classic rule on, you get another roll straight away. Careful though: three 6s in a row and the turn is lost!",
  },
  {
    icon: "snake",
    title: "Snakes bite down",
    body: "Land on a cell where a snake's head waits and you slide all the way down to its tail. It stings, but everyone gets bitten eventually. The trick is to bounce straight back.",
  },
  {
    icon: "ladder",
    title: "Ladders lift you up",
    body: "Land at the bottom of a ladder and you climb straight to its top. Big ladders near the finish can swing the whole game in one roll.",
  },
  {
    icon: "flag",
    title: "Finishing",
    body: "With the bounce-back rule on you must land on cell 100 exactly. Overshoot and you bounce back the extra steps. Turn the rule off for a friendlier sprint finish.",
  },
];

export function HowToPlayScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const theme = THEMES[useGame((s) => s.config.theme)];

  return (
    <AnimatedBackground theme={theme}>
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden safe-top">
        <div className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-3">
          <button
            onClick={() => setScreen("home")}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: "var(--font-fredoka), sans-serif" }}>
            <HelpCircle className="h-6 w-6" /> How to Play
          </h1>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        <div className="space-y-3 pb-8">
          {STEPS.map((s, i) => (
            <section
              key={s.title}
              className="flex gap-4 rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10">
                <GameIcon id={s.icon} size={24} strokeWidth={1.9} style={{ color: "#fcd34d" }} />
              </div>
              <div>
                <h2 className="mb-1 flex items-center gap-2 text-[15px] font-bold text-white">
                  <span className="text-xs font-black text-white/40">{i + 1}</span> {s.title}
                </h2>
                <p className="text-[13px] leading-relaxed text-white/70">{s.body}</p>
              </div>
            </section>
          ))}

          {/* arcade tiles */}
          <section className="rounded-3xl border-2 border-dashed border-fuchsia-400/50 bg-fuchsia-500/10 p-4 backdrop-blur-md">
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white">
              <GameIcon id="sparkles" size={18} strokeWidth={2} style={{ color: "#f0abfc" }} /> Arcade power tiles
              <span className="text-[10px] font-semibold text-fuchsia-200">(optional)</span>
            </h2>
            <div className="space-y-2.5">
              {Object.values(POWER_META).map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full border-2"
                    style={{ borderColor: p.color, background: `${p.color}22`, color: p.color }}
                  >
                    <GameIcon id={p.icon} size={18} strokeWidth={2.1} />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-white">{p.label}</div>
                    <div className="text-[12px] text-white/60">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-fuchsia-100/70">
              Turn arcade tiles on in the rules section when setting up a game. Tiles disappear once claimed, so grab
              them before your rivals do!
            </p>
          </section>

          {/* online rooms + coins */}
          <section className="rounded-3xl border-2 border-dashed border-violet-400/50 bg-violet-500/10 p-4 backdrop-blur-md">
            <h2 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-white">
              <GameIcon id="globe" size={18} strokeWidth={2} style={{ color: "#c4b5fd" }} /> Playing online
            </h2>
            <div className="space-y-2 text-[13px] leading-relaxed text-white/70">
              <p>
                Up to 6 friends can play from anywhere. One person taps <b className="text-white">Create a room</b>,
                everyone else joins with the 5-letter code, and the host picks the map and the theme for the table.
                If someone drops mid-game their token keeps rolling on its own until they reconnect.
              </p>
              <p>
                <b className="text-white">Quick match</b> pits you against a random rival for a ular stake. Winner
                takes the whole pot, so bring your lucky dice.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-amber-300/30 bg-amber-400/10 p-4 backdrop-blur-md">
            <h2 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-white">
              <GameIcon id="coin" size={18} strokeWidth={2} style={{ color: "#fcd34d" }} /> Ular, the game coin
            </h2>
            <div className="space-y-2 text-[13px] leading-relaxed text-white/70">
              <p>
                Ular (it means snake) is earned by playing: a daily gift, ranked wins, friendly wins with friends,
                achievements and even offline wins against the bots. Spend it in the shop to unlock extra maps like
                Hacker Grid, Magma Rush and Frostbite, each with its own matching theme.
              </p>
              <p>
                No real money is ever involved. Playing as a guest keeps your wallet on this device, and signing in
                carries your coins and maps with you.
              </p>
            </div>
          </section>

          {/* tips */}
          <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md">
            <h2 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-white">
              <GameIcon id="lightbulb" size={18} strokeWidth={2} style={{ color: "#fde68a" }} /> Pro tips
            </h2>
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-white/70">
              <li>• Turn on <b className="text-white">Instant</b> animation speed in Settings for lightning-fast games.</li>
              <li>• The shield only blocks one snake, so spend it wisely.</li>
              <li>• Games auto-save. Quit any time and hit <b className="text-white">Resume</b> on the home screen.</li>
              <li>• Want fullscreen play? Open your browser menu and choose “Add to Home screen”.</li>
            </ul>
          </section>
        </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
