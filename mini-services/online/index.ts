/* ============================================================
   Snakes & Ladders Deluxe: online service
   Socket.io server that owns accounts, the ular economy,
   friendly rooms (up to 6 players), ranked matchmaking with
   coin stakes, the shop and the leaderboard.

   Authority model: the server resolves every dice roll and
   broadcasts a complete TurnResult so all clients animate the
   same turn identically.
   ============================================================ */

import { createServer } from "http";
import { createHash, randomBytes } from "crypto";
import { Server, type Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { BOARDS, MAP_PRODUCTS, ECONOMY, THEMES } from "../../src/lib/game/data";
import type {
  ChatMessage,
  LeaderboardRow,
  OnlinePlayerState,
  OnlineUserPublic,
  RoomPlayer,
  RoomSettings,
  RoomView,
  TurnResult,
} from "../../src/lib/game/types";

// Hosts like Render pass the port through PORT; local dev keeps 3005.
const PORT = Number(process.env.PORT) || 3005;
const FREE_THEMES = ["wood", "jungle", "space", "ocean", "candy"] as const;
const ROOM_TTL_AFTER_FINISH = 3 * 60 * 1000;
const AUTO_ROLL_DELAY = 7000;
const MAX_PLAYERS = 6;

const prisma = new PrismaClient();

/* ---------------- helpers ---------------- */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashPin(pin: string, salt: string): string {
  return createHash("sha256").update(salt + pin).digest("hex");
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newRoomCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}

function sanitizeText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);
}

function validName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().slice(0, 14);
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{2,13}$/u.test(name)) return null;
  return name;
}

function validPin(raw: unknown): raw is string {
  return typeof raw === "string" && /^\d{4}$/.test(raw);
}

function toPublic(user: {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  unlockedCsv: string;
  wins: number;
  losses: number;
  rankWins: number;
  lastDaily: string;
}): OnlineUserPublic {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    coins: user.coins,
    unlockedMaps: user.unlockedCsv ? user.unlockedCsv.split(",").filter(Boolean) : [],
    wins: user.wins,
    losses: user.losses,
    rankWins: user.rankWins,
    dailyAvailable: user.lastDaily !== todayKey(),
  };
}

/* ---------------- room state ---------------- */

interface ServerGame {
  players: OnlinePlayerState[];
  turn: number;
  winnerId: string | null;
  startedAt: number;
  sixStreaks: Record<string, number>;
}

interface QueueEntry {
  userId: string;
  stake: number;
  matchId: string;
}

interface ServerRoom {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  phase: "lobby" | "playing" | "finished";
  game: ServerGame | null;
  ranked: boolean;
  stake: number;
  chat: ChatMessage[];
  chatSeq: number;
  matchId?: string;
  autoTimer: ReturnType<typeof setTimeout> | null;
  finishTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, ServerRoom>();
const userSockets = new Map<string, Set<string>>(); // userId -> socket ids
const queue: QueueEntry[] = [];
const socketUser = new Map<string, string>(); // socketId -> userId

function getSocket(id: string): Socket | undefined {
  return io.sockets.sockets.get(id);
}

function roomView(room: ServerRoom): RoomView {
  return {
    code: room.code,
    hostId: room.hostId,
    players: room.players.map((p) => ({ ...p })),
    settings: { ...room.settings },
    phase: room.phase,
    game: room.game
      ? {
          players: room.game.players.map((p) => ({ ...p })),
          turn: room.game.turn,
          winnerId: room.game.winnerId,
          startedAt: room.game.startedAt,
        }
      : null,
    ranked: room.ranked,
    stake: room.stake,
  };
}

function broadcastRoom(room: ServerRoom): void {
  const view = roomView(room);
  for (const p of room.players) {
    for (const sid of userSockets.get(p.id) ?? []) {
      getSocket(sid)?.emit("room:state", { room: view });
    }
  }
}

function emitToUser(userId: string, event: string, payload: unknown): void {
  for (const sid of userSockets.get(userId) ?? []) {
    getSocket(sid)?.emit(event, payload);
  }
}

function emitMe(userId: string): Promise<void> {
  return prisma.onlineUser
    .findUnique({ where: { id: userId } })
    .then((user) => {
      if (user) emitToUser(userId, "me:update", { user: toPublic(user) });
    })
    .catch(() => undefined);
}

function pushChat(room: ServerRoom, name: string, text: string): ChatMessage {
  const msg: ChatMessage = { id: ++room.chatSeq, name, text, at: Date.now() };
  room.chat.push(msg);
  room.chat = room.chat.slice(-30);
  for (const p of room.players) {
    for (const sid of userSockets.get(p.id) ?? []) {
      getSocket(sid)?.emit("chat:msg", { msg });
    }
  }
  return msg;
}

function clearAutoTimer(room: ServerRoom): void {
  if (room.autoTimer) {
    clearTimeout(room.autoTimer);
    room.autoTimer = null;
  }
}

function scheduleCleanup(room: ServerRoom): void {
  if (room.finishTimer) return;
  room.finishTimer = setTimeout(() => {
    rooms.delete(room.code);
  }, ROOM_TTL_AFTER_FINISH);
}

/* ---------------- per-user serialization for coin mutations ----------------
   Rapid client events (3 achievements at once) would otherwise race on
   read-then-write updates and lose grants. One queue per user. */

const userQueues = new Map<string, Promise<unknown>>();

function queueFor<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const prev = userQueues.get(userId) ?? Promise.resolve();
  const run = () => task();
  const next = prev.then(run, run);
  userQueues.set(userId, next);
  void next
    .catch(() => undefined)
    .finally(() => {
      if (userQueues.get(userId) === next) userQueues.delete(userId);
    });
  return next;
}

