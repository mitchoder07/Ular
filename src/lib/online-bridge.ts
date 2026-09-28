/* ============================================================
   Online + coin bridges.
   Small mutable hooks that let the game store talk to the
   online store without a circular import, and route coin
   rewards to whichever wallet is active (guest or account).
   ============================================================ */

import { useProfile } from "@/store/profile";

type EmitFn = () => void;
let emitRoll: EmitFn | null = null;

/** The online store registers its socket roll emitter here */
export function setOnlineRollEmitter(fn: EmitFn | null): void {
  emitRoll = fn;
}

/** Called by the game store when the local player rolls in an online game */
export function emitOnlineRoll(): void {
  emitRoll?.();
}

export type CoinReason = "achievement" | "offline-win";

type CoinFn = (amount: number, reason: CoinReason) => void;

/**
 * Default: guest wallet. The online store replaces this while
 * signed in so bonuses are validated and credited server-side.
 */
let grantFn: CoinFn = (amount) => {
  useProfile.getState().addCoins(amount);
};

export function setCoinGrant(fn: CoinFn): void {
  grantFn = fn;
}

export function grantCoins(amount: number, reason: CoinReason): void {
  grantFn(amount, reason);
}
