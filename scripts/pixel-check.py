#!/usr/bin/env python3
"""Pixel-level gradient check: sample colors along vertical/horizontal lines."""
from PIL import Image
import sys

def analyze(path, points, label):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    print(f"\n=== {label} ({path}) {w}x{h} ===")
    for (name, x1, y1, x2, y2, samples) in points:
        print(f"\n{name}: from ({x1},{y1}) to ({x2},{y2}), {samples} samples")
        for i in range(samples):
            t = i / (samples - 1) if samples > 1 else 0
            x = int(x1 + (x2 - x1) * t)
            y = int(y1 + (y2 - y1) * t)
            x = min(max(x, 0), w - 1)
            y = min(max(y, 0), h - 1)
            r, g, b = img.getpixel((x, y))
            print(f"  ({x:4d},{y:4d})  #{r:02x}{g:02x}{b:02x}")

# Home screen 390x844: play button is amber, roughly y 570-640, x 48-342
analyze("qa/after-home.png", [
    ("Play button vertical scan (center x=195)", 195, 575, 195, 635, 7),
    ("Background top-to-center (x=30)", 30, 60, 30, 400, 5),
    ("Background left-to-right (y=420)", 10, 420, 380, 420, 6),
], "HOME")
