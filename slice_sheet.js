/**
 * slice_sheet.js
 * Slices a labeled sprite sheet (magenta row separators) into
 * individual animation strip PNGs ready for Phaser to load.
 *
 * Usage:
 *   node slice_sheet.js <sheet.png> <CharName>
 *
 * Example:
 *   node slice_sheet.js raw_frames/kai_sheet.png Kai
 *
 * Requires:  npm install jimp
 */

const Jimp = require('jimp');
const fs   = require('fs');
const path = require('path');

// ── Animation row order (must match the order rows appear in the sheet) ────────
const ANIM_NAMES = [
  'Idle',
  'Run',
  'Jump',
  'Fall',
  'Attack1',
  'Attack2',
  'Attack3',
  'Take Hit',
  'Death',
];

const FRAMES_PER_ROW = 8;
// ── Helpers ───────────────────────────────────────────────────────────────────

// Returns true if more than 60% of pixels in this row share a similar
// non-transparent solid color (catches magenta, purple, or any separator color)
function rowIsSeparator(img, y) {
  const w = img.bitmap.width;
  const samples = [];
  for (let x = 0; x < w; x += 4) {
    const { r, g, b, a } = Jimp.intToRGBA(img.getPixelColor(x, y));
    if (a > 200) samples.push({ r, g, b });
  }
  if (samples.length < w * 0.1) return false; // mostly transparent — not a separator

  // Check if all opaque samples are roughly the same color
  const ref = samples[0];
  const uniform = samples.filter(s =>
    Math.abs(s.r - ref.r) < 40 &&
    Math.abs(s.g - ref.g) < 40 &&
    Math.abs(s.b - ref.b) < 40
  );
  return uniform.length / samples.length > 0.85;
}

// Find the leftmost x where non-label content starts.
// The label column is opaque non-transparent pixels on a dark/colored bg.
// We detect it by scanning the first animation row for where content
// repeating pixel pattern starts — we just use a fixed scan approach:
// scan from left until we find a column that has mostly transparent pixels
// (the checkerboard transparent area between frames is mostly alpha=0).
function detectLabelWidth(img, rowY, rowH) {
  const w = img.bitmap.width;
  for (let x = 0; x < w; x++) {
    let transparentCount = 0;
    for (let y = rowY; y < rowY + rowH; y++) {
      const { a } = Jimp.intToRGBA(img.getPixelColor(x, y));
      if (a < 30) transparentCount++;
    }
    // If more than 40% of this column in the row is transparent, label has ended
    if (transparentCount / rowH > 0.40) {
      return Math.max(0, x - 2);
    }
  }
  return 0;
}

// Removes the background from a strip by sampling the top-left pixel of
// each frame as the background color and making matching pixels transparent.
// 8-directional flood fill from a start pixel — erases connected background.
// Bounds-constrained to [minX, maxX] so fills don't bleed into adjacent frames.
function floodFill(data, w, h, startX, startY, tolerance, minX, maxX) {
  const startIdx = (startY * w + startX) * 4;
  if (data[startIdx + 3] < 10) return; // already transparent — nothing to do

  const bgR = data[startIdx];
  const bgG = data[startIdx + 1];
  const bgB = data[startIdx + 2];

  const visited = new Uint8Array(w * h);
  const queue   = [startY * w + startX];

  while (queue.length > 0) {
    const pos = queue.pop();
    if (visited[pos]) continue;
    visited[pos] = 1;

    const x = pos % w;
    const y = (pos - x) / w;
    if (x < minX || x > maxX || y < 0 || y >= h) continue;

    const idx = pos * 4;
    if (data[idx + 3] < 10) continue; // already transparent

    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    if (
      Math.abs(r - bgR) <= tolerance &&
      Math.abs(g - bgG) <= tolerance &&
      Math.abs(b - bgB) <= tolerance
    ) {
      data[idx + 3] = 0; // erase pixel

      // Queue all 8 neighbours (handles checkerboard diagonal adjacency)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= minX && nx <= maxX && ny >= 0 && ny < h) {
            const npos = ny * w + nx;
            if (!visited[npos]) queue.push(npos);
          }
        }
      }
    }
  }
}

