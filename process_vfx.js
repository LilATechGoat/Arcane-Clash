/**
 * process_vfx.js
 * Processes Copilot VFX sprite sheets (already transparent background):
 *   - Auto-detects frame count by finding fully-transparent column gaps
 *   - Crops away empty transparent rows at top/bottom
 *   - Saves to assets/vfx/ with clean names
 *
 * Usage: node process_vfx.js
 */

const Jimp = require('jimp');
const fs   = require('fs');
const path = require('path');

// frames: hardcoded because auto-detection mis-counts sparse effects.
// 1536 / 8 = 192 — the one clean divisor that matches visual frame counts.
const VFX_MAP = [
  { src: 'assets/sprites/Copilot_20260516_164539.png',       name: 'vfx_water_splash', frames: 8 },
  { src: 'assets/sprites/Copilot_20260516_164543.png',       name: 'vfx_earth_impact', frames: 8 },
  { src: 'assets/sprites/Copilot_20260516_164628.png',       name: 'vfx_fireball',     frames: 8 },
  { src: 'assets/sprites/Copilot_20260516_164629.png',       name: 'vfx_shockwave',    frames: 8 },
  { src: 'assets/sprites/Copilot_20260516_164633.png',       name: 'vfx_slash',        frames: 8 },
  { src: 'assets/sprites/Copilot_20260516_164633 (1).png',   name: 'vfx_electric',     frames: 8 },
  { src: 'assets/sprites/Copilot_20260516_164637.png',       name: 'vfx_explosion',    frames: 8 },
  { src: 'assets/sprites/Copilot_20260516_164638.png',       name: 'vfx_fire_burst',   frames: 8 },
];

const ALPHA_THRESHOLD = 10; // pixels with alpha below this = transparent/empty
const OUT = path.join(__dirname, 'assets', 'vfx');

// ── Helpers ───────────────────────────────────────────────────────────────────

function isTransparent(img, x, y) {
  return Jimp.intToRGBA(img.getPixelColor(x, y)).a < ALPHA_THRESHOLD;
}

// Find topmost/bottommost rows that have any non-transparent pixel
function contentRows(img) {
  const w = img.bitmap.width, h = img.bitmap.height;
  let top = h, bot = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isTransparent(img, x, y)) {
        if (y < top) top = y;
        if (y > bot) bot = y;
      }
    }
  }
  const pad = 8;
  return { top: Math.max(0, top - pad), bot: Math.min(h - 1, bot + pad) };
}

// Detect frame count. Requires a gap of MIN_GAP consecutive transparent columns
// between frames so that small empty areas WITHIN a frame aren't counted as separators.
function detectFrameCount(img) {
  const w = img.bitmap.width, h = img.bitmap.height;
  const MIN_GAP = 12;

  // Build per-column isEmpty flag
  const empty = new Array(w);
  for (let x = 0; x < w; x++) {
    empty[x] = true;
    for (let y = 0; y < h; y++) {
      if (!isTransparent(img, x, y)) { empty[x] = false; break; }
    }
  }

  let frames = 0;
  let x = 0;
  while (x < w) {
    // Skip leading empty columns
    while (x < w && empty[x]) x++;
    if (x >= w) break;
    frames++;

    // Consume this frame's content, treating gaps < MIN_GAP as still inside the frame
    while (x < w) {
      if (!empty[x]) { x++; continue; }
      // Measure gap length
      let gx = x;
      while (gx < w && empty[gx]) gx++;
      if (gx - x >= MIN_GAP) { x = gx; break; } // real gap → end of frame
      x = gx; // tiny gap inside frame → keep going
    }
  }

  return Math.max(frames, 1);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function processOne({ src, name, frames: frameCount }) {
  const img = await Jimp.read(path.resolve(__dirname, src));

  const { top, bot } = contentRows(img);
  const contentH = bot - top + 1;
  const frameW   = Math.floor(img.bitmap.width / frameCount);

  // Save each frame as its own PNG: vfx_slash_f0.png … vfx_slash_f7.png
  for (let f = 0; f < frameCount; f++) {
    const frame = img.clone().crop(f * frameW, top, frameW, contentH);
    await frame.writeAsync(path.join(OUT, `${name}_f${f}.png`));
  }

  console.log(`  ✓  ${name}  — ${frameCount} frames  ${frameW}×${contentH}px`);
  return { name, frameCount, frameW, frameH: contentH };
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('Processing VFX sprite sheets...\n');

  const results = [];
  for (const entry of VFX_MAP) {
    try {
      results.push(await processOne(entry));
    } catch (e) {
      console.error(`  ✗  ${entry.name}: ${e.message}`);
    }
  }

  console.log('\n── BootScene load config (copy this) ──');
  for (const r of results) {
    console.log(`  ['${r.name}', ${r.frameW}, ${r.frameH}, ${r.frameCount}],`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
