import type {
  AchievementDef,
  BoardDef,
  Difficulty,
  MapProduct,
  ThemeDef,
  ThemeId,
} from "./types";

/* ============================================================
   PLAYER COLORS (token colors, vibrant and distinguishable)
   ============================================================ */

export const PLAYER_COLORS = [
  { name: "Coral", main: "#f43f5e", light: "#fda4af", dark: "#9f1239" },
  { name: "Teal", main: "#14b8a6", light: "#5eead4", dark: "#115e59" },
  { name: "Violet", main: "#a855f7", light: "#d8b4fe", dark: "#6b21a8" },
  { name: "Amber", main: "#f59e0b", light: "#fcd34d", dark: "#b45309" },
  { name: "Emerald", main: "#22c55e", light: "#86efac", dark: "#15803d" },
  { name: "Sky", main: "#0ea5e9", light: "#7dd3fc", dark: "#075985" },
] as const;

export const MAX_PLAYERS = 6;

/* ============================================================
   AVATARS: icon ids rendered through the GameIcon registry
   ============================================================ */

export const AVATARS = [
  "cat", "dog", "rabbit", "bird",
  "fish", "turtle", "bug", "snail",
  "squirrel", "mouse", "rat", "worm",
  "ghost", "bot", "flame", "star",
] as const;

/* ============================================================
   ULAR ECONOMY
   Ular is the game coin (it means snake). Earned through daily
   gifts, achievements, friendly wins and ranked matches, spent
   on unlocking extra maps.
   ============================================================ */

export const ECONOMY = {
  startingCoins: 300,
  dailyBonus: 75,
  achievementReward: 25,
  offlineWinBonus: 10,
  friendlyWinBonus: 15,
  rankedStakes: [25, 100, 250] as const,
} as const;

/* ============================================================
   BOARDS: every board is a full 10×10 = 100-cell board.
   Layouts are hand-balanced: endpoints never collide, ascent
   roughly balances descent, and snakes bite hardest near the
   finish, exactly like the timeless classic boards.

   "classic" follows the famously playtested Milton Bradley
   1952 layout (chutes rendered as snakes), the most beloved
   100-cell arrangement ever printed.
   ============================================================ */

export const BOARDS: BoardDef[] = [
  {
    id: "classic",
    name: "Classic",
    tagline: "The timeless 1950s layout",
    size: 10,
    totalCells: 100,
    ladders: { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 },
    snakes: { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 },
  },
  {
    id: "adventure",
    name: "Adventure",
    tagline: "Balanced climbs, fair bites",
    size: 10,
    totalCells: 100,
    ladders: { 5: 27, 12: 35, 25: 57, 33: 49, 45: 68, 58: 78, 70: 88, 74: 94 },
    snakes: { 18: 7, 29: 9, 41: 20, 55: 31, 63: 42, 77: 54, 89: 61, 96: 65 },
  },
  {
    id: "highstakes",
    name: "High Stakes",
    tagline: "Snake-heavy, dramatic finishes",
    size: 10,
    totalCells: 100,
    ladders: { 2: 23, 8: 34, 15: 37, 22: 61, 41: 67, 57: 76, 73: 95 },
    snakes: { 26: 5, 39: 14, 51: 19, 65: 38, 71: 30, 88: 49, 94: 60, 99: 55 },
  },
  {
    id: "hacker",
    name: "Hacker Grid",
    tagline: "Neon wormholes, code the ascent",
    size: 10,
    totalCells: 100,
    ladders: { 3: 17, 12: 29, 25: 44, 38: 55, 53: 72, 66: 87, 79: 96 },
    snakes: { 21: 4, 34: 13, 47: 26, 59: 37, 68: 50, 82: 58, 91: 65, 97: 75 },
  },
  {
    id: "volcano",
    name: "Magma Rush",
    tagline: "Climb the vents, dodge the lava",
    size: 10,
    totalCells: 100,
    ladders: { 6: 22, 17: 35, 30: 48, 44: 63, 58: 77, 72: 90 },
    snakes: { 24: 8, 39: 15, 52: 31, 64: 42, 76: 53, 88: 61, 95: 69, 99: 81 },
  },
  {
    id: "glacier",
    name: "Frostbite",
    tagline: "Slippery slopes, icy drops",
    size: 10,
    totalCells: 100,
    ladders: { 4: 19, 13: 33, 27: 46, 41: 60, 55: 74, 69: 88, 84: 97 },
    snakes: { 23: 5, 36: 11, 49: 28, 62: 40, 75: 51, 87: 64, 94: 71 },
  },
];

