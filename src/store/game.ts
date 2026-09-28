/* ============================================================
   Game store: full turn orchestrator with auto-save & resume
   ============================================================ */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import {
  ACHIEVEMENTS,
  AI_PERSONAS,
  DEFAULT_RULES,
  ECONOMY,
  EMOJI_TO_ICON,
  PLAYER_COLORS,
  getBoard,
  pickRandom,
} from "@/lib/game/data";
import type {
  Difficulty,
  GameConfig,
  GameEventToast,
  LogEntry,
  OnlinePlayerState,
  Phase,
  PlayerState,
  PowerType,
  Screen,
  TurnResult,
} from "@/lib/game/types";
import { sound } from "@/lib/sound";
import { speedFactor, useProfile } from "./profile";
import { emitOnlineRoll, grantCoins } from "@/lib/online-bridge";

export interface PlayerSetup {
  name: string;
  avatar: string;
  isAI: boolean;
  difficulty: Difficulty;
}

export interface MoveInfo {
  kind: "step" | "snake" | "ladder" | "teleport" | "enter";
  playerId: string;
}

/** Live connection info while playing an online game */
export interface OnlineMeta {
  active: boolean;
  myId?: string;
  roomCode?: string;
  ranked: boolean;
  stake: number;
}

export const ONLINE_INACTIVE: OnlineMeta = { active: false, ranked: false, stake: 0 };

interface GameState {
  screen: Screen;
  resumable: boolean;
  config: GameConfig;
  boardId: string;
  powerTiles: Record<number, PowerType>;
  players: PlayerState[];
  turn: number;
  dice: number | null;
  diceRolling: boolean;
  phase: Phase;
  log: LogEntry[];
  toasts: GameEventToast[];
  aiBubble: { id: number; playerId: string; text: string } | null;
  finishOrder: string[];
  startedAt: number;
  endedAt?: number;
  winnerId?: string;
  diceHistory: number[];
  newUnlocks: string[];
  move: MoveInfo | null;
  /** live online game info (inactive for local games) */
  online: OnlineMeta;
  /** generation counter that invalidates in-flight async turns */
  gen: number;
}

interface GameActions {
  setScreen: (screen: Screen) => void;
  startGame: (config: GameConfig, setups: PlayerSetup[]) => void;
  resumeGame: () => void;
  discardGame: () => void;
  restart: () => void;
  roll: () => Promise<void>;
  dismissToast: (id: number) => void;
  clearAiBubble: () => void;
  /* online bridging (state driven by the server) */
  startOnlineGame: (config: GameConfig, snapshot: OnlinePlayerState[], turn: number, meta: OnlineMeta) => void;
  applyOnlineTurn: (result: TurnResult) => Promise<void>;
  syncOnlinePlayers: (snapshot: OnlinePlayerState[], turn: number) => void;
  exitOnline: () => void;
}

export type GameStore = GameState & GameActions;

/* ---------------- helpers ---------------- */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** valid board layout ids (all 100-cell) */
const BOARDS_MODES = ["classic", "adventure", "highstakes", "hacker", "volcano", "glacier"];

/** true if the avatar string is a modern icon id (not a legacy emoji) */
function isIconId(avatar: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(avatar);
}

/**
 * Collision-proof id generator: persisted entries from a previous session
 * (log/toast ids) can never collide with fresh ones since time always
 * moves forward and the counter disambiguates within the same millisecond.
 */
let uid = 0;
const nextId = () => Date.now() * 1000 + (++uid % 1000);

