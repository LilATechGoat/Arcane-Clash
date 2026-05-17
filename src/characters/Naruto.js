/**
 * @file Naruto.js
 * Naruto Uzumaki — rushdown fighter.
 * Visual: orange outfit, spiky blonde hair, headband, whisker marks.
 */

/* global NarutoCharacter, BaseCharacter, CharacterRenderer, ANIM, GAME_CONFIG */

// ── Naruto Renderer ───────────────────────────────────────────────────────────

class NarutoRenderer extends CharacterRenderer {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.P = GAME_CONFIG.PALETTE;
  }

  drawBody(gfx, state, frame, flash = false) {
    const P  = this.P;
    const c  = CharacterRenderer.c;
    const R  = CharacterRenderer.rect;
    const C  = CharacterRenderer.circ;
    const T  = CharacterRenderer.tri;
    const OL = P.OUTLINE;

    // ── Walk cycle: leg offset ──────────────────────────────────
    let legLY = 0, legRY = 0;
    if (state === ANIM.WALK) {
      const cycle = frame % 4;
      legLY = [0, 4, 0, -4][cycle];
      legRY = [0, -4, 0, 4][cycle];
    }

    // ── Attack extension ────────────────────────────────────────
    let armExt = 0;
    if (state === ANIM.ATTACK_LIGHT) armExt = frame < 2 ? 10 : 5;
    if (state === ANIM.ATTACK_HEAVY) armExt = frame < 2 ? 14 : 7;
    if (state === ANIM.ATTACK_SPEC)  armExt = frame < 3 ? 12 : 6;

    // ── Jump / fall lean ────────────────────────────────────────
    const bodyLean = state === ANIM.JUMP ? -3 : state === ANIM.FALL ? 2 : 0;

    // ── Idle bob ────────────────────────────────────────────────
    const bob = state === ANIM.IDLE ? (frame % 2 === 0 ? 0 : -1) : 0;

    const by = bob + bodyLean;  // body base Y

    // ── Draw order: back arm → body → front arm → head ──────────

    // Back arm (left when facing right)
    R(gfx, 2, by - 16, 6, 18, c(P.NARUTO.outfit, flash), c(OL, flash));

    // Legs
    R(gfx, -12, by + 14 + legLY, 11, 22, c(P.NARUTO.outfit, flash), c(OL, flash));
    R(gfx,   2, by + 14 + legRY, 11, 22, c(P.NARUTO.outfit, flash), c(OL, flash));
    // Boot tops
    R(gfx, -12, by + 30 + legLY, 11, 8,  c(0x333344, flash));
    R(gfx,   2, by + 30 + legRY, 11, 8,  c(0x333344, flash));

    // Torso
    R(gfx, -13, by - 20, 26, 34, c(P.NARUTO.outfit, flash), c(OL, flash));
    // Dark jacket seam / collar
    R(gfx, -4,  by - 20,  8, 14, c(P.NARUTO.outfitDark, flash));
    // White under-shirt visible at neck
    R(gfx, -3,  by - 20,  6,  8, c(P.WHITE, flash));

    // Belt
    R(gfx, -13, by + 10, 26, 6, c(0xffffff, flash), c(OL, flash));
    R(gfx, -3,  by + 11,  6, 4, c(0xaaaaaa, flash));  // buckle

    // Front arm + fist (punching arm)
    R(gfx, -18, by - 16, 6, 18, c(P.NARUTO.outfit, flash), c(OL, flash));
    R(gfx, -20 - armExt, by - 2, 10, 10, c(P.SKIN, flash), c(OL, flash));

    // ── Head ────────────────────────────────────────────────────
    C(gfx, -2, by - 34, 14, c(P.SKIN, flash), c(OL, flash));

    // Spiky hair — back spikes
    T(gfx, -14, by - 38, -8, by - 52, -4, by - 40, c(P.NARUTO.hair, flash));
    T(gfx, -6,  by - 42, 0,  by - 56, 6,  by - 42, c(P.NARUTO.hair, flash));
    T(gfx,  4,  by - 42, 10, by - 52, 14, by - 38, c(P.NARUTO.hair, flash));
    // Hair body on top/sides of head
    R(gfx, -14, by - 48, 28, 18, c(P.NARUTO.hair, flash), c(OL, flash));
    R(gfx, -15, by - 38, 10, 10, c(P.NARUTO.hair, flash));  // sideburn L
    R(gfx,   5, by - 38, 10, 10, c(P.NARUTO.hair, flash));  // sideburn R

    // Headband (metal plate)
    R(gfx, -14, by - 42, 24, 7,  c(P.NARUTO.headband, flash), c(OL, flash));
    R(gfx, -10, by - 42, 16, 6,  c(P.NARUTO.plate, flash));
    // Leaf symbol (simple cross)
    if (!flash) {
      gfx.fillStyle(0x667788, 1);
      gfx.fillRect(-2, by - 41, 1, 4);
      gfx.fillRect(-4, by - 39, 5, 1);
    }

    // Eyes
    if (state !== ANIM.HURT) {
      R(gfx, -8,  by - 32, 5, 4, c(P.WHITE, flash));
      R(gfx, -6,  by - 31, 3, 3, c(P.NARUTO.eyes, flash));
      R(gfx,  1,  by - 32, 5, 4, c(P.WHITE, flash));
      R(gfx,  3,  by - 31, 3, 3, c(P.NARUTO.eyes, flash));
    } else {
      // Hurt: closed/squinting eyes
      R(gfx, -8, by - 30, 5, 2, c(OL, flash));
      R(gfx,  1, by - 30, 5, 2, c(OL, flash));
    }

    // Whisker marks
    if (!flash) {
      gfx.fillStyle(0x8b6040, 1);
      // Left cheek
      gfx.fillRect(-13, by - 30, 5, 1);
      gfx.fillRect(-12, by - 28, 5, 1);
      gfx.fillRect(-13, by - 26, 5, 1);
      // Right cheek
      gfx.fillRect(-2, by - 30, 5, 1);
      gfx.fillRect(-2, by - 28, 5, 1);
      gfx.fillRect(-2, by - 26, 5, 1);
    }

    // Mouth
    if (state === ANIM.ATTACK_HEAVY || state === ANIM.ATTACK_SPEC) {
      R(gfx, -4, by - 23, 8, 3, c(0x331100, flash));  // open mouth
    }
  }
}

