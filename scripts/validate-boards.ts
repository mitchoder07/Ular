/* Board layout validator: every board must be a clean 100-cell layout.
   Run: bun scripts/validate-boards.ts */

import { BOARDS, MAP_PRODUCTS } from "../src/lib/game/data";

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error("FAIL " + msg);
};

for (const b of BOARDS) {
  if (b.size !== 10 || b.totalCells !== 100) fail(`${b.id}: not a 10x10 board`);

  const endpoints = new Map<number, string>();
  const claim = (cell: number, what: string) => {
    if (cell < 1 || cell > 100) fail(`${b.id}: ${what} endpoint ${cell} out of range`);
    if (endpoints.has(cell)) fail(`${b.id}: cell ${cell} used by both ${endpoints.get(cell)} and ${what}`);
    endpoints.set(cell, what);
  };

  for (const [head, tail] of Object.entries(b.snakes)) {
    const h = Number(head);
    if (h <= tail) fail(`${b.id}: snake head ${h} must be above tail ${tail}`);
    if (h === 100) fail(`${b.id}: snake head on finish cell 100`);
    claim(h, `snake head (from ${h} to ${tail})`);
    claim(tail, `snake tail (from ${h} to ${tail})`);
  }
  for (const [bottom, top] of Object.entries(b.ladders)) {
    const bt = Number(bottom);
    if (top <= bt) fail(`${b.id}: ladder top ${top} must be above bottom ${bt}`);
    if (bt < 1) fail(`${b.id}: ladder bottom below cell 1`);
    // ladder top on 100 is the classic winning climb (80 to 100): allowed
    claim(bt, `ladder bottom (from ${bt} to ${top})`);
    claim(top, `ladder top (from ${bt} to ${top})`);
  }

  const snakeBites = Object.values(b.snakes).reduce((acc, t) => acc + t, 0);
  const ladderTops = Object.values(b.ladders).reduce((acc, t) => acc + t, 0);
  console.log(
    `${failures === 0 ? "ok" : "?? "} ${b.id}: ${Object.keys(b.snakes).length} snakes, ${Object.keys(b.ladders).length} ladders, endpoints unique, balance delta ${ladderTops - snakeBites}`
  );
}

for (const m of MAP_PRODUCTS) {
  if (!BOARDS.some((b) => b.id === m.boardId)) fail(`map product ${m.id}: unknown board ${m.boardId}`);
}

if (failures > 0) {
  console.error(`\n${failures} failures`);
  process.exit(1);
}
console.log("\nAll boards valid");