function patchPlayer(
  players: PlayerState[],
  id: string,
  patch: Partial<PlayerState>
): PlayerState[] {
  return players.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

/** Fold a server player snapshot into local player states (keeps local counters). */
function mergeServerPlayers(local: PlayerState[], snapshot: OnlinePlayerState[]): PlayerState[] {
  const merged = local.map((p) => {
    const sp = snapshot.find((s) => s.id === p.id);
    if (!sp) return p;
    return { ...p, pos: sp.pos, name: sp.name, avatar: sp.avatar, colorId: sp.colorId };
  });
  // append any server players we somehow do not know yet
  for (const sp of snapshot) {
    if (!merged.some((p) => p.id === sp.id)) {
      merged.push({
        id: sp.id,
        name: sp.name,
        avatar: sp.avatar,
        colorId: sp.colorId,
        isAI: false,
        difficulty: "medium" as Difficulty,
        pos: sp.pos,
        shield: false,
        boost: 0,
        sixStreak: 0,
        snakesHit: 0,
        laddersClimbed: 0,
        sixesRolled: 0,
        rolls: 0,
      });
    }
  }
  return merged;
}

/** Storage that only persists "safe" snapshots (never mid-animation). */
const gameStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      const parsed = JSON.parse(value) as {
        state?: { phase?: Phase; screen?: Screen; winnerId?: string; online?: OnlineMeta };
      };
      const ph = parsed?.state?.phase;
      const scr = parsed?.state?.screen;
      const won = parsed?.state?.winnerId;
      const onl = parsed?.state?.online;
      // online games live on the server only, never persist them
      const safe =
        !onl?.active &&
        (scr !== "game" || ph === "awaitRoll" || (ph === "gameover" && !!won));
      if (safe) localStorage.setItem(name, value);
    } catch {
      /* ignore */
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

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function pickStorage(): StateStorage {
  return typeof window === "undefined" ? noopStorage : gameStorage;
}

/** Show a floating event toast (keeps last 3) */
function pushToast(
  icon: string,
  title: string,
  subtitle: string | undefined,
  tone: GameEventToast["tone"]
): void {
  useGame.setState((s) => ({
    toasts: [...s.toasts, { id: nextId(), icon, title, subtitle, tone }].slice(-3),
  }));
}

function pushLog(text: string, icon: string, kind: LogEntry["kind"]): void {
  useGame.setState((s) => ({
    log: [...s.log, { id: nextId(), text, icon, kind }].slice(-80),
  }));
}

function showAiBubble(playerId: string, text: string): void {
  useGame.setState({ aiBubble: { id: nextId(), playerId, text } });
}

/** Unlock achievement for the user + celebratory toast + ular reward */
function unlockNow(id: string): void {
  const profile = useProfile.getState();
  if (profile.achievements[id]) return;
  void profile.unlock(id);
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  useGame.setState((s) => ({
    newUnlocks: [...s.newUnlocks, id],
    toasts: [
      ...s.toasts,
      {
        id: nextId(),
        icon: "medal",
        title: "Achievement unlocked!",
        subtitle: def?.title,
        tone: "power" as const,
      },
    ].slice(-3),
  }));
  sound.play("power");
  sound.haptic([25, 50, 25]);
  // every achievement pays a little ular bonus
  grantCoins(ECONOMY.achievementReward, "achievement");
  pushToast("coin", "+" + ECONOMY.achievementReward + " ular", def?.title ?? "Achievement reward", "power");
  sound.play("coin");
}

/** Advance to the next player (skipping finished ones) */
function endTurn(): void {
  const s = useGame.getState();
  const current = s.players[s.turn];
  useGame.setState((st) => ({
    players: current ? patchPlayer(st.players, current.id, { sixStreak: 0 }) : st.players,
    turn: (st.turn + 1) % Math.max(1, st.players.length),
    phase: "awaitRoll",
    move: null,
  }));
  sound.play("turn");
  scheduleAI();
}

/** If the current player is AI, auto-roll after a persona-appropriate delay */
function scheduleAI(delayMs?: number): void {
  const s = useGame.getState();
  if (s.screen !== "game" || s.winnerId) return;
  const player = s.players[s.turn];
  if (!player?.isAI) return;
  const g = s.gen;
  const persona = AI_PERSONAS[player.difficulty];
  const delay = delayMs ?? persona.thinkMs;

  // occasional "closing in" taunt
  if (player.pos >= 80 && Math.random() < 0.35) {
    setTimeout(() => {
      const st = useGame.getState();
      if (st.gen === g && st.screen === "game") {
        showAiBubble(player.id, pickRandom(persona.taunts.winning));
      }
    }, Math.max(200, delay * 0.4));
  }

  setTimeout(() => {
    const st = useGame.getState();
    if (
      st.gen === g &&
      st.screen === "game" &&
      st.phase === "awaitRoll" &&
      !st.winnerId &&
      st.players[st.turn]?.id === player.id
    ) {
      void st.roll();
    }
  }, delay);
}

/** When a human gets bitten, an AI opponent may taunt them */
function maybeTauntOpponent(humanId: string): void {
  const s = useGame.getState();
  const ais = s.players.filter((p) => p.isAI && p.id !== humanId);
  if (ais.length === 0 || Math.random() > 0.6) return;
  const ai = pickRandom(ais);
  const persona = AI_PERSONAS[ai.difficulty];
  showAiBubble(ai.id, pickRandom(persona.taunts.opponentSnake));
}

function finalizeGame(winnerId: string, wasExact: boolean, timeMs: number): void {
  const s = useGame.getState();
  const winner = s.players.find((p) => p.id === winnerId);
  if (!winner) return;

  // AI loser bubble
  const losers = s.players.filter((p) => p.isAI && p.id !== winnerId);
  if (losers.length > 0) {
    const persona = AI_PERSONAS[losers[0].difficulty];
    showAiBubble(losers[0].id, pickRandom(persona.taunts.lose));
  }

  // stats for humans
  const profile = useProfile.getState();
  const stats = { ...profile.stats };
  for (const p of s.players) {
    if (p.isAI) continue;
    const key = p.name || "Player";
    const rec = stats[key] ?? { games: 0, wins: 0, snakes: 0, ladders: 0, sixes: 0 };
    rec.games += 1;
    rec.snakes += p.snakesHit;
    rec.ladders += p.laddersClimbed;
    rec.sixes += p.sixesRolled;
    if (p.id === winnerId) {
      rec.wins += 1;
      if (!rec.bestTimeMs || timeMs < rec.bestTimeMs) rec.bestTimeMs = timeMs;
    }
    stats[key] = rec;
  }
  useProfile.setState({ stats });

  // achievements
  if (!winner.isAI) {
    const wins = stats[winner.name]?.wins ?? 1;
    unlockNow("first-victory");
    if (wins >= 10) unlockNow("champion");
    if (wins >= 25) unlockNow("legend");
    if (winner.snakesHit >= 3) unlockNow("snake-charmer");
    if (winner.laddersClimbed >= 4) unlockNow("ladder-master");
    if (wasExact) unlockNow("perfect-finish");
    if (s.config.rules.arcadePowerTiles) unlockNow("arcade-star");
    if (timeMs < 4 * 60 * 1000) unlockNow("speedrunner");
    if (s.config.mode === "hacker") unlockNow("grid-hacker");
    if (s.config.mode === "volcano") unlockNow("lava-tamer");
    if (s.config.mode === "glacier") unlockNow("ice-breaker");
    // a win against the bots pays a small ular bonus (server pays
    // friendly and ranked online wins separately)
    if (!s.online.active) {
      grantCoins(ECONOMY.offlineWinBonus, "offline-win");
      pushToast("coin", "+" + ECONOMY.offlineWinBonus + " ular", "Offline win bonus", "power");
      sound.play("coin");
    }
  }
}

/* ---------------- store ---------------- */

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: "home",
      resumable: false,
      config: { mode: "classic", theme: "jungle", rules: { ...DEFAULT_RULES } },
      boardId: "",
      powerTiles: {},
      players: [],
      turn: 0,
      dice: null,
      diceRolling: false,
      phase: "awaitRoll",
      log: [],
      toasts: [],
      aiBubble: null,
      finishOrder: [],
      startedAt: 0,
      diceHistory: [],
      newUnlocks: [],
      move: null,
      online: { ...ONLINE_INACTIVE },
      gen: 0,

      setScreen: (screen) => {
        sound.play("click");
        set({ screen });
      },

      startGame: (config, setups) => {
        const board = getBoard(config.mode);
        const players: PlayerState[] = setups.map((s, i) => ({
          id: `p${i + 1}-${Date.now().toString(36)}${i}`,
          name: s.name.trim() || (s.isAI ? AI_PERSONAS[s.difficulty].name : "Player"),
          avatar: s.avatar,
          colorId: i % PLAYER_COLORS.length,
          isAI: s.isAI,
          difficulty: s.difficulty,
          pos: 0,
          shield: false,
          boost: 0,
          sixStreak: 0,
          snakesHit: 0,
          laddersClimbed: 0,
          sixesRolled: 0,
          rolls: 0,
        }));

        // generate arcade power tiles on free cells
        const powerTiles: Record<number, PowerType> = {};
        if (config.rules.arcadePowerTiles) {
          const used = new Set<number>([
            1,
            board.totalCells,
            ...Object.keys(board.snakes).map(Number),
            ...Object.values(board.snakes),
            ...Object.keys(board.ladders).map(Number),
            ...Object.values(board.ladders),
          ]);
          const types: PowerType[] = ["star", "shield", "rocket", "swap"];
          const perType = board.totalCells >= 100 ? 2 : 1;
          let placed = 0;
          let attempts = 0;
          while (placed < types.length * perType && attempts < 600) {
            attempts++;
            const cell = 2 + Math.floor(Math.random() * (board.totalCells - 2));
            if (used.has(cell)) continue;
            used.add(cell);
            powerTiles[cell] = types[Math.floor(placed / perType)];
            placed++;
          }
        }

        sound.play("start");
        sound.haptic([18, 40, 18]);
        set({
          screen: "game",
          resumable: false,
          config,
          boardId: board.id,
          powerTiles,
          players,
          turn: 0,
          dice: null,
          diceRolling: false,
          phase: "awaitRoll",
          log: [
            {
              id: nextId(),
              kind: "start",
              icon: "flag",
              text: `A fresh game on the ${board.name} board, 100 cells to go`,
            },
          ],
          toasts: [],
          aiBubble: null,
          finishOrder: [],
          startedAt: Date.now(),
          endedAt: undefined,
          winnerId: undefined,
          diceHistory: [],
          newUnlocks: [],
          move: null,
          gen: get().gen + 1,
        });
        scheduleAI();
      },

      resumeGame: () => {
        const s = get();
        if (!s.resumable) return;
        sound.play("click");
        set({ screen: "game", resumable: false, gen: s.gen + 1 });
        scheduleAI();
      },

      discardGame: () => {
        set({
          screen: "home",
          resumable: false,
          players: [],
          powerTiles: {},
          winnerId: undefined,
          endedAt: undefined,
          finishOrder: [],
          gen: get().gen + 1,
        });
      },

      restart: () => {
        const s = get();
        if (!s.players.length) return;
        const setups: PlayerSetup[] = s.players.map((p) => ({
          name: p.name,
          avatar: p.avatar,
          isAI: p.isAI,
          difficulty: p.difficulty,
        }));
        get().startGame(s.config, setups);
      },

      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      clearAiBubble: () => set({ aiBubble: null }),

      /* ---------------- online bridging ---------------- */

      startOnlineGame: (config, snapshot, turn, meta) => {
        const board = getBoard(config.mode);
        const players: PlayerState[] = snapshot.map((sp, i) => ({
          id: sp.id,
          name: sp.name,
          avatar: sp.avatar,
          colorId: sp.colorId ?? i,
          isAI: false,
          difficulty: "medium" as Difficulty,
          pos: sp.pos,
          shield: false,
          boost: 0,
          sixStreak: 0,
          snakesHit: 0,
          laddersClimbed: 0,
          sixesRolled: 0,
          rolls: 0,
        }));
        sound.play("start");
        sound.haptic([18, 40, 18]);
        set({
          screen: "game",
          resumable: false,
          config,
          boardId: board.id,
          powerTiles: {},
          players,
          turn: Math.max(0, Math.min(turn, players.length - 1)),
          dice: null,
          diceRolling: false,
          phase: "awaitRoll",
          log: [
            {
              id: nextId(),
              kind: "start",
              icon: "flag",
              text: `Online game on the ${board.name} board, may the best roller win`,
            },
          ],
          toasts: [],
          aiBubble: null,
          finishOrder: [],
          startedAt: Date.now(),
          endedAt: undefined,
          winnerId: undefined,
          diceHistory: [],
          newUnlocks: [],
          move: null,
          online: { ...meta },
          gen: get().gen + 1,
        });
      },

      syncOnlinePlayers: (snapshot, turn) => {
        const s = get();
        if (!s.online.active) return;
        set({
          players: mergeServerPlayers(s.players, snapshot),
          turn: Math.max(0, Math.min(turn, snapshot.length - 1)),
          move: null,
        });
      },

      applyOnlineTurn: async (result) => {
        const s0 = get();
        if (!s0.online.active) return;
        const g = s0.gen;
        const alive = () => {
          const s = get();
          return s.gen === g && s.screen === "game" && s.online.active;
        };

        const board = getBoard(s0.config.mode);
        const total = board.totalCells;
        const spd = speedFactor();
        const player = get().players.find((p) => p.id === result.playerId);
        if (!player) return;

        /* 1. dice animation */
        set({ phase: "rolling", dice: null, diceRolling: true });
        sound.play("roll");
        sound.haptic(22);
        await sleep(560 / spd);
        if (!alive()) return;

        set((st) => ({
          dice: result.dice,
          diceRolling: false,
          diceHistory: [result.dice, ...st.diceHistory].slice(0, 8),
        }));
        await sleep(980 / spd);
        if (!alive()) return;

        pushLog(`${player.name} rolled a ${result.dice}`, "dice", "info");
        if (result.dice === 6) {
          sound.play("six");
          sound.haptic([15, 40, 15]);
        }

        /* 2. three sixes forfeit */
        if (result.forfeit) {
          pushToast("dice", "Three sixes!", `${player.name} loses the turn`, "six");
          pushLog(`${player.name} rolled three 6s in a row and lost the turn`, "dice", "six");
          sound.play("fail");
          await sleep(750 / spd);
          if (!alive()) return;
          set({
            players: mergeServerPlayers(get().players, result.players),
            turn: result.nextTurn,
            phase: "awaitRoll",
            move: null,
          });
          return;
        }

        /* 3. step animation along the server path */
        set({ phase: "moving" });
        for (let i = 0; i < result.path.length; i++) {
          const cell = result.path[i];
          set((s) => ({
            move: { kind: "step", playerId: player.id },
            players: patchPlayer(s.players, player.id, { pos: cell }),
          }));
          sound.play("step", i);
          sound.haptic(8);
          await sleep(185 / spd);
          if (!alive()) return;
        }

        /* 4. snake or ladder resolution */
        if (result.snake) {
          const me = get().players.find((p) => p.id === player.id);
          pushToast("snake", "Snake!", `Down from ${result.snake.from} to ${result.snake.to}`, "snake");
          pushLog(`${player.name} slid down a snake from ${result.snake.from} to ${result.snake.to}`, "snake", "snake");
          sound.play("snake");
          sound.haptic([50, 60, 90]);
          set((s) => ({
            move: { kind: "snake", playerId: player.id },
            players: patchPlayer(s.players, player.id, {
              pos: result.snake!.to,
              snakesHit: (me?.snakesHit ?? 0) + 1,
            }),
          }));
          await sleep(830 / spd);
          if (!alive()) return;
        } else if (result.ladder) {
          const me = get().players.find((p) => p.id === player.id);
          pushToast("ladder", "Ladder!", `Up from ${result.ladder.from} to ${result.ladder.to}`, "ladder");
          pushLog(`${player.name} climbed a ladder from ${result.ladder.from} to ${result.ladder.to}`, "ladder", "ladder");
          sound.play("ladder");
          sound.haptic(35);
          set((s) => ({
            move: { kind: "ladder", playerId: player.id },
            players: patchPlayer(s.players, player.id, {
              pos: result.ladder!.to,
              laddersClimbed: (me?.laddersClimbed ?? 0) + 1,
            }),
          }));
          await sleep(700 / spd);
          if (!alive()) return;
        }

        /* 5. win */
        if (result.win) {
          const timeMs = Date.now() - get().startedAt;
          const me = get().players.find((p) => p.id === player.id);
          if (!me) return;
          set((s) => ({
            phase: "gameover",
            winnerId: player.id,
            endedAt: Date.now(),
            finishOrder: [...s.finishOrder, player.id],
            players: patchPlayer(s.players, player.id, {
              rank: 1,
              finishedAt: Date.now(),
            }),
            move: { kind: "step", playerId: player.id },
          }));
          pushToast("trophy", me.name === "You" ? "You win!" : `${me.name} wins!`, "What a race!", "win");
          pushLog(`${player.name} reached ${total} and won the game!`, "trophy", "win");
          sound.play("win");
          sound.haptic([40, 80, 40, 120]);
          finalizeGame(player.id, false, timeMs);
          return;
        }

        /* 6. hand-off */
        if (result.extra && result.dice === 6) {
          pushToast("zap", "Rolled a 6!", `${player.name} rolls again`, "six");
        }
        set({
          players: mergeServerPlayers(get().players, result.players),
          turn: result.nextTurn,
          phase: "awaitRoll",
          move: null,
        });
      },

      exitOnline: () => {
        set((s) => ({
          online: { ...ONLINE_INACTIVE },
          players: [],
          powerTiles: {},
          winnerId: undefined,
          endedAt: undefined,
          finishOrder: [],
          resumable: false,
          gen: s.gen + 1,
        }));
      },

      roll: async () => {
        const s0 = get();
        if (s0.phase !== "awaitRoll" || s0.winnerId || s0.screen !== "game") return;

        // online games: the server rolls and broadcasts the turn
        if (s0.online.active) {
          const current = s0.players[s0.turn];
          if (current && current.id === s0.online.myId && !current.isAI) {
            emitOnlineRoll();
          }
          return;
        }

        const g = s0.gen;
        const alive = () => {
          const s = get();
          return s.gen === g && s.screen === "game" && !s.winnerId;
        };

        const board = getBoard(s0.config.mode);
        const total = board.totalCells;
        const rules = s0.config.rules;
        const spd = speedFactor();
        const idx = s0.turn;
        const player = s0.players[idx];
        if (!player) return;

        /* 1. roll the dice */
        set({ phase: "rolling", dice: null, diceRolling: true });
        sound.play("roll");
        sound.haptic(22);
        await sleep(560 / spd);
        if (!alive()) return;

        const value = 1 + Math.floor(Math.random() * 6);
        set((st) => ({
          dice: value,
          diceRolling: false,
          diceHistory: [value, ...st.diceHistory].slice(0, 8),
        }));
        await sleep(980 / spd);
        if (!alive()) return;

        pushLog(`${player.name} rolled a ${value}`, "dice", "info");
        if (value === 6) {
          sound.play("six");
          sound.haptic([15, 40, 15]);
          if (player.isAI) {
            showAiBubble(player.id, pickRandom(AI_PERSONAS[player.difficulty].taunts.rollSix));
          }
        }

        /* 2. six streak bookkeeping */
        const streak = value === 6 ? player.sixStreak + 1 : 0;
        set((s) => ({
          players: patchPlayer(s.players, player.id, {
            sixStreak: streak,
            rolls: player.rolls + 1,
            sixesRolled: player.sixesRolled + (value === 6 ? 1 : 0),
          }),
        }));

        if (value === 6 && streak >= 3 && rules.threeSixesForfeit) {
          if (!player.isAI) unlockNow("lucky-streak");
          pushToast("dice", "Three sixes!", `${player.name} loses the turn`, "six");
          pushLog(`${player.name} rolled three 6s in a row and lost the turn`, "dice", "six");
          sound.play("fail");
          await sleep(750 / spd);
          if (!alive()) return;
          set((s) => ({
            players: patchPlayer(s.players, player.id, { sixStreak: 0 }),
          }));
          endTurn();
          return;
        }

        /* 3. roll-six-to-start gate */
        if (player.pos === 0 && rules.rollSixToStart && value !== 6) {
          pushToast("info", "A six gets you moving", `${player.name} is still waiting to start`, "info");
          pushLog(`${player.name} needs a 6 to join the race`, "info", "info");
          sound.play("fail");
          await sleep(700 / spd);
          if (!alive()) return;
          endTurn();
          return;
        }

        if (player.pos === 0 && rules.rollSixToStart && value === 6) {
          set((s) => ({
            move: { kind: "enter", playerId: player.id },
            players: patchPlayer(s.players, player.id, { pos: 1 }),
          }));
          pushToast("party", "On the board!", `${player.name} enters the game`, "info");
          pushLog(`${player.name} entered the board`, "flag", "info");
          await sleep(520 / spd);
          if (!alive()) return;
          if (rules.extraTurnOnSix) {
            set({ phase: "awaitRoll" });
            scheduleAI(800);
          } else {
            endTurn();
          }
          return;
        }

        /* 4. compute the move path */
        const from = player.pos;
        const boost = player.boost;
        if (boost > 0) {
          set((s) => ({
            players: patchPlayer(s.players, player.id, { boost: 0 }),
          }));
          pushLog(`The rocket adds +${boost} for ${player.name}`, "rocket", "power");
        }
        const rawTarget = from + value + boost;
        const over = rawTarget - total;
        const bounced = over > 0 && rules.bounceBack;
        const finalTarget = bounced ? total - over : Math.min(rawTarget, total);

        const path: number[] = [];
        for (let c = from + 1; c <= Math.min(rawTarget, total); c++) path.push(c);
        if (bounced) for (let c = total - 1; c >= finalTarget; c--) path.push(c);

        /* 5. animate steps */
        set({ phase: "moving" });
        for (let i = 0; i < path.length; i++) {
          const cell = path[i];
          set((s) => ({
            move: { kind: "step", playerId: player.id },
            players: patchPlayer(s.players, player.id, { pos: cell }),
          }));
          sound.play("step", i);
          sound.haptic(8);
          await sleep(185 / spd);
          if (!alive()) return;
        }

        let pos = finalTarget;
        const wasExact = pos === total && path.length > 0 && !bounced;

        /* 6. resolve snakes, ladders and power tiles */
        let starExtra = false;
        let guard = 0;
        while (guard++ < 5 && pos !== total) {
          const snakeTail = board.snakes[pos];
          const ladderTop = board.ladders[pos];
          const power = get().powerTiles[pos];

          if (snakeTail !== undefined) {
            const me = get().players.find((p) => p.id === player.id);
            if (!me) return;
            if (me.shield) {
              set((s) => ({
                players: patchPlayer(s.players, player.id, { shield: false }),
              }));
              if (!player.isAI) unlockNow("needled-thread");
              pushToast("shield", "Shield to the rescue!", `${player.name} slips past the snake`, "power");
              pushLog(`${player.name}'s shield blocked the snake at ${pos}`, "shield", "power");
              sound.play("shield");
              sound.haptic([30, 60, 30]);
              await sleep(650 / spd);
              if (!alive()) return;
              break;
            }
            pushToast("snake", "Snake!", `Down from ${pos} to ${snakeTail}`, "snake");
            pushLog(`${player.name} slid down a snake from ${pos} to ${snakeTail}`, "snake", "snake");
            sound.play("snake");
            sound.haptic([50, 60, 90]);
            set((s) => ({
              move: { kind: "snake", playerId: player.id },
              players: patchPlayer(s.players, player.id, {
                pos: snakeTail,
                snakesHit: me.snakesHit + 1,
              }),
            }));
            if (player.isAI) {
              showAiBubble(player.id, pickRandom(AI_PERSONAS[player.difficulty].taunts.snake));
            } else {
              maybeTauntOpponent(player.id);
            }
            await sleep(830 / spd);
            if (!alive()) return;
            pos = snakeTail;
            continue;
          }

          if (ladderTop !== undefined) {
            const me = get().players.find((p) => p.id === player.id);
            if (!me) return;
            pushToast("ladder", "Ladder!", `Up from ${pos} to ${ladderTop}`, "ladder");
            pushLog(`${player.name} climbed a ladder from ${pos} to ${ladderTop}`, "ladder", "ladder");
            sound.play("ladder");
            sound.haptic(35);
            set((s) => ({
              move: { kind: "ladder", playerId: player.id },
              players: patchPlayer(s.players, player.id, {
                pos: ladderTop,
                laddersClimbed: me.laddersClimbed + 1,
              }),
            }));
            if (player.isAI) {
              showAiBubble(player.id, pickRandom(AI_PERSONAS[player.difficulty].taunts.ladder));
            }
            await sleep(700 / spd);
            if (!alive()) return;
            pos = ladderTop;
            continue;
          }

          if (power && rules.arcadePowerTiles) {
            set((s) => {
              const tiles = { ...s.powerTiles };
              delete tiles[pos];
              return { powerTiles: tiles };
            });
            sound.play("power");
            sound.haptic([20, 30, 20]);
            if (power === "star") {
              starExtra = true;
              pushToast("star", "Extra roll!", `${player.name} goes again`, "power");
              pushLog(`${player.name} grabbed a star and rolls again`, "star", "power");
            } else if (power === "shield") {
              set((s) => ({
                players: patchPlayer(s.players, player.id, { shield: true }),
              }));
              pushToast("shield", "Shield up!", "Next snake bite is blocked", "power");
              pushLog(`${player.name} raised a shield`, "shield", "power");
            } else if (power === "rocket") {
              set((s) => ({
                players: patchPlayer(s.players, player.id, { boost: 3 }),
              }));
              if (!player.isAI) unlockNow("rocket-rider");
              pushToast("rocket", "Rocket armed!", "+3 on the next roll", "power");
              pushLog(`${player.name} armed a rocket (+3 next roll)`, "rocket", "power");
            } else {
              const others = get().players.filter((p) => p.id !== player.id);
              if (others.length > 0) {
                let target = others.reduce((best, p) => (p.pos > best.pos ? p : best), others[0]);
                if (target.pos <= pos) target = pickRandom(others);
                const myNew = target.pos;
                pushToast("shuffle", "Position swap!", `${player.name} and ${target.name} trade places`, "power");
                pushLog(`${player.name} swapped places with ${target.name}`, "shuffle", "power");
                sound.play("swap");
                sound.haptic([30, 40, 30, 40, 30]);
                set((s) => ({
                  move: { kind: "teleport", playerId: player.id },
                  players: s.players.map((p) =>
                    p.id === player.id
                      ? { ...p, pos: myNew }
                      : p.id === target.id
                        ? { ...p, pos }
                        : p
                  ),
                }));
                if (!player.isAI) unlockNow("swapper");
                pos = myNew;
              }
            }
            await sleep(560 / spd);
            if (!alive()) return;
            break;
          }

          break;
        }

        /* 7. win check */
        if (pos === total) {
          const timeMs = Date.now() - get().startedAt;
          const me = get().players.find((p) => p.id === player.id);
          if (!me) return;
          set((s) => ({
            phase: "gameover",
            winnerId: player.id,
            endedAt: Date.now(),
            finishOrder: [...s.finishOrder, player.id],
            players: patchPlayer(s.players, player.id, {
              rank: 1,
              finishedAt: Date.now(),
            }),
            move: { kind: "step", playerId: player.id },
          }));
          pushToast("trophy", me.name === "You" ? "You win!" : `${me.name} wins!`, "What a race!", "win");
          pushLog(`${player.name} reached ${total} and won the game!`, "trophy", "win");
          sound.play("win");
          sound.haptic([40, 80, 40, 120]);
          finalizeGame(player.id, wasExact, timeMs);
          return;
        }

        /* 8. extra turn or next player */
        const extra = (value === 6 && rules.extraTurnOnSix) || starExtra;
        if (extra) {
          if (value === 6) {
            pushToast("zap", "Rolled a 6!", "Roll again", "six");
          }
          set({ phase: "awaitRoll", move: null });
          scheduleAI(850);
        } else {
          endTurn();
        }
      },
    }),
    {
      name: "snl-deluxe-game",
      storage: createJSONStorage(pickStorage),
      version: 1,
      migrate: (persisted) => {
        // persisted payloads are old shapes, read them loosely and rebuild
        const raw = persisted as Record<string, unknown> | undefined;
        const s = (raw ?? {}) as unknown as GameState;
        const rawMode = (raw?.config as { mode?: string } | undefined)?.mode;
        const rawBoardId = raw?.boardId as string | undefined;
        if (rawMode === "quick" || rawBoardId === "quick-sprint") {
          s.config = { ...s.config, mode: "classic" };
        }
        if (rawMode && !BOARDS_MODES.includes(rawMode)) {
          s.config = { ...s.config, mode: "classic" };
        }
        // v0 -> v1: emoji avatars replaced with icon ids
        if (Array.isArray(s.players)) {
          s.players = s.players.map((p) => ({
            ...p,
            avatar: EMOJI_TO_ICON[p.avatar] ?? (isIconId(p.avatar) ? p.avatar : "cat"),
          }));
        }
        return s;
      },
      partialize: (s) => ({
        screen: s.online.active ? "home" : s.screen,
        config: s.config,
        boardId: s.boardId,
        powerTiles: s.powerTiles,
        players: s.online.active ? [] : s.players,
        turn: s.turn,
        phase: s.online.active ? "awaitRoll" : s.phase,
        log: s.log,
        finishOrder: s.finishOrder,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        winnerId: s.winnerId,
        diceHistory: s.diceHistory,
        online: { ...ONLINE_INACTIVE },
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (!state) return;
          // Defer: zustand hydrates synchronously during create(), when the
          // `useGame` const is not yet assigned (TDZ). setTimeout(0) runs
          // after module evaluation completes.
          setTimeout(() => {
            // offer resume for any in-progress game (also when user quit to home)
            const inProgress =
              state.players.length > 0 && !state.winnerId && state.phase === "awaitRoll";
            if (inProgress) {
              useGame.setState({
                screen: "home",
                resumable: true,
                phase: "awaitRoll",
                dice: null,
                diceRolling: false,
                toasts: [],
                aiBubble: null,
                move: null,
                gen: useGame.getState().gen + 1,
              });
            } else {
              useGame.setState({ resumable: false });
            }
          }, 0);
        };
      },
    }
  )
);
