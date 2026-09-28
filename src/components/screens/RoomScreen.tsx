"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGame } from "@/store/game";
import { useOnline } from "@/store/online";
import { BOARDS, MAP_PRODUCTS, PLAYER_COLORS, THEMES, THEME_LIST } from "@/lib/game/data";
import type { ThemeId } from "@/lib/game/types";
import { GameIcon } from "@/components/game/GameIcon";
import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function RoomScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const config = useGame((s) => s.config);
  const theme = THEMES[config.theme];

  const me = useOnline((s) => s.me);
  const room = useOnline((s) => s.room);
  const leaveRoom = useOnline((s) => s.leaveRoom);
  const updateRoomSettings = useOnline((s) => s.updateRoomSettings);
  const startRoomGame = useOnline((s) => s.startRoomGame);
  const kickPlayer = useOnline((s) => s.kickPlayer);
  const roomError = useOnline((s) => s.roomError);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!room) setScreen("online");
  }, [room, setScreen]);

  if (!room) {
    return (
      <AnimatedBackground theme={theme}>
        <div className="grid h-dvh place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-white/60" />
        </div>
      </AnimatedBackground>
    );
  }

  const isHost = me?.id === room.hostId;
  const lobbyTheme = THEMES[room.settings.themeId as ThemeId] ?? theme;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      sound.play("click");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AnimatedBackground theme={lobbyTheme}>
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden safe-top">
        {/* header */}
        <div className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-3">
          <button
            onClick={() => {
              sound.play("click");
              leaveRoom();
            }}
            aria-label="Leave room"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
          >
            Room
          </h1>
          <button
            onClick={copyCode}
            className="ml-auto flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3.5 py-2 backdrop-blur-md transition-transform active:scale-95"
          >
            <span className="text-lg font-bold tracking-[0.3em] text-white">{room.code}</span>
            {copied ? (
              <Check className="h-4 w-4 text-emerald-300" />
            ) : (
              <Copy className="h-4 w-4 text-white/60" />
            )}
          </button>
        </div>

        {/* scrollable middle */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          <div className="space-y-4 pb-5">
            {roomError && (
              <p className="rounded-2xl bg-rose-500/15 px-4 py-2.5 text-xs font-semibold text-rose-200">
                {roomError}
              </p>
            )}

            {/* players */}
            <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md">
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-white">
                <GameIcon id="users" size={18} strokeWidth={2.2} className="text-amber-300" />
                Players {room.players.length}/6
              </h2>
              <div className="space-y-2">
                {room.players.map((p) => {
                  const color = PLAYER_COLORS[p.colorId % PLAYER_COLORS.length];
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-center gap-2.5 rounded-2xl border px-3 py-2",
                        p.connected ? "border-white/15 bg-white/5" : "border-rose-400/30 bg-rose-500/10"
                      )}
                    >
                      <div
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/70"
                        style={{ background: color.main }}
                      >
                        <GameIcon id={p.avatar} size={20} strokeWidth={2.1} style={{ color: "#fff" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-white">{p.name}</span>
                          {p.isHost && <GameIcon id="crown" size={13} strokeWidth={2.4} style={{ color: "#fbbf24" }} />}
                          {me?.id === p.id && (
                            <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/70">
                              you
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-semibold text-white/45">
                          {p.connected ? (p.isHost ? "Host" : "Ready") : "Reconnecting..."}
                        </div>
                      </div>
                      {isHost && p.id !== me?.id && (
                        <button
                          onClick={() => {
                            kickPlayer(p.id);
                            sound.play("click");
                          }}
                          aria-label={`Remove ${p.name}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white/50 transition-transform active:scale-90"
                        >
                          <GameIcon id="x" size={14} strokeWidth={2.4} />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-[11px] text-white/45">
                Share the code {room.code} with your friends, they tap Join with a code
              </p>
            </section>

            {/* host picks the map + theme */}
            <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md">
              <h2 className="mb-1 flex items-center gap-2 text-[15px] font-bold text-white">
                <GameIcon id="map" size={18} strokeWidth={2.2} className="text-amber-300" /> Board map
                {!isHost && <span className="ml-auto text-[11px] font-semibold text-white/45">Host picks</span>}
              </h2>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {BOARDS.map((b) => {
                  const product = MAP_PRODUCTS.find((m) => m.id === b.id);
                  const owned = !product || product.price === 0 || (me?.unlockedMaps ?? []).includes(b.id);
                  const active = room.settings.boardId === b.id;
                  return (
                    <button
                      key={b.id}
                      disabled={!isHost || !owned}
                      onClick={() => {
                        updateRoomSettings({ boardId: b.id });
                        sound.play("click");
                      }}
                      className={cn(
                        "rounded-2xl border-2 p-2.5 text-left transition-all active:scale-[0.97]",
                        active
                          ? "border-amber-400 bg-amber-400/15 shadow-lg"
                          : "border-white/15 bg-white/5",
                        (!isHost || !owned) && "opacity-55"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <GameIcon
                          id={product?.icon ?? "map"}
                          size={15}
                          strokeWidth={2.2}
                          style={{ color: active ? "#fcd34d" : "rgba(255,255,255,0.6)" }}
                        />
                        {!owned && <GameIcon id="lock" size={11} strokeWidth={2.4} style={{ color: "#fca5a5" }} />}
                      </div>
                      <div className="mt-1 text-[12px] font-bold leading-tight text-white">{b.name}</div>
                      <div className="text-[9px] leading-tight text-white/55">{b.tagline}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md">
              <h2 className="mb-1 flex items-center gap-2 text-[15px] font-bold text-white">
                <GameIcon id="gem" size={18} strokeWidth={2.2} className="text-amber-300" /> Board theme
                {!isHost && <span className="ml-auto text-[11px] font-semibold text-white/45">Host picks</span>}
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {THEME_LIST.map((t, ti) => {
                  const product = MAP_PRODUCTS.find((m) => m.themeId === t.id && m.price > 0);
                  const owned = !product || (me?.unlockedMaps ?? []).includes(product.id);
                  const active = room.settings.themeId === t.id;
                  return (
                    <button
                      key={t.id}
                      disabled={!isHost || !owned}
                      onClick={() => {
                        updateRoomSettings({ themeId: t.id });
                        sound.play("click");
                      }}
                      className={cn(
                        "overflow-hidden rounded-2xl border-2 text-left transition-all active:scale-[0.97]",
                        ti === THEME_LIST.length - 1 && THEME_LIST.length % 2 === 1 && "col-span-2",
                        active ? "border-amber-400 shadow-lg" : "border-white/15",
                        (!isHost || !owned) && "opacity-55"
                      )}
                    >
                      <div className="flex items-center gap-3 p-2.5">
                        <div
                          className="grid shrink-0 grid-cols-4 gap-[3px] rounded-lg p-[7px]"
                          style={{ background: t.pageBg }}
                        >
                          {Array.from({ length: 12 }, (_, ci) => (
                            <div
                              key={ci}
                              className="aspect-square w-1.5 rounded-[3px]"
                              style={{ background: ci % 2 === 0 ? t.cellA : t.cellB }}
                            />
                          ))}
                        </div>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <GameIcon id={t.icon} size={14} strokeWidth={2.2} style={{ color: "#fff" }} />
                          <span className="truncate text-[13px] font-bold leading-tight text-white">{t.name}</span>
                          {!owned && <GameIcon id="lock" size={11} strokeWidth={2.4} style={{ color: "#fca5a5" }} />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <p className="px-2 text-center text-[11px] leading-relaxed text-white/40">
              Standard rules: bounce back at 100, extra roll on a six, three sixes forfeits the turn
            </p>
          </div>
        </div>

        {/* footer: start / waiting */}
        <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pt-2">
          {isHost ? (
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => {
                  startRoomGame();
                  sound.play("start");
                }}
                disabled={room.players.length < 2}
                className="h-14 w-full rounded-3xl bg-emerald-500 text-lg font-bold text-white shadow-lg hover:bg-emerald-500"
                style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
              >
                {room.players.length < 2 ? "Waiting for players..." : "Start Game"}
              </Button>
            </motion.div>
          ) : (
            <div className="flex h-14 items-center justify-center gap-2 rounded-3xl border border-white/15 bg-white/10 text-sm font-semibold text-white/70 backdrop-blur-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for {room.players.find((p) => p.id === room.hostId)?.name ?? "the host"} to start
            </div>
          )}
        </div>
      </div>
    </AnimatedBackground>
  );
}