// ── KAI Character (Martial Hero 3) ────────────────────────────────────────────
// Identity: FASTEST attacks in the game + smoke teleport behind opponent

class NarutoCharacter extends BaseCharacter {
  constructor(scene, x, y, playerId, input, combat, animMgr) {
    super(scene, x, y, playerId, input, combat, animMgr);
    this.renderer  = BaseCharacter.pickRenderer(scene, x, y, 'Naruto', new NarutoRenderer(scene, x, y));
    this.maxJumps  = 2;
    this.jumpsLeft = 2;

    this._teleportCooldown = 0;
    this._flipCooldown     = 0;
  }

  doAttack(type, axisX, axisY, airborne) {
    switch (type) {
      case 'light':   this._lightAttack(axisX, axisY, airborne); break;
      case 'heavy':   this._heavyAttack(axisX, axisY, airborne); break;
      case 'special': this._special(axisX, axisY, airborne);     break;
      case 'grab':    this._grab();                               break;
    }
  }

  // KAI: FASTEST normal attacks. Single spammable jabs — no slow combos.
  // Unique: smoke teleport sends him BEHIND the opponent for a surprise hit.
  _lightAttack(ax, ay, air) {
    if (air) {
      this.renderer.setState(ANIM.ATTACK_LIGHT);
      this._emitKi(this.x + this.facing*36, this.y, 0x44ccff, 4, 22);
      this._scheduleHitbox(30, 220, { offsetX:36, offsetY:0, w:50, h:38,
        damage:6, kbBase:250, kbScale:30, kbAngle:ax>=0?22:158,
        type:'light', particleColor:0x44ccff });
    } else if (ay < 0) {
      this.renderer.setState(ANIM.ATTACK_LIGHT);
      this._emitKi(this.x, this.y - 30, 0x44ccff, 5, 28);
      this._scheduleHitbox(30, 220, { offsetX:0, offsetY:-40, w:44, h:46,
        damage:7, kbBase:290, kbScale:34, kbAngle:90,
        type:'light', particleColor:0x44ccff });
    } else {
      // Single fast jab — fastest startup in the game (35ms)
      this.renderer.setState(ANIM.ATTACK_LIGHT);
      this._emitKi(this.x + this.facing*36, this.y, 0x44ccff, 3, 18);
      this._scheduleHitbox(35, 240, { offsetX:36, offsetY:0, w:48, h:40,
        damage:5, kbBase:180, kbScale:20,
        kbAngle:this.facing>0?15:165, type:'light', particleColor:0x44ccff });
    }
  }

