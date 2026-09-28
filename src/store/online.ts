/* ============================================================
   Online store: socket connection, account, rooms, ranked
   matchmaking, shop and leaderboard. Bridges server-driven
   games into the local game store so the board, dice and
   animations are shared between offline and online play.
   ============================================================ */

import { create } from "zustand";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import type {
  ChatMessage,
  LeaderboardRow,
  OnlineUserPublic,
  RoomSettings,
  RoomView,
  TurnResult,
} from "@/lib/game/types";
import { DEFAULT_RULES, ECONOMY, getMapProduct } from "@/lib/game/data";
import type { GameMode, ThemeId } from "@/lib/game/types";
import { useGame } from "@/store/game";
import { useProfile } from "@/store/profile";
import { setCoinGrant, setOnlineRollEmitter } from "@/lib/online-bridge";
import { sound } from "@/lib/sound";

const TOKEN_KEY = "snl-online-token";
const ONLINE_SERVICE_PORT = 3005;

/*
 * When the game is deployed publicly (Vercel, or any host), set
 * NEXT_PUBLIC_ONLINE_URL to the online service URL, for example
 * https://snl-online.onrender.com. Left unset, we fall back to the
 * sandbox preview proxy path so local development keeps working.
 */
const ONLINE_URL = process.env.NEXT_PUBLIC_ONLINE_URL;

export type OnlineStatus = "offline" | "connecting" | "online";

export interface RankedResult {
  youWon: boolean;
  delta: number; // +stake on win, -stake on loss
  opponentName: string;
}

interface OnlineStore {
  status: OnlineStatus;
  me: OnlineUserPublic | null;
  authError: string | null;
  authBusy: boolean;
  room: RoomView | null;
  roomError: string | null;
  searching: boolean;
  searchStake: number;
  leaderboard: LeaderboardRow[];
  leaderboardBusy: boolean;
  chat: ChatMessage[];
  lastRanked: RankedResult | null;
  notice: { id: number; text: string } | null;

  connect: () => void;
  disconnect: () => void;
  register: (name: string, pin: string, avatar: string) => void;
  login: (name: string, pin: string) => void;
  logout: () => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;
  startRoomGame: () => void;
  kickPlayer: (playerId: string) => void;
  queueRanked: (stake: number) => void;
  cancelRanked: () => void;
  rematch: () => void;
  buyMap: (mapId: string) => void;
  claimDaily: () => void;
  fetchLeaderboard: () => void;
  sendChat: (text: string) => void;
  clearNotice: () => void;
}

let socket: Socket | null = null;
let noticeId = 0;
let connectFails = 0;

function pushNotice(text: string) {
  useOnline.setState({ notice: { id: ++noticeId, text } });
}

function pushGameToast(icon: string, title: string, subtitle?: string) {
  useGame.setState((s) => ({
    toasts: [
      ...s.toasts,
      {
        id: Date.now() * 1000 + (++noticeId % 1000),
        icon,
        title,
        subtitle,
        tone: "info" as const,
      },
    ].slice(-3),
  }));
}

function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Kick a fresh online game into the shared game store */
function bridgeRoomGame(room: RoomView) {
  if (!room.game) return;
  const game = useGame.getState();
  const product = getMapProduct(room.settings.boardId);
  const config = {
    mode: (room.settings.boardId as GameMode) ?? "classic",
    theme: (room.settings.themeId as ThemeId) ?? (product?.themeId as ThemeId) ?? "jungle",
    rules: { ...DEFAULT_RULES },
  };

  if (room.phase === "playing" && (!game.online.active || game.online.roomCode !== room.code)) {
    game.startOnlineGame(
      config,
      room.game.players,
      room.game.turn,
      {
        active: true,
        myId: useOnline.getState().me?.id,
        roomCode: room.code,
        ranked: room.ranked,
        stake: room.stake,
      },
    );
  } else if (room.phase === "finished" && (!game.online.active || game.online.roomCode !== room.code)) {
    game.startOnlineGame(
      config,
      room.game.players,
      room.game.turn,
      {
        active: true,
        myId: useOnline.getState().me?.id,
        roomCode: room.code,
        ranked: room.ranked,
        stake: room.stake,
      },
    );
    const winner = room.game.winnerId;
    useGame.setState({
      phase: "gameover",
      winnerId: winner ?? undefined,
      endedAt: Date.now(),
      move: null,
    });
  } else if (game.online.active && game.online.roomCode === room.code) {
    if (room.phase === "finished" && room.game?.winnerId && game.phase !== "gameover") {
      // forfeit or reconnect: the server already crowned a winner
      useGame.setState({
        phase: "gameover",
        winnerId: room.game.winnerId,
        endedAt: Date.now(),
        move: null,
      });
    } else if (game.phase === "awaitRoll") {
      // gentle re-sync while waiting (never interrupts an animation)
      game.syncOnlinePlayers(room.game.players, room.game.turn);
    }
  }
}