/* ---------------- turn resolution (server authority) ---------------- */

const TOTAL = 100;

function resolveTurn(room: ServerRoom): TurnResult | null {
  const game = room.game;
  if (!game || room.phase !== "playing" || game.winnerId) return null;
  const player = game.players[game.turn];
  if (!player) return null;

  const board = BOARDS.find((b) => b.id === room.settings.boardId) ?? BOARDS[0];
  const dice = 1 + Math.floor(Math.random() * 6);

  const streak = dice === 6 ? (game.sixStreaks[player.id] ?? 0) + 1 : 0;
  game.sixStreaks[player.id] = streak;

  const snapshotPlayers = () => game.players.map((p) => ({ ...p }));
  const advance = (extra: boolean, win: boolean) => {
    if (win) {
      game.winnerId = player.id;
      room.phase = "finished";
      const idx = game.players.findIndex((p) => p.id === player.id);
      game.players[idx] = { ...player, finishedAt: Date.now() };
    }
    game.turn = extra && !win ? game.turn : (game.turn + 1) % game.players.length;
    if (!win && !extra) game.sixStreaks[player.id] = 0;
  };

  // three sixes in a row forfeits the turn
  if (dice === 6 && streak >= 3) {
    game.sixStreaks[player.id] = 0;
    game.turn = (game.turn + 1) % game.players.length;
    return {
      playerId: player.id,
      dice,
      path: [],
      bounce: false,
      snake: null,
      ladder: null,
      extra: false,
      forfeit: true,
      win: false,
      nextTurn: game.turn,
      players: snapshotPlayers(),
      winnerId: null,
    };
  }

  const from = player.pos;
  const raw = from + dice;
  const over = raw - TOTAL;
  const bounce = over > 0;
  const finalTarget = bounce ? TOTAL - over : Math.min(raw, TOTAL);

  const path: number[] = [];
  for (let c = from + 1; c <= Math.min(raw, TOTAL); c++) path.push(c);
  if (bounce) for (let c = TOTAL - 1; c >= finalTarget; c--) path.push(c);

  // resolve snakes / ladders (one chain pass like the client)
  let pos = finalTarget;
  let snake: { from: number; to: number } | null = null;
  let ladder: { from: number; to: number } | null = null;
  let guard = 0;
  while (guard++ < 5 && pos !== TOTAL) {
    const snakeTail = board.snakes[pos];
    if (snakeTail !== undefined) {
      snake = { from: pos, to: snakeTail };
      pos = snakeTail;
      continue;
    }
    const ladderTop = board.ladders[pos];
    if (ladderTop !== undefined) {
      ladder = { from: pos, to: ladderTop };
      pos = ladderTop;
      continue;
    }
    break;
  }

  const win = pos === TOTAL;
  const extra = dice === 6 && !win;
  const idx = game.players.findIndex((p) => p.id === player.id);
  game.players[idx] = { ...player, pos, finishedAt: win ? Date.now() : undefined };

  advance(extra, win);

  return {
    playerId: player.id,
    dice,
    path,
    bounce,
    snake,
    ladder,
    extra,
    forfeit: false,
    win,
    nextTurn: game.turn,
    players: snapshotPlayers(),
    winnerId: game.winnerId,
  };
}

/* ---------------- settle finished games ---------------- */