  // Double spinning heel kick — hits TWICE (front arc + back sweep)
  _heavyAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_HEAVY);
    this._emitKi(this.x, this.y, 0x0088ff, 8, 44);
    if (ay < 0) {
      this._emitKi(this.x, this.y - 34, 0x44ccff, 8, 40);
      this._scheduleHitbox(90, 460, { offsetX:0, offsetY:-48, w:52, h:60,
        damage:14, kbBase:460, kbScale:65, kbAngle:90,
        type:'heavy', particleColor:0x0088ff });
    } else {
      const opp = this.combat?.characters?.find(c => c !== this && !c.isDead);
      const damageBefore = opp?.damage ?? -1;

      // Hit 1 — front kick
      this.scene.time.delayedCall(80, () => {
        if (this.isDead) return;
        this._addHitbox({ offsetX:44, offsetY:0, w:60, h:48,
          damage:9, kbBase:320, kbScale:44,
          kbAngle:this.facing>0?20:160, type:'heavy', particleColor:0x44ccff });
        this._emitKi(this.x + this.facing*44, this.y, 0x44ccff, 6, 34);
      });
      // Hit 2 — back sweep (opposite direction)
      this.scene.time.delayedCall(200, () => {
        if (this.isDead) return;
        this._addHitbox({ offsetX:-36, offsetY:0, w:52, h:44,
          damage:7, kbBase:280, kbScale:36,
          kbAngle:this.facing>0?160:20, type:'heavy', particleColor:0x0088ff });
        this._emitKi(this.x - this.facing*36, this.y, 0x0088ff, 5, 28);
      });
      this._attackCooldown = 440;
      this.scene.time.delayedCall(440, () => { this.isAttacking = false; });

      // Lightning only fires if the enemy's damage increased (hit connected)
      this.scene.time.delayedCall(480, () => {
        if (this.isDead) return;
        const target = this.combat?.characters?.find(c => c !== this && !c.isDead);
        if (!target || target.damage <= damageBefore) return;
        this._spawnLightningAt(target.x, target.y - 20);
      });
    }
  }

  _special(ax, ay, air) {
    const now = this.scene.time.now;
    if (ay < 0 && this._flipCooldown < now) {
      this._risingFlipKick(); this._flipCooldown = now + 3000;
    } else if (this._teleportCooldown < now) {
      this._smokeTeleport(); this._teleportCooldown = now + 2500;
    } else {
      this._lightAttack(ax, ay, air);
    }
  }

  _grab() {
    this.renderer.setState(ANIM.ATTACK_LIGHT);

    const opp = this.combat?.characters?.find(c => c !== this && !c.isDead);
    const damageBefore = opp?.damage ?? -1;

    this._scheduleHitbox(60, 320, { offsetX:40, offsetY:0, w:46, h:42,
      damage:5, kbBase:105, kbScale:18,
      kbAngle:this.facing>0?45:135, type:'grab', particleColor:0x44ccff });

    this.scene.time.delayedCall(80, () => {
      if (this.isDead) return;
      this._emitKi(this.x + this.facing * 40, this.y, 0x44ccff, 6, 24);
    });

    // Lightning only fires if the enemy's damage increased (hit connected)
    this.scene.time.delayedCall(420, () => {
      if (this.isDead) return;
      const target = this.combat?.characters?.find(c => c !== this && !c.isDead);
      if (!target || target.damage <= damageBefore) return;
      this._spawnLightningAt(target.x, target.y - 20);
    });
  }

  _spawnLightningAt(bx, by) {
    const bolt = this.scene.add.rectangle(bx, by - 80, 4, 160, 0x44ccff, 0.9).setDepth(55);
    this.scene.tweens.add({
      targets: bolt, scaleX: 2.5, alpha: 0, duration: 220,
      ease: 'Quad.easeOut', onComplete: () => bolt.destroy(),
    });
    this._emitKi(bx, by, 0x44ccff, 20, 56);
    this._emitKi(bx, by, 0xaaddff, 10, 30);
    if (GAME_CONFIG.PIXEL_VFX_LOADED && this.scene.anims?.exists('pvfx_electric')) {
      const vfx = this.scene.add.sprite(bx, by, 'pvfx_electric', 0)
        .setDepth(54).setScale(2.2);
      vfx.play('pvfx_electric');
      vfx.once('animationcomplete', () => vfx.destroy());
    }
  }

  // UNIQUE: Smoke bomb teleport — vanishes, reappears BEHIND opponent and strikes
  _smokeTeleport() {
    this._attackCooldown = 560; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    this._setInvuln(400);

    // Smoke burst at origin
    this._emitKi(this.x, this.y, 0x224466, 18, 50);
    this.renderer.setAlpha(0);

    const chars = this.combat?.characters || [];
    const opp   = chars.find(c => c !== this && !c.isDead);
    const destX = opp ? opp.x - this.facing * -70 : this.x + this.facing * 200;
    const destY = opp ? opp.y : this.y;

    this.scene.time.delayedCall(180, () => {
      if (this.isDead) return;
      // Teleport
      this.x = destX; this.y = destY;
      if (this.renderer.container) this.renderer.container.setPosition(this.x, this.y);
      else if (this.renderer.sprite) this.renderer.sprite.setPosition(this.x, this.y);
      this.vel.x = 0; this.vel.y = 0;
      this.renderer.setAlpha(1);
      // Reappear smoke
      this._emitKi(this.x, this.y, 0x44ccff, 18, 50);
      // Strike
      this._addHitbox({ offsetX:40, offsetY:0, w:64, h:52,
        damage:16, kbBase:480, kbScale:68,
        kbAngle:this.facing>0?22:158, type:'special', particleColor:0x44ccff });
    });
    this.scene.time.delayedCall(560, () => { this.isAttacking = false; });
  }

  // Rising flip kick — 3 hits ascending
  _risingFlipKick() {
    this._attackCooldown = 680; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    this.vel.y = -580; this.vel.x = this.facing * 160;
    [70, 170, 270].forEach((d, i) => {
      this.scene.time.delayedCall(d, () => {
        if (this.isDead) return;
        this._addHitbox({ offsetX:0, offsetY:-28, w:48, h:56,
          damage:5 + i*3, kbBase:200 + i*90, kbScale:24 + i*12, kbAngle:82,
          type:'special', particleColor:0x44ccff });
        this._emitKi(this.x, this.y - 28, 0x44ccff, 6, 34);
      });
    });
    this.scene.time.delayedCall(680, () => { this.isAttacking = false; });
  }
}

GAME_CONFIG.CHARACTERS['Naruto'] = NarutoCharacter;