/** Leave any bridged online game cleanly */
function teardownOnlineGame() {
  const game = useGame.getState();
  if (game.online.active) {
    game.exitOnline();
  }
}

export const useOnline = create<OnlineStore>()((set, get) => ({
  status: "offline",
  me: null,
  authError: null,
  authBusy: false,
  room: null,
  roomError: null,
  searching: false,
  searchStake: ECONOMY.rankedStakes[1],
  leaderboard: [],
  leaderboardBusy: false,
  chat: [],
  lastRanked: null,
  notice: null,

  connect: () => {
    if (socket) {
      // restart the retry cycle if the old socket gave up or dropped
      if (!socket.connected) socket.connect();
      set({ status: socket.connected ? "online" : "connecting" });
      return;
    }
    set({ status: "connecting" });
    const sock: Socket = io(
      ONLINE_URL ?? `/?XTransformPort=${ONLINE_SERVICE_PORT}`,
      {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 900,
        timeout: 10000,
      }
    );
    socket = sock;

    sock.on("connect", () => {
      connectFails = 0;
      set({ status: "online", authError: null });
      setOnlineRollEmitter(() => {
        sock.emit("game:roll");
      });
      const token = readToken();
      if (token) {
        set({ authBusy: true });
        sock.emit("auth:token", { token });
      }
    });

    sock.on("disconnect", () => {
      set({ status: "offline" });
      setOnlineRollEmitter(null);
    });

    sock.on("connect_error", () => {
      connectFails += 1;
      // after a few failed attempts, swap the endless "Linking" spinner
      // for the friendly offline panel. The socket keeps retrying quietly
      // in the background, so the moment the service answers we go live
      // again without the player tapping anything.
      if (connectFails >= 3) {
        set({ status: "offline" });
      }
    });

    socket.on("auth:ok", ({ user, token, merged }: { user: OnlineUserPublic; token: string; merged?: boolean }) => {
      set({ me: user, authBusy: false, authError: null });
      saveToken(token);
      // once an account owns the wallet, bonuses are validated server-side
      setCoinGrant((amount, reason) => {
        socket?.emit("coins:bonus", { amount, reason });
      });
      if (merged) {
        useProfile.getState().consumeGuestWallet();
        pushNotice("Your guest ular and maps traveled with you");
      }
    });

    socket.on("auth:error", ({ message }: { message: string }) => {
      set({ authError: message, authBusy: false });
    });

    socket.on("me:update", ({ user }: { user: OnlineUserPublic }) => {
      set({ me: user });
    });

    socket.on("room:state", ({ room }: { room: RoomView | null }) => {
      set({ room, roomError: null });
      if (room) {
        const screen = useGame.getState().screen;
        if (room.phase === "lobby" && screen !== "room" && screen !== "game") {
          useGame.setState({ screen: "room" });
          sound.play("join");
        }
        // host triggered a rematch: drop the finished game and return to the lobby
        if (room.phase === "lobby" && screen === "game") {
          const game = useGame.getState();
          if (game.online.active) game.exitOnline();
          useGame.setState({ screen: "room" });
        }
        if (room.phase === "playing" || room.phase === "finished") {
          bridgeRoomGame(room);
        }
      } else {
        set({ chat: [], lastRanked: null });
        teardownOnlineGame();
        const screen = useGame.getState().screen;
        if (screen === "room" || screen === "game") {
          useGame.setState({ screen: "online" });
        }
      }
    });

    socket.on("room:error", ({ message }: { message: string }) => {
      set({ roomError: message });
    });

    socket.on("room:closed", ({ reason }: { reason: string }) => {
      pushNotice(reason);
      set({ room: null, chat: [] });
      teardownOnlineGame();
      useGame.setState({ screen: "online" });
    });

    socket.on("game:turn", ({ result }: { result: TurnResult }) => {
      void useGame.getState().applyOnlineTurn(result);
    });

    socket.on("match:searching", () => {
      set({ searching: true });
    });

    socket.on("match:found", ({ room }: { room: RoomView }) => {
      set({ searching: false, room });
      sound.play("match");
      sound.haptic([30, 60, 30]);
      bridgeRoomGame(room);
    });

    socket.on("match:cancelled", () => {
      set({ searching: false });
    });

    socket.on("ranked:result", ({ youWon, delta, opponentName }: RankedResult) => {
      set({ lastRanked: { youWon, delta, opponentName } });
      sound.play(youWon ? "coin" : "coinLose");
      sound.haptic(youWon ? [40, 70, 40] : 60);
    });

    socket.on("chat:msg", ({ msg }: { msg: ChatMessage }) => {
      set((s) => ({ chat: [...s.chat, msg].slice(-40) }));
      if (msg.name !== get().me?.name) sound.play("chat");
    });

    socket.on("leaderboard", ({ rows }: { rows: LeaderboardRow[] }) => {
      set({ leaderboard: rows, leaderboardBusy: false });
    });

    socket.on("coins:granted", ({ amount, reason }: { amount: number; reason: string }) => {
      pushGameToast("coin", `+${amount} ular`, reason, );
      sound.play("coin");
    });

    socket.on("coins:spent", ({ amount, reason }: { amount: number; reason: string }) => {
      pushGameToast("coin", `-${amount} ular`, reason);
      sound.play("coinLose");
    });

    socket.on("map:unlocked", ({ mapId }: { mapId: string }) => {
      const product = getMapProduct(mapId);
      if (product) pushNotice(`${product.name} unlocked, enjoy the new board`);
    });

    socket.on("toast", ({ text }: { text: string }) => {
      pushNotice(text);
    });
  },

  disconnect: () => {
    socket?.disconnect();
    socket = null;
    set({ status: "offline", room: null, searching: false });
    setOnlineRollEmitter(null);
  },

  register: (name, pin, avatar) => {
    if (!socket?.connected) {
      set({ authError: "Not connected yet, give it a second" });
      return;
    }
    set({ authBusy: true, authError: null });
    const wallet = useProfile.getState().wallet;
    const guest =
      wallet.coins > 0 || wallet.unlockedMaps.length > 3
        ? { coins: wallet.coins, unlockedMaps: wallet.unlockedMaps }
        : undefined;
    socket.emit("auth:register", { name, pin, avatar, mergeWallet: guest });
  },

  login: (name, pin) => {
    if (!socket?.connected) {
      set({ authError: "Not connected yet, give it a second" });
      return;
    }
    set({ authBusy: true, authError: null });
    const wallet = useProfile.getState().wallet;
    const guest =
      wallet.coins > 0 || wallet.unlockedMaps.length > 3
        ? { coins: wallet.coins, unlockedMaps: wallet.unlockedMaps }
        : undefined;
    socket.emit("auth:login", { name, pin, mergeWallet: guest });
  },

  logout: () => {
    socket?.emit("auth:logout");
    saveToken(null);
    set({ me: null, room: null, chat: [], lastRanked: null });
    teardownOnlineGame();
    // back to the guest wallet
    setCoinGrant((amount) => {
      useProfile.getState().addCoins(amount);
    });
  },

  createRoom: () => {
    socket?.emit("room:create");
  },

  rematch: () => {
    socket?.emit("room:again");
  },

  joinRoom: (code) => {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 5) {
      set({ roomError: "Room codes are 5 letters" });
      return;
    }
    set({ roomError: null });
    socket?.emit("room:join", { code: clean });
  },

  leaveRoom: () => {
    socket?.emit("room:leave");
    set({ chat: [], lastRanked: null });
  },

  updateRoomSettings: (settings) => {
    socket?.emit("room:update", { settings });
  },

  startRoomGame: () => {
    socket?.emit("room:start");
  },

  kickPlayer: (playerId) => {
    socket?.emit("room:kick", { playerId });
  },

  queueRanked: (stake) => {
    if (!ECONOMY.rankedStakes.includes(stake as (typeof ECONOMY.rankedStakes)[number])) return;
    set({ searchStake: stake, searching: true });
    socket?.emit("match:queue", { stake });
  },

  cancelRanked: () => {
    socket?.emit("match:cancel");
    set({ searching: false });
  },

  buyMap: (mapId) => {
    socket?.emit("shop:buy", { mapId });
  },

  claimDaily: () => {
    socket?.emit("daily:claim");
  },

  fetchLeaderboard: () => {
    set({ leaderboardBusy: true });
    socket?.emit("leaderboard:fetch");
  },

  sendChat: (text) => {
    const clean = text.trim().slice(0, 80);
    if (!clean) return;
    socket?.emit("chat:send", { text: clean });
  },

  clearNotice: () => set({ notice: null }),
}));