export function getBoard(mode: string): BoardDef {
  return BOARDS.find((b) => b.id === mode) ?? BOARDS[0];
}

/* ============================================================
   MAP PRODUCTS: what the shop sells. The three premium maps
   each bundle a matching theme so they feel like whole new
   worlds, not just reshuffled snakes.
   ============================================================ */

export const MAP_PRODUCTS: MapProduct[] = [
  { id: "classic", boardId: "classic", themeId: "wood", name: "Classic", icon: "trophy", tagline: "The timeless 1950s layout", price: 0 },
  { id: "adventure", boardId: "adventure", themeId: "jungle", name: "Adventure", icon: "compass", tagline: "Balanced climbs, fair bites", price: 0 },
  { id: "highstakes", boardId: "highstakes", themeId: "space", name: "High Stakes", icon: "swords", tagline: "Snake-heavy, dramatic finishes", price: 0 },
  { id: "hacker", boardId: "hacker", themeId: "hacker", name: "Hacker Grid", icon: "terminal", tagline: "Neon wormholes on a terminal board", price: 900 },
  { id: "volcano", boardId: "volcano", themeId: "magma", name: "Magma Rush", icon: "flame", tagline: "Ember cells and lava snakes", price: 600 },
  { id: "glacier", boardId: "glacier", themeId: "frost", name: "Frostbite", icon: "snowflake", tagline: "An icy board with steel ladders", price: 1200 },
];

export function getMapProduct(id: string): MapProduct | undefined {
  return MAP_PRODUCTS.find((m) => m.id === id);
}

/** themes bundled with a purchasable map (unlocked together) */
export const PREMIUM_THEMES: ThemeId[] = ["hacker", "magma", "frost"];

export function themeIsLocked(themeId: ThemeId, unlockedMaps: string[]): boolean {
  if (!PREMIUM_THEMES.includes(themeId)) return false;
  const product = MAP_PRODUCTS.find((m) => m.themeId === themeId);
  return !!product && !unlockedMaps.includes(product.id);
}

/* ============================================================
   THEMES: flat, normal colors only (no gradients anywhere)
   ============================================================ */

