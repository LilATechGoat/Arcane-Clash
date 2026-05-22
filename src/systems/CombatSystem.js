/**
 * @file CombatSystem.js
 * Handles hit detection, damage application, knockback calculation,
 * hitstop (freeze frames), and screen shake. No character-specific logic here.
 */

/* global CombatSystem, GAME_CONFIG */

class CombatSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {AnimationManager} animManager
   */
  constructor(scene, animManager) {
    this.scene      = scene;
    this.animMgr    = animManager;
    /** @type {BaseCharacter[]} */
    this.characters = [];
    /** Hitboxes currently active this frame: Array of hitbox descriptor objects */
    this._activeHitboxes = [];
    /** Set of 'attackId_targetId' strings to prevent double-hit in same attack. */
    this._hitSet = new Set();
  }

  /** @param {BaseCharacter} char */
  register(char) { this.characters.push(char); }

  /**
   * Register an active hitbox for one frame of detection.
   * @param {Object} hb
   * @param {number}        hb.x         World-space centre X
   * @param {number}        hb.y         World-space centre Y
   * @param {number}        hb.w         Width
   * @param {number}        hb.h         Height
   * @param {number}        hb.damage    Base damage dealt
   * @param {number}        hb.kbBase    Base knockback
   * @param {number}        hb.kbScale   Knockback scaling with damage %
   * @param {number}        hb.kbAngle   Launch angle in degrees (0 = right)
   * @param {string}        hb.type      'light' | 'heavy' | 'special' | 'grab'
   * @param {BaseCharacter} hb.owner     Character that threw the hitbox
   * @param {string}        hb.id        Unique attack instance id
   */
  addHitbox(hb) {
    this._activeHitboxes.push(hb);
  }

  /**
   * Main tick — run after character updates each frame.
   */
  update() {
    for (const hb of this._activeHitboxes) {
      for (const target of this.characters) {
        if (target === hb.owner) continue;
        if (target.isDead || target.isRespawning) continue;

        const hitKey = `${hb.id}_${target.playerId}`;
        if (this._hitSet.has(hitKey)) continue;

        if (target.isInvulnerable) continue;
        if (target.isShielding && !this._isGrab(hb)) {
          this._applyShieldHit(hb, target);
          this._hitSet.add(hitKey);
          continue;
        }

        if (this._overlaps(hb, target)) {
          this._applyHit(hb, target);
          this._hitSet.add(hitKey);
        }
      }
    }
    this._activeHitboxes = [];
  }

  /** Clear hit-set at start of each new attack swing (called by BaseCharacter). */
  clearHitSet(attackId) {
    for (const key of [...this._hitSet]) {
      if (key.startsWith(`${attackId}_`)) this._hitSet.delete(key);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _isGrab(hb) { return hb.type === 'grab'; }

  _overlaps(hb, target) {
    const hw = GAME_CONFIG.CHAR_W / 2;
    const hh = GAME_CONFIG.CHAR_H / 2;
    return (
      Math.abs(hb.x - target.x) < hb.w / 2 + hw &&
      Math.abs(hb.y - target.y) < hb.h / 2 + hh
    );
  }

  _applyHit(hb, target) {
    // Damage
    target.damage += hb.damage;

    // Hitstop: freeze both attacker and target
    const stopFrames = GAME_CONFIG[`HITSTOP_${hb.type.toUpperCase()}`] || GAME_CONFIG.HITSTOP_LIGHT;
    this._applyHitstop(hb.owner, target, stopFrames);

    // Knockback
    const totalKB = this._calcKnockback(hb, target.damage);
    const rad     = Phaser.Math.DegToRad(hb.kbAngle);

    // IMPORTANT: Phaser's Y-axis points DOWN, but attack angles are defined in
    // standard math convention (90° = up, 270° = down). Negate sin so that
    // angle=90 launches UP and angle=270 launches DOWN as expected.
    const di  = GAME_CONFIG.DI_STRENGTH;
    const diX = target.diX || 0;
    const diY = target.diY || 0;
    const kbX =  Math.cos(rad) * totalKB + diX * di * totalKB;
    const kbY = -Math.sin(rad) * totalKB + diY * di * totalKB;

    target.receiveKnockback(kbX, kbY);

    // Visual feedback
    if (target.renderer) target.renderer.flashHit();

    // Sprite-based hit effect (the imported VFX sheet)
    if (this.scene.playHitVFX) {
      this.scene.playHitVFX(target.x, target.y - 20, hb.type, hb.owner);
    }

    // Supplemental procedural particles — use attacker's particle color if set
    const hitColor = hb.particleColor ||
                    (hb.type === 'heavy'   ? 0xff6600 :
                     hb.type === 'special' ? 0xaa44ff :
                     hb.type === 'grab'    ? 0xffffff : 0xffee44);
    hb.owner._emitHitParticles(hb.x, hb.y, hitColor, 8, hb.type);

    // Screen shake for heavy / special
    if (hb.type === 'heavy') {
      const s = GAME_CONFIG.SHAKE_HEAVY;
      this.scene.cameras.main.shake(s.duration, s.intensity);
    } else if (hb.type === 'special') {
      const s = GAME_CONFIG.SHAKE_SPECIAL;
      this.scene.cameras.main.shake(s.duration, s.intensity);
    }

    // Emit event for HUD to react
    this.scene.events.emit('hit', { attacker: hb.owner, target, hb });
  }

  _applyShieldHit(hb, target) {
    target.shieldHP -= hb.damage * 0.6;
    this.animMgr.shieldPulse(target.shieldSprite);
    if (target.shieldHP <= 0) target.breakShield();
  }

  _calcKnockback(hb, targetDamage) {
    // Smash Bros style: strong base knockback at 0% that scales explosively.
    //   • 0%   → already flies noticeably (base = kbBase * 0.55)
    //   • 50%  → solid launch
    //   • 100% → kill territory for most moves
    //   • 150% → everything kills
    const p      = Math.max(targetDamage, 0);
    const base   = hb.kbBase * 0.80;                        // Smash-level base — always flies
    const growth = hb.kbScale * Math.pow(p, 1.3) / 24;     // faster growth curve
    const total  = (base + growth) * GAME_CONFIG.KB_SCALE;
    return Math.min(total, GAME_CONFIG.KB_MAX);
  }

  _applyHitstop(attacker, target, frames) {
    const ms = frames * (1000 / 60);
    attacker.freeze(ms);
    target.freeze(ms);
  }
}
