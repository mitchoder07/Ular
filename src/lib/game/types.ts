/* ============================================================
   Snakes & Ladders Deluxe: Core Types
   ============================================================ */

export type Screen =
  | "home"
  | "setup"
  | "game"
  | "stats"
  | "howto"
  | "online"
  | "room"
  | "shop";

/** Board layout: every layout is a full 100-cell 10×10 board. */
export type GameMode =
  | "classic"
  | "adventure"
  | "highstakes"
  | "hacker"
  | "volcano"
  | "glacier";

export type ThemeId =
  | "wood"
  | "jungle"
  | "space"
  | "ocean"
  | "candy"
  | "hacker"
  | "magma"
  | "frost";

export type PowerType = "star" | "shield" | "rocket" | "swap";

export type Difficulty = "easy" | "medium" | "hard";

export type Phase =
  | "awaitRoll" // waiting for current player to roll
  | "rolling" // dice animating
  | "moving" // token stepping / sliding
  | "gameover"; // someone won

export interface GameRules {
  /** Bounce back at finish when overshooting (else: any roll past finish wins) */
  bounceBack: boolean;
  /** Classic rule: must roll a 6 before entering the board */
  rollSixToStart: boolean;
  /** Rolling a 6 grants another turn */
  extraTurnOnSix: boolean;
  /** Three 6s in a row forfeits the turn */
  threeSixesForfeit: boolean;
  /** Arcade mode: power tiles on the board */
  arcadePowerTiles: boolean;
}

export interface GameConfig {
  mode: GameMode;
  theme: ThemeId;
  rules: GameRules;
}

export interface BoardDef {
  id: string;
  name: string;
  /** short tagline shown in setup */
  tagline: string;
  size: number; // grid dimension (always 10)
  totalCells: number; // size * size (always 100)
  /** snake head cell -> tail cell (head > tail) */
  snakes: Record<number, number>;
  /** ladder bottom cell -> top cell (top > bottom) */
  ladders: Record<number, number>;
}

/** A purchasable map: board layout + bundled theme + ular price. */
export interface MapProduct {
  id: string; // same as boardId
  boardId: string;
  themeId: ThemeId;
  name: string;
  /** icon id (GameIcon registry) */
  icon: string;
  tagline: string;
  /** ular price, 0 = free */
  price: number;
}

export interface PlayerState {
  id: string;
  name: string;
  /** icon id resolved through GameIcon registry */
  avatar: string;
  colorId: number; // index into PLAYER_COLORS
  isAI: boolean;
  difficulty: Difficulty;
  /** 0 = off board (start), 1..totalCells */
  pos: number;
  /** arcade shield active */
  shield: boolean;
  /** arcade rocket boost pending for next roll */
  boost: number;
  /** consecutive sixes rolled this turn chain */
  sixStreak: number;
  /** per-game stats */
  snakesHit: number;
  laddersClimbed: number;
  sixesRolled: number;
  rolls: number;
  rank?: number;
  finishedAt?: number;
}

export interface LogEntry {
  id: number;
  text: string;
  /** icon id (GameIcon registry) */
  icon: string;
  kind: "info" | "snake" | "ladder" | "power" | "six" | "win" | "ai" | "start";
}

export interface GameEventToast {
  id: number;
  /** icon id (GameIcon registry) */
  icon: string;
  title: string;
  subtitle?: string;
  tone: "snake" | "ladder" | "power" | "six" | "win" | "info";
}

export interface PlayerStatsRecord {
  games: number;
  wins: number;
  snakes: number;
  ladders: number;
  sixes: number;
  bestTimeMs?: number;
}

export interface AchievementDef {
  id: string;
  /** icon id (GameIcon registry) */
  icon: string;
  title: string;
  description: string;
  /** hint shown when locked */
  secret?: string;
}

export interface ThemeDef {
  id: ThemeId;
  name: string;
  /** icon id (GameIcon registry) */
  icon: string;
  /** flat page background color (no gradients) */
  pageBg: string;
  /** decorative floating particles colors */
  particles: string[];
  particleShape: "circle" | "star" | "leaf" | "bubble";
  /** board frame color */
  frame: string;
  frameInner: string;
  /** board surface color */
  boardBg: string;
  /** alternating cell colors */
  cellA: string;
  cellB: string;
  cellStroke: string;
  /** cell number color */
  numberColor: string;
  /** 3 snake color palettes [body, belly, outline] cycled by index */
  snakes: Array<{ body: string; belly: string; outline: string }>;
  /** ladder [rail, rung] */
  ladder: { rail: string; rung: string; outline: string };
  /** HUD accent (hex) */
  accent: string;
  accentSoft: string;
  /** true if theme background is light (affects HUD text) */
  light: boolean;
}

/* ============================================================
   ONLINE PLAY: shared protocol types (client + server)
   ============================================================ */

export interface OnlineUserPublic {
  id: string;
  name: string;
  avatar: string;
  coins: number;
  unlockedMaps: string[];
  wins: number;
  losses: number;
  rankWins: number;
  /** true when today's gift has not been claimed yet */
  dailyAvailable: boolean;
}

export interface RoomPlayer {
  id: string; // user id
  name: string;
  avatar: string;
  colorId: number;
  connected: boolean;
  isHost: boolean;
}

export interface RoomSettings {
  boardId: string;
  themeId: ThemeId;
}

export interface OnlinePlayerState {
  id: string;
  name: string;
  avatar: string;
  colorId: number;
  pos: number;
  connected: boolean;
  finishedAt?: number;
}

export interface OnlineGameState {
  players: OnlinePlayerState[];
  turn: number; // index into players
  winnerId: string | null;
  startedAt: number;
}

export interface RoomView {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  phase: "lobby" | "playing" | "finished";
  game: OnlineGameState | null;
  ranked: boolean;
  stake: number;
}

/** One full turn, precomputed by the server for animation on every client. */
export interface TurnResult {
  playerId: string;
  dice: number;
  /** cells stepped through in order (bounce included) */
  path: number[];
  bounce: boolean;
  snake: { from: number; to: number } | null;
  ladder: { from: number; to: number } | null;
  extra: boolean; // extra turn granted (rolled a 6)
  forfeit: boolean; // three sixes in a row
  win: boolean;
  nextTurn: number;
  /** player snapshot AFTER the turn resolves */
  players: OnlinePlayerState[];
  winnerId: string | null;
}

export interface ChatMessage {
  id: number;
  name: string;
  text: string;
  at: number;
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  avatar: string;
  coins: number;
  rankWins: number;
}
