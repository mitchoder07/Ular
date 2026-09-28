"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/store/game";
import { useProfile } from "@/store/profile";
import { useOnline } from "@/store/online";
import { attachAudioUnlock, sound } from "@/lib/sound";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { SetupScreen } from "@/components/screens/SetupScreen";
import { GameScreen } from "@/components/screens/GameScreen";
import { StatsScreen } from "@/components/screens/StatsScreen";
import { HowToPlayScreen } from "@/components/screens/HowToPlayScreen";
import { OnlineScreen } from "@/components/screens/OnlineScreen";
import { RoomScreen } from "@/components/screens/RoomScreen";
import { ShopScreen } from "@/components/screens/ShopScreen";

const emptySubscribe = () => () => {};

export default function Page() {
  const screen = useGame((s) => s.screen);
  // hydration guard without setState-in-effect
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    // sync sound engine with persisted settings
    const { sfx, music, haptics } = useProfile.getState().settings;
    sound.sfxEnabled = sfx;
    sound.hapticsEnabled = haptics;
    sound.musicEnabled = music;
    // reach for the online service so signed-in wallets show up instantly
    useOnline.getState().connect();
    return attachAudioUnlock();
  }, []);

  if (!mounted) return <BootSplash />;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {screen === "home" && <HomeScreen />}
        {screen === "setup" && <SetupScreen />}
        {screen === "game" && <GameScreen />}
        {screen === "stats" && <StatsScreen />}
        {screen === "howto" && <HowToPlayScreen />}
        {screen === "online" && <OnlineScreen />}
        {screen === "room" && <RoomScreen />}
        {screen === "shop" && <ShopScreen />}
      </motion.div>
    </AnimatePresence>
  );
}

function BootSplash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#171132]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-float text-6xl text-amber-300" aria-hidden>
          <svg
            viewBox="0 0 24 24"
            width={72}
            height={72}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 5.5c4.5 0 4.5 4 0 4s-4.5 4.5 0 4.5 6 .5 8 .5c2.5 0 3.5 1 3.5 2.5" />
            <circle cx="19.5" cy="18.5" r="2.2" />
            <circle cx="19.5" cy="18" r="0.35" fill="currentColor" stroke="none" />
            <path d="M21.7 18.5h.8m0 0-.4-.7m.4.7-.4.7" strokeWidth={1.2} />
          </svg>
        </div>
        <div className="h-1.5 w-36 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-1/2 animate-[loadslide_1.1s_ease-in-out_infinite] rounded-full bg-amber-400" />
        </div>
        <style>{`@keyframes loadslide { 0% { transform: translateX(-100%);} 100% { transform: translateX(300%);} }`}</style>
      </div>
    </div>
  );
}
