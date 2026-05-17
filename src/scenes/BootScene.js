/**
 * @file BootScene.js
 * Loads all per-animation sprite sheets from assets/sprites/ and registers
 * Phaser animations. Each animation file is its own horizontal strip:
 *   texture width  = frameSize × frameCount
 *   texture height = frameSize  (all packs use square frames)
 */

/* global BootScene, GAME_CONFIG */

// ── Per-character sprite configuration ───────────────────────────────────────
// Maps ANIM states → { file, frameCount, frameRate, repeat }
// frameSize (px): square frame dimensions for this pack
const SPRITE_CONFIG = {
  Naruto: {
    displayName: 'KAI',
    dir:       'assets/sprites/Martial Hero 3/Martial Hero 3/Sprite/',
    frameSize: 126,
    scale:     1.2,
    footRatio: 0.643,
    anims: {
      idle:         { file: 'Idle.png',       frames: 10, rate: 8,  repeat: -1 },
      walk:         { file: 'Run.png',        frames: 8,  rate: 10, repeat: -1 },
      jump:         { file: 'Going Up.png',   frames: 3,  rate: 8,  repeat:  0 },
      fall:         { file: 'Going Down.png', frames: 3,  rate: 8,  repeat:  0 },
      attack_light: { file: 'Attack1.png',    frames: 7,  rate: 14, repeat:  0 },
      attack_heavy: { file: 'Attack2.png',    frames: 6,  rate: 12, repeat:  0 },
      attack_spec:  { file: 'Attack3.png',    frames: 9,  rate: 12, repeat:  0 },
      hurt:         { file: 'Take Hit.png',   frames: 3,  rate: 12, repeat:  0 },
      dead:         { file: 'Death.png',      frames: 11, rate: 8,  repeat:  0 },
    },
  },

  Goku: {
    displayName: 'RYU',
    dir:       'assets/sprites/Martial Hero/Martial Hero/Sprites/',
    frameSize: 200,
    scale:     0.85,
    footRatio: 0.605,
    anims: {
      idle:         { file: 'Idle.png',     frames: 8, rate: 8,  repeat: -1 },
      walk:         { file: 'Run.png',      frames: 8, rate: 10, repeat: -1 },
      jump:         { file: 'Jump.png',     frames: 2, rate: 8,  repeat:  0 },
      fall:         { file: 'Fall.png',     frames: 2, rate: 8,  repeat:  0 },
      attack_light: { file: 'Attack1.png',  frames: 6, rate: 14, repeat:  0 },
      attack_heavy: { file: 'Attack2.png',  frames: 6, rate: 12, repeat:  0 },
      attack_spec:  { file: 'Attack2.png',  frames: 6, rate: 10, repeat:  0 },
      hurt:         { file: 'Take Hit.png', frames: 4, rate: 12, repeat:  0 },
      dead:         { file: 'Death.png',    frames: 6, rate: 8,  repeat:  0 },
    },
  },

  Ichigo: {
    displayName: 'BLADE',
    dir:       'assets/sprites/Medieval Warrior Pack 3/Medieval Warrior Pack 3/Sprites/',
    frameSize: 135,
    scale:     1.1,
    footRatio: 0.630,
    anims: {
      idle:         { file: 'Idle.png',    frames: 10, rate: 8,  repeat: -1 },
      walk:         { file: 'Run.png',     frames: 6,  rate: 10, repeat: -1 },
      jump:         { file: 'Jump.png',    frames: 2,  rate: 8,  repeat:  0 },
      fall:         { file: 'Fall.png',    frames: 2,  rate: 8,  repeat:  0 },
      attack_light: { file: 'Attack1.png', frames: 4,  rate: 14, repeat:  0 },
      attack_heavy: { file: 'Attack2.png', frames: 4,  rate: 12, repeat:  0 },
      attack_spec:  { file: 'Attack3.png', frames: 5,  rate: 12, repeat:  0 },
      hurt:         { file: 'Get Hit.png', frames: 3,  rate: 12, repeat:  0 },
      dead:         { file: 'Death.png',   frames: 9,  rate: 8,  repeat:  0 },
    },
  },

  Luffy: {
    displayName: 'JIN',
    dir:       'assets/sprites/Martial Hero 2/Martial Hero 2/Sprites/',
    frameSize: 200,
    scale:     0.85,
    footRatio: 0.635,
    anims: {
      idle:         { file: 'Idle.png',      frames: 4, rate: 6,  repeat: -1 },
      walk:         { file: 'Run.png',       frames: 8, rate: 10, repeat: -1 },
      jump:         { file: 'Jump.png',      frames: 2, rate: 8,  repeat:  0 },
      fall:         { file: 'Fall.png',      frames: 2, rate: 8,  repeat:  0 },
      attack_light: { file: 'Attack1.png',   frames: 4, rate: 14, repeat:  0 },
      attack_heavy: { file: 'Attack2.png',   frames: 4, rate: 12, repeat:  0 },
      attack_spec:  { file: 'Attack1.png',   frames: 4, rate: 16, repeat:  0 },
      hurt:         { file: 'Take hit.png',  frames: 3, rate: 12, repeat:  0 },
      dead:         { file: 'Death.png',     frames: 7, rate: 8,  repeat:  0 },
    },
  },

  Tanjiro: {
    displayName: 'ZARA',
    dir:       'assets/sprites/Fantasy Warrior/Fantasy Warrior/Sprites/',
    frameSize: 162,
    scale:     1.0,
    footRatio: 0.617,
    anims: {
      idle:         { file: 'Idle.png',      frames: 10, rate: 8,  repeat: -1 },
      walk:         { file: 'Run.png',       frames: 8,  rate: 10, repeat: -1 },
      jump:         { file: 'Jump.png',      frames: 3,  rate: 8,  repeat:  0 },
      fall:         { file: 'Fall.png',      frames: 3,  rate: 8,  repeat:  0 },
      attack_light: { file: 'Attack1.png',   frames: 7,  rate: 14, repeat:  0 },
      attack_heavy: { file: 'Attack2.png',   frames: 7,  rate: 12, repeat:  0 },
      attack_spec:  { file: 'Attack3.png',   frames: 8,  rate: 12, repeat:  0 },
      hurt:         { file: 'Take hit.png',  frames: 3,  rate: 12, repeat:  0 },
      dead:         { file: 'Death.png',     frames: 7,  rate: 8,  repeat:  0 },
    },
  },

  Warrior: {
    displayName: 'VOSS',
    dir:       'assets/sprites/Warrior/',
    frameSize: 64,
    scale:     1.4,
    footRatio: 0.81,
    anims: {
      idle:         { file: 'Idle.png',    frames: 6,  rate: 8,  repeat: -1 },
      walk:         { file: 'Run.png',     frames: 8,  rate: 12, repeat: -1 },
      jump:         { file: 'Jump.png',    frames: 3,  rate: 8,  repeat:  0 },
      fall:         { file: 'Fall.png',    frames: 3,  rate: 8,  repeat:  0 },
      attack_light: { file: 'Attack1.png', frames: 12, rate: 18, repeat:  0 },
      attack_heavy: { file: 'Attack2.png', frames: 10, rate: 14, repeat:  0 },
      attack_spec:  { file: 'Attack3.png', frames: 7,  rate: 14, repeat:  0 },
      hurt:         { file: 'TakeHit.png', frames: 4,  rate: 12, repeat:  0 },
      dead:         { file: 'Death.png',   frames: 11, rate: 10, repeat:  0 },
    },
  },
};