export const THEMES: Record<ThemeId, ThemeDef> = {
  wood: {
    id: "wood",
    name: "Classic Wood",
    icon: "tree",
    pageBg: "#46291a",
    particles: ["#d9a05b", "#b98046", "#e8c89a"],
    particleShape: "circle",
    frame: "#5b3417",
    frameInner: "#8a5a2e",
    boardBg: "#f9efdc",
    cellA: "#fbf4e3",
    cellB: "#f0e0bd",
    cellStroke: "rgba(91,52,23,0.10)",
    numberColor: "#8a6238",
    snakes: [
      { body: "#6b8e23", belly: "#a9c46c", outline: "#3e5c10" },
      { body: "#a0522d", belly: "#d29a6b", outline: "#5e2c14" },
      { body: "#556b2f", belly: "#9db87a", outline: "#2f3d17" },
    ],
    ladder: { rail: "#8a5a2e", rung: "#a0693a", outline: "#4a2c11" },
    accent: "#d97706",
    accentSoft: "rgba(217,119,6,0.16)",
    light: false,
  },
  jungle: {
    id: "jungle",
    name: "Jungle",
    icon: "palm",
    pageBg: "#0b3b2c",
    particles: ["#34d399", "#a3e635", "#166534"],
    particleShape: "leaf",
    frame: "#0b4d34",
    frameInner: "#157347",
    boardBg: "#edf8e6",
    cellA: "#f3faee",
    cellB: "#dcf0ca",
    cellStroke: "rgba(20,83,45,0.10)",
    numberColor: "#2e7a52",
    snakes: [
      { body: "#10b981", belly: "#6ee7b7", outline: "#065f46" },
      { body: "#84cc16", belly: "#d9f99d", outline: "#3f6212" },
      { body: "#0d9488", belly: "#99f6e4", outline: "#134e4a" },
    ],
    ladder: { rail: "#b98a4a", rung: "#d1a566", outline: "#6b4a1f" },
    accent: "#10b981",
    accentSoft: "rgba(16,185,129,0.16)",
    light: false,
  },
  space: {
    id: "space",
    name: "Space Odyssey",
    icon: "rocket",
    pageBg: "#171132",
    particles: ["#a78bfa", "#67e8f9", "#f0abfc", "#fde68a"],
    particleShape: "star",
    frame: "#1b1442",
    frameInner: "#3b2a7a",
    boardBg: "#181338",
    cellA: "#1f194b",
    cellB: "#272057",
    cellStroke: "rgba(167,139,250,0.13)",
    numberColor: "#cdc2fe",
    snakes: [
      { body: "#e91e8c", belly: "#f9a8d4", outline: "#8b0f57" },
      { body: "#22d3ee", belly: "#a5f3fc", outline: "#0e7490" },
      { body: "#a3e635", belly: "#ecfccb", outline: "#4d7c0f" },
    ],
    ladder: { rail: "#cbd5f5", rung: "#94a3d8", outline: "#4c1d95" },
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.16)",
    light: false,
  },
  ocean: {
    id: "ocean",
    name: "Ocean Deep",
    icon: "waves",
    pageBg: "#0a3a4e",
    particles: ["#38bdf8", "#7dd3fc", "#2dd4bf"],
    particleShape: "bubble",
    frame: "#053b53",
    frameInner: "#0c607f",
    boardBg: "#e6f5fa",
    cellA: "#eff9fc",
    cellB: "#d3ecf6",
    cellStroke: "rgba(6,86,120,0.10)",
    numberColor: "#0d7391",
    snakes: [
      { body: "#f97316", belly: "#fdba74", outline: "#9a3412" },
      { body: "#e11d48", belly: "#fda4af", outline: "#881337" },
      { body: "#0d9488", belly: "#99f6e4", outline: "#115e59" },
    ],
    ladder: { rail: "#b98a4a", rung: "#d1a566", outline: "#6b4a1f" },
    accent: "#0ea5e9",
    accentSoft: "rgba(14,165,233,0.16)",
    light: false,
  },
  candy: {
    id: "candy",
    name: "Candy Land",
    icon: "candy",
    pageBg: "#c2417a",
    particles: ["#fff1f7", "#fde68a", "#fbcfe8", "#a7f3d0"],
    particleShape: "circle",
    frame: "#c2417a",
    frameInner: "#db709f",
    boardBg: "#fff6fa",
    cellA: "#fff2f8",
    cellB: "#ffdcea",
    cellStroke: "rgba(190,24,93,0.09)",
    numberColor: "#bb4a73",
    snakes: [
      { body: "#ec4899", belly: "#fbcfe8", outline: "#9d174d" },
      { body: "#8b5cf6", belly: "#ddd6fe", outline: "#5b21b6" },
      { body: "#f59e0b", belly: "#fde68a", outline: "#b45309" },
    ],
    ladder: { rail: "#f472b6", rung: "#fda4d0", outline: "#9d174d" },
    accent: "#ec4899",
    accentSoft: "rgba(236,72,153,0.15)",
    light: true,
  },
  hacker: {
    id: "hacker",
    name: "Hacker Grid",
    icon: "terminal",
    pageBg: "#071410",
    particles: ["#34d399", "#10b981", "#065f46"],
    particleShape: "circle",
    frame: "#0d2b1e",
    frameInner: "#1d5c40",
    boardBg: "#0a1f16",
    cellA: "#0d2519",
    cellB: "#123122",
    cellStroke: "rgba(52,211,153,0.15)",
    numberColor: "#5eead4",
    snakes: [
      { body: "#a3e635", belly: "#ecfccb", outline: "#3f6212" },
      { body: "#22d3ee", belly: "#a5f3fc", outline: "#155e75" },
      { body: "#f87171", belly: "#fecaca", outline: "#7f1d1d" },
    ],
    ladder: { rail: "#94a3b8", rung: "#cbd5e1", outline: "#475569" },
    accent: "#34d399",
    accentSoft: "rgba(52,211,153,0.16)",
    light: false,
  },
  magma: {
    id: "magma",
    name: "Magma Rush",
    icon: "flame",
    pageBg: "#20100a",
    particles: ["#f97316", "#fdba74", "#dc2626"],
    particleShape: "circle",
    frame: "#2e1209",
    frameInner: "#7c2d12",
    boardBg: "#261712",
    cellA: "#2c1a14",
    cellB: "#38211a",
    cellStroke: "rgba(251,146,60,0.14)",
    numberColor: "#fdba74",
    snakes: [
      { body: "#ef4444", belly: "#fca5a5", outline: "#7f1d1d" },
      { body: "#f97316", belly: "#fdba74", outline: "#9a3412" },
      { body: "#eab308", belly: "#fef08a", outline: "#854d0e" },
    ],
    ladder: { rail: "#9a3412", rung: "#c2410c", outline: "#431407" },
    accent: "#f97316",
    accentSoft: "rgba(249,115,22,0.16)",
    light: false,
  },
  frost: {
    id: "frost",
    name: "Frostbite",
    icon: "snowflake",
    pageBg: "#0e3944",
    particles: ["#a5f3fc", "#cffafe", "#67e8f9"],
    particleShape: "bubble",
    frame: "#0c4a56",
    frameInner: "#12707f",
    boardBg: "#ecf7fb",
    cellA: "#f2fafd",
    cellB: "#d8ecf4",
    cellStroke: "rgba(12,74,110,0.10)",
    numberColor: "#146e88",
    snakes: [
      { body: "#0891b2", belly: "#a5f3fc", outline: "#155e75" },
      { body: "#14b8a6", belly: "#99f6e4", outline: "#115e59" },
      { body: "#64748b", belly: "#e2e8f0", outline: "#334155" },
    ],
    ladder: { rail: "#64748b", rung: "#94a3b8", outline: "#1e293b" },
    accent: "#06b6d4",
    accentSoft: "rgba(6,182,212,0.16)",
    light: false,
  },
};