async function settleGame(room: ServerRoom, winnerId: string): Promise<void> {
  const game = room.game;
  if (!game) return;

  if (room.ranked && room.matchId) {
    const loser = game.players.find((p) => p.id !== winnerId);
    const winner = game.players.find((p) => p.id === winnerId);
    if (winner && loser) {
      await prisma.$transaction([
        prisma.onlineUser.update({
          where: { id: winner.id },
          data: { coins: { increment: room.stake * 2 }, wins: { increment: 1 }, rankWins: { increment: 1 } },
        }),
        prisma.onlineUser.update({
          where: { id: loser.id },
          data: { losses: { increment: 1 } },
        }),
        prisma.matchLog.update({
          where: { id: room.matchId },
          data: { status: "settled", winnerId, settledAt: new Date() },
        }),
      ]);
      await emitMe(winner.id);
      await emitMe(loser.id);
      emitToUser(winner.id, "ranked:result", {
        youWon: true,
        delta: room.stake,
        opponentName: loser.name,
      });
      emitToUser(loser.id, "ranked:result", {
        youWon: false,
        delta: -room.stake,
        opponentName: winner.name,
      });
    }
  } else if (!room.ranked) {
    // friendly rooms pay the winner a small ular bonus
    const winner = game.players.find((p) => p.id === winnerId);
    if (winner) {
      await prisma.onlineUser.update({
        where: { id: winner.id },
        data: {
          coins: { increment: ECONOMY.friendlyWinBonus },
          wins: { increment: 1 },
        },
      });
      const others = game.players.filter((p) => p.id !== winnerId);
      for (const o of others) {
        await prisma.onlineUser.update({ where: { id: o.id }, data: { losses: { increment: 1 } } });
      }
      await emitMe(winner.id);
      emitToUser(winner.id, "coins:granted", {
        amount: ECONOMY.friendlyWinBonus,
        reason: "Friendly win bonus",
      });
    }
  }
  clearAutoTimer(room);
  scheduleCleanup(room);
}

/** forfeit a ranked match: opponent takes the pot */
async function forfeitRanked(room: ServerRoom, disconnectedId: string): Promise<void> {
  const game = room.game;
  if (!game || room.phase !== "playing" || !room.ranked) return;
  const winner = game.players.find((p) => p.id !== disconnectedId);
  if (!winner) return;
  const loser = game.players.find((p) => p.id === disconnectedId);
  game.winnerId = winner.id;
  room.phase = "finished";
  const idx = game.players.findIndex((p) => p.id === winner.id);
  game.players[idx] = { ...winner, finishedAt: Date.now() };
  broadcastRoom(room);
  emitToUser(winner.id, "toast", { text: `${loser?.name ?? "Your opponent"} disconnected, you win the pot` });
  await settleGame(room, winner.id);
}

/* ---------------- disconnected players auto-roll ---------------- */

function maybeScheduleAutoRoll(room: ServerRoom): void {
  clearAutoTimer(room);
  if (room.phase !== "playing" || !room.game || room.game.winnerId || room.ranked) return;
  const current = room.game.players[room.game.turn];
  if (!current) return;
  const member = room.players.find((p) => p.id === current.id);
  if (member && member.connected) return;
  room.autoTimer = setTimeout(() => {
    const g = room.game;
    if (!g || room.phase !== "playing" || g.winnerId) return;
    const cur = g.players[g.turn];
    if (!cur) return;
    const m = room.players.find((p) => p.id === cur.id);
    if (m && m.connected) return;
    const result = resolveTurn(room);
    if (!result) return;
    broadcastRoom(room);
    for (const p of room.players) {
      for (const sid of userSockets.get(p.id) ?? []) {
        getSocket(sid)?.emit("game:turn", { result });
      }
    }
    if (result.win) {
      void settleGame(room, result.playerId);
    } else {
      maybeScheduleAutoRoll(room);
    }
  }, AUTO_ROLL_DELAY);
}

/* ---------------- ranked matchmaking ---------------- */

