/**
 * @file SpriteAnimator.js
 * Drives a Phaser.GameObjects.Sprite with per-animation spritesheets.
 * Each animation (idle, walk, attack…) lives in its own texture; Phaser
 * handles the texture swap automatically when play() is called because each
 * Phaser.Animation carries its source texture key in the frame data.
 */

/* global SpriteAnimator, GAME_CONFIG, ANIM */

class SpriteAnimator {
  /**
   * @param {Phaser.Scene} scene
   * @param {number}       x
   * @param {number}       y
   * @param {string}       charName  e.g. 'Naruto'
   */
  constructor(scene, x, y, charName) {
    this.scene    = scene;
    this.charName = charName;

    const cfg   = GAME_CONFIG.SPRITE_CONFIG[charName];
    this.scale  = cfg ? cfg.scale : 0.5;

    // Start with idle texture
    const initKey = `${charName}_idle`;
    this.sprite = scene.add.sprite(x, y, initKey, 0)
      .setScale(this.scale)
      .setDepth(10)
      // Anchor at bottom-center so feet align with hitbox bottom
      .setOrigin(0.5, 1);

    this.state    = ANIM.IDLE;
    this._playing = '';

    this._hitFlashTimer = 0;
    this._invulnTimer   = 0;
    this._invulnBlink   = false;

    // ANIM state → animation key suffix
    this._stateMap = {
      [ANIM.IDLE]:         'idle',
      [ANIM.WALK]:         'walk',
      [ANIM.JUMP]:         'jump',
      [ANIM.FALL]:         'fall',
      [ANIM.ATTACK_LIGHT]: 'attack_light',
      [ANIM.ATTACK_HEAVY]: 'attack_heavy',
      [ANIM.ATTACK_SPEC]:  'attack_spec',
      [ANIM.HURT]:         'hurt',
      [ANIM.SHIELD]:       'idle',   // no shield anim → reuse idle
      [ANIM.DEAD]:         'dead',
    };

    // Play initial animation
    this._play(ANIM.IDLE);
  }

  // ── Public API (mirrors CharacterRenderer) ──────────────────────────────────

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this._play(newState);
  }

  // Force state — used by network sync for remote characters.
  // Only restarts the animation when the KEY changes (different state).
  // Uses currentAnim.key as truth instead of isPlaying which can be unreliable.
  forceState(newState) {
    const suffix = this._stateMap[newState] || 'idle';
    const key    = `${this.charName}_${suffix}`;
    this.state    = newState;
    this._playing = key;

    const curKey = this.sprite.anims?.currentAnim?.key;
    if (curKey !== key && this.scene.anims.exists(key)) {
      this.sprite.play(key, true);
    }
  }

  update(dt, x, y, facing) {
    // Position sprite so the character's feet (measured footRatio down the frame)
    // align exactly with the hitbox bottom (y + CHAR_H/2 = ground contact point).
    //
    // With origin(0.5, 1): sprite bottom = spriteBottomY
    // Character feet inside frame = footRatio * frameSize * scale from sprite top
    //   => feet Y = spriteBottom - displayH + footRatio * displayH
    //             = spriteBottom - displayH * (1 - footRatio)
    // We want feet Y = y + CHAR_H/2, so:
    //   spriteBottom = y + CHAR_H/2 + displayH * (1 - footRatio)
    const cfg      = GAME_CONFIG.SPRITE_CONFIG[this.charName] || {};
    const foot     = cfg.footRatio || 0.65;
    const displayH = (cfg.frameSize || 200) * this.scale;
    const spriteBottomY = y + GAME_CONFIG.CHAR_H / 2 + displayH * (1 - foot);
    this.sprite.setPosition(Math.round(x), Math.round(spriteBottomY));
    // LuizMelo sprites face RIGHT — flip for left-facing
    this.sprite.setFlipX(facing < 0);

    // Hit flash: white tint
    if (this._hitFlashTimer > 0) {
      this._hitFlashTimer -= dt * 1000;
      this.sprite.setTint(0xffffff);
    } else {
      this.sprite.clearTint();
    }

    // Invuln blink
    if (this._invulnTimer > 0) {
      this._invulnTimer -= dt * 1000;
      const blink = Math.floor(this.scene.time.now / 100) % 2 === 0;
      this.sprite.setAlpha(blink ? 0.15 : 1);
    } else {
      if (this.sprite.alpha < 1) this.sprite.setAlpha(1);
    }

    // Keep animation playing (setState may not have been called this frame)
    this._play(this.state);
  }

  flashHit()       { this._hitFlashTimer = 100; }
  startInvuln(ms)  { this._invulnTimer = ms; }

  setVisible(v) { this.sprite.setVisible(v); }
  setAlpha(a)   { this.sprite.setAlpha(a); }
  setDepth(d)   { this.sprite.setDepth(d); }

  // BaseCharacter's death tween targets .container — expose sprite as container
  get container() { return this.sprite; }

  destroy() { this.sprite.destroy(); }

  // ── Private ──────────────────────────────────────────────────────────────────

  _play(state) {
    const suffix = this._stateMap[state] || 'idle';
    const key    = `${this.charName}_${suffix}`;
    if (this._playing === key) return;

    if (this.scene.anims.exists(key)) {
      this.sprite.play(key, true);
      this._playing = key;
    }
  }
}
