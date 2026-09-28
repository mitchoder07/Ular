"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/store/game";
import { useOnline } from "@/store/online";
import { useProfile } from "@/store/profile";
import { AVATARS, ECONOMY, MAP_PRODUCTS } from "@/lib/game/data";
import { THEMES } from "@/lib/game/data";
import { GameIcon } from "@/components/game/GameIcon";
import { AnimatedBackground } from "@/components/game/AnimatedBackground";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function OnlineScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const config = useGame((s) => s.config);
  const theme = THEMES[config.theme];

  const status = useOnline((s) => s.status);
  const me = useOnline((s) => s.me);
  const connect = useOnline((s) => s.connect);
  const notice = useOnline((s) => s.notice);
  const clearNotice = useOnline((s) => s.clearNotice);

  useEffect(() => {
    connect();
  }, [connect]);

  /* auto-dismiss server notices */
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearNotice, 2600);
    return () => clearTimeout(t);
  }, [notice, clearNotice]);

  return (
    <AnimatedBackground theme={theme}>
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
            Play Online
          </h1>
          <div
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
              status === "online"
                ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                : "border-amber-300/40 bg-amber-500/20 text-amber-100"
            )}
          >
            <GameIcon id={status === "online" ? "wifi" : "wifiOff"} size={12} strokeWidth={2.4} />
            {status === "online" ? "Live" : status === "connecting" ? "Linking" : "Offline"}
          </div>
        </div>

        {/* scrollable middle */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          <div className="space-y-4 pb-5">
            {notice && (
              <div className="rounded-2xl border border-sky-300/30 bg-sky-500/15 px-4 py-2.5 text-[13px] font-semibold text-sky-100">
                {notice.text}
              </div>
            )}

            {status === "online" && !me && <AuthCard />}
            {status === "online" && me && <LobbyCards />}
            {status === "connecting" && (
              <div className="grid place-items-center rounded-3xl border border-white/12 bg-white/[0.07] p-10">
                <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                <p className="mt-3 text-sm text-white/60">Connecting to the arena...</p>
              </div>
            )}
            {status === "offline" && (
              <div className="grid place-items-center rounded-3xl border border-white/12 bg-white/[0.07] p-8 text-center">
                <GameIcon id="wifiOff" size={30} strokeWidth={2} style={{ color: "#fca5a5" }} />
                <p className="mt-3 text-sm font-semibold text-white">Can not reach the arena right now</p>
                <p className="mt-1 text-xs text-white/55">
                  Offline play still works perfectly, try again in a moment
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 h-9 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => connect()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}

/* ---------------- auth card ---------------- */

function AuthCard() {
  const register = useOnline((s) => s.register);
  const login = useOnline((s) => s.login);
  const authError = useOnline((s) => s.authError);
  const authBusy = useOnline((s) => s.authBusy);

  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [avatar, setAvatar] = useState("dog");

  const submit = () => {
    if (authBusy) return;
    if (mode === "register") register(name, pin, avatar);
    else login(name, pin);
  };

  return (
    <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
        <GameIcon id="login" size={18} strokeWidth={2.2} className="text-amber-300" />
        {mode === "register" ? "Create your player card" : "Welcome back"}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-white/55">
        {mode === "register"
          ? "A name and a 4-digit PIN is all it takes. Your ular wallet, maps and stats live on this card."
          : "Sign in with your name and PIN to pick up where you left off."}
      </p>

      <div className="mt-3 space-y-2.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 14))}
          placeholder="Player name"
          autoComplete="off"
          className="h-11 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/40"
        />
        <Input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="4-digit PIN"
          inputMode="numeric"
          autoComplete="off"
          className="h-11 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/40 tracking-[0.4em]"
        />

        {mode === "register" && (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Pick a face
            </div>
            <div className="grid grid-cols-8 gap-1 rounded-xl bg-black/25 p-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setAvatar(a);
                    sound.play("click");
                  }}
                  aria-label={`Avatar ${a}`}
                  className={cn(
                    "grid h-9 place-items-center rounded-lg transition-all active:scale-90",
                    avatar === a ? "bg-white/25 ring-2 ring-amber-400" : "hover:bg-white/10"
                  )}
                >
                  <GameIcon id={a} size={18} strokeWidth={2} style={{ color: "#fff" }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {authError && (
          <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200">{authError}</p>
        )}

        <Button
          onClick={submit}
          disabled={authBusy || name.trim().length < 3 || pin.length !== 4}
          className="h-12 w-full rounded-2xl bg-emerald-500 text-base font-bold text-white hover:bg-emerald-500"
          style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
        >
          {authBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : mode === "register" ? (
            "Create card"
          ) : (
            "Sign in"
          )}
        </Button>

        <button
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            sound.play("click");
          }}
          className="w-full py-1 text-center text-xs font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          {mode === "register" ? "Already have a card? Sign in" : "New here? Create a card"}
        </button>
      </div>
    </section>
  );
}

/* ---------------- signed-in lobby cards ---------------- */

function LobbyCards() {
  const me = useOnline((s) => s.me)!;
  const createRoom = useOnline((s) => s.createRoom);
  const joinRoom = useOnline((s) => s.joinRoom);
  const roomError = useOnline((s) => s.roomError);
  const queueRanked = useOnline((s) => s.queueRanked);
  const searching = useOnline((s) => s.searching);
  const cancelRanked = useOnline((s) => s.cancelRanked);
  const leaderboard = useOnline((s) => s.leaderboard);
  const fetchLeaderboard = useOnline((s) => s.fetchLeaderboard);
  const leaderboardBusy = useOnline((s) => s.leaderboardBusy);
  const logout = useOnline((s) => s.logout);
  const claimDaily = useOnline((s) => s.claimDaily);
  const setScreen = useGame((s) => s.setScreen);

  const [code, setCode] = useState("");
  const [stake, setStake] = useState<number>(ECONOMY.rankedStakes[1]);
  const [showBoard, setShowBoard] = useState(false);

  useEffect(() => {
    if (showBoard && leaderboard.length === 0) fetchLeaderboard();
  }, [showBoard, leaderboard.length, fetchLeaderboard]);

  return (
    <div className="space-y-4">
      {/* profile */}
      <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/60"
            style={{ background: "#14b8a6" }}
          >
            <GameIcon id={me.avatar} size={24} strokeWidth={2.1} style={{ color: "#fff" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-white">{me.name}</div>
            <div className="text-[11px] text-white/55">
              {me.wins} wins · {me.rankWins} ranked titles
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1.5 text-sm font-bold text-amber-200">
            <GameIcon id="coin" size={15} strokeWidth={2.2} />
            {me.coins}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {me.dailyAvailable ? (
            <Button
              size="sm"
              onClick={() => {
                claimDaily();
                sound.play("coin");
              }}
              className="h-9 flex-1 rounded-xl bg-amber-500 text-xs font-bold text-white hover:bg-amber-500"
            >
              <GameIcon id="gift" size={14} strokeWidth={2.2} className="mr-1.5" />
              Daily gift +{ECONOMY.dailyBonus}
            </Button>
          ) : (
            <div className="flex h-9 flex-1 items-center justify-center rounded-xl border border-white/12 bg-white/5 text-[11px] font-semibold text-white/45">
              Gift claimed, come back tomorrow
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScreen("shop")}
            className="h-9 rounded-xl border-white/20 bg-white/10 text-xs font-bold text-white hover:bg-white/20"
          >
            Shop
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => logout()}
            aria-label="Sign out"
            className="h-9 w-9 rounded-xl p-0 text-white/60 hover:text-white"
          >
            <GameIcon id="logout" size={16} strokeWidth={2.2} />
          </Button>
        </div>
      </section>

      {/* create room */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          sound.play("click");
          createRoom();
        }}
        className="w-full rounded-3xl bg-emerald-500 px-5 py-4 text-left shadow-lg no-select"
      >
        <div className="flex items-center gap-3">
          <GameIcon id="plus" size={22} strokeWidth={2.4} style={{ color: "#fff" }} />
          <div>
            <div className="text-base font-bold text-white" style={{ fontFamily: "var(--font-fredoka), sans-serif" }}>
              Create a room
            </div>
            <div className="text-[11px] text-emerald-50/80">Up to 6 friends, you pick the map and theme</div>
          </div>
        </div>
      </motion.button>

      {/* join room */}
      <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
          <GameIcon id="login" size={18} strokeWidth={2.2} className="text-amber-300" /> Join with a code
        </h2>
        <div className="mt-2.5 flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
            placeholder="ABCDE"
            className="h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 text-center text-lg font-bold tracking-[0.35em] text-white placeholder:text-white/30"
          />
          <Button
            onClick={() => {
              sound.play("click");
              joinRoom(code);
            }}
            disabled={code.length !== 5}
            className="h-11 rounded-xl bg-white/15 px-5 font-bold text-white hover:bg-white/25"
          >
            Join
          </Button>
        </div>
        {roomError && (
          <p className="mt-2 rounded-xl bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200">{roomError}</p>
        )}
      </section>

      {/* ranked quick match */}
      <section className="rounded-3xl border border-violet-300/25 bg-violet-500/10 p-4 backdrop-blur-md">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
          <GameIcon id="swords" size={18} strokeWidth={2.2} className="text-violet-300" /> Quick match
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          Face a random rival on the Classic board. Winner takes the whole pot.
        </p>

        {searching ? (
          <div className="mt-3 rounded-2xl border border-violet-300/30 bg-violet-500/15 p-3">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-violet-200" />
              <div className="flex-1 text-sm font-semibold text-violet-100">
                Looking for a rival at {stake} ular...
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancelRanked()}
                className="h-8 rounded-lg border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {ECONOMY.rankedStakes.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStake(s);
                    sound.play("click");
                  }}
                  className={cn(
                    "flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-bold transition-all active:scale-95",
                    stake === s
                      ? "border-violet-300 bg-violet-500/30 text-white"
                      : "border-white/15 bg-white/5 text-white/60"
                  )}
                >
                  <GameIcon id="coin" size={14} strokeWidth={2.2} />
                  {s}
                </button>
              ))}
            </div>
            <Button
              onClick={() => {
                queueRanked(stake);
                sound.play("match");
              }}
              disabled={me.coins < stake}
              className="mt-2.5 h-12 w-full rounded-2xl bg-violet-500 text-base font-bold text-white hover:bg-violet-500"
              style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
            >
              {me.coins < stake ? "Not enough ular" : `Play for ${stake} ular`}
            </Button>
          </>
        )}
      </section>

      {/* leaderboard */}
      <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-md">
        <button
          onClick={() => {
            setShowBoard(!showBoard);
            if (!showBoard) fetchLeaderboard();
            sound.play("click");
          }}
          className="flex w-full items-center gap-2 text-left text-[15px] font-bold text-white"
        >
          <GameIcon id="chart" size={18} strokeWidth={2.2} className="text-amber-300" />
          Ular rich list
          <span className="ml-auto text-xs font-semibold text-white/50">{showBoard ? "Hide" : "Show"}</span>
        </button>

        {showBoard && (
          <div className="mt-2.5 max-h-64 space-y-1.5 overflow-y-auto game-scroll pr-1">
            {leaderboardBusy && leaderboard.length === 0 && (
              <div className="grid place-items-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-white/50" />
              </div>
            )}
            {leaderboard.map((row) => (
              <div
                key={row.rank}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2",
                  row.name === me.name ? "bg-amber-400/15 border border-amber-300/30" : "bg-white/5"
                )}
              >
                <span className="w-6 text-center text-xs font-bold text-white/50">{row.rank}</span>
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/50"
                  style={{ background: "#a855f7" }}
                >
                  <GameIcon id={row.avatar} size={16} strokeWidth={2.1} style={{ color: "#fff" }} />
                </div>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{row.name}</span>
                <span className="flex items-center gap-1 text-[13px] font-bold text-amber-200">
                  <GameIcon id="coin" size={13} strokeWidth={2.2} />
                  {row.coins}
                </span>
              </div>
            ))}
            {leaderboard.length === 0 && !leaderboardBusy && (
              <p className="py-4 text-center text-xs text-white/45">No legends yet, be the first</p>
            )}
          </div>
        )}
      </section>

      {/* how coins work */}
      <section className="rounded-3xl border border-white/12 bg-white/[0.07] p-4 text-xs leading-relaxed text-white/55 backdrop-blur-md">
        <div className="mb-1.5 flex items-center gap-2 text-[15px] font-bold text-white">
          <GameIcon id="coin" size={18} strokeWidth={2.2} className="text-amber-300" /> Earning ular
        </div>
        Daily gift +{ECONOMY.dailyBonus} · Ranked wins +stake · Friendly wins +
        {ECONOMY.friendlyWinBonus} · Achievements +{ECONOMY.achievementReward} · Offline wins +
        {ECONOMY.offlineWinBonus}. Spend them on premium maps like{" "}
        {MAP_PRODUCTS.filter((m) => m.price > 0)
          .map((m) => m.name)
          .join(", ")}
        .
      </section>
    </div>
  );
}