async function tryPairQueue(): Promise<void> {
  // find the first same-stake pair (two distinct users)
  const findPair = (): [number, number] | null => {
    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        if (queue[i].stake === queue[j].stake && queue[i].userId !== queue[j].userId) {
          return [i, j];
        }
      }
    }
    return null;
  };

  while (true) {
    const pair = findPair();
    if (!pair) return;
    const [i, j] = pair;
    const a = queue[i];
    const b = queue[j];
    queue.splice(j, 1);
    queue.splice(i, 1);

    const ua = await prisma.onlineUser.findUnique({ where: { id: a.userId } });
    const ub = await prisma.onlineUser.findUnique({ where: { id: b.userId } });
    if (!ua || !ub) continue;

    // both stakes stay escrowed; one log tracks the whole pot
    await prisma.matchLog.update({ where: { id: a.matchId }, data: { bId: b.userId } });
    await prisma.matchLog.delete({ where: { id: b.matchId } }).catch(() => undefined);

    const theme = FREE_THEMES[Math.floor(Math.random() * FREE_THEMES.length)];
    const room: ServerRoom = {
      code: newRoomCode(),
      hostId: a.userId,
      players: [
        { id: ua.id, name: ua.name, avatar: ua.avatar, colorId: 0, connected: true, isHost: true },
        { id: ub.id, name: ub.name, avatar: ub.avatar, colorId: 1, connected: true, isHost: false },
      ],
      settings: { boardId: "classic", themeId: theme },
      phase: "playing",
      game: {
        players: [
          { id: ua.id, name: ua.name, avatar: ua.avatar, colorId: 0, pos: 0, connected: true },
          { id: ub.id, name: ub.name, avatar: ub.avatar, colorId: 1, pos: 0, connected: true },
        ],
        turn: Math.random() < 0.5 ? 0 : 1,
        winnerId: null,
        startedAt: Date.now(),
        sixStreaks: {},
      },
      ranked: true,
      stake: a.stake,
      chat: [],
      chatSeq: 0,
      matchId: a.matchId,
      autoTimer: null,
      finishTimer: null,
    };
    rooms.set(room.code, room);
    for (const entry of [a, b]) {
      emitToUser(entry.userId, "match:found", { room: roomView(room) });
    }
  }
}

/* ---------------- auth ---------------- */

async function mergeWallet(
  user: { id: string; coins: number; unlockedCsv: string; merged: boolean },
  merge: { coins?: number; unlockedMaps?: string[] } | undefined
): Promise<boolean> {
  if (!merge || user.merged) return false;
  const addCoins = Math.max(0, Math.min(3000, Math.floor(merge.coins ?? 0)));
  const freeIds = MAP_PRODUCTS.filter((m) => m.price === 0).map((m) => m.id);
  const guestMaps = (merge.unlockedMaps ?? []).filter(
    (id) => MAP_PRODUCTS.some((m) => m.id === id && m.price > 0)
  );
  const current = user.unlockedCsv.split(",").filter(Boolean);
  const unlocked = Array.from(new Set([...current, ...guestMaps, ...freeIds]));
  await prisma.onlineUser.update({
    where: { id: user.id },
    data: { coins: user.coins + addCoins, unlockedCsv: unlocked.join(","), merged: true },
  });
  return true;
}

async function handleRegister(
  socket: Socket,
  payload: { name?: string; pin?: string; avatar?: string; mergeWallet?: { coins?: number; unlockedMaps?: string[] } }
): Promise<void> {
  const name = validName(payload.name);
  if (!name) {
    socket.emit("auth:error", { message: "Names are 3 to 14 letters, starting with a letter" });
    return;
  }
  if (!validPin(payload.pin)) {
    socket.emit("auth:error", { message: "The PIN is 4 digits" });
    return;
  }
  const avatar = typeof payload.avatar === "string" ? payload.avatar.slice(0, 16) : "cat";
  const existing = await prisma.onlineUser.findUnique({ where: { nameLower: name.toLowerCase() } });
  if (existing) {
    socket.emit("auth:error", { message: "That name is taken, try another" });
    return;
  }
  const salt = randomBytes(8).toString("hex");
  const token = randomBytes(24).toString("hex");
  const freeIds = MAP_PRODUCTS.filter((m) => m.price === 0).map((m) => m.id);
  const user = await prisma.onlineUser.create({
    data: {
      name,
      nameLower: name.toLowerCase(),
      avatar,
      pinHash: hashPin(payload.pin, salt),
      pinSalt: salt,
      token,
      coins: ECONOMY.startingCoins,
      unlockedCsv: freeIds.join(","),
    },
  });
  const merged = await mergeWallet(user, payload.mergeWallet);
  const fresh = await prisma.onlineUser.findUnique({ where: { id: user.id } });
  bindUser(socket, user.id);
  socket.emit("auth:ok", { user: toPublic(fresh ?? user), token, merged });
}