export const THEME_LIST = Object.values(THEMES);

/* ============================================================
   AI PERSONALITIES + TAUNTS (icon avatars, plain text lines)
   Six distinct bots so a full 6-player table never repeats.
   ============================================================ */

export interface AIPersona {
  id: Difficulty;
  name: string;
  /** icon id (GameIcon registry) */
  avatar: string;
  /** reaction delay before rolling (ms) */
  thinkMs: number;
  taunts: {
    rollSix: string[];
    ladder: string[];
    snake: string[];
    opponentSnake: string[];
    winning: string[];
    lose: string[];
  };
}

export const AI_PERSONAS: Record<Difficulty, AIPersona> = {
  easy: {
    id: "easy",
    name: "Bunny",
    avatar: "rabbit",
    thinkMs: 1400,
    taunts: {
      rollSix: ["Six! Hop hop!", "Yay, a six!"],
      ladder: ["Wheee, up I go!", "Ladder! So fun!"],
      snake: ["Oh no, snakey!", "Aww... bye bye."],
      opponentSnake: ["Ooh, that looked scary!", "Are you okay?"],
      winning: ["Am I winning? Hehe.", "This is so exciting!"],
      lose: ["Good game! You're amazing!", "Aww, but that was fun!"],
    },
  },
  medium: {
    id: "medium",
    name: "Whiskers",
    avatar: "cat",
    thinkMs: 950,
    taunts: {
      rollSix: ["A six! How cunning.", "Lucky paws!"],
      ladder: ["Climbing in style.", "Up and up I go!"],
      snake: ["Ssssneaky snake!", "I'll be back, snake."],
      opponentSnake: ["Ooh, down you go! Hehe.", "The snake likes you today."],
      winning: ["Sniffing victory!", "The trophy smells close."],
      lose: ["Well played, clever one!", "Next time, next time..."],
    },
  },
  hard: {
    id: "hard",
    name: "Phantom",
    avatar: "ghost",
    thinkMs: 600,
    taunts: {
      rollSix: ["Six! The dice fears me.", "Destiny rolls my way."],
      ladder: ["Straight to the top!", "Too easy."],
      snake: ["A mere scratch!", "I've fought worse beasts."],
      opponentSnake: ["Down you go!", "Enjoy the fall, mortal."],
      winning: ["I smell victory!", "Bow before the Phantom."],
      lose: ["Impossible... a worthy rival.", "You have earned my respect."],
    },
  },
};

/** extra bots so tables up to 6 players stay distinct */
export const EXTRA_AI_PERSONAS: Record<Difficulty, AIPersona[]> = {
  easy: [
    {
      id: "easy",
      name: "Ducky",
      avatar: "bird",
      thinkMs: 1500,
      taunts: {
        rollSix: ["Quack! A six!", "Lucky feathers!"],
        ladder: ["Flapping to the top!", "Quack quack, up we go!"],
        snake: ["That snake is rude!", "Puddle please, not a snake."],
        opponentSnake: ["Ooh, ouch!", "I felt that from here."],
        winning: ["Winning? Little old me?", "The pond is proud!"],
        lose: ["You swim better!", "Splendidly played!"],
      },
    },
  ],
  medium: [
    {
      id: "medium",
      name: "Olive",
      avatar: "turtle",
      thinkMs: 1050,
      taunts: {
        rollSix: ["A six, slowly savored.", "Steady shell, lucky roll."],
        ladder: ["One careful step at a time.", "The view improves."],
        snake: ["Well, that set me back.", "Patience, patience."],
        opponentSnake: ["The board giveth and taketh.", "Smooth roads to you... not."],
        winning: ["Slow and steady, remember?", "Almost within shell's reach."],
        lose: ["A lovely race.", "I'll treasure this rematch."],
      },
    },
  ],
  hard: [
    {
      id: "hard",
      name: "Rex",
      avatar: "rat",
      thinkMs: 620,
      taunts: {
        rollSix: ["Six! The grid hums for me.", "Raw power!"],
        ladder: ["Skyscraper speed!", "Rat race won."],
        snake: ["A minor detour.", "Small setback, big comeback."],
        opponentSnake: ["Enjoy the descent!", "Gravity says hello."],
        winning: ["The crown is warm already.", "Scurrying to victory."],
        lose: ["You rat-raced me good.", "Respect, tiny champion."],
      },
    },
  ],
};

