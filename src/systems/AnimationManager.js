/**
 * @file AnimationManager.js
 * Lightweight visual effect helpers. Character-specific animations are now
 * handled by CharacterRenderer subclasses; this class handles scene-level
 * effects like screen flash and shield visuals.
 */

/* global AnimationManager */

class AnimationManager {
  /** @param {Phaser.Scene} scene */
  constructor(scene) { this.scene = scene; }

  /**
   * Flash the character's renderer on hit.
   * GameScene overrides this to call renderer.flashHit() directly.
   * @param {*} sprite  legacy param (unused after override)
   */
  // eslint-disable-next-line no-unused-vars
  flashHit(sprite) {}

  /**
   * Shield bubble pulse (visual only, no sound).
   * @param {Phaser.GameObjects.Ellipse} shieldSprite
   */
  shieldPulse(shieldSprite) {
    this.scene.tweens.add({
      targets: shieldSprite,
      scaleX:  1.12, scaleY: 1.12,
      duration: 90,
      yoyo:    true,
      ease:    'Sine.easeInOut',
    });
  }

  /**
   * Sustained power-boost aura tween on the renderer container.
   * @param {CharacterRenderer} renderer
   * @param {number}            duration  ms
   * @param {number}            [color]   tint color (unused for Graphics objects)
   */
  powerAura(renderer, duration) {
    // Pulse the container scale slightly
    const tween = this.scene.tweens.add({
      targets:  renderer.container,
      scaleX:   renderer.container.scaleX * 1.06,
      scaleY:   1.06,
      duration: 180,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
    this.scene.time.delayedCall(duration, () => {
      tween.stop();
      renderer.container.setScale(renderer.container.scaleX > 0 ? 1 : -1, 1);
    });
  }

  /**
   * Attack startup pulse.
   * @param {CharacterRenderer} renderer
   */
  attackPulse(renderer) {
    const sx = renderer.container.scaleX;
    this.scene.tweens.add({
      targets:  renderer.container,
      scaleX:   sx * 1.14,
      scaleY:   1.14,
      duration: 55,
      yoyo:     true,
      ease:     'Quad.easeOut',
    });
  }

  /**
   * Death spin-out (legacy; BaseCharacter now does this via tween on container).
   */
  deathSpin() {}

  /**
   * Respawn blink (handled inside BaseCharacter via renderer.startInvuln).
   */
  respawnBlink() {}
}
