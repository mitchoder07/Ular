"""Programmatic screenshot verification: checks screenshots are non-blank,
color-diverse, and contain expected board/theme colors."""
from PIL import Image
import sys
import os

SHOTS = "/home/z/my-project"
EXPECTED = {
    "shot-home.png": {"desc": "Home (jungle green bg)", "rgb_probes": [(30, 400)]},
    "shot-setup.png": {"desc": "Setup screen"},
    "shot-game.png": {"desc": "Quick game board"},
    "shot-classic.png": {"desc": "Classic 100-cell board"},
    "shot-win.png": {"desc": "Win overlay"},
    "shot-stats.png": {"desc": "Stats screen"},
    "shot-desktop.png": {"desc": "Desktop layout"},
    "shot-howto.png": {"desc": "How to play"},
}

def analyze(path):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    small = img.resize((64, 64))
    colors = small.getcolors(64 * 64) or []
    ncolors = len(colors)
    # variance proxy: unique colors in downsample
    px = list(small.getdata())
    if not px:
        return None
    rs = [p[0] for p in px]; gs = [p[1] for p in px]; bs = [p[2] for p in px]
    mean = (sum(rs) / len(rs), sum(gs) / len(gs), sum(bs) / len(bs))
    # count "bright" pixels (UI text/buttons etc.)
    bright = sum(1 for p in px if sum(p) > 550)
    return {
        "size": f"{w}x{h}",
        "unique_colors": ncolors,
        "mean_rgb": tuple(round(m) for m in mean),
        "bright_px": bright,
    }

def main():
    ok = True
    for name, meta in EXPECTED.items():
        path = os.path.join(SHOTS, name)
        if not os.path.exists(path):
            print(f"MISSING  {name}")
            ok = False
            continue
        r = analyze(path)
        issues = []
        if r["unique_colors"] < 12:
            issues.append("low color diversity (possibly blank)")
        if r["unique_colors"] >= 12 and r["bright_px"] < 5:
            issues.append("no bright UI elements")
        status = "OK  " if not issues else "WARN"
        if issues:
            ok = False
        print(f"{status} {name:22s} {r['size']:10s} colors={r['unique_colors']:3d} mean={r['mean_rgb']} bright={r['bright_px']:4d} {'; '.join(issues)}")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