async function handleLogin(
  socket: Socket,
  payload: { name?: string; pin?: string; mergeWallet?: { coins?: number; unlockedMaps?: string[] } }
): Promise<void> {
  const name = validName(payload.name);
  if (!name || !validPin(payload.pin)) {
    socket.emit("auth:error", { message: "Check your name and 4-digit PIN" });
    return;
  }
  const user = await prisma.onlineUser.findUnique({ where: { nameLower: name.toLowerCase() } });
  if (!user || hashPin(payload.pin, user.pinSalt) !== user.pinHash) {
    socket.emit("auth:error", { message: "Wrong name or PIN" });
    return;
  }
  const token = randomBytes(24).toString("hex");
  await prisma.onlineUser.update({ where: { id: user.id }, data: { token } });
  const merged = await mergeWallet(user, payload.mergeWallet);
  const fresh = await prisma.onlineUser.findUnique({ where: { id: user.id } });
  bindUser(socket, user.id);
  socket.emit("auth:ok", { user: toPublic(fresh ?? user), token, merged });
}

async function handleTokenAuth(socket: Socket, payload: { token?: string }): Promise<void> {
  if (typeof payload.token !== "string" || payload.token.length < 16) {
    socket.emit("auth:error", { message: "Session expired, sign in again" });
    return;
  }
  const user = await prisma.onlineUser.findUnique({ where: { token: payload.token } });
  if (!user) {
    socket.emit("auth:error", { message: "Session expired, sign in again" });
    return;
  }
  bindUser(socket, user.id);
  socket.emit("auth:ok", { user: toPublic(user), token: payload.token, merged: false });
}

function bindUser(socket: Socket, userId: string): void {
  socketUser.set(socket.id, userId);
  let set = userSockets.get(userId);
  if (!set) {
    set = new Set();
    userSockets.set(userId, set);
  }
  set.add(socket.id);

  // rebind into an existing room (reconnect / second device)
  for (const room of rooms.values()) {
    const member = room.players.find((p) => p.id === userId);
    if (member && !member.connected) {
      member.connected = true;
      if (room.game) {
        const gp = room.game.players.find((p) => p.id === userId);
        if (gp) gp.connected = true;
      }
      clearAutoTimer(room);
      broadcastRoom(room);
      maybeScheduleAutoRoll(room);
      return;
    }
    if (member && member.connected) {
      broadcastRoom(room);
      return;
    }
  }
}

/* ---------------- rooms ---------------- */

function findRoomByUser(userId: string): ServerRoom | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.id === userId)) return room;
  }
  return undefined;
}

async function createRoom(socket: Socket): Promise<void> {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const user = await prisma.onlineUser.findUnique({ where: { id: userId } });
  if (!user) return;

  // leave any previous room first
  const prev = findRoomByUser(userId);
  if (prev) await leaveRoomInternal(socket, userId, prev, false);

  let code = newRoomCode();
  while (rooms.has(code)) code = newRoomCode();
  const room: ServerRoom = {
    code,
    hostId: userId,
    players: [{ id: user.id, name: user.name, avatar: user.avatar, colorId: 0, connected: true, isHost: true }],
    settings: { boardId: "classic", themeId: "jungle" },
    phase: "lobby",
    game: null,
    ranked: false,
    stake: 0,
    chat: [],
    chatSeq: 0,
    autoTimer: null,
    finishTimer: null,
  };
  rooms.set(code, room);
  socket.emit("room:state", { room: roomView(room) });
}

async function joinRoom(socket: Socket, payload: { code?: string }): Promise<void> {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const code = typeof payload.code === "string" ? payload.code.trim().toUpperCase() : "";
  const room = rooms.get(code);
  if (!room || room.ranked) {
    socket.emit("room:error", { message: "No open room with that code" });
    return;
  }
  if (room.phase !== "lobby") {
    socket.emit("room:error", { message: "That game already started" });
    return;
  }
  if (room.players.some((p) => p.id === userId)) {
    socket.emit("room:state", { room: roomView(room) });
    return;
  }
  if (room.players.length >= MAX_PLAYERS) {
    socket.emit("room:error", { message: "That room is full" });
    return;
  }
  const user = await prisma.onlineUser.findUnique({ where: { id: userId } });
  if (!user) return;
  const usedColors = new Set(room.players.map((p) => p.colorId));
  let colorId = 0;
  while (usedColors.has(colorId)) colorId++;
  room.players.push({ id: user.id, name: user.name, avatar: user.avatar, colorId, connected: true, isHost: false });
  pushChat(room, "Server", `${user.name} joined`);
  broadcastRoom(room);
}

