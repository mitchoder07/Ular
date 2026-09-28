"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/store/game";
import { useOnline } from "@/store/online";
import { useProfile } from "@/store/profile";
import { BOARDS, ECONOMY, MAP_PRODUCTS, THEMES } from "@/lib/game/data";
import type { ThemeId } from "@/lib/game/types";
import { GameIcon } from "@/components/game/GameIcon";
import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function ShopScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const config = useGame((s) => s.config);
  const theme = THEMES[config.theme];

  const me = useOnline((s) => s.me);
  const status = useOnline((s) => s.status);
  const buyMapOnline = useOnline((s) => s.buyMap);
  const claimDailyOnline = useOnline((s) => s.claimDaily);
  const roomError = useOnline((s) => s.roomError);

  const wallet = useProfile((s) => s.wallet);
  const claimDailyLocal = useProfile((s) => s.claimDaily);
  const spendCoins = useProfile((s) => s.spendCoins);
  const unlockMapLocal = useProfile((s) => s.unlockMap);

  const [justBought, setJustBought] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // account wallet wins when signed in, guest wallet otherwise
  const online = status === "online" && !!me;
  const coins = online ? me!.coins : wallet.coins;
  const unlockedMaps = online ? me!.unlockedMaps : wallet.unlockedMaps;
  const dailyAvailable = online ? me!.dailyAvailable : wallet.lastDailyAt !== new Date().toISOString().slice(0, 10);

  const claimDaily = () => {
    if (online) claimDailyOnline();
    else claimDailyLocal();
    sound.play("coin");
    sound.haptic([20, 40, 20]);
  };

  const buyMap = (mapId: string, price: number) => {
    if (price === 0 || unlockedMaps.includes(mapId)) return;
    if (online) {
      buyMapOnline(mapId);
      sound.play("unlock");
      setJustBought(mapId);
    } else {
      if (spendCoins(price)) {
        unlockMapLocal(mapId);
        sound.play("unlock");
        sound.haptic([30, 60, 30]);
        setJustBought(mapId);
      } else {
        setLocalError("Not enough ular yet, grab the daily gift or win some ranked matches");
        sound.play("fail");
      }
    }
  };

  return (
    <AnimatedBackground theme={theme}>
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden safe-top">
        {/* header */}
        <div className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-3">
          <button
            onClick={() => setScreen(online ? "online" : "home")}
            aria-label="Back"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
          >
            Map Shop
          </h1>
          <div className="ml-auto flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-sm font-bold text-amber-200">
            <GameIcon id="coin" size={15} strokeWidth={2.2} />
            {coins}
          </div>
        </div>

        {/* scrollable middle */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          <div className="space-y-4 pb-5">
            {/* daily gift */}
            <section className="rounded-3xl border border-amber-300/30 bg-amber-400/10 p-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400/20 text-amber-200">
                  <Gift className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold text-white">Daily gift</div>
                  <div className="text-[11px] text-white/55">
                    {online ? "Paid straight to your account" : "Saved in this device's wallet"}
                  </div>
                </div>
                {dailyAvailable ? (
                  <Button
                    size="sm"
                    onClick={claimDaily}
                    className="h-9 rounded-xl bg-amber-500 text-xs font-bold text-white hover:bg-amber-500"
                  >
                    Claim +{ECONOMY.dailyBonus}
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-white/45">
                    <Check className="h-3.5 w-3.5 text-emerald-300" /> Claimed
                  </span>
                )}
              </div>
            </section>

            {(roomError || localError) && (
              <p className="rounded-2xl bg-rose-500/15 px-4 py-2.5 text-xs font-semibold text-rose-200">
                {roomError ?? localError}
              </p>
            )}

            {!online && (
              <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 text-xs leading-relaxed text-white/55 backdrop-blur-md">
                <div className="mb-1 flex items-center gap-2 text-[15px] font-bold text-white">
                  <GameIcon id="globe" size={18} strokeWidth={2.2} className="text-amber-300" /> Guest wallet
                </div>
                You are buying with the wallet saved on this device. Sign in from Play Online and your
                guest ular and every map you own travel with you.
              </section>
            )}

            {/* map products */}
            {MAP_PRODUCTS.filter((m) => m.price > 0).map((product) => {
              const board = BOARDS.find((b) => b.id === product.boardId)!;
              const mapTheme = THEMES[product.themeId as ThemeId];
              const owned = unlockedMaps.includes(product.id);
              const afford = coins >= product.price;
              return (
                <motion.section
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-3xl border border-white/12 bg-white/[0.07] backdrop-blur-md"
                >
                  {/* preview */}
                  <div className="relative p-3" style={{ background: mapTheme.pageBg }}>
                    <svg viewBox="0 0 220 110" className="w-full" role="img" aria-label={`${product.name} preview`}>
                      <rect x="2" y="2" width="216" height="106" rx="14" fill={mapTheme.frame} />
                      <rect x="10" y="10" width="200" height="90" rx="10" fill={mapTheme.boardBg} />
                      {Array.from({ length: 40 }, (_, i) => {
                        const row = Math.floor(i / 8);
                        const col = row % 2 === 0 ? i % 8 : 7 - (i % 8);
                        return (
                          <rect
                            key={i}
                            x={12 + col * 24.6}
                            y={12 + (4 - row) * 17.8}
                            width={22}
                            height={15.8}
                            rx={3}
                            fill={i % 2 === 0 ? mapTheme.cellA : mapTheme.cellB}
                            stroke={mapTheme.cellStroke}
                            strokeWidth={0.6}
                          />
                        );
                      })}
                      {/* preview ladder */}
                      <line x1="60" y1="88" x2="44" y2="30" stroke={mapTheme.ladder.outline} strokeWidth={6} strokeLinecap="round" />
                      <line x1="72" y1="92" x2="56" y2="34" stroke={mapTheme.ladder.outline} strokeWidth={6} strokeLinecap="round" />
                      <line x1="60" y1="88" x2="44" y2="30" stroke={mapTheme.ladder.rail} strokeWidth={3.4} strokeLinecap="round" />
                      <line x1="72" y1="92" x2="56" y2="34" stroke={mapTheme.ladder.rail} strokeWidth={3.4} strokeLinecap="round" />
                      {/* preview snake */}
                      <path
                        d="M140,26 C120,50 180,55 158,74 C140,90 176,94 168,102"
                        fill="none"
                        stroke={mapTheme.snakes[0].outline}
                        strokeWidth={9}
                        strokeLinecap="round"
                      />
                      <path
                        d="M140,26 C120,50 180,55 158,74 C140,90 176,94 168,102"
                        fill="none"
                        stroke={mapTheme.snakes[0].body}
                        strokeWidth={6}
                        strokeLinecap="round"
                      />
                      <ellipse cx="140" cy="26" rx="8" ry="6.5" fill={mapTheme.snakes[0].body} stroke={mapTheme.snakes[0].outline} strokeWidth={1.6} />
                    </svg>
                    {justBought === product.id && (
                      <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/45">
                        <div className="flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900">
                          <Check className="h-4 w-4" /> Unlocked!
                        </div>
                      </div>
                    )}
                  </div>

                  {/* details */}
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <GameIcon id={product.icon} size={18} strokeWidth={2.2} className="text-amber-300" />
                      <span className="text-[15px] font-bold text-white">{product.name}</span>
                      {owned && (
                        <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-200">
                          <Check className="h-3 w-3" /> Owned
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/55">{product.tagline}</p>
                    <p className="mt-0.5 text-[11px] text-white/40">
                      Includes the {mapTheme.name} theme · {Object.keys(board.snakes).length} snakes ·{" "}
                      {Object.keys(board.ladders).length} ladders
                    </p>

                    {!owned && (
                      <Button
                        onClick={() => buyMap(product.id, product.price)}
                        disabled={!afford}
                        className={cn(
                          "mt-3 h-11 w-full rounded-2xl text-sm font-bold text-white",
                          afford ? "bg-amber-500 hover:bg-amber-500" : "bg-white/10 text-white/40"
                        )}
                      >
                        <GameIcon id="coin" size={15} strokeWidth={2.2} className="mr-1.5" />
                        Unlock for {product.price}
                      </Button>
                    )}
                  </div>
                </motion.section>
              );
            })}

            {/* earn more hint */}
            <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 text-xs leading-relaxed text-white/55 backdrop-blur-md">
              <div className="mb-1.5 flex items-center gap-2 text-[15px] font-bold text-white">
                <GameIcon id="lightbulb" size={18} strokeWidth={2.2} className="text-amber-300" /> Need more ular?
              </div>
              Win ranked matches for the biggest pots, or bring friends into a room: every friendly win pays{" "}
              {ECONOMY.friendlyWinBonus}. Offline wins against the bots add {ECONOMY.offlineWinBonus} each.
            </section>
          </div>
        </div>

        {status === "connecting" && (
          <div className="grid place-items-center pb-6">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
          </div>
        )}
      </div>
    </AnimatedBackground>
  );
}