// Expose so SpriteAnimator and BaseCharacter can read scale/frameSize
GAME_CONFIG.SPRITE_CONFIG = SPRITE_CONFIG;

// ─────────────────────────────────────────────────────────────────────────────

class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    const W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

    // Loading bar
    const barBg  = this.add.rectangle(W/2, H/2, 400, 10, 0x111122);
    const bar    = this.add.rectangle(W/2 - 200, H/2, 0, 6, 0x4466ff).setOrigin(0, 0.5);
    this.add.text(W/2, H/2 - 28, 'LOADING SPRITES...', {
      fontSize: '14px', fontFamily: '"Courier New", monospace', color: '#334466',
    }).setOrigin(0.5);

    this.load.on('progress', v => { bar.width = 400 * v; });

    // Brackeys VFX removed — replaced by PixelArtRPGVFX + impact-effects
    GAME_CONFIG.BRACKEYS_VFX        = [];
    GAME_CONFIG.BRACKEYS_VFX_LOADED = false;

    // Pixel Art RPG VFX Lite — 64×64 frames, 6 frames per vertical strip
    const PX = 'assets/sprites/PixelArtRPGVFXLite/Textures/';
    const PIXEL_VFX = [
      ['pvfx_electric',  PX + 'Electricity/ElectricLighting1_Lite.png'],
      ['pvfx_explosion', PX + 'Explosion/Explosion_03_Lite.png'],
      ['pvfx_fire',      PX + 'Fire/FireFlamme_Lite.png'],
      ['pvfx_firework',  PX + 'FireWork/FireWork_002_Lite.png'],
      ['pvfx_holy',      PX + 'Holy/HolyCross_Lite.png'],
      ['pvfx_void',      PX + 'Void/VoidShield_Lite.png'],
      ['pvfx_water',     PX + 'Water/WaterWave_Lite.png'],
      ['pvfx_wind',      PX + 'Wind/WindGround_Lite.png'],
    ];
    PIXEL_VFX.forEach(([key, path]) => {
      this.load.spritesheet(key, path, { frameWidth: 64, frameHeight: 64 });
    });
    GAME_CONFIG.PIXEL_VFX_KEYS = PIXEL_VFX.map(([key]) => key);

    // Impact-effects sparks — 128×128 frames, 4 cols × 3 rows = 12 frames each
    const IE_TYPES  = ['01','02','03','04','05','06','07'];
    const IE_COLORS = ['blue','green','grey','purple','red'];
    IE_TYPES.forEach(type => IE_COLORS.forEach(color => {
      this.load.spritesheet(
        `ie_${type}_${color}`,
        `assets/sprites/impact-effects/${type}/${color}/spritesheet.png`,
        { frameWidth: 128, frameHeight: 128 }
      );
    }));
    GAME_CONFIG.IE_TYPES  = IE_TYPES;
    GAME_CONFIG.IE_COLORS = IE_COLORS;

    // Load every animation file for every character
    for (const [charName, cfg] of Object.entries(SPRITE_CONFIG)) {
      for (const [animKey, animCfg] of Object.entries(cfg.anims)) {
        const textureKey = `${charName}_${animKey}`;
        // Skip duplicate texture keys (e.g. Goku attack_spec reuses Attack2)
        if (!this.textures.exists(textureKey)) {
          this.load.spritesheet(textureKey, cfg.dir + animCfg.file, {
            frameWidth:  cfg.frameSize,
            frameHeight: cfg.frameSize,
          });
        }
      }
    }
  }

  create() {

    // Register impact-effects animations
    let ieLoaded = 0;
    (GAME_CONFIG.IE_TYPES || []).forEach(type => {
      (GAME_CONFIG.IE_COLORS || []).forEach(color => {
        const key = `ie_${type}_${color}`;
        if (this.textures.exists(key)) {
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(key, { start: 0, end: 11 }),
            frameRate: 16,
            repeat: 0,
          });
          ieLoaded++;
        }
      });
    });
    GAME_CONFIG.IE_LOADED = ieLoaded > 0;

    // Register Pixel Art RPG VFX animations
    let pvfxLoaded = 0;
    (GAME_CONFIG.PIXEL_VFX_KEYS || []).forEach(key => {
      if (this.textures.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }),
          frameRate: 14,
          repeat: 0,
        });
        pvfxLoaded++;
      }
    });
    GAME_CONFIG.PIXEL_VFX_LOADED = pvfxLoaded > 0;

    GAME_CONFIG.LOADED_SHEETS = {};

    for (const [charName, cfg] of Object.entries(SPRITE_CONFIG)) {
      let allLoaded = true;

      for (const [animKey, animCfg] of Object.entries(cfg.anims)) {
        const textureKey = `${charName}_${animKey}`;

        if (!this.textures.exists(textureKey)) {
          allLoaded = false;
          continue;
        }

        // Create Phaser animation (skip if already registered — dedup)
        const animName = `${charName}_${animKey}`;
        if (!this.anims.exists(animName)) {
          this.anims.create({
            key:       animName,
            frames:    this.anims.generateFrameNumbers(textureKey, {
              start: 0, end: animCfg.frames - 1,
            }),
            frameRate: animCfg.rate,
            repeat:    animCfg.repeat,
          });
        }
      }

      GAME_CONFIG.LOADED_SHEETS[charName] = allLoaded;
      console.log(`[Boot] ${charName}: ${allLoaded ? '✓ sprites loaded' : '✗ missing files, using procedural'}`);
    }

    this.scene.start('MenuScene');
  }
}