async function leaveRoomInternal(socket: Socket, userId: string, room: ServerRoom, announce: boolean): Promise<void> {
  const member = room.players.find((p) => p.id === userId);
  if (!member) return;

  if (room.phase === "lobby") {
    room.players = room.players.filter((p) => p.id !== userId);
    if (announce) pushChat(room, "Server", `${member.name} left`);
    if (room.players.length === 0) {
      clearAutoTimer(room);
      rooms.delete(room.code);
      return;
    }
    if (room.hostId === userId) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
      if (announce) pushChat(room, "Server", `${room.players[0].name} is the new host`);
    }
    broadcastRoom(room);
  } else {
    // mid-game: mark disconnected, keep the seat
    member.connected = false;
    if (room.game) {
      const gp = room.game.players.find((p) => p.id === userId);
      if (gp) gp.connected = false;
    }
    if (announce) pushChat(room, "Server", `${member.name} lost connection`);
    if (room.ranked) {
      await forfeitRanked(room, userId);
    } else {
      broadcastRoom(room);
      maybeScheduleAutoRoll(room);
    }
  }
}

function startGame(socket: Socket): void {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const room = findRoomByUser(userId);
  if (!room || room.ranked) return;
  if (room.hostId !== userId || room.phase !== "lobby") return;
  if (room.players.length < 2) {
    socket.emit("room:error", { message: "You need at least 2 players" });
    return;
  }
  room.phase = "playing";
  room.game = {
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      colorId: p.colorId,
      pos: 0,
      connected: p.connected,
    })),
    turn: 0,
    winnerId: null,
    startedAt: Date.now(),
    sixStreaks: {},
  };
  pushChat(room, "Server", "Game on! First to 100 wins");
  broadcastRoom(room);
}

function updateRoomSettings(socket: Socket, payload: { settings?: Partial<RoomSettings> }): void {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const room = findRoomByUser(userId);
  if (!room || room.ranked || room.hostId !== userId || room.phase !== "lobby") return;
  const s = payload.settings ?? {};

  const boardId = typeof s.boardId === "string" ? s.boardId : null;
  if (boardId && BOARDS.some((b) => b.id === boardId)) {
    const product = MAP_PRODUCTS.find((m) => m.id === boardId);
    if (product && product.price === 0) {
      room.settings.boardId = boardId;
    } else {
      // premium maps require ownership by the host
      void prisma.onlineUser
        .findUnique({ where: { id: userId } })
        .then((user) => {
          if (user && user.unlockedCsv.split(",").includes(boardId)) {
            room.settings.boardId = boardId;
            broadcastRoom(room);
          } else {
            socket.emit("room:error", { message: "Unlock that map first in the shop" });
          }
        })
        .catch(() => undefined);
    }
  }

  const themeId = typeof s.themeId === "string" ? s.themeId : null;
  if (themeId && themeId in THEMES) {
    const product = MAP_PRODUCTS.find((m) => m.themeId === themeId && m.price > 0);
    if (!product) {
      room.settings.themeId = themeId as RoomSettings["themeId"];
      broadcastRoom(room);
    } else {
      void prisma.onlineUser
        .findUnique({ where: { id: userId } })
        .then((user) => {
          if (user && user.unlockedCsv.split(",").includes(product.id)) {
            room.settings.themeId = themeId as RoomSettings["themeId"];
            broadcastRoom(room);
          } else {
            socket.emit("room:error", { message: "Unlock that map first in the shop" });
          }
        })
        .catch(() => undefined);
    }
  }

  broadcastRoom(room);
}

function kickPlayer(socket: Socket, payload: { playerId?: string }): void {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const room = findRoomByUser(userId);
  if (!room || room.ranked || room.hostId !== userId || room.phase !== "lobby") return;
  const target = room.players.find((p) => p.id === payload.playerId);
  if (!target || target.id === userId) return;
  room.players = room.players.filter((p) => p.id !== target.id);
  for (const sid of userSockets.get(target.id) ?? []) {
    const s = getSocket(sid);
    s?.emit("room:closed", { reason: "The host removed you from the room" });
  }
  pushChat(room, "Server", `${target.name} was removed`);
  broadcastRoom(room);
}

function handleRoll(socket: Socket): void {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const room = findRoomByUser(userId);
  if (!room || room.phase !== "playing" || !room.game || room.game.winnerId) return;
  const current = room.game.players[room.game.turn];
  if (!current || current.id !== userId) return;

  const result = resolveTurn(room);
  if (!result) return;
  broadcastRoom(room);
  for (const p of room.players) {
    for (const sid of userSockets.get(p.id) ?? []) {
      getSocket(sid)?.emit("game:turn", { result });
    }
  }
  if (result.win) {
    void settleGame(room, result.playerId);
  } else {
    maybeScheduleAutoRoll(room);
  }
}

/* ---------------- shop / daily / leaderboard / bonuses ---------------- */

