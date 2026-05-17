/**
 * assemble_sprites.js
 * Stitches individual frame PNGs into horizontal sprite strips.
 *
 * Usage:
 *   node assemble_sprites.js
 *
 * Requirements:
 *   npm install jimp
 *
 * Place your frame files in:
 *   raw_frames/<CharName>/<animName>/0.png, 1.png, 2.png ...
 *
 * Output goes to:
 *   assets/sprites/AI_<CharName>/  (one PNG per animation)
 */

const Jimp   = require('jimp');
const fs     = require('fs');
const path   = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
// Edit these to match your generated frames.
// frameSize: the pixel width/height of each individual frame image.
// If you generated at 256x256, set 256. If 128x128, set 128.

const CHARACTERS = {
  Kai: {
    frameSize: 128,
    anims: {
      'Idle':       6,
      'Run':        8,
      'Jump':       3,
      'Fall':       3,
      'Attack1':    5,
      'Attack2':    6,
      'Attack3':    7,
      'Take Hit':   3,
      'Death':      8,
    },
  },
  Ryu: {
    frameSize: 128,
    anims: {
      'Idle':       6,
      'Run':        8,
      'Jump':       3,
      'Fall':       3,
      'Attack1':    5,
      'Attack2':    6,
      'Attack3':    7,
      'Take Hit':   3,
      'Death':      8,
    },
  },
  Blade: {
    frameSize: 128,
    anims: {
      'Idle':       6,
      'Run':        8,
      'Jump':       3,
      'Fall':       3,
      'Attack1':    5,
      'Attack2':    6,
      'Attack3':    7,
      'Take Hit':   3,
      'Death':      8,
    },
  },
  Jin: {
    frameSize: 128,
    anims: {
      'Idle':       6,
      'Run':        8,
      'Jump':       3,
      'Fall':       3,
      'Attack1':    5,
      'Attack2':    6,
      'Attack3':    7,
      'Take Hit':   3,
      'Death':      8,
    },
  },
  Zara: {
    frameSize: 128,
    anims: {
      'Idle':       6,
      'Run':        8,
      'Jump':       3,
      'Fall':       3,
      'Attack1':    5,
      'Attack2':    6,
      'Attack3':    7,
      'Take Hit':   3,
      'Death':      8,
    },
  },
};

const RAW_DIR = path.join(__dirname, 'raw_frames');
const OUT_DIR = path.join(__dirname, 'assets', 'sprites');

// ── Main ──────────────────────────────────────────────────────────────────────

async function assembleStrip(charName, animName, frameCount, frameSize) {
  const inputDir = path.join(RAW_DIR, charName, animName);
  const outDir   = path.join(OUT_DIR, `AI_${charName}`, 'Sprites');
  fs.mkdirSync(outDir, { recursive: true });

  const outPath  = path.join(outDir, `${animName}.png`);
  const stripW   = frameSize * frameCount;
  const strip    = new Jimp(stripW, frameSize, 0x00000000); // transparent

  let loaded = 0;
  for (let i = 0; i < frameCount; i++) {
    // Accept either 0.png / 1.png or frame_0.png / frame_1.png
    const candidates = [
      path.join(inputDir, `${i}.png`),
      path.join(inputDir, `frame_${i}.png`),
      path.join(inputDir, `${String(i).padStart(2, '0')}.png`),
    ];

    let img = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try { img = await Jimp.read(p); break; } catch (_) { /* skip */ }
      }
    }

    if (!img) {
      console.warn(`  ⚠  ${charName}/${animName}: missing frame ${i} — filling with blank`);
      // Insert a blank transparent frame
      img = new Jimp(frameSize, frameSize, 0x00000000);
    }

    // Resize to frameSize x frameSize if needed (keeps aspect ratio, pads transparent)
    if (img.bitmap.width !== frameSize || img.bitmap.height !== frameSize) {
      img.contain(frameSize, frameSize, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_BOTTOM);
    }

    strip.composite(img, i * frameSize, 0);
    loaded++;
  }

  await strip.writeAsync(outPath);
  console.log(`  ✓  ${charName}/${animName}.png  (${loaded}/${frameCount} frames)`);
  return outPath;
}

async function run() {
  console.log('=== Sprite Strip Assembler ===\n');

  for (const [charName, cfg] of Object.entries(CHARACTERS)) {
    console.log(`\n── ${charName} ──`);
    for (const [animName, frameCount] of Object.entries(cfg.anims)) {
      await assembleStrip(charName, animName, frameCount, cfg.frameSize);
    }
  }

  console.log('\n✅  All strips written to assets/sprites/AI_<CharName>/Sprites/');
  console.log('\nNext: update SPRITE_CONFIG in BootScene.js to point at the new folders.');
  console.log('Use frameSize matching what you set above (default: 128).');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
