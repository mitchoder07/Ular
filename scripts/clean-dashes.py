#!/usr/bin/env python3
"""Clean em/en dashes from code comments in the game source files."""
import io

FILES = [
    "/home/z/my-project/src/store/profile.ts",
    "/home/z/my-project/src/components/game/GameIcon.tsx",
    "/home/z/my-project/src/lib/game/types.ts",
    "/home/z/my-project/src/lib/game/data.ts",
    "/home/z/my-project/src/lib/game/engine.ts",
]

REPLACEMENTS = [
    ("store — settings", "store: settings"),
    ("registry — string ids resolve to components", "registry: string ids resolve to components"),
    ("Deluxe — Core Types", "Deluxe: Core Types"),
    ("/** Board layout — every layout", "/** Board layout: every layout"),
    ("(token colors — vibrant, distinguishable)", "(token colors, vibrant and distinguishable)"),
    ("AVATARS — icon ids", "AVATARS: icon ids"),
    ("BOARDS — every board", "BOARDS: every board"),
    ("finish — exactly like", "finish, exactly like"),
    ("(chutes rendered as snakes) — the most beloved", "(chutes rendered as snakes), the most beloved"),
    ("THEMES — flat, normal colors", "THEMES: flat, normal colors"),
    ("ACHIEVEMENTS — icon ids", "ACHIEVEMENTS: icon ids"),
    ("POWER TILE META — icon ids", "POWER TILE META: icon ids"),
    ("Deluxe — Board Geometry", "Deluxe: Board Geometry"),
    ("1.8–2.0 wave cycles", "1.8 to 2.0 wave cycles"),
    ("3×3 — ", "3x3: "),
    (" — ", ": "),
]

for path in FILES:
    with io.open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    if content != original:
        with io.open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"cleaned: {path}")
    else:
        print(f"no change: {path}")

print("done")
