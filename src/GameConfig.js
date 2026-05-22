/**
 * @file GameConfig.js
 * Central configuration — ALL tuning values live here.
 * No magic numbers anywhere else in the codebase.
 * @namespace GAME_CONFIG
 */

/* global GAME_CONFIG */
const GAME_CONFIG = {

  // ── Canvas ──────────────────────────────────────────────
  WIDTH:  1280,
  HEIGHT: 720,

  // ── World Physics ────────────────────────────────────────
  /** Downward gravity applied to all characters (px/s²) */
  GRAVITY:            3200,   // heavier gravity = less floaty, more Smash-like
  /** Terminal fall speed cap (px/s) */
  MAX_FALL_SPEED:     1300,   // faster falling
  /** Multiplier applied when fast-falling (down + airborne + falling) */
  FAST_FALL_MULT:     1.6,    // less extreme fast-fall since gravity is already high
  /** Ground friction: velocity multiplied this per frame */
  GROUND_FRICTION:    0.55,   // snappier stops
  /** Air horizontal drag: velocity multiplied this per frame */
  AIR_DRAG:           0.94,   // less air drift

  // ── Movement ────────────────────────────────────────────
  WALK_SPEED:         340,    // px/s — snappier ground movement
  JUMP_VELOCITY:     -920,    // stronger jump to compensate for higher gravity
  DOUBLE_JUMP_VEL:   -820,
  AIR_SPEED:          310,    // px/s
  WALL_SLIDE_MAX:      85,
  WALL_JUMP_X:        420,
  WALL_JUMP_Y:       -820,

  // ── Air Dodge ────────────────────────────────────────────
  AIR_DODGE_SPEED:    720,    // launch speed
  AIR_DODGE_MS:       290,    // total dodge duration (ms)
  AIR_DODGE_INVULN:   190,    // invincibility window inside dodge (ms)

  // ── Shield ───────────────────────────────────────────────
  SHIELD_MAX:         100,
  SHIELD_DECAY:        14,    // HP lost per second while shielding
  SHIELD_REGEN:        20,    // HP recovered per second while not shielding
  SHIELD_BREAK_MS:   3500,    // stun duration when shield reaches 0
  SHIELD_COOLDOWN:    350,    // ms before shield usable again after drop

  // ── Knockback ────────────────────────────────────────────
  /** Global knockback multiplier — raise to make the game more explosive */
  KB_SCALE:            1.3,   // more explosive knockback like Smash
  /** Hard cap on knockback launch speed (px/s) */
  KB_MAX:            2800,
  /** Directional Influence strength (0 = none, 0.15 = strong) */
  DI_STRENGTH:        0.12,

  // ── Attack timing multipliers ────────────────────────────
  ATTACK_STARTUP_MULT:  0.5,    // slightly more startup = attacks feel committed
  ATTACK_COOLDOWN_MULT: 0.6,    // more end-lag = punishable on whiff

  // ── Hitstop (freeze frames at 60 fps) ───────────────────
  HITSTOP_LIGHT:       4,    // more hitstop = satisfying impact
  HITSTOP_HEAVY:      10,
  HITSTOP_SPECIAL:     7,
  HITSTOP_GRAB:        3,

  // ── Camera Shake ─────────────────────────────────────────
  SHAKE_HEAVY:   { duration: 220, intensity: 0.018 },
  SHAKE_SPECIAL: { duration: 300, intensity: 0.025 },

  // ── Stocks & Respawn ────────────────────────────────────
  STARTING_STOCKS:     3,
  RESPAWN_DELAY:    2400,     // ms after dying before reappearing
  RESPAWN_INVULN:   3000,     // ms of invincibility after respawn

  // ── Blast Zones (world coords) ──────────────────────────
  BLAST_LEFT:        -340,
  BLAST_RIGHT:       1620,
  BLAST_TOP:         -440,
  BLAST_BOTTOM:       870,

  // ── Character body size ──────────────────────────────────
  CHAR_W: 44,
  CHAR_H: 62,

  // ── Sprite sheet layout (must match generate_sprites.js) ────────────
  SPRITE: {
    FRAME_W: 256,   // px per frame  (4×4 grid = 1024×1024 total)
    FRAME_H: 256,
    COLS:    4,
    ROWS:    4,
    SCALE:   0.26,  // shrink 256px frame to ~66px on screen
  },

  // ── Character registry ───────────────────────────────────
  /** Populated by each character file: { Naruto: NarutoCharacter, … } */
  CHARACTERS: {},

  /** Populated by BootScene after preload: { Naruto: true/false, … } */
  LOADED_SHEETS: {},

  // ── Stage list ───────────────────────────────────────────
  STAGES: ['battlefield', 'final_destination'],

  // ── Colors (hex) ─────────────────────────────────────────
  COLORS: {
    NARUTO:  0xFF7722,
    GOKU:    0x3366FF,
    ICHIGO:  0x2A2A3A,
    LUFFY:   0xCC2200,
    TANJIRO: 0x1B4D2E,
    P1_HUD:  0x44AAFF,
    P2_HUD:  0xFF4444,
    SHIELD:  0x66CCFF,
    HIT:     0xFFFFFF,
    PLATFORM_SOLID:  0x1e2d3d,
    PLATFORM_PASS:   0x1a2e1a,
    BG_BATTLEFIELD:  0x07060f,
    BG_FINAL:        0x030308,
  },

  // ── Character palettes ───────────────────────────────────
  PALETTE: {
    SKIN:        0xf4c07a,
    SKIN_SHADOW: 0xc8884a,
    OUTLINE:     0x0a0a12,
    WHITE:       0xeeeef8,

    NARUTO: {
      hair:       0xf5c518,
      hairShadow: 0xc09010,
      outfit:     0xe05a10,
      outfitDark: 0x992800,
      headband:   0x8899bb,
      plate:      0xaabbdd,
      eyes:       0x3388ff,
    },
    GOKU: {
      hair:       0x1a1a22,
      hairHi:     0x44445a,
      gi:         0xff7700,
      giDark:     0xbb4400,
      inner:      0x2244cc,
      innerDark:  0x112288,
      belt:       0x0a1a88,
      eyes:       0x1a1a22,
    },
    ICHIGO: {
      hair:       0xcc4400,
      hairHi:     0xff6622,
      robe:       0x12121e,
      robeDark:   0x080810,
      robeHi:     0x222238,
      sword:      0x2a3a4a,
      swordEdge:  0x7a9ab8,
      eyes:       0x774422,
    },
    LUFFY: {
      hair:       0x151515,
      vest:       0xcc1a1a,
      vestDark:   0x881010,
      shirt:      0xddddee,
      shorts:     0x2233aa,
      shortsDark: 0x112266,
      hat:        0xc8a050,
      hatBrim:    0x8a6820,
      eyes:       0x151515,
      scar:       0xaa4422,
    },
    TANJIRO: {
      hair:       0x0f0f18,
      hairTip:    0x882211,
      uniform:    0x172a1f,
      uniformDk:  0x0c1a12,
      uniformPat: 0x0a1810,
      pants:      0x0e0e1a,
      earR:       0xff3311,
      earG:       0x22aa44,
      scar:       0x881a0a,
      eyes:       0x2a5030,
      blade:      0x1a2a38,
    },
  },
};
