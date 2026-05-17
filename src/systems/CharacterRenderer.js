/**
 * @file CharacterRenderer.js
 * Graphics-based character renderer with animation state machine.
 * Each character subclass overrides drawBody() to define its visual.
 * All drawing is relative to (0,0); the Graphics object is repositioned each frame.
 * Mirroring is handled via container.scaleX = facing.
 */

/* global CharacterRenderer, GAME_CONFIG */

/* global ANIM */
// Animation states shared by all characters — exposed as global for character files
const ANIM = window.ANIM = {
  IDLE:         'idle',
  WALK:         'walk',
  JUMP:         'jump',
  FALL:         'fall',
  ATTACK_LIGHT: 'attack_light',
  ATTACK_HEAVY: 'attack_heavy',
  ATTACK_SPEC:  'attack_spec',
  HURT:         'hurt',
  SHIELD:       'shield',
  DEAD:         'dead',
};

class CharacterRenderer {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene = scene;

    // Container handles position + horizontal flip via scaleX
    this.container = scene.add.container(x, y).setDepth(10);
    this.gfx = scene.add.graphics();
    this.container.add(this.gfx);

    this.state    = ANIM.IDLE;
    this.frame    = 0;
    this.animTime = 0;

    // ms per frame for each state
    this._frameDur = {
      [ANIM.IDLE]:         200,
      [ANIM.WALK]:          90,
      [ANIM.JUMP]:         999,
      [ANIM.FALL]:         999,
      [ANIM.ATTACK_LIGHT]: 60,
      [ANIM.ATTACK_HEAVY]: 80,
      [ANIM.ATTACK_SPEC]:  70,
      [ANIM.HURT]:         80,
      [ANIM.SHIELD]:       999,
      [ANIM.DEAD]:         999,
    };

    this._hitFlashTimer = 0;
    this._invulnTimer   = 0;
    this._invulnBlink   = false;

    // Damage shake offset
    this._shakeX = 0;
    this._shakeY = 0;
  }

  /** Change animation state; resets frame counter if state changed. */
  setState(newState) {
    if (this.state === newState) return;
    this.state    = newState;
    this.frame    = 0;
    this.animTime = 0;
  }

  /**
   * Called every frame by BaseCharacter.
   * @param {number} dt      seconds
   * @param {number} x
   * @param {number} y
   * @param {number} facing  1 or -1
   */
  update(dt, x, y, facing) {
    // Advance animation frame
    this.animTime += dt * 1000;
    const dur = this._frameDur[this.state] || 150;
    if (this.animTime >= dur) {
      this.animTime -= dur;
      this.frame++;
    }

    // Hit flash countdown
    if (this._hitFlashTimer > 0) {
      this._hitFlashTimer -= dt * 1000;
    }

    // Invuln blink
    if (this._invulnTimer > 0) {
      this._invulnTimer -= dt * 1000;
      this._invulnBlink = Math.floor(this.scene.time.now / 100) % 2 === 0;
    } else {
      this._invulnBlink = false;
    }

    // Damage shake decay
    this._shakeX *= 0.7;
    this._shakeY *= 0.7;

    // Position & flip
    this.container.setPosition(
      Math.round(x + this._shakeX),
      Math.round(y + this._shakeY)
    );
    this.container.setScale(facing, 1);

    // Draw
    this.gfx.clear();
    if (this._invulnBlink) return;

    if (this._hitFlashTimer > 0) {
      // White flash: draw white silhouette
      this._drawFlash();
    } else {
      this.drawBody(this.gfx, this.state, this.frame);
    }
  }

  /** Override in subclass: draw the character at (0,0). */
  // eslint-disable-next-line no-unused-vars
  drawBody(gfx, state, frame) {}

  /** Called by CombatSystem on hit. */
  flashHit() {
    this._hitFlashTimer = 90;
    this._shakeX = Phaser.Math.Between(-6, 6);
    this._shakeY = Phaser.Math.Between(-4, 4);
  }

  /** Start invuln blinking for ms milliseconds. */
  startInvuln(ms) {
    this._invulnTimer = ms;
  }

  _drawFlash() {
    // White silhouette — subclass should draw its shape in white
    this.drawBody(this.gfx, this.state, this.frame, true);
  }

  setVisible(v) { this.container.setVisible(v); }
  setAlpha(a)   { this.container.setAlpha(a); }
  setDepth(d)   { this.container.setDepth(d); }

  destroy() {
    this.container.destroy();
  }

  // ── Drawing helpers (used by subclasses) ──────────────────────────────────

  /**
   * Fill a rectangle with optional 1-px outline. All coords relative to (0,0).
   * @param {Phaser.GameObjects.Graphics} g
   * @param {number} x  left edge
   * @param {number} y  top edge
   * @param {number} w
   * @param {number} h
   * @param {number} fill   hex color
   * @param {number} [outline]  hex color; omit to skip outline
   */
  static rect(g, x, y, w, h, fill, outline) {
    if (outline !== undefined) {
      g.fillStyle(outline, 1);
      g.fillRect(x - 1, y - 1, w + 2, h + 2);
    }
    g.fillStyle(fill, 1);
    g.fillRect(x, y, w, h);
  }

  /**
   * Fill a circle with optional 1-px outline.
   */
  static circ(g, x, y, r, fill, outline) {
    if (outline !== undefined) {
      g.fillStyle(outline, 1);
      g.fillCircle(x, y, r + 1);
    }
    g.fillStyle(fill, 1);
    g.fillCircle(x, y, r);
  }

  /**
   * Fill a triangle (three points).
   */
  static tri(g, x1, y1, x2, y2, x3, y3, fill) {
    g.fillStyle(fill, 1);
    g.fillTriangle(x1, y1, x2, y2, x3, y3);
  }

  /** Convenience: get white if flashing, else normal color. */
  static c(color, flash) {
    return flash ? 0xffffff : color;
  }
}
