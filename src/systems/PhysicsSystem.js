/**
 * @file PhysicsSystem.js
 * Handles gravity, platform collision, wall-slide/jump, and blast-zone detection.
 * All characters are registered here; the GameScene calls update() each frame.
 */

/* global PhysicsSystem, GAME_CONFIG */

class PhysicsSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object[]} platforms  Array of platform descriptor objects built by GameScene
   */
  constructor(scene, platforms) {
    this.scene = scene;
    this.platforms = platforms;   // { x, y, w, h, passThrough }
    /** @type {BaseCharacter[]} */
    this.characters = [];
  }

  /** @param {BaseCharacter} char */
  register(char) { this.characters.push(char); }

  /**
   * Main physics tick. Call before character updates.
   * @param {number} dt  delta in seconds
   */
  update(dt) {
    for (const c of this.characters) {
      if (c.isDead || c.isRespawning) continue;
      this._applyGravity(c, dt);
      this._moveAndCollide(c, dt);
      this._checkBlastZone(c);
    }
  }

  // ── Private ─────────────────────────────────────────────────────────────

  _applyGravity(c, dt) {
    // Tick drop-through timer
    if (c._dropTimer > 0) {
      c._dropTimer -= dt * 1000;
      if (c._dropTimer < 0) c._dropTimer = 0;
    }

    if (c.isGrounded) return;
    let grav = GAME_CONFIG.GRAVITY;

    // Fast-fall: only when falling (vy > 0) and player presses down
    if (c.fastFalling && c.vel.y > 0) grav *= GAME_CONFIG.FAST_FALL_MULT;

    c.vel.y += grav * dt;
    if (c.vel.y > GAME_CONFIG.MAX_FALL_SPEED) c.vel.y = GAME_CONFIG.MAX_FALL_SPEED;
  }

  _moveAndCollide(c, dt) {
    // Proposed new position
    let nx = c.x + c.vel.x * dt;
    let ny = c.y + c.vel.y * dt;

    const hw = GAME_CONFIG.CHAR_W / 2;
    const hh = GAME_CONFIG.CHAR_H / 2;

    let grounded = false;
    let wallLeft = false;
    let wallRight = false;
    c.onPassThrough = false;   // reset each frame; set true below if landing on pass-through

    for (const plat of this.platforms) {
      const platRight  = plat.x + plat.w;
      const platBottom = plat.y + plat.h;

      // Horizontal overlap check (uses new horizontal, old vertical)
      const overlapH = nx + hw > plat.x && nx - hw < platRight;
      // Vertical overlap check
      const overlapV = ny + hh > plat.y && ny - hh < platBottom;

      // ── Pass-through platforms ──────────────────────────────────────────
      if (plat.passThrough) {
        // Skip all collision while drop-through timer is active
        if (c._dropTimer > 0) continue;

        const prevFeetY = c.y + hh;
        const feetY     = ny + hh;

        // Land when:
        //  • not moving upward (vel.y >= 0 covers standing still AND falling)
        //  • feet were at or above the platform surface last frame (+2px tolerance)
        //  • horizontally overlapping
        //  • feet reach or cross the platform surface this frame
        if (c.vel.y >= 0 &&
            prevFeetY <= plat.y + 2 &&
            overlapH &&
            feetY >= plat.y) {
          ny = plat.y - hh;
          c.vel.y = 0;
          grounded = true;
          c.onPassThrough = true;
        }
        continue;
      }

      // ── Solid platforms ─────────────────────────────────────────────────
      if (!overlapH && !overlapV) continue;

      // Resolve vertical (landing on top / hitting ceiling)
      if (overlapH) {
        const feetY = ny + hh;
        const headY = ny - hh;
        const prevFeetY = c.y + hh;
        const prevHeadY = c.y - hh;

        // Landing
        if (c.vel.y >= 0 && prevFeetY <= plat.y && feetY >= plat.y) {
          ny = plat.y - hh;
          c.vel.y = 0;
          grounded = true;
        }
        // Ceiling
        else if (c.vel.y < 0 && prevHeadY >= platBottom && headY <= platBottom) {
          ny = platBottom + hh;
          c.vel.y = 0;
        }
      }

      // Resolve horizontal (wall collision)
      if (overlapV) {
        const rightEdge = nx + hw;
        const leftEdge  = nx - hw;
        const prevRight = c.x + hw;
        const prevLeft  = c.x - hw;

        if (c.vel.x > 0 && prevRight <= plat.x && rightEdge >= plat.x) {
          nx = plat.x - hw;
          c.vel.x = 0;
          wallRight = true;
        } else if (c.vel.x < 0 && prevLeft >= platRight && leftEdge <= platRight) {
          nx = platRight + hw;
          c.vel.x = 0;
          wallLeft = true;
        }
      }
    }

    c.x = nx;
    c.y = ny;
    c.isGrounded  = grounded;
    c.touchWallL  = wallLeft;
    c.touchWallR  = wallRight;

    if (grounded) {
      c.jumpsLeft   = c.maxJumps;
      c.fastFalling = false;
      c.airDodgeUsed = false;
    }

    // Ground friction / air drag
    if (grounded && !c.isAttacking) {
      c.vel.x *= GAME_CONFIG.GROUND_FRICTION;
      if (Math.abs(c.vel.x) < 5) c.vel.x = 0;
    } else if (!grounded) {
      c.vel.x *= GAME_CONFIG.AIR_DRAG;
    }

    // Sync display object
    // Renderer positioning is handled by CharacterRenderer.update() in BaseCharacter.update()
  }

  _checkBlastZone(c) {
    const outside =
      c.x < GAME_CONFIG.BLAST_LEFT  ||
      c.x > GAME_CONFIG.BLAST_RIGHT ||
      c.y < GAME_CONFIG.BLAST_TOP   ||
      c.y > GAME_CONFIG.BLAST_BOTTOM;

    if (outside && !c.isDead) {
      c.die();
    }
  }
}
