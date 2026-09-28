/* ============================================================
   Profile store: settings, stats, achievements and the guest
   ular wallet. The wallet is the local source of truth while
   playing as a guest; once you sign in online, the server
   account takes over and this wallet is merged into it.
   ============================================================ */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import type { PlayerStatsRecord } from "@/lib/game/types";
import { sound } from "@/lib/sound";
import { ACHIEVEMENTS, ECONOMY, MAP_PRODUCTS } from "@/lib/game/data";

export type AnimSpeed = "normal" | "fast" | "instant";

export interface Settings {
  sfx: boolean;
  music: boolean;
  haptics: boolean;
  speed: AnimSpeed;
  showTokenPos: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sfx: true,
  music: true,
  haptics: true,
  speed: "normal",
  showTokenPos: true,
};

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* quota */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* noop */
    }
  },
};

function pickStorage(): StateStorage {
  return typeof window === "undefined" ? noopStorage : safeStorage;
}

const FREE_MAPS = MAP_PRODUCTS.filter((m) => m.price === 0).map((m) => m.id);

interface ProfileStore {
  settings: Settings;
  stats: Record<string, PlayerStatsRecord>;
  achievements: Record<string, number>;
  /** guest ular wallet (used while signed out) */
  wallet: {
    coins: number;
    unlockedMaps: string[];
    lastDailyAt: string | null;
  };
  setSettings: (partial: Partial<Settings>) => void;
  unlock: (id: string) => boolean;
  resetAll: () => void;
  /* wallet */
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  unlockMap: (mapId: string) => void;
  mapUnlocked: (mapId: string) => boolean;
  claimDaily: () => number;
  /** wipe the guest wallet after it was merged into an online account */
  consumeGuestWallet: () => void;
}

/** local calendar day key (YYYY-MM-DD) */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useProfile = create<ProfileStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      stats: {},
      achievements: {},
      wallet: {
        coins: ECONOMY.startingCoins,
        unlockedMaps: [...FREE_MAPS],
        lastDailyAt: null,
      },
      setSettings: (partial) => {
        const settings = { ...get().settings, ...partial };
        sound.sfxEnabled = settings.sfx;
        sound.hapticsEnabled = settings.haptics;
        if (settings.music) {
          sound.unlock();
          sound.startMusic();
        } else {
          sound.stopMusic();
        }
        set({ settings });
      },
      unlock: (id) => {
        if (get().achievements[id]) return false;
        set((s) => ({ achievements: { ...s.achievements, [id]: Date.now() } }));
        return true;
      },
      resetAll: () =>
        set({
          stats: {},
          achievements: {},
          wallet: { coins: ECONOMY.startingCoins, unlockedMaps: [...FREE_MAPS], lastDailyAt: null },
        }),

      /* ---------------- guest wallet ---------------- */

      addCoins: (amount) =>
        set((s) => ({ wallet: { ...s.wallet, coins: Math.max(0, s.wallet.coins + amount) } })),

      spendCoins: (amount) => {
        const w = get().wallet;
        if (w.coins < amount) return false;
        set({ wallet: { ...w, coins: w.coins - amount } });
        return true;
      },

      unlockMap: (mapId) =>
        set((s) =>
          s.wallet.unlockedMaps.includes(mapId)
            ? s
            : { wallet: { ...s.wallet, unlockedMaps: [...s.wallet.unlockedMaps, mapId] } }
        ),

      mapUnlocked: (mapId) => get().wallet.unlockedMaps.includes(mapId),

      claimDaily: () => {
        const w = get().wallet;
        const today = todayKey();
        if (w.lastDailyAt === today) return 0;
        set({ wallet: { ...w, lastDailyAt: today, coins: w.coins + ECONOMY.dailyBonus } });
        return ECONOMY.dailyBonus;
      },

      consumeGuestWallet: () =>
        set({ wallet: { coins: 0, unlockedMaps: [...FREE_MAPS], lastDailyAt: null } }),
    }),
    {
      name: "snl-deluxe-profile",
      version: 2,
      migrate: (persisted) => {
        const s = persisted as ProfileStore | undefined;
        if (!s) return {} as ProfileStore;
        // v1 -> v2: ular wallet arrives with the online update
        if (!s.wallet) {
          s.wallet = {
            coins: ECONOMY.startingCoins,
            unlockedMaps: [...FREE_MAPS],
            lastDailyAt: null,
          };
        }
        if (!Array.isArray(s.wallet.unlockedMaps) || s.wallet.unlockedMaps.length === 0) {
          s.wallet.unlockedMaps = [...FREE_MAPS];
        }
        return s;
      },
      storage: createJSONStorage(pickStorage),
    }
  )
);

export function speedFactor(): number {
  const s = useProfile.getState().settings.speed;
  return s === "fast" ? 1.7 : s === "instant" ? 3.4 : 1;
}

export function achievementById(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