async function handleBuy(socket: Socket, payload: { mapId?: string }): Promise<void> {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const product = MAP_PRODUCTS.find((m) => m.id === payload.mapId);
  if (!product || product.price === 0) return;
  await queueFor(userId, async () => {
    const user = await prisma.onlineUser.findUnique({ where: { id: userId } });
    if (!user) return;
    if (user.unlockedCsv.split(",").includes(product.id)) return;
    if (user.coins < product.price) {
      socket.emit("room:error", { message: "Not enough ular for that map" });
      return;
    }
    await prisma.onlineUser.update({
      where: { id: userId },
      data: { coins: { decrement: product.price }, unlockedCsv: `${user.unlockedCsv},${product.id}` },
    });
    await emitMe(userId);
    socket.emit("coins:spent", { amount: product.price, reason: product.name });
    socket.emit("map:unlocked", { mapId: product.id });
  });
}

async function handleDaily(socket: Socket): Promise<void> {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  await queueFor(userId, async () => {
    const user = await prisma.onlineUser.findUnique({ where: { id: userId } });
    if (!user) return;
    const today = todayKey();
    if (user.lastDaily === today) {
      socket.emit("room:error", { message: "Come back tomorrow for the next gift" });
      return;
    }
    await prisma.onlineUser.update({ where: { id: userId }, data: { lastDaily: today, coins: { increment: ECONOMY.dailyBonus } } });
    await emitMe(userId);
    socket.emit("coins:granted", { amount: ECONOMY.dailyBonus, reason: "Daily gift" });
  });
}

async function handleLeaderboard(socket: Socket): Promise<void> {
  const users = await prisma.onlineUser.findMany({
    orderBy: { coins: "desc" },
    take: 20,
  });
  const rows: LeaderboardRow[] = users.map((u, i) => ({
    rank: i + 1,
    name: u.name,
    avatar: u.avatar,
    coins: u.coins,
    rankWins: u.rankWins,
  }));
  socket.emit("leaderboard", { rows });
}

async function handleBonus(
  socket: Socket,
  payload: { amount?: number; reason?: string }
): Promise<void> {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const amount = Math.floor(payload.amount ?? 0);
  // only the two known client bonus kinds are accepted, capped per day
  if (amount !== ECONOMY.offlineWinBonus && amount !== ECONOMY.achievementReward) return;
  await queueFor(userId, async () => {
    const user = await prisma.onlineUser.findUnique({ where: { id: userId } });
    if (!user) return;
    const today = todayKey();
    const spentToday = user.bonusDay === today ? user.bonusToday : 0;
    if (spentToday + amount > 200) return; // daily bonus cap reached
    await prisma.onlineUser.update({
      where: { id: userId },
      data: {
        coins: { increment: amount },
        bonusDay: today,
        bonusToday: user.bonusDay === today ? user.bonusToday + amount : amount,
      },
    });
    await emitMe(userId);
    socket.emit("coins:granted", { amount, reason: payload.reason === "achievement" ? "Achievement reward" : "Offline win bonus" });
  });
}

/* ---------------- ranked queue ---------------- */

async function handleQueue(socket: Socket, payload: { stake?: number }): Promise<void> {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const stake = Math.floor(payload.stake ?? 0);
  if (!ECONOMY.rankedStakes.includes(stake as (typeof ECONOMY.rankedStakes)[number])) return;
  if (queue.some((q) => q.userId === userId)) return;

  if (findRoomByUser(userId)) {
    socket.emit("room:error", { message: "Leave your room before playing ranked" });
    return;
  }

  const escrowed = await queueFor(userId, async () => {
    const user = await prisma.onlineUser.findUnique({ where: { id: userId } });
    if (!user) return false;
    if (user.coins < stake) {
      socket.emit("room:error", { message: "Not enough ular for that stake" });
      return false;
    }
    // escrow the stake
    const match = await prisma.matchLog.create({ data: { aId: userId, stake } });
    await prisma.onlineUser.update({ where: { id: userId }, data: { coins: { decrement: stake } } });
    await emitMe(userId);
    queue.push({ userId, stake, matchId: match.id });
    socket.emit("match:searching", { stake });
    return true;
  });
  if (escrowed) await tryPairQueue();
}

async function handleQueueCancel(socket: Socket): Promise<void> {
  const userId = socketUser.get(socket.id);
  if (!userId) return;
  const idx = queue.findIndex((q) => q.userId === userId);
  if (idx === -1) {
    socket.emit("match:cancelled", {});
    return;
  }
  const entry = queue[idx];
  queue.splice(idx, 1);
  await prisma.matchLog.update({ where: { id: entry.matchId }, data: { status: "refunded" } });
  await prisma.onlineUser.update({ where: { id: userId }, data: { coins: { increment: entry.stake } } });
  await emitMe(userId);
  socket.emit("match:cancelled", {});
}

