/* Smoke test for the online service: register, create room, roll.
   Run: bun scripts/online-smoke.ts */

import { io } from "socket.io-client";

const sock = io("ws://localhost:3005", { transports: ["websocket"] });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let userId = "";

function reply<T>(onEvent: string, emitEvent: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting ${onEvent}`)), 6000);
    sock.once(onEvent, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
    sock.emit(emitEvent, payload);
  });
}

async function main() {
  await new Promise<void>((r) => sock.once("connect", r));
  console.log("connected");

  const name = "Smoke" + Math.floor(Math.random() * 10000);
  const reg = await reply<{ user: { id: string; coins: number }; token: string }>("auth:ok", "auth:register", {
    name,
    pin: "1234",
    avatar: "dog",
  });
  userId = reg.user.id;
  console.log("registered:", name, "coins:", reg.user.coins);

  const room = await reply<{ room: { code: string; phase: string } }>("room:state", "room:create", {});
  console.log("room created:", room.room.code, room.room.phase);

  const daily = await new Promise<void>((resolve) => {
    sock.once("coins:granted", (d: { amount: number }) => {
      console.log("daily granted:", d.amount);
      resolve();
    });
    sock.emit("daily:claim");
  });
  await daily;

  const lb = await reply<{ rows: Array<{ rank: number; name: string }> }>("leaderboard", "leaderboard:fetch", {});
  console.log("leaderboard top:", lb.rows.slice(0, 3).map((r) => `${r.rank}. ${r.name}`).join(", "));

  console.log("SMOKE OK");
  sock.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("SMOKE FAILED:", err.message);
  process.exit(1);
});
