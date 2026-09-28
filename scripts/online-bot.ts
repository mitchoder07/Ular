/* Online E2E bot: a second real player for testing rooms and ranked.
   Usage:
     bun scripts/online-bot.ts room <CODE>   // join a friendly room and auto-play
     bun scripts/online-bot.ts ranked <STAKE> // queue a ranked match and auto-play
   The bot registers its own account, auto-rolls on its turns, and logs
   key events so the terminal shows what the opponent experienced.
*/

import { io } from "socket.io-client";

const mode = process.argv[2] ?? "room";
const arg = process.argv[3] ?? "";

const sock = io("ws://localhost:3005", { transports: ["websocket"] });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const name = "Bot" + Math.floor(Math.random() * 10000);
let myId = "";
let inGame = false;
let rolling = false;

function log(...parts: unknown[]) {
  console.log(`[${name}]`, ...parts);
}

function maybeRoll(room: { phase: string; game: { turn: number; players: Array<{ id: string }>; winnerId: string | null } | null }) {
  if (!room || room.phase !== "playing" || !room.game || room.game.winnerId) return;
  const current = room.game.players[room.game.turn];
  if (!current || current.id !== myId) return;
  if (rolling) return;
  rolling = true;
  setTimeout(() => {
    rolling = false;
    if (inGame) {
      sock.emit("game:roll");
      log("rolled");
    }
  }, 500);
}

async function main() {
  await new Promise<void>((r) => sock.once("connect", r));
  log("connected");

  const authed = await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("auth timeout")), 5000);
    sock.once("auth:ok", (d: { user: { id: string; coins: number } }) => {
      clearTimeout(timer);
      myId = d.user.id;
      log("registered, coins:", d.user.coins);
      resolve();
    });
    sock.emit("auth:register", { name, pin: "4321", avatar: "bot" });
  });
  await authed;

  sock.on("room:state", ({ room }) => {
    if (!room) {
      log("room closed");
      inGame = false;
      return;
    }
    if (room.phase === "lobby") {
      log("lobby:", room.players.map((p: { name: string }) => p.name).join(", "));
    } else if (room.phase === "playing") {
      if (!inGame) {
        inGame = true;
        log("game started, players:", room.game?.players.map((p: { name: string; pos: number }) => `${p.name}@${p.pos}`).join(" "));
      }
      maybeRoll(room);
    } else if (room.phase === "finished") {
      const winner = room.game?.players.find((p: { id: string }) => p.id === room.game?.winnerId);
      log("game finished, winner:", winner?.name ?? "unknown");
    }
  });

  sock.on("ranked:result", (r: { youWon: boolean; delta: number; opponentName: string }) => {
    log("ranked result:", r.youWon ? "WON" : "LOST", r.delta, "vs", r.opponentName);
  });

  sock.on("chat:msg", ({ msg }: { msg: { name: string; text: string } }) => {
    log("chat:", msg.name, ">", msg.text);
  });

  sock.on("match:found", ({ room }) => {
    log("ranked match found vs", room.game?.players.find((p: { id: string }) => p.id !== myId)?.name);
    inGame = true;
    maybeRoll(room);
  });

  if (mode === "room") {
    const code = arg.toUpperCase();
    sock.emit("room:join", { code });
    log("joining room", code);
  } else if (mode === "ranked") {
    const stake = Number(arg) || 25;
    sock.emit("match:queue", { stake });
    log("queued ranked at", stake);
  }

  // keep the bot alive for 5 minutes max
  await wait(5 * 60 * 1000);
  log("done, exiting");
  sock.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(`[${name}] BOT FAILED:`, err.message);
  process.exit(1);
});