/* ---------------- boot: recover orphaned escrow ---------------- */

async function recoverEscrow(): Promise<void> {
  const open = await prisma.matchLog.findMany({ where: { status: "open" } });
  for (const m of open) {
    const ids = m.bId ? [m.aId, m.bId] : [m.aId];
    for (const id of ids) {
      await prisma.onlineUser
        .update({ where: { id }, data: { coins: { increment: m.stake } } })
        .catch(() => undefined);
    }
    await prisma.matchLog
      .update({ where: { id: m.id }, data: { status: "refunded" } })
      .catch(() => undefined);
  }
  if (open.length > 0) console.log(`recovered ${open.length} orphaned escrows`);
}

/* ---------------- socket wiring ---------------- */

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path, Caddy uses it to forward requests
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", (socket) => {
  socket.on("auth:register", (p) => void handleRegister(socket, p));
  socket.on("auth:login", (p) => void handleLogin(socket, p));
  socket.on("auth:token", (p) => void handleTokenAuth(socket, p));
  socket.on("auth:logout", () => {
    const userId = socketUser.get(socket.id);
    if (!userId) return;
    void prisma.onlineUser.update({ where: { id: userId }, data: { token: randomBytes(24).toString("hex") } });
    socketUser.delete(socket.id);
    const set = userSockets.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) userSockets.delete(userId);
    }
  });

  socket.on("room:create", () => void createRoom(socket));
  socket.on("room:join", (p) => void joinRoom(socket, p));
  socket.on("room:leave", () => {
    const userId = socketUser.get(socket.id);
    if (!userId) return;
    const room = findRoomByUser(userId);
    if (!room) {
      socket.emit("room:state", { room: null });
      return;
    }
    void leaveRoomInternal(socket, userId, room, true).then(() => {
      if (room.phase === "lobby") {
        // full leave: tell this client the room is gone for them
        socket.emit("room:state", { room: null });
      }
    });
  });
  socket.on("room:update", (p) => updateRoomSettings(socket, p));
  socket.on("room:start", () => startGame(socket));
  socket.on("room:kick", (p) => kickPlayer(socket, p));
  socket.on("room:again", () => {
    const userId = socketUser.get(socket.id);
    if (!userId) return;
    const room = findRoomByUser(userId);
    if (!room || room.ranked || room.hostId !== userId || room.phase !== "finished") return;
    room.phase = "lobby";
    room.game = null;
    clearAutoTimer(room);
    broadcastRoom(room);
  });

  socket.on("game:roll", () => handleRoll(socket));

  socket.on("match:queue", (p) => void handleQueue(socket, p));
  socket.on("match:cancel", () => void handleQueueCancel(socket));

  socket.on("shop:buy", (p) => void handleBuy(socket, p));
  socket.on("daily:claim", () => void handleDaily(socket));
  socket.on("leaderboard:fetch", () => void handleLeaderboard(socket));
  socket.on("coins:bonus", (p) => void handleBonus(socket, p));

  socket.on("chat:send", (p) => {
    const userId = socketUser.get(socket.id);
    if (!userId) return;
    const room = findRoomByUser(userId);
    if (!room) return;
    const member = room.players.find((pl) => pl.id === userId);
    if (!member) return;
    const text = sanitizeText(p?.text);
    if (!text) return;
    pushChat(room, member.name, text);
  });

  socket.on("disconnect", () => {
    const userId = socketUser.get(socket.id);
    socketUser.delete(socket.id);
    if (!userId) return;
    const set = userSockets.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size > 0) return; // another device still online
      userSockets.delete(userId);
    }
    // no sockets left: mark offline in any room
    const room = findRoomByUser(userId);
    if (!room) return;
    const member = room.players.find((p) => p.id === userId);
    if (!member || !member.connected) return;
    if (room.phase === "lobby") {
      member.connected = false;
      broadcastRoom(room);
      return;
    }
    member.connected = false;
    if (room.game) {
      const gp = room.game.players.find((p) => p.id === userId);
      if (gp) gp.connected = false;
    }
    if (room.ranked) {
      void forfeitRanked(room, userId);
    } else {
      pushChat(room, "Server", `${member.name} lost connection`);
      broadcastRoom(room);
      maybeScheduleAutoRoll(room);
    }
  });

  socket.on("error", (err) => console.error(`socket error ${socket.id}:`, err));
});

recoverEscrow()
  .catch((err) => console.error("escrow recovery failed:", err))
  .finally(() => {
    httpServer.listen(PORT, () => {
      console.log(`online service listening on port ${PORT}`);
    });
  });

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
