/**
 * @file BaseCharacter.js
 * Abstract base: movement, physics integration, shield, knockback, hitstun,
 * death/respawn, and animation-state routing. Visual rendering is delegated
 * to a CharacterRenderer subclass instance (this.renderer).
 */

/* global BaseCharacter, GAME_CONFIG, CharacterRenderer, SpriteAnimator, ANIM */

class BaseCharacter {
  /**
   * Returns a SpriteAnimator if a generated sheet exists for charName,
   * otherwise falls back to the procedural CharacterRenderer subclass.
   * Call this from each character's constructor to set this.renderer.
   *
   * @param {Phaser.Scene}    scene
   * @param {number}          x
   * @param {number}          y
   * @param {string}          charName        e.g. 'Naruto'
   * @param {CharacterRenderer} proceduralRenderer  already-constructed fallback
   */
  static pickRenderer(scene, x, y, charName, proceduralRenderer) {
    if (GAME_CONFIG.LOADED_SHEETS && GAME_CONFIG.LOADED_SHEETS[charName]) {
      proceduralRenderer.destroy();
      return new SpriteAnimator(scene, x, y, charName);
    }
    return proceduralRenderer;
  }

  /** Expose _hitstunTimer for subclass checks */
  get hitstunTimer() { return this._hitstunTimer; }


