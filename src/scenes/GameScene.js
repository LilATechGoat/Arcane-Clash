/**
 * @file GameScene.js
 * Main gameplay scene with atmospheric Hollow Knight / Brawlhalla-style stages.
 */

/* global GameScene, GAME_CONFIG, InputManager, PhysicsSystem, CombatSystem, AnimationManager */

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this._p1CharName = data.p1Char   || 'Naruto';
    this._p2CharName = data.p2Char   || 'Goku';
    this._stageName  = data.stage    || 'battlefield';
    this._mode       = data.mode     || 'pvp';
    this._botLevel   = data.botLevel || 5;
    this._netMgr     = data.netMgr   || null;  // NetworkManager instance or null
    this._netIsHost  = data.netIsHost || false;
  }

  create() {
    this.inputMgr     = new InputManager(this);
    this.animMgr      = new AnimationManager(this);
    this._platforms   = this._buildStage(this._stageName);
    this.physicsSys   = new PhysicsSystem(this, this._platforms);
    this.combatSystem = new CombatSystem(this, this.animMgr);

    // Build stage visuals BEFORE spawning characters so characters render on top
    this._drawStage(this._stageName);

    const P1Class = GAME_CONFIG.CHARACTERS[this._p1CharName] || GAME_CONFIG.CHARACTERS['Naruto'];
    const P2Class = GAME_CONFIG.CHARACTERS[this._p2CharName] || GAME_CONFIG.CHARACTERS['Goku'];

    // Store on scene so UIScene can find them via lazy init if timing is off
    this.p1 = new P1Class(this, 420, 500, 0, this.inputMgr, this.combatSystem, this.animMgr);
    this.p2 = new P2Class(this, 860, 500, 1, this.inputMgr, this.combatSystem, this.animMgr);

    this.physicsSys.register(this.p1);
    this.physicsSys.register(this.p2);
    this.combatSystem.register(this.p1);
    this.combatSystem.register(this.p2);
    this.combatSystem.characters = [this.p1, this.p2];

    // Bot mode
    this._bot = null;
    if (this._mode === 'bot') {
      this._bot = new BotController(this._botLevel);
      this.inputMgr.setBotController(1, this._bot);
    }

    // Network mode — remote player's inputs come via NetworkManager
    if (this._mode === 'online' && this._netMgr) {
      const remoteId = this._netIsHost ? 1 : 0;
      this.inputMgr.setNetController(remoteId, this._netMgr);

      // Guest: apply authoritative state from host
      if (!this._netIsHost) {
        this._netMgr.onRemoteState(s => {
          this._applyNetState(this.p1, s.p1x, s.p1y, s.p1vx, s.p1vy, s.p1d, s.p1s, s.p1f);
          this._applyNetState(this.p2, s.p2x, s.p2y, s.p2vx, s.p2vy, s.p2d, s.p2s, s.p2f);
        });
      }
    }

    this.events.emit('gameReady', [this.p1, this.p2]);

    this.events.on('gameOver', this._handleGameOver, this);

    // Scanline overlay — matches the dark fantasy UI style
    const sl = this.add.graphics().setDepth(999).setScrollFactor(0);
    sl.fillStyle(0x000000, 0.09);
    for (let y = 0; y < GAME_CONFIG.HEIGHT; y += 2) sl.fillRect(0, y, GAME_CONFIG.WIDTH, 1);

    // Override AnimationManager's flashHit to use CharacterRenderer
    this.animMgr.flashHit = (sprite) => {
      // sprite here is a legacy arg — find the character whose sprite this belongs to
      const char = [this.p1, this.p2].find(c => c.sprite === sprite);
      if (char?.renderer) char.renderer.flashHit();
    };

    // Override flashHit on CombatSystem to call renderer directly
    const origApplyHit = this.combatSystem._applyHit.bind(this.combatSystem);
    this.combatSystem._applyHit = (hb, target) => {
      origApplyHit(hb, target);
      if (target.renderer) target.renderer.flashHit();
    };
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    this.inputMgr.update(delta);
    // Bot thinks before the character acts
    if (this._bot) this._bot.update(dt, this.p2, this.p1);

    // Network sync
    if (this._mode === 'online' && this._netMgr?.isConnected) {
      const localId = this._netIsHost ? 0 : 1;
      this.inputMgr.sendNetworkInput(this._netMgr, localId);
      // Host sends authoritative state to guest every frame
      if (this._netIsHost) this._netMgr.sendState(this.p1, this.p2);
    }
    this.physicsSys.update(dt);
    this.p1.update(dt);
    this.p2.update(dt);
    this.combatSystem.update();
    this._tickAmbient(time);
  }

  /**
   * Spawn an animated hit effect sprite at world position.
   * Picked by attack type; randomly rotated for variety.
   * @param {number} x
   * @param {number} y
   * @param {string} type  'light' | 'heavy' | 'special' | 'grab'
   */
  playHitVFX(x, y, type, attacker) {
    const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    const cx = Phaser.Math.Clamp(x, 80, W - 80);
    const cy = Phaser.Math.Clamp(y, 80, H - 80);
    const charName = attacker?.constructor?.name?.replace('Character', '') || '';

    // ── Impact sparks (per-character color, per-attack type) ─────────────────
    if (GAME_CONFIG.IE_LOADED) {
      // Color matched to each character's theme
      const charColor = {
        Naruto:  'grey',    // KAI  — purple/mauve sparks
        Goku:    'blue',    // RYU  — orange/red sparks
        Ichigo:  'purple',  // BLADE — cool-toned sparks
        Luffy:   'blue',    // JIN  — red/orange impact
        Tanjiro: 'green',   // ZARA — green sparks
        Warrior: 'purple',  // VOSS — purple sparks
      };
      // Spark type matched to hit strength
      const typeMap = { light:'02', heavy:'03', special:'05', grab:'01' };

      const color    = charColor[charName] || 'grey';
      const ieType   = typeMap[type] || '02';
      const ieKey    = `ie_${ieType}_${color}`;
      const ieScale  = type === 'special' ? 1.4 : type === 'heavy' ? 1.2 : 0.9;

      if (this.anims.exists(ieKey)) {
        const sparks = this.add.sprite(cx, cy, ieKey, 0)
          .setDepth(52).setScale(ieScale);
        sparks.play(ieKey);
        sparks.once('animationcomplete', () => sparks.destroy());
      }
    }

    // ── Themed PixelArt VFX — heavy and special only (larger dramatic effect) ─
    if (GAME_CONFIG.PIXEL_VFX_LOADED && (type === 'heavy' || type === 'special')) {
      const charVFX = {
        Naruto: { heavy:'pvfx_electric', special:'pvfx_firework'  },
        Goku:   { heavy:'pvfx_explosion',special:'pvfx_explosion' },
        Ichigo: { heavy:'pvfx_wind',      special:'pvfx_firework'  },
        Luffy:  { heavy:'pvfx_firework', special:'pvfx_firework'  },
        Tanjiro:{ heavy:'pvfx_wind',     special:'pvfx_wind'      },
        Warrior:{ heavy:'pvfx_void',     special:'pvfx_firework'  },
      };
      const pvfxKey   = charVFX[charName]?.[type] || 'pvfx_explosion';
      const pvfxScale = type === 'special' ? 2.4 : 1.8;
      // Ground-sweep effects play at feet level, not character centre
      const pvfxY = pvfxKey === 'pvfx_wind' ? cy + 12 : cy;

      const themed = this.add.sprite(cx, pvfxY, pvfxKey, 0)
        .setDepth(50).setScale(pvfxScale);
      themed.play(pvfxKey);
      themed.once('animationcomplete', () => themed.destroy());
    }
  }

  // ── Stage Data ────────────────────────────────────────────────────────────

  _buildStage(name) {
    if (name === 'final_destination') return this._platsFinalDest();
    return this._platsBattlefield();
  }

  _platsBattlefield() {
    return [
      { x: 250, y: 552, w: 780, h: 28, passThrough: false },
      { x: 270, y: 415, w: 170, h: 16, passThrough: true  },
      { x: 555, y: 358, w: 170, h: 16, passThrough: true  },
      { x: 840, y: 415, w: 170, h: 16, passThrough: true  },
    ];
  }

  _platsFinalDest() {
    return [
      { x: 250, y: 552, w: 780, h: 28, passThrough: false },
    ];
  }

  // ── Stage Drawing ─────────────────────────────────────────────────────────

  _drawStage(name) {
    if (name === 'final_destination') {
      this._drawFinalDestination();
    } else {
      this._drawBattlefield();
    }
  }

  // ── Battlefield ───────────────────────────────────────────────────────────

  _drawBattlefield() {
    const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

    // ── Sky gradient ──────────────────────────────────────────────────────
    const sky = this.add.graphics().setDepth(0);
    const bands = [
      [0,    '#03020a'], [0.15, '#060415'], [0.3,  '#0b071e'],
      [0.5,  '#0f0e28'], [0.7,  '#0d1224'], [0.85, '#0b1018'], [1.0, '#080c12'],
    ];
    bands.forEach(([t, hex], i) => {
      const y0 = i > 0 ? H * bands[i-1][0] : 0;
      const h  = H * t - y0;
      sky.fillStyle(Phaser.Display.Color.HexStringToColor(hex).color, 1);
      sky.fillRect(0, y0, W, Math.ceil(h) + 1);
    });

    // ── Stars ─────────────────────────────────────────────────────────────
    const stars = this.add.graphics().setDepth(1);
    this._seedRng(42);
    for (let i = 0; i < 180; i++) {
      const sx   = this._rng() * W;
      const sy   = this._rng() * H * 0.72;
      const size = this._rng() > 0.93 ? 2 : 1;
      stars.fillStyle(0xaabbff, 0.25 + this._rng() * 0.6);
      stars.fillRect(Math.round(sx), Math.round(sy), size, size);
    }

    // ── Symmetric ruin towers (left & right, mirrored) ────────────────────
    const ruins = this.add.graphics().setDepth(1);
    ruins.fillStyle(0x0c0a1e, 1);
    // Left pair
    this._drawRuinTower(ruins,  20, 580, 70, 290);
    this._drawRuinTower(ruins, 110, 580, 48, 210);
    // Right pair (mirror of left)
    this._drawRuinTower(ruins, W - 90,  580, 70, 290);
    this._drawRuinTower(ruins, W - 158, 580, 48, 210);

    // Background arch — centered on W/2
    const archCX = W / 2;
    ruins.fillStyle(0x0e0c22, 1);
    ruins.fillRect(archCX - 340, 390, 680, 22);
    ruins.fillRect(archCX - 340, 390, 18, 170);
    ruins.fillRect(archCX + 322, 390, 18, 170);
    ruins.fillStyle(0x100e26, 1);
    ruins.fillRect(archCX - 360, 368, 38, 24);
    ruins.fillRect(archCX + 322, 368, 38, 24);

    // ── Glowing orbs — symmetric pairs ───────────────────────────────────
    const glow = this.add.graphics().setDepth(2);
    const orbPairs = [
      [W*0.06, 330], [W*0.11, 365],          // left
      [W*0.94, 330], [W*0.89, 365],          // right (mirror)
      [W*0.43, 225], [W*0.5, 200], [W*0.57, 225], // center top
    ];
    orbPairs.forEach(([ox, oy]) => {
      glow.fillStyle(0x3311aa, 0.10); glow.fillCircle(ox, oy, 18);
      glow.fillStyle(0x5522cc, 0.22); glow.fillCircle(ox, oy, 8);
      glow.fillStyle(0x9966ff, 0.65); glow.fillCircle(ox, oy, 3);
    });

    // ── Main platform ─────────────────────────────────────────────────────
    this._drawMainPlatform(552, 780, 250);

    // ── 3 floating platforms ──────────────────────────────────────────────
    this._drawFloatingPlatform(270, 415, 170, 0x44aa66, 0x226644);
    this._drawFloatingPlatform(555, 358, 170, 0x44aa66, 0x226644);
    this._drawFloatingPlatform(840, 415, 170, 0x44aa66, 0x226644);

    // ── Mist / atmosphere below the island ───────────────────────────────
    const mist = this.add.graphics().setDepth(4);
    for (let i = 0; i < 8; i++) {
      mist.fillStyle(0x1a2a44, 0.06 + i * 0.02);
      mist.fillEllipse(W/2, 620 + i * 10, W * 0.85 + i * 30, 60 + i * 20);
    }
    // Ice-crystal glow pool directly under island
    for (let r = 180; r > 0; r -= 24) {
      mist.fillStyle(0x113366, 0.025 * (180 - r + 24) / 180);
      mist.fillEllipse(W/2, 590, r * 3.2, r * 0.55);
    }

    // ── Floor base (dark void) ────────────────────────────────────────────
    const floorGlow = this.add.graphics().setDepth(3);
    floorGlow.fillStyle(0x050812, 1);
    floorGlow.fillRect(0, 580, W, H - 580);

    this._ambientParticles = [];
    this._nextParticleTime = 0;
  }

  _drawRuinTower(g, x, bottom, w, h) {
    g.fillRect(x, bottom - h, w, h);
    // Crumbled top
    g.fillRect(x - 4, bottom - h, 8, 20);
    g.fillRect(x + w - 4, bottom - h, 8, 20);
    g.fillRect(x, bottom - h - 14, w * 0.4, 14);
    g.fillRect(x + w * 0.6, bottom - h - 10, w * 0.4, 10);
    // Window slits
    const wSlits = Math.floor(h / 60);
    for (let i = 0; i < wSlits; i++) {
      const wy = bottom - h + 30 + i * 55;
      g.fillStyle(0x220066, 0.8);
      g.fillRect(x + w * 0.3, wy, w * 0.4, 18);
    }
    g.fillStyle(0x0c0a1e, 1);
  }

  _drawMainPlatform(y, w, x) {
    const g  = this.add.graphics().setDepth(5);
    const cx = x + w / 2;

    // ── Ice glow beneath island ───────────────────────────────────────────
    for (let r = 120; r > 0; r -= 20) {
      g.fillStyle(0x1155aa, 0.03 * (120 - r + 20) / 120);
      g.fillEllipse(cx, y + 90, w * 0.55 * (r / 120), r * 0.5);
    }

    // ── Island rocky body (layered depth) ────────────────────────────────
    // Bottom dark underside
    g.fillStyle(0x0e141e, 1);
    g.fillRect(x + 20, y + 16, w - 40, 18);
    // Slight taper on sides
    g.fillStyle(0x0e141e, 1);
    g.fillTriangle(x, y + 16, x + 20, y + 16, x + 20, y + 34);
    g.fillTriangle(x + w, y + 16, x + w - 20, y + 16, x + w - 20, y + 34);

    // Main stone body
    g.fillStyle(0x1c2638, 1);
    g.fillRect(x, y, w, 18);

    // Top surface — lighter stone
    g.fillStyle(0x283444, 1);
    g.fillRect(x, y, w, 8);

    // Very top surface highlight
    g.fillStyle(0x324458, 1);
    g.fillRect(x + 4, y, w - 8, 3);

    // ── Glowing top edge ─────────────────────────────────────────────────
    g.fillStyle(0x55bbdd, 0.75);
    g.fillRect(x, y, w, 2);
    g.fillStyle(0x99ddff, 0.25);
    g.fillRect(x, y + 2, w, 2);

    // ── Stone tile divisions ──────────────────────────────────────────────
    g.fillStyle(0x0e1620, 1);
    const tileW = 88;
    for (let tx = x + tileW; tx < x + w; tx += tileW) {
      g.fillRect(tx, y, 2, 18);
    }

    // ── Central rune circle ───────────────────────────────────────────────
    const rc = 88;
    [rc, rc*0.72, rc*0.44].forEach((r, i) => {
      g.fillStyle(0x2255aa, 0.05 + i * 0.03);
      g.fillCircle(cx, y + 3, r);
    });
    // Ring lines (fake stroke using thin filled rects)
    g.fillStyle(0x3366bb, 0.45);
    g.fillRect(cx - rc, y + 1, rc * 2, 2);
    g.fillRect(cx - 1, y + 1 - rc, 2, rc * 2);
    g.fillStyle(0x2255aa, 0.3);
    g.fillRect(cx - rc * 0.7, y + 1, rc * 1.4, 2);

    // ── Vegetation patches ────────────────────────────────────────────────
    const vegData = [
      [x + 55,  y, 52, 12, 0x1e4a22, 0x2a6630],
      [x + 185, y, 38, 10, 0x1a4020, 0x265828],
      [x + w - 130, y, 48, 12, 0x1e4a22, 0x2a6630],
      [x + w - 240, y, 36, 9,  0x1a4020, 0x265828],
    ];
    vegData.forEach(([vx, vy, vw, vh, c1, c2]) => {
      g.fillStyle(c1, 0.9);
      g.fillEllipse(vx + vw/2, vy + vh/2, vw, vh);
      g.fillStyle(c2, 0.55);
      g.fillEllipse(vx + vw/2, vy + vh/2 - 2, vw * 0.65, vh * 0.65);
    });

    // ── Ice crystal formations hanging below ──────────────────────────────
    const crystalData = [
      [0.12, 58, 18], [0.20, 82, 14], [0.28, 44, 12],
      [0.38, 94, 20], [0.50, 72, 16], [0.62, 88, 20],
      [0.72, 48, 13], [0.80, 76, 15], [0.88, 54, 14],
    ];
    crystalData.forEach(([ox, ch, cw]) => {
      const crx = x + w * ox;
      const cry = y + 18;
      // Crystal body
      g.fillStyle(0x1e4a88, 0.75);
      g.fillTriangle(crx - cw/2, cry, crx + cw/2, cry, crx, cry + ch);
      // Left face highlight
      g.fillStyle(0x5599cc, 0.35);
      g.fillTriangle(crx - cw/2, cry, crx, cry, crx, cry + ch * 0.55);
      // Core bright
      g.fillStyle(0x88bbee, 0.2);
      g.fillTriangle(crx - cw/4, cry, crx + cw/4, cry, crx, cry + ch * 0.38);
    });

    // ── Small dark rock chunks at base ────────────────────────────────────
    g.fillStyle(0x131c28, 1);
    this._seedRng(12);
    for (let dx = x + 30; dx < x + w - 20; dx += Math.floor(55 + this._rng()*40)) {
      const rh = Math.floor(6 + this._rng() * 8);
      const rw = Math.floor(10 + this._rng() * 16);
      g.fillRect(dx, y + 18 - rh, rw, rh);
    }
  }

  _drawFloatingPlatform(x, y, w, glowColor, stoneColor) {
    const g  = this.add.graphics().setDepth(5);
    const cx = x + w / 2;

    // ── Glow halo beneath ────────────────────────────────────────────────
    g.fillStyle(0x33aa66, 0.07);
    g.fillEllipse(cx, y + 28, w + 50, 38);

    // ── Stone body with depth ─────────────────────────────────────────────
    // Dark front face (depth illusion)
    g.fillStyle(0x111e18, 1);
    g.fillRect(x + 4, y + 10, w - 8, 10);

    // Main stone
    g.fillStyle(0x1e3028, 1);
    g.fillRect(x, y, w, 14);

    // Top surface
    g.fillStyle(0x2a4035, 1);
    g.fillRect(x, y, w, 6);

    // ── Gold energy trim on top ───────────────────────────────────────────
    g.fillStyle(0xcc9922, 0.9);
    g.fillRect(x, y, w, 2);
    g.fillStyle(0xffcc44, 0.5);
    g.fillRect(x + 2, y, w - 4, 1);

    // ── Blue energy accent below gold ────────────────────────────────────
    g.fillStyle(0x2266aa, 0.6);
    g.fillRect(x + 4, y + 2, w - 8, 2);

    // ── Center segment panels (like Battlefield's orange panels) ─────────
    const segW = Math.floor(w / 3) - 4;
    [x + 2, x + Math.floor(w/3) + 2, x + Math.floor(2*w/3) + 2].forEach(sx => {
      g.fillStyle(0xaa7700, 0.2);
      g.fillRect(sx, y + 4, segW, 4);
    });

    // ── Vines / moss dripping down ────────────────────────────────────────
    [[x + 18, 16], [x + 55, 22], [x + w - 38, 14], [x + w - 68, 20]].forEach(([vx, vh]) => {
      g.fillStyle(0x1a3a20, 0.9);
      g.fillRect(vx, y + 14, 2, vh);
      g.fillStyle(0x224a28, 0.7);
      g.fillEllipse(vx + 1, y + 14 + vh, 6, 5);
    });

    // ── End cap ornaments ────────────────────────────────────────────────
    g.fillStyle(0xcc9922, 0.7);
    g.fillRect(x - 2, y, 4, 14);
    g.fillRect(x + w - 2, y, 4, 14);
  }

  // ── Final Destination ─────────────────────────────────────────────────────

  _drawFinalDestination() {
    const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    const px = 250, py = 552, pw = 780;

    // ── Sky — same dark gradient as battlefield for consistency ───────────
    const sky = this.add.graphics().setDepth(0);
    const bands = [
      [0, '#020408'], [0.2, '#04060e'], [0.45, '#060814'],
      [0.7, '#080c18'], [1.0, '#050810'],
    ];
    bands.forEach(([t, hex], i) => {
      const y0 = i > 0 ? H * bands[i-1][0] : 0;
      const h  = H * t - y0;
      sky.fillStyle(Phaser.Display.Color.HexStringToColor(hex).color, 1);
      sky.fillRect(0, y0, W, Math.ceil(h) + 1);
    });

    // ── Stars ─────────────────────────────────────────────────────────────
    const stars = this.add.graphics().setDepth(1);
    this._seedRng(77);
    for (let i = 0; i < 200; i++) {
      const sx   = this._rng() * W;
      const sy   = this._rng() * H * 0.82;
      const size = this._rng() > 0.94 ? 2 : 1;
      stars.fillStyle(0xaabbff, 0.15 + this._rng() * 0.55);
      stars.fillRect(Math.round(sx), Math.round(sy), size, size);
    }

    // ── Distant arcane circle glow (very subtle, just a faint ring) ───────
    const arcane = this.add.graphics().setDepth(2);
    const cx = W / 2, cy = H * 0.38;
    [180, 140, 100].forEach((r, i) => {
      arcane.fillStyle(0xE0C070, 0.012 + i * 0.008);
      arcane.fillCircle(cx, cy, r);
    });
    // Thin gold ring marks
    [160, 120, 80].forEach(r => {
      arcane.fillStyle(0xE0C070, 0.06);
      arcane.fillRect(cx - r, cy - 1, r * 2, 1);
      arcane.fillRect(cx - 1, cy - r, 1, r * 2);
    });

    // ── Ruin silhouettes left + right (same as battlefield but simpler) ───
    const ruins = this.add.graphics().setDepth(1);
    ruins.fillStyle(0x06080e, 1);
    this._drawRuinTower(ruins,  30, 580, 55, 240);
    this._drawRuinTower(ruins, W - 85, 580, 55, 240);

    // ── Platform underside glow ───────────────────────────────────────────
    const glow = this.add.graphics().setDepth(4);
    for (let r = 120; r > 0; r -= 20) {
      glow.fillStyle(0xE0C070, 0.018 * (120 - r + 20) / 120);
      glow.fillEllipse(cx, py + 60, r * 4.5, r * 0.55);
    }

    // ── Dark void floor ───────────────────────────────────────────────────
    glow.fillStyle(0x020408, 1);
    glow.fillRect(0, py + 28, W, H - py - 28);

    // ── Main platform — dark stone with gold arcane trim ──────────────────
    const plat = this.add.graphics().setDepth(5);

    // Stone body with depth
    plat.fillStyle(0x0c1018, 1);
    plat.fillRect(px + 12, py + 14, pw - 24, 16);   // dark underside
    plat.fillStyle(0x141c28, 1);
    plat.fillRect(px, py, pw, 18);                    // main stone
    plat.fillStyle(0x1e2a3c, 1);
    plat.fillRect(px, py, pw, 7);                     // top surface

    // Gold top trim
    plat.fillStyle(0xE0C070, 0.85);
    plat.fillRect(px, py, pw, 2);
    plat.fillStyle(0xFFD98A, 0.35);
    plat.fillRect(px + 2, py, pw - 4, 1);

    // Dark accent line below gold
    plat.fillStyle(0x1A2A44, 1);
    plat.fillRect(px + 4, py + 2, pw - 8, 2);

    // Stone tile divisions
    plat.fillStyle(0x0a1018, 1);
    const tileW = 90;
    for (let tx = px + tileW; tx < px + pw; tx += tileW) {
      plat.fillRect(tx, py, 2, 18);
    }

    // Central arcane rune on platform
    plat.fillStyle(0xE0C070, 0.18);
    plat.fillRect(cx - 60, py + 4, 120, 1);
    plat.fillRect(cx - 1,  py + 1, 2, 8);
    plat.fillCircle(cx, py + 5, 6);
    plat.fillStyle(0x050816, 1);
    plat.fillCircle(cx, py + 5, 3);

    // Gold end caps
    plat.fillStyle(0xE0C070, 0.8);
    plat.fillRect(px - 3, py, 3, 18);
    plat.fillRect(px + pw, py, 3, 18);

    this._ambientParticles = [];
    this._nextParticleTime = 0;
  }

  // ── Ambient tick ──────────────────────────────────────────────────────────

  _tickAmbient(time) {
    if (time < this._nextParticleTime) return;
    this._nextParticleTime = time + Phaser.Math.Between(180, 500);

    const isFinal = this._stageName === 'final_destination';
    const color   = isFinal ? 0x3366ff : 0x5533aa;
    const x       = Phaser.Math.Between(80, GAME_CONFIG.WIDTH - 80);
    const y       = Phaser.Math.Between(300, 540);

    const p = this.add.circle(x, y, Phaser.Math.Between(1, 3), color, 0.6).setDepth(3);
    this.tweens.add({
      targets: p,
      y: y - Phaser.Math.Between(60, 140),
      alpha: 0,
      duration: Phaser.Math.Between(1200, 2400),
      ease: 'Sine.easeIn',
      onComplete: () => p.destroy(),
    });
  }

  // ── Tiny deterministic RNG for consistent star patterns ──────────────────
  _seedRng(seed) { this._rngState = seed; }
  _rng() {
    this._rngState = (this._rngState * 1664525 + 1013904223) & 0xffffffff;
    return (this._rngState >>> 0) / 0xffffffff;
  }

  // ── Apply authoritative state from host (guest only) ─────────────────────
  _applyNetState(char, x, y, vx, vy, damage, stocks, facing) {
    char.x      = x;
    char.y      = y;
    char.vel.x  = vx;
    char.vel.y  = vy;
    char.damage = damage;
    char.stocks = stocks;
    char.facing = facing;
  }

  // ── Game over ─────────────────────────────────────────────────────────────
  _handleGameOver() {
    this.time.delayedCall(5000, () => {
      if (this.scene.isActive('GameScene')) {
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
      }
    });
  }
}
