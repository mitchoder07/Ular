"use client";

import type { SVGProps } from "react";
import {
  ArrowLeft,
  ArrowUpFromLine,
  Award,
  BarChart3,
  Bird,
  Bot,
  Bug,
  Cat,
  Check,
  ChevronsUp,
  CircleCheck,
  Compass,
  Copy,
  Crown,
  Dices,
  Dog,
  Flag,
  Flame,
  Fish,
  Flower,
  Gauge,
  Gem,
  Ghost,
  Gift,
  Globe,
  Heart,
  HelpCircle,
  History,
  Home,
  Info,
  Landmark,
  Lightbulb,
  Lock,
  LogIn,
  LogOut,
  Map,
  Medal,
  MessageCircle,
  Minus,
  Mountain,
  Mouse,
  Music,
  PartyPopper,
  Pause,
  Play,
  Plus,
  Rabbit,
  Rat,
  RefreshCw,
  RotateCcw,
  Rocket,
  Send,
  Settings,
  Shield,
  Shuffle,
  Snail,
  Snowflake,
  Sparkles,
  Squirrel,
  Star,
  Swords,
  Tag,
  Target,
  Terminal,
  Timer,
  TreePine,
  Trophy,
  Turtle,
  Palmtree,
  Users,
  Vibrate,
  Volume2,
  VolumeX,
  Waves,
  Wifi,
  WifiOff,
  X,
  Zap,
  Candy,
  Worm,
} from "lucide-react";

/* ============================================================
   Custom brand icons drawn in Lucide's visual language
   (24×24 viewBox, 2px round stroke, currentColor)
   ============================================================ */

export function SnakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {/* coiled body */}
      <path d="M4.5 5.5c4.5 0 4.5 4 0 4s-4.5 4.5 0 4.5 6 .5 8 .5c2.5 0 3.5 1 3.5 2.5" />
      {/* head */}
      <circle cx="19.5" cy="18.5" r="2.2" />
      {/* eye */}
      <circle cx="19.5" cy="18" r="0.35" fill="currentColor" stroke="none" />
      {/* forked tongue */}
      <path d="M21.7 18.5h.8m0 0-.4-.7m.4.7-.4.7" strokeWidth={1.4} />
    </svg>
  );
}

export function LadderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M8 2.5v19M16 2.5v19" />
      <path d="M8 6.5h8M8 11h8M8 15.5h8M8 20h8" />
    </svg>
  );
}

/** A die mid-tumble (for dice-related flair) */
export function DiceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** The ular coin: a round chip with a little snake curled inside */
export function CoinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="6.4" strokeWidth={1.4} opacity={0.55} />
      <path d="M14.8 9.2c0-1.5-1.2-2.4-2.8-2.4-1.7 0-2.9.9-2.9 2.2 0 1.4 1.2 2 3 2.2 1.9.2 3.1.8 3.1 2.3 0 1.4-1.3 2.3-3 2.3-1.6 0-2.9-.8-3-2.2" strokeWidth={1.7} />
    </svg>
  );
}

/* ============================================================
   Icon registry: string ids resolve to components.
   Used by data.ts (pure data keeps string ids) and rendered
   through <GameIcon/>. Unknown ids fall back to a paw print.
   ============================================================ */

export type GameIconComponent = React.ComponentType<SVGProps<SVGSVGElement>>;

export const ICONS: Record<string, GameIconComponent> = {
  /* avatars & characters */
  cat: Cat,
  dog: Dog,
  rabbit: Rabbit,
  bird: Bird,
  fish: Fish,
  turtle: Turtle,
  bug: Bug,
  snail: Snail,
  squirrel: Squirrel,
  mouse: Mouse,
  rat: Rat,
  ghost: Ghost,
  bot: Bot,
  flame: Flame,
  star: Star,
  heart: Heart,
  worm: Worm,

  /* game events */
  snake: SnakeIcon,
  ladder: LadderIcon,
  dice: DiceIcon,
  diceAlt: Dices,
  trophy: Trophy,
  crown: Crown,
  medal: Medal,
  award: Award,
  target: Target,
  shield: Shield,
  rocket: Rocket,
  shuffle: Shuffle,
  sparkles: Sparkles,
  flag: Flag,
  timer: Timer,
  zap: Zap,
  party: PartyPopper,
  lock: Lock,
  swords: Swords,
  mountain: Mountain,
  gem: Gem,
  flower: Flower,
  coin: CoinIcon,

  /* themes */
  tree: TreePine,
  palm: Palmtree,
  waves: Waves,
  candy: Candy,
  compass: Compass,
  landmark: Landmark,
  terminal: Terminal,
  snowflake: Snowflake,

  /* UI */
  play: Play,
  pause: Pause,
  settings: Settings,
  volume: Volume2,
  volumeOff: VolumeX,
  music: Music,
  vibrate: Vibrate,
  tag: Tag,
  gauge: Gauge,
  users: Users,
  map: Map,
  lightbulb: Lightbulb,
  info: Info,
  home: Home,
  rotate: RotateCcw,
  history: History,
  chart: BarChart3,
  help: HelpCircle,
  check: Check,
  checked: CircleCheck,
  chevronsUp: ChevronsUp,
  arrowUp: ArrowUpFromLine,
  arrowLeft: ArrowLeft,
  globe: Globe,
  gift: Gift,
  copy: Copy,
  logout: LogOut,
  login: LogIn,
  message: MessageCircle,
  send: Send,
  plus: Plus,
  minus: Minus,
  x: X,
  refresh: RefreshCw,
  wifi: Wifi,
  wifiOff: WifiOff,
};

interface GameIconProps extends SVGProps<SVGSVGElement> {
  id: string;
  size?: number | string;
}

/**
 * Render a registered icon by id.
 * Accepts x/y/width/height so it can be nested directly inside
 * other SVGs (e.g. the game board), or sized via `size` in HTML.
 */
export function GameIcon({ id, size, ...rest }: GameIconProps) {
  const Cmp = ICONS[id] ?? Cat;
  const props: SVGProps<SVGSVGElement> = { ...rest };
  if (size !== undefined && props.width === undefined && props.height === undefined) {
    props.width = size;
    props.height = size;
  }
  return <Cmp {...props} />;
}