  /**
   * @param {Phaser.Scene}        scene
   * @param {number}              x
   * @param {number}              y
   * @param {number}              playerId   0 or 1
   * @param {InputManager}        input
   * @param {CombatSystem}        combat
   * @param {AnimationManager}    animMgr
   */
  constructor(scene, x, y, playerId, input, combat, animMgr) {
    this.scene    = scene;
    this.playerId = playerId;
    this.input    = input;
    this.combat   = combat;
    this.animMgr  = animMgr;

    // ── Position / Velocity ──────────────────────────────────────
    this.x   = x;
    this.y   = y;
    this.vel = { x: 0, y: 0 };

    // ── State flags ──────────────────────────────────────────────
    this.isGrounded     = false;
    this.onPassThrough  = false;
    this.touchWallL     = false;
    this.touchWallR     = false;
    this.fastFalling    = false;
    this.airDodgeUsed   = false;
    this.isAttacking    = false;
    this.isShielding    = false;
    this.isDead         = false;
    this.isRespawning   = false;
    this.isInvulnerable = false;
    this.isFrozen       = false;
    this.facing         = playerId === 0 ? 1 : -1;

    // ── Stats ────────────────────────────────────────────────────
    this.maxJumps  = 2;
    this.jumpsLeft = 2;
    this.damage    = 0;
    this.stocks    = GAME_CONFIG.STARTING_STOCKS;
    this.shieldHP  = GAME_CONFIG.SHIELD_MAX;

    // ── Directional Influence ────────────────────────────────────
    this.diX = 0;
    this.diY = 0;

    // ── Timers (ms) ──────────────────────────────────────────────
    this._attackCooldown   = 0;
    this._shieldCooldown   = 0;
    this._dodgeTimer       = 0;
    this._freezeTimer      = 0;
    this._shieldBreakTimer = 0;
    this._hitstunTimer     = 0;
    this._attackId         = 0;
    this._attackFacing     = 1;
    this._dropTimer        = 0;   // ms remaining to phase through pass-through platforms  // lock facing during attack

    // ── Renderer — subclasses set this.renderer in their constructor ──
    /** @type {CharacterRenderer} */
    this.renderer = null;

    // ── Shield bubble ────────────────────────────────────────────
    this.shieldSprite = scene.add.ellipse(
      x, y,
      GAME_CONFIG.CHAR_W * 1.7, GAME_CONFIG.CHAR_H * 1.7,
      GAME_CONFIG.COLORS.SHIELD, 0.35
    ).setDepth(12).setVisible(false);

    // Glowing shield ring
    this._shieldRing = scene.add.ellipse(
      x, y,
      GAME_CONFIG.CHAR_W * 1.8, GAME_CONFIG.CHAR_H * 1.8,
      0xaaddff, 0.15
    ).setDepth(11).setVisible(false);

    // ── Damage percent text ──────────────────────────────────────
    this._dmgText = scene.add.text(x, y - GAME_CONFIG.CHAR_H / 2 - 30, '0%', {
      fontSize: '15px',
      fontFamily: '"Courier New", monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 1).setDepth(25);

    // ── Stock icons are managed by HUD ───────────────────────────
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Public update — called by GameScene each frame
  // ════════════════════════════════════════════════════════════════════════

  /** @param {number} dt  delta seconds */
  update(dt) {
    if (this.isDead || this.isRespawning) return;

    // Hitstop freeze
    if (this.isFrozen) {
      this._freezeTimer -= dt * 1000;
      if (this._freezeTimer <= 0) this.isFrozen = false;
      this._syncAncillary();
      return;
    }

    // Hitstun — target can't act, only DI
    if (this._hitstunTimer > 0) {
      this._hitstunTimer -= dt * 1000;
      this.diX = this.input.axisX(this.playerId);
      this.diY = this.input.axisY(this.playerId);
      this._updateAnimState();
      if (this.renderer) this.renderer.update(dt, this.x, this.y, this.facing);
      this._syncAncillary();
      return;
    }

    this._tickCooldowns(dt);
    this._handleShield(dt);

    if (!this.isShielding && !this._shieldBreakTimer) {
      this._handleMovement(dt);
      this._handleAttacks();
    }

    this.diX = this.input.axisX(this.playerId);
    this.diY = this.input.axisY(this.playerId);

    this._updateAnimState();
    if (this.renderer) this.renderer.update(dt, this.x, this.y, this.facing);
    this._syncAncillary();
  }

  /**
   * Apply knockback impulse, enter hitstun.
   * @param {number} kbX
   * @param {number} kbY
   */
  receiveKnockback(kbX, kbY) {
    this.vel.x = kbX;
    this.vel.y = kbY;
    this.isGrounded  = false;
    this.isAttacking = false;
    this._attackCooldown = 0;

    // Hitstun proportional to knockback — capped low so the game stays responsive
    const mag = Math.hypot(kbX, kbY);
    this._hitstunTimer = Phaser.Math.Clamp(mag * 0.04, 40, 320);

    if (this.renderer) this.renderer.setState(ANIM.HURT);
  }

  /** Freeze character for hitstop (ms). */
  freeze(ms) {
    this.isFrozen     = true;
    this._freezeTimer = Math.max(this._freezeTimer, ms);
  }

  /** Called by PhysicsSystem when character exits blast zone. */
  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.stocks--;

    if (this.renderer) {
      this.renderer.setState(ANIM.DEAD);
      this.scene.tweens.add({
        targets:  this.renderer.container,
        angle:    720,
        alpha:    0,
        scaleX:   0.15,
        scaleY:   0.15,
        duration: 600,
        ease:     'Quad.easeIn',
        onComplete: () => {
          const cont = this.renderer.container;
          cont.angle = 0;
          cont.setAlpha(0);                          // stays hidden until respawn
          cont.setScale(this.renderer.scale || 1);   // restore scale, no scaleX flip
        },
      });
    }

    this.shieldSprite.setVisible(false);
    this._shieldRing.setVisible(false);
    this.scene.events.emit('characterDied', { char: this });

    if (this.stocks > 0) {
      this.scene.time.delayedCall(GAME_CONFIG.RESPAWN_DELAY, () => this._respawn());
    } else {
      this.scene.events.emit('gameOver', { loser: this });
    }
  }

  breakShield() {
    this.isShielding       = false;
    this.shieldHP          = 0;
    this._shieldBreakTimer = GAME_CONFIG.SHIELD_BREAK_MS;
    this.shieldSprite.setVisible(false);
    this._shieldRing.setVisible(false);
    this.scene.cameras.main.flash(200, 180, 220, 255);
    this._emitHitParticles(this.x, this.y, 0x66ccff, 18);
  }

  destroy() {
    if (this.renderer) this.renderer.destroy();
    this.shieldSprite.destroy();
    this._shieldRing.destroy();
    this._dmgText.destroy();
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Extension points for subclasses
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Execute a character-specific attack.
   * @param {string}  type     'light' | 'heavy' | 'special' | 'grab'
   * @param {number}  axisX
   * @param {number}  axisY
   * @param {boolean} airborne
   */
  // eslint-disable-next-line no-unused-vars
  doAttack(type, axisX, axisY, airborne) {}

  // ════════════════════════════════════════════════════════════════════════
  //  Private helpers
  // ════════════════════════════════════════════════════════════════════════

  _handleMovement(dt) {
    const ax = this.input.axisX(this.playerId);
    const ay = this.input.axisY(this.playerId);

    // Don't change facing during attacks
    if (!this.isAttacking) {
      if (ax !== 0) this.facing = ax;
    }

    // Horizontal — allow reduced movement mid-attack so character isn't rooted
    if (this.isGrounded) {
      if (!this.isAttacking) {
        this.vel.x = ax * GAME_CONFIG.WALK_SPEED;
      } else if (ax !== 0) {
        this.vel.x = ax * GAME_CONFIG.WALK_SPEED * 0.3;
      }
    } else {
      if (ax !== 0) {
        this.vel.x += ax * 900 * dt;
        const cap = GAME_CONFIG.AIR_SPEED;
        this.vel.x = Phaser.Math.Clamp(this.vel.x, -cap, cap);
      }
    }

    // Jump (buffer check — wall jump is separate, no double-consume)
    if (this.input.consumeBuffer(this.playerId, 'up')) {
      // Wall jump takes priority if touching a wall and airborne
      if (!this.isGrounded && (this.touchWallL || this.touchWallR)) {
        const wallDir = this.touchWallL ? 1 : -1;
        this.vel.x    = wallDir * GAME_CONFIG.WALL_JUMP_X;
        this.vel.y    = GAME_CONFIG.WALL_JUMP_Y;
        this.facing   = wallDir;
        this.jumpsLeft = this.maxJumps - 1;
      } else {
        this._tryJump();
      }
    }

    // Drop through pass-through platforms: down while standing on one
    if (this.isGrounded && this.onPassThrough && this.input.consumeBuffer(this.playerId, 'down')) {
      this._dropTimer = 260;    // ignore pass-through collision for 260 ms
      this.vel.y      = 200;    // push downward so the character clears the platform
      this.isGrounded = false;
    }

    // Fast fall (airborne, already falling, press down)
    if (!this.isGrounded && ay > 0 && this.vel.y > 0) {
      this.fastFalling = true;
    }

    // Air dodge
    if (this.input.consumeBuffer(this.playerId, 'shield') &&
        !this.isGrounded && !this.airDodgeUsed) {
      this._airDodge(ax, ay);
    }
  }

  _tryJump() {
    if (this.isGrounded) {
      this.vel.y      = GAME_CONFIG.JUMP_VELOCITY;
      this.isGrounded = false;
      this.jumpsLeft  = this.maxJumps - 1;
    } else if (this.jumpsLeft > 0) {
      this.vel.y = GAME_CONFIG.DOUBLE_JUMP_VEL;
      this.jumpsLeft--;
      // Double-jump particle puff
      this._emitHitParticles(this.x, this.y + 20, 0xaaccff, 8);
    }
  }

  _airDodge(ax, ay) {
    this.airDodgeUsed = true;
    let dx = ax, dy = ay;
    if (dx === 0 && dy === 0) dx = this.facing;
    const len = Math.hypot(dx, dy) || 1;
    this.vel.x = (dx / len) * GAME_CONFIG.AIR_DODGE_SPEED;
    this.vel.y = (dy / len) * GAME_CONFIG.AIR_DODGE_SPEED;
    this._setInvuln(GAME_CONFIG.AIR_DODGE_INVULN);
    this._dodgeTimer = GAME_CONFIG.AIR_DODGE_MS;
    this._emitHitParticles(this.x, this.y, 0x8888ff, 10);
  }

  _handleShield(dt) {
    if (this._shieldBreakTimer > 0) {
      this._shieldBreakTimer -= dt * 1000;
      if (this._shieldBreakTimer < 0) {
        this._shieldBreakTimer = 0;
        this.shieldHP         = GAME_CONFIG.SHIELD_MAX * 0.3;
        this._shieldCooldown  = GAME_CONFIG.SHIELD_COOLDOWN;
      }
      return;
    }

    const wantShield = this.input.isHeld(this.playerId, 'shield') &&
                       this.isGrounded && this._shieldCooldown <= 0;

    if (wantShield) {
      this.isShielding = true;
      this.shieldHP   -= GAME_CONFIG.SHIELD_DECAY * dt;
      if (this.shieldHP <= 0) { this.breakShield(); return; }
    } else {
      if (this.isShielding) {
        this.isShielding     = false;
        this._shieldCooldown = GAME_CONFIG.SHIELD_COOLDOWN;
      }
      this.shieldHP = Math.min(GAME_CONFIG.SHIELD_MAX,
        this.shieldHP + GAME_CONFIG.SHIELD_REGEN * dt);
    }

    const vis = this.isShielding;
    this.shieldSprite.setVisible(vis);
    this._shieldRing.setVisible(vis);
    if (vis) {
      const ratio = this.shieldHP / GAME_CONFIG.SHIELD_MAX;
      const s = 0.4 + ratio * 0.7;
      this.shieldSprite.setScale(s);
      this._shieldRing.setScale(s + 0.08);
    }
  }

  _handleAttacks() {
    if (this._attackCooldown > 0) return;
    const ax  = this.input.axisX(this.playerId);
    const ay  = this.input.axisY(this.playerId);
    const air = !this.isGrounded;

    let type = null;
    if      (this.input.consumeBuffer(this.playerId, 'grab'))    type = 'grab';
    else if (this.input.consumeBuffer(this.playerId, 'special')) type = 'special';
    else if (this.input.consumeBuffer(this.playerId, 'heavy'))   type = 'heavy';
    else if (this.input.consumeBuffer(this.playerId, 'light'))   type = 'light';

    if (type) {
      this._attackId++;
      this.combat.clearHitSet(this._attackId - 1);
      this.isAttacking    = true;
      this._attackFacing  = this.facing;
      this.doAttack(type, ax, ay, air);
    }
  }

  _tickCooldowns(dt) {
    const ms = dt * 1000;
    if (this._attackCooldown > 0) this._attackCooldown -= ms;
    if (this._shieldCooldown > 0) this._shieldCooldown -= ms;
    if (this._dodgeTimer > 0) {
      this._dodgeTimer -= ms;
      if (this._dodgeTimer <= 0) { this._dodgeTimer = 0; this.isAttacking = false; }
    }
  }

  _updateAnimState() {
    if (!this.renderer) return;
    // Skip local animation decisions for network-controlled remote characters —
    // their animation is driven by the host's state sync instead.
    if (this.input?.isRemoteControlled?.(this.playerId)) return;

    if (this._hitstunTimer > 0) {
      this.renderer.setState(ANIM.HURT); return;
    }
    if (this.isShielding) {
      this.renderer.setState(ANIM.SHIELD); return;
    }
    if (this.isAttacking) {
      return;
    }
    if (!this.isGrounded) {
      this.renderer.setState(this.vel.y < 0 ? ANIM.JUMP : ANIM.FALL);
    } else {
      const moving = Math.abs(this.vel.x) > 20;
      this.renderer.setState(moving ? ANIM.WALK : ANIM.IDLE);
    }
  }

  // ── Helpers used by subclasses ────────────────────────────────────────

  /**
   * Register a hitbox for one frame. Owner + ID auto-filled.
   * offsetX is pre-multiplied by facing inside addHitbox call site.
   */
  _addHitbox(opts) {
    this.combat.addHitbox({
      owner:   this,
      id:      `${this.playerId}_${this._attackId}`,
      x:       this.x + (opts.offsetX || 0) * this.facing,
      y:       this.y + (opts.offsetY || 0),
      w:       opts.w      || 60,
      h:       opts.h      || 60,
      damage:  opts.damage  || 6,
      kbBase:  opts.kbBase  || 300,
      kbScale: opts.kbScale || 40,
      kbAngle: opts.kbAngle !== undefined
        ? opts.kbAngle
        : (this.facing > 0 ? 30 : 150),
      type:    opts.type    || 'light',
    });
  }

  /**
   * Schedule a hitbox after `delay` ms; total attack lasts `total` ms.
   * Sets _attackCooldown and calls isAttacking = false when done.
   */
  _scheduleHitbox(delay, total, hbOpts) {
    // Apply global timing multipliers — tune ATTACK_STARTUP_MULT / ATTACK_COOLDOWN_MULT
    // in GameConfig without touching individual character files.
    const d = Math.max(delay  * GAME_CONFIG.ATTACK_STARTUP_MULT,  16);
    const t = Math.max(total  * GAME_CONFIG.ATTACK_COOLDOWN_MULT, 80);

    this._attackCooldown = t;
    this.scene.time.delayedCall(d, () => {
      if (this.isDead) return;
      this._addHitbox(hbOpts);
      this._emitHitParticles(
        this.x + (hbOpts.offsetX || 0) * this.facing,
        this.y + (hbOpts.offsetY || 0),
        hbOpts.particleColor || 0xffffff,
        10,
        hbOpts.type || 'light'
      );
    });
    this.scene.time.delayedCall(t, () => {
      this.isAttacking     = false;
      // Recovery window — prevents attack spamming
      this._attackCooldown = GAME_CONFIG.ATTACK_RECOVERY_MS || 220;
    });
  }

  /**
   * Full hit VFX: impact ring + star sparks + streaks.
   * Called automatically by _scheduleHitbox; also usable directly.
   * @param {number} wx
   * @param {number} wy
   * @param {number} color
   * @param {number} [count=12]
   * @param {string} [type='light']
   */
  _emitHitParticles(wx, wy, color, count = 12, type = 'light') {
    const scene = this.scene;

    // Triangle sparks radiating outward
    const sparkCount = type === 'special' ? 16 : type === 'heavy' ? 12 : 8;
    const sparkSize  = type === 'special' ? 14 : type === 'heavy' ? 10 : 7;
    const sparkSpeed = type === 'special' ? 320 : type === 'heavy' ? 250 : 180;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
      const dist  = sparkSpeed * (0.6 + Math.random() * 0.8) * 0.28;
      const col   = i % 2 === 0 ? color : 0xffffff;
      const s     = scene.add.triangle(
        wx, wy,
        0, -sparkSize, sparkSize * 0.5, sparkSize * 0.5, -sparkSize * 0.5, sparkSize * 0.5,
        col, 0.95
      ).setDepth(31).setAngle(Phaser.Math.RadToDeg(angle));

      scene.tweens.add({
        targets: s,
        x: wx + Math.cos(angle) * dist,
        y: wy + Math.sin(angle) * dist,
        scaleX: 0.05, scaleY: 0.05, alpha: 0,
        duration: Phaser.Math.Between(160, 340),
        ease: 'Quad.easeOut',
        onComplete: () => s.destroy(),
      });
    }

    // Dust chips flying outward
    const dustCount = Math.min(count, 8);
    for (let i = 0; i < dustCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = Phaser.Math.Between(20, 80);
      const size  = Phaser.Math.Between(4, 10);
      const p     = scene.add.rectangle(wx, wy, size, size, color, 0.8).setDepth(29);
      scene.tweens.add({
        targets: p,
        x: wx + Math.cos(angle) * dist,
        y: wy + Math.sin(angle) * dist + Phaser.Math.Between(-10, 10),
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(220, 420),
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ── Character-specific VFX helpers ──────────────────────────────────────

  _emitSlash() {} // disabled — replaced by impact-effects sprites

  /** Upward fire burst — rising orange/red embers. */
  _emitFire(wx, wy, count = 12, big = false) {
    const s = this.scene;
    for (let i = 0; i < count; i++) {
      const x  = wx + Phaser.Math.Between(-28, 28);
      const sz = big ? Phaser.Math.Between(10, 24) : Phaser.Math.Between(5, 14);
      const col = Math.random() > 0.45 ? 0xff4400 : 0xff9900;
      const p = s.add.circle(x, wy, sz, col, 0.88).setDepth(34);
      s.tweens.add({
        targets:p, x: x + Phaser.Math.Between(-20, 20),
        y: wy - Phaser.Math.Between(50, big ? 160 : 100),
        alpha:0, scaleX:0.05, scaleY:0.05,
        duration: Phaser.Math.Between(300, 650), ease:'Quad.easeOut',
        onComplete:()=>p.destroy(),
      });
    }
  }

  /** Ki / energy orbs that bloom outward then fade. */
  _emitKi(wx, wy, color = 0xffff44, count = 10, radius = 70) {
    const s = this.scene;
    // Central flash
    const flash = s.add.circle(wx, wy, 22, color, 0.7).setDepth(34);
    s.tweens.add({ targets:flash, scaleX:2.5, scaleY:2.5, alpha:0, duration:280,
      ease:'Quad.easeOut', onComplete:()=>flash.destroy() });

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI*2*i/count) + Math.random()*0.5;
      const dist  = radius * (0.5 + Math.random()*0.8);
      const sz    = Phaser.Math.Between(4, 12);
      const p = s.add.circle(wx, wy, sz, color, 0.9).setDepth(33);
      s.tweens.add({
        targets:p, x:wx+Math.cos(angle)*dist, y:wy+Math.sin(angle)*dist-10,
        alpha:0, scaleX:0.1, scaleY:0.1,
        duration:Phaser.Math.Between(220, 480), ease:'Quad.easeOut',
        onComplete:()=>p.destroy(),
      });
    }
  }

  /** Dark energy — black/purple wisps. */
  _emitDark(wx, wy, count = 10) {
    const s = this.scene;
    const colors = [0x220033, 0x440066, 0x660099, 0x110022];
    for (let i = 0; i < count; i++) {
      const angle = Math.random()*Math.PI*2;
      const dist  = Phaser.Math.Between(20, 80);
      const col   = colors[Math.floor(Math.random()*colors.length)];
      const sz    = Phaser.Math.Between(8, 20);
      const p = s.add.circle(wx, wy, sz, col, 0.85).setDepth(33);
      s.tweens.add({
        targets:p, x:wx+Math.cos(angle)*dist, y:wy+Math.sin(angle)*dist,
        alpha:0, scaleX:0.05, scaleY:0.05,
        duration:Phaser.Math.Between(280, 560), ease:'Quad.easeOut',
        onComplete:()=>p.destroy(),
      });
    }
  }

  /** Water splash — blue droplets arc upward and fall. */
  _emitWater(wx, wy, count = 10) {
    const s = this.scene;
    for (let i = 0; i < count; i++) {
      const vx = Phaser.Math.Between(-120, 120);
      const vy = Phaser.Math.Between(-180, -60);
      const sz = Phaser.Math.Between(4, 10);
      const col = Math.random() > 0.5 ? 0x0088ff : 0x44ccff;
      const p = s.add.circle(wx, wy, sz, col, 0.9).setDepth(33);
      s.tweens.add({
        targets:p, x:wx + vx*0.4, y:wy + vy*0.4,
        alpha:0, scaleX:0.1, scaleY:0.1,
        duration:Phaser.Math.Between(250, 500), ease:'Quad.easeOut',
        onComplete:()=>p.destroy(),
      });
    }
  }


  /** Set invulnerability for N ms. Also tells renderer to blink. */
  _setInvuln(ms) {
    this.isInvulnerable = true;
    if (this.renderer) this.renderer.startInvuln(ms);
    this.scene.time.delayedCall(ms, () => {
      this.isInvulnerable = false;
    });
  }

  _respawn() {
    this.isDead         = false;
    this.isRespawning   = true;
    this.damage         = 0;
    this.vel.x          = 0;
    this.vel.y          = 0;
    this.shieldHP       = GAME_CONFIG.SHIELD_MAX;
    this.isAttacking    = false;
    this.isShielding    = false;
    this.jumpsLeft      = this.maxJumps;
    this._hitstunTimer  = 0;
    this._attackCooldown = 0;

    this.x = GAME_CONFIG.WIDTH / 2 + (this.playerId === 0 ? -180 : 180);
    this.y = 60;

    if (this.renderer) {
      this.renderer.setState(ANIM.IDLE);
      // Reset transform — use setScale/setAlpha so SpriteAnimator's flipX isn't clobbered
      const cont = this.renderer.container;
      cont.angle = 0;
      cont.setAlpha(0);
      // Restore correct scale (SpriteAnimator handles flip separately via setFlipX)
      const sc = this.renderer.scale || 1;
      cont.setScale(sc);
      // Fade in
      this.scene.tweens.add({
        targets:  cont,
        alpha:    1,
        duration: 350,
        ease:     'Sine.easeOut',
      });
      this.renderer.startInvuln(GAME_CONFIG.RESPAWN_INVULN);
    }

    this._setInvuln(GAME_CONFIG.RESPAWN_INVULN);
    this.scene.time.delayedCall(450, () => { this.isRespawning = false; });
    this.scene.events.emit('characterRespawned', { char: this });
  }

  _syncAncillary() {
    // Shield
    this.shieldSprite.setPosition(this.x, this.y);
    this._shieldRing.setPosition(this.x, this.y);

    // Damage text
    const pct   = Math.floor(this.damage);
    const ratio = Math.min(pct / 150, 1);
    const g     = Math.floor(255 * (1 - ratio));
    const rHex  = 'ff';
    const gHex  = g.toString(16).padStart(2, '0');
    this._dmgText
      .setText(`${pct}%`)
      .setPosition(this.x, this.y - GAME_CONFIG.CHAR_H / 2 - 30)
      .setColor(`#${rHex}${gHex}00`);
  }

  // Removed scripted shape VFX — stubbed so character attack files don't crash
  _emitShockwave() {}
  _emitSmoke()     {}
}