/** All six personas in the order extra players are added */
export const ALL_AI_PERSONAS: AIPersona[] = [
  AI_PERSONAS.medium,
  AI_PERSONAS.hard,
  ...EXTRA_AI_PERSONAS.medium,
  ...EXTRA_AI_PERSONAS.easy,
  ...EXTRA_AI_PERSONAS.hard,
  AI_PERSONAS.easy,
];

/** Pick the first persona whose avatar is not already at the table */
export function nextFreePersona(usedAvatars: Set<string>): AIPersona {
  return ALL_AI_PERSONAS.find((p) => !usedAvatars.has(p.avatar)) ?? AI_PERSONAS.medium;
}

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ============================================================
   DEFAULT GAME RULES
   ============================================================ */

export const DEFAULT_RULES = {
  bounceBack: true,
  rollSixToStart: false,
  extraTurnOnSix: true,
  threeSixesForfeit: true,
  arcadePowerTiles: false,
};

/* ============================================================
   ACHIEVEMENTS: icon ids only, no emojis
   ============================================================ */

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-victory", icon: "crown", title: "First Victory", description: "Win your first game." },
  { id: "champion", icon: "trophy", title: "Champion", description: "Win 10 games." },
  { id: "legend", icon: "star", title: "Legend", description: "Win 25 games." },
  { id: "snake-charmer", icon: "snake", title: "Snake Charmer", description: "Win a game despite being bitten 3+ times." },
  { id: "ladder-master", icon: "ladder", title: "Ladder Master", description: "Climb 4+ ladders in a single game." },
  { id: "perfect-finish", icon: "target", title: "Perfect Finish", description: "Win with an exact roll." },
  { id: "lucky-streak", icon: "dice", title: "Lucky Streak", description: "Roll three 6s in a row." },
  { id: "needled-thread", icon: "shield", title: "Needle & Thread", description: "Land on a snake head but block it with a shield." },
  { id: "arcade-star", icon: "sparkles", title: "Arcade Star", description: "Win a game with arcade power tiles on." },
  { id: "rocket-rider", icon: "rocket", title: "Rocket Rider", description: "Collect and use a rocket boost." },
  { id: "swapper", icon: "shuffle", title: "Master of Fate", description: "Swap positions with an opponent." },
  { id: "speedrunner", icon: "timer", title: "Speedrunner", description: "Win a game in under 4 minutes." },
  { id: "grid-hacker", icon: "terminal", title: "Grid Hacker", description: "Win a game on the Hacker Grid board." },
  { id: "lava-tamer", icon: "flame", title: "Lava Tamer", description: "Win a game on Magma Rush." },
  { id: "ice-breaker", icon: "snowflake", title: "Ice Breaker", description: "Win a game on Frostbite." },
];

/* ============================================================
   POWER TILE META: icon ids only
   ============================================================ */

export const POWER_META = {
  star: { icon: "star", label: "Extra Roll", color: "#f59e0b", desc: "Roll again immediately" },
  shield: { icon: "shield", label: "Shield", color: "#0ea5e9", desc: "Blocks the next snake bite" },
  rocket: { icon: "rocket", label: "Rocket", color: "#ef4444", desc: "+3 boost on your next roll" },
  swap: { icon: "shuffle", label: "Swap", color: "#a855f7", desc: "Swap places with the leader" },
} as const;

/** Legacy emoji avatar -> icon id (persisted-state migration) */
export const EMOJI_TO_ICON: Record<string, string> = {
  "🦁": "cat", "🐼": "bug", "🦊": "cat", "🐸": "turtle", "🐵": "squirrel", "🐯": "flame",
  "🦉": "bird", "🐙": "bug", "🦄": "star", "🐨": "snail", "🐺": "dog", "🦖": "worm",
  "🐬": "fish", "🦋": "bug", "🐝": "bug", "🦜": "bird", "🐰": "rabbit", "🐲": "flame",
};