function removeBackground(strip) {
  const sw     = strip.bitmap.width;
  const sh     = strip.bitmap.height;
  const frameW = Math.round(sw / FRAMES_PER_ROW);
  const data   = strip.bitmap.data;
  const TOL    = 55;

  for (let f = 0; f < FRAMES_PER_ROW; f++) {
    const x0 = f * frameW;
    const x1 = x0 + frameW - 1;
    const mx  = x0 + Math.floor(frameW / 2);

    // Flood fill from all edges of this frame (top, bottom, sides, midpoints)
    const seeds = [
      [x0, 0],  [x1, 0],  [x0, sh-1],  [x1, sh-1],   // corners
      [mx, 0],  [mx, sh-1],              // top/bottom midpoints
      [x0, Math.floor(sh/2)],            // left mid
      [x1, Math.floor(sh/2)],            // right mid
    ];
    for (const [sx, sy] of seeds) {
      floodFill(data, sw, sh, sx, sy, TOL, x0, x1);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const [,, sheetPath, charName] = process.argv;

  if (!sheetPath || !charName) {
    console.error('Usage: node slice_sheet.js <sheet.png> <CharName>');
    console.error('Example: node slice_sheet.js raw_frames/kai_sheet.png Kai');
    process.exit(1);
  }

  const absSheet = path.resolve(__dirname, sheetPath);
  if (!fs.existsSync(absSheet)) {
    console.error(`File not found: ${absSheet}`);
    process.exit(1);
  }

  console.log(`\nLoading: ${absSheet}`);
  const img = await Jimp.read(absSheet);
  const W = img.bitmap.width;
  const H = img.bitmap.height;
  console.log(`Sheet size: ${W} × ${H} px`);

  // ── Find separator rows ────────────────────────────────────────────────────
  const separatorYs = [];
  for (let y = 0; y < H; y++) {
    if (rowIsSeparator(img, y)) {
      // Avoid duplicates (separators can be 2px thick)
      if (separatorYs.length === 0 || y - separatorYs[separatorYs.length - 1] > 3) {
        separatorYs.push(y);
      }
    }
  }
  console.log(`Found ${separatorYs.length} separator line(s) at y: ${separatorYs.join(', ')}`);

  // ── Build row boundaries ───────────────────────────────────────────────────
  // Rows live between separators. Add virtual top (0) and bottom (H).
  const boundaries = [0, ...separatorYs, H];
  const rows = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const top    = boundaries[i];
    const bottom = boundaries[i + 1];
    const height = bottom - top;
    // Skip the separator rows themselves and anything too thin to be a real row
    if (height > 10) {
      rows.push({ top, height });
    }
  }
  console.log(`Detected ${rows.length} animation row(s)`);

  if (rows.length !== ANIM_NAMES.length) {
    console.warn(`⚠  Expected ${ANIM_NAMES.length} rows but found ${rows.length}.`);
    console.warn(`   Falling back to even division across full sheet height.`);

    // Even-split fallback: divide total height by number of animations
    const rowH = Math.floor(H / ANIM_NAMES.length);
    rows.length = 0;
    for (let i = 0; i < ANIM_NAMES.length; i++) {
      rows.push({ top: i * rowH, height: rowH });
    }
    console.log(`   Using even rows of ${rowH}px each.\n`);
  }

  // ── Detect label width from first row ────────────────────────────────────
  const labelW = detectLabelWidth(img, rows[0].top, rows[0].height);
  console.log(`Label column width: ~${labelW}px`);

  const contentW  = W - labelW;
  const frameW    = Math.floor(contentW / FRAMES_PER_ROW);
  // Use the first row's actual height as frame height (square frames may differ from frameW)
  const frameSize = Math.min(frameW, rows[0].height);
  console.log(`Frame size: ${frameW} × ${rows[0].height} px → using ${frameSize} as square frameSize\n`);

  // ── Output directory ──────────────────────────────────────────────────────
  const outDir = path.join(__dirname, 'assets', 'sprites', `AI_${charName}`, 'Sprites');
  fs.mkdirSync(outDir, { recursive: true });

  // ── Slice each row ────────────────────────────────────────────────────────
  const count = Math.min(rows.length, ANIM_NAMES.length);
  const slicedPaths = [];

  for (let i = 0; i < count; i++) {
    const { top, height } = rows[i];
    const animName        = ANIM_NAMES[i];

    // Crop the full row (excluding label column)
    const strip = img.clone().crop(labelW, top, contentW, height);

    // Resize so each frame is frameSize × frameSize
    const targetW = frameW * FRAMES_PER_ROW;
    if (strip.bitmap.width !== targetW || strip.bitmap.height !== frameSize) {
      strip.resize(targetW, frameSize);
    }

    // Remove background: sample top-left corner pixel as bg color,
    // then flood-fill any matching pixels to transparent
    removeBackground(strip);

    const outPath = path.join(outDir, `${animName}.png`);
    await strip.writeAsync(outPath);
    slicedPaths.push({ animName, outPath, frameSize, frames: FRAMES_PER_ROW });
    console.log(`  ✓  ${animName}.png  (${frameSize}×${frameSize} × ${FRAMES_PER_ROW} frames)`);
  }

  // ── Print BootScene config snippet ───────────────────────────────────────
  console.log(`\n✅  Sprites saved to: assets/sprites/AI_${charName}/Sprites/`);
  console.log('\n── Paste this into BootScene.js SPRITE_CONFIG ──\n');
  console.log(`  ${charName}: {`);
  console.log(`    displayName: '${charName.toUpperCase()}',`);
  console.log(`    dir:       'assets/sprites/AI_${charName}/Sprites/',`);
  console.log(`    frameSize: ${frameW},`);
  console.log(`    scale:     1.0,`);
  console.log(`    footRatio: 0.82,`);
  console.log(`    anims: {`);
  const animMap = {
    'Idle':     { key: 'idle',         rate: 8,  repeat: -1 },
    'Run':      { key: 'walk',         rate: 10, repeat: -1 },
    'Jump':     { key: 'jump',         rate: 8,  repeat:  0 },
    'Fall':     { key: 'fall',         rate: 8,  repeat:  0 },
    'Attack1':  { key: 'attack_light', rate: 14, repeat:  0 },
    'Attack2':  { key: 'attack_heavy', rate: 12, repeat:  0 },
    'Attack3':  { key: 'attack_spec',  rate: 12, repeat:  0 },
    'Take Hit': { key: 'hurt',         rate: 12, repeat:  0 },
    'Death':    { key: 'dead',         rate: 8,  repeat:  0 },
  };
  for (const { animName } of slicedPaths) {
    const m = animMap[animName];
    if (m) {
      console.log(`      ${m.key.padEnd(13)}: { file: '${animName}.png',${' '.repeat(Math.max(1, 18 - animName.length))}frames: ${FRAMES_PER_ROW}, rate: ${m.rate},  repeat: ${m.repeat < 0 ? '-1' : ' ' + m.repeat} },`);
    }
  }
  console.log(`    },`);
  console.log(`  },`);
}

run().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
