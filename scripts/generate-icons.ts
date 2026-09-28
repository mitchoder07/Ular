// Generates the PWA icon set from a flat-color SVG game icon using sharp.
// Outputs: icon-512 / icon-192 (rounded, transparent corners),
// icon-maskable-512 (full-bleed background, art inside the maskable safe
// zone) and apple-touch-icon (full-bleed square, iOS rounds it itself).
import sharp from "sharp";
import path from "path";

// Flat solid colors only. Same identity as before, zero gradients.
const C = {
  bg: "#1b1340",
  bgDeep: "#140f26",
  border: "#6d5bd0",
  snakeDark: "#065f46",
  snake: "#10b981",
  ladder: "#f59e0b",
  rung: "#fbbf24",
  pip: "#1e293b",
  tongue: "#f43f5e",
};

// The game art, drawn inside a 0..512 box, centered on the canvas.
function art(): string {
  return `
  <g opacity="0.12">
    ${Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (_, j) =>
        `<rect x="${76 + j * 92}" y="${76 + i * 92}" width="82" height="82" rx="14" fill="#ffffff"/>`
      ).join("")
    ).join("")}
  </g>
  <g stroke="${C.ladder}" stroke-width="16" stroke-linecap="round">
    <line x1="150" y1="400" x2="128" y2="130"/>
    <line x1="212" y1="400" x2="190" y2="130"/>
  </g>
  <g stroke="${C.rung}" stroke-width="12" stroke-linecap="round">
    <line x1="152" y1="362" x2="211" y2="368"/>
    <line x1="148" y1="310" x2="207" y2="316"/>
    <line x1="143" y1="258" x2="202" y2="264"/>
    <line x1="139" y1="206" x2="198" y2="212"/>
    <line x1="134" y1="154" x2="193" y2="160"/>
  </g>
  <path d="M 400 350 C 320 420 260 330 300 270 C 340 210 300 150 220 150 C 165 150 150 105 190 85"
        fill="none" stroke="${C.snakeDark}" stroke-width="46" stroke-linecap="round"/>
  <path d="M 400 350 C 320 420 260 330 300 270 C 340 210 300 150 220 150 C 165 150 150 105 190 85"
        fill="none" stroke="${C.snake}" stroke-width="34" stroke-linecap="round"/>
  <circle cx="398" cy="352" r="30" fill="${C.snake}"/>
  <circle cx="388" cy="342" r="8" fill="#fff"/>
  <circle cx="388" cy="342" r="4" fill="#0f172a"/>
  <circle cx="410" cy="344" r="8" fill="#fff"/>
  <circle cx="410" cy="344" r="4" fill="#0f172a"/>
  <path d="M 418 362 q 22 4 26 -16" stroke="${C.tongue}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <g transform="translate(330 60) rotate(12)">
    <rect x="0" y="0" width="88" height="88" rx="20" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
    <circle cx="26" cy="26" r="10" fill="${C.pip}"/>
    <circle cx="62" cy="62" r="10" fill="${C.pip}"/>
    <circle cx="44" cy="44" r="10" fill="${C.pip}"/>
  </g>`;
}

// Rounded app icon with transparent corners (launcher / manifest "any").
function roundedIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="16" y="16" width="480" height="480" rx="110" fill="${C.bg}"/>
  <rect x="16" y="16" width="480" height="480" rx="110" fill="none" stroke="${C.border}" stroke-width="10" opacity="0.55"/>
  ${art()}
</svg>`;
}

// Maskable icon: solid full-bleed background, art scaled into the safe zone
// (content stays inside the center 80% so any launcher mask keeps it whole).
function maskableIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="0" y="0" width="512" height="512" fill="${C.bg}"/>
  <rect x="0" y="0" width="512" height="512" fill="none" stroke="${C.border}" stroke-width="12" opacity="0.4"/>
  <g transform="translate(256 256) scale(0.76) translate(-256 -256)">
    ${art()}
  </g>
</svg>`;
}

// Apple touch icon: full-bleed square, iOS applies its own corner mask.
function appleIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="0" y="0" width="512" height="512" fill="${C.bgDeep}"/>
  <g transform="translate(256 256) scale(0.9) translate(-256 -256)">
    ${art()}
  </g>
</svg>`;
}

async function main() {
  const outDir = path.join(process.cwd(), "public");
  await sharp(Buffer.from(roundedIcon())).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
  await sharp(Buffer.from(roundedIcon())).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
  await sharp(Buffer.from(maskableIcon())).resize(512, 512).png().toFile(path.join(outDir, "icon-maskable-512.png"));
  await sharp(Buffer.from(appleIcon())).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));
  console.log("Icons generated (flat colors, maskable safe zone):", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
