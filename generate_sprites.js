/**
 * generate_sprites.js
 *
 * Generates pixel-art sprite sheets using OpenAI DALL-E 3.
 * Each sheet is a 4×4 grid (1024×1024) — 4 columns × 4 rows of 256px frames:
 *
 *   Row 0  (frames  0–3)  Idle animation
 *   Row 1  (frames  4–7)  Walk / run cycle
 *   Row 2  (frames  8–11) Jump, Fall, Light attack, Heavy attack
 *   Row 3  (frames 12–15) Special move, Hurt/flinch, Shield/guard, Death
 *
 * Usage:
 *   Windows:   set OPENAI_API_KEY=sk-...  &&  node generate_sprites.js
 *   Mac/Linux: OPENAI_API_KEY=sk-...  node generate_sprites.js
 *
 * Generate one character:
 *   node generate_sprites.js Naruto
 *
 * Get a free API key at: https://platform.openai.com/api-keys
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_KEY = process.env.OPENAI_API_KEY || '';
const OUT_DIR = path.join(__dirname, 'assets', 'sprites');

// ── Shared style instructions ─────────────────────────────────────────────────
const STYLE = `
pixel art style, clean bold black 2-pixel outline around character,
flat color shading with 1 shadow tone per color,
white background, no gradients, no anti-aliasing,
Brawlhalla / fighting game character art style,
character faces RIGHT in every frame,
exactly 4 columns and 4 rows forming a perfect grid,
each of the 16 cells is exactly 256x256 pixels,
every frame shows the SAME character with IDENTICAL colors and proportions,
no labels no numbers no borders between cells
`.trim().replace(/\n/g, ' ');

const NEGATIVE = `
blurry, realistic, 3D, watermark, text, logo, border lines,
extra characters, inconsistent design, gradient background,
different outfit per frame, missing limbs, deformed
`;

// ── Row descriptions used in every prompt ─────────────────────────────────────
const ROWS = `
ROW 1 — 4 idle standing frames: slight body bob, breathing, weight shift left to right.
ROW 2 — 4 walk/run cycle frames: legs alternating, arms swinging, clear forward motion.
ROW 3 — frame 1: jump (legs tucked, arms up); frame 2: falling (arms out); frame 3: light attack (fist/weapon extended forward); frame 4: heavy attack (wide powerful swing, full body lean).
ROW 4 — frame 1: signature special move with visible energy/power effect; frame 2: hurt reaction (flinching backward, pain expression); frame 3: guard/shield pose (arms raised defensively); frame 4: death (collapsed on ground or falling backward).
`.trim().replace(/\n/g, ' ');

// ── Per-character prompts ─────────────────────────────────────────────────────
const CHARACTERS = {
  Naruto: `
    Naruto Uzumaki anime ninja fighter character sprite sheet.
    Wearing bright ORANGE jumpsuit with dark navy collar and cuffs,
    wild spiky GOLDEN YELLOW hair sticking up and back,
    blue metal forehead protector headband with leaf symbol,
    THREE thin whisker-like marks on each cheek,
    bright blue eyes, energetic determined face,
    ninja sandals, age 16 teen build.
    Special move (row 4 frame 1): glowing blue spinning Rasengan energy sphere in outstretched palm.
  `,

  Goku: `
    Son Goku Dragon Ball martial artist fighter character sprite sheet.
    Wearing ORANGE gi training uniform with dark blue undershirt visible at neck and wrists,
    dark spiky hair with FIVE large upward-pointing spikes,
    no headband bare forehead, strong muscular build,
    confident smile, dark eyes with thick eyebrows,
    blue wristbands, dark boots.
    Special move (row 4 frame 1): both hands cupped to one side firing a wide CYAN energy beam (Kamehameha), mouth open yelling.
  `,

  Ichigo: `
    Ichigo Kurosaki Soul Reaper sword fighter character sprite sheet.
    Wearing flowing BLACK shihakusho robe with wide sleeves,
    spiky ORANGE hair swept to one side over forehead,
    intense serious furrowed brow expression, brown eyes,
    tall lean athletic build,
    carrying a massive BLACK zanpakuto sword (taller than character) strapped across back for idle frames, held in hand for attack frames.
    Special move (row 4 frame 1): swinging black sword releasing a dark purple crescent energy wave.
  `,

  Luffy: `
    Monkey D. Luffy One Piece pirate brawler fighter character sprite sheet.
    Wearing open RED vest over bare chest, blue shorts,
    dark short messy hair, round wide STRAW HAT on head,
    large carefree grin showing teeth, scar below LEFT eye,
    sandals, lean build.
    Attack frames: arms stretched forward like rubber (Gum-Gum style), exaggerated reach.
    Special move (row 4 frame 1): both fists rapid-firing in a blur (Gum-Gum Gatling), motion lines.
  `,

  Tanjiro: `
    Tanjiro Kamado Demon Slayer sword fighter character sprite sheet.
    Wearing dark TEAL-GREEN uniform with black checkered diamond pattern (ichimatsu),
    dark black hair with RED-TIPPED front strands,
    small DARK RED scar on forehead, green eyes,
    small round earrings (left ear: red top green bottom),
    holding a BLACK nichirin blade sword with red edge.
    Special move (row 4 frame 1): wide circular spinning sword swing with bright ORANGE FIRE trail (Hinokami Kagura), fire particles.
  `,
};

// ── API call ──────────────────────────────────────────────────────────────────
function generateImage(charName, charPrompt) {
  return new Promise((resolve, reject) => {
    const fullPrompt = `
${STYLE}

${ROWS}

CHARACTER: ${charPrompt.trim()}

CRITICAL LAYOUT RULE: The output image must be exactly 1024x1024 pixels containing a 4-column 4-row grid of 16 animation frames. Every one of the 16 cells must show the same character. White background fills all empty space.
    `.trim();

    const body = JSON.stringify({
      model:           'dall-e-3',
      prompt:          fullPrompt,
      size:            '1024x1024',
      quality:         'hd',
      response_format: 'b64_json',
      n:               1,
    });

    const options = {
      hostname: 'api.openai.com',
      path:     '/v1/images/generations',
      method:   'POST',
      headers:  {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          if (json.error) {
            console.error(`  ✗ API error: ${json.error.message}`);
            reject(new Error(json.error.message));
            return;
          }

          if (!json.data || !json.data[0]) {
            console.error('  ✗ Unexpected response:', JSON.stringify(json, null, 2));
            reject(new Error('No image data returned'));
            return;
          }

          const b64     = json.data[0].b64_json;
          const outPath = path.join(OUT_DIR, `${charName}.png`);
          fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
          console.log(`  ✓ Saved → ${outPath}`);

          // Log the revised prompt DALL-E actually used (often informative)
          if (json.data[0].revised_prompt) {
            console.log(`  [revised prompt]: ${json.data[0].revised_prompt.slice(0, 120)}...`);
          }

          resolve(outPath);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!API_KEY) {
    console.error('\n  ERROR: OpenAI API key not set.\n');
    console.error('  Windows PowerShell:');
    console.error('    $env:OPENAI_API_KEY = "sk-..."');
    console.error('    node generate_sprites.js\n');
    console.error('  Mac / Linux:');
    console.error('    OPENAI_API_KEY=sk-... node generate_sprites.js\n');
    console.error('  Get a key at: https://platform.openai.com/api-keys\n');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const target = process.argv[2];
  const names  = target
    ? [target]
    : Object.keys(CHARACTERS);

  const missing = names.filter(n => !CHARACTERS[n]);
  if (missing.length) {
    console.error(`\n  Unknown character(s): ${missing.join(', ')}`);
    console.error(`  Valid names: ${Object.keys(CHARACTERS).join(', ')}\n`);
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Anime Brawl — Sprite Sheet Generator (DALL-E 3)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`  Generating: ${names.join(', ')}`);
  console.log(`  Output:     ${OUT_DIR}`);
  console.log(`  Layout:     4×4 grid, 256px frames, 1024×1024 total`);
  console.log(`  Cost est.:  ~$0.08 per character (HD quality)\n`);

  for (const name of names) {
    console.log(`Generating ${name}...`);
    try {
      await generateImage(name, CHARACTERS[name]);
    } catch (err) {
      console.error(`  ✗ ${name} failed: ${err.message}`);
    }
    // Respect rate limits between requests
    if (names.indexOf(name) < names.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n  Done! Sprites saved to assets/sprites/');
  console.log('  Start your server and the game will load them automatically.\n');
}

main();
