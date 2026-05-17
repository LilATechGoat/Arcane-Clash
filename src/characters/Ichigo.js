/**
 * @file Ichigo.js
 * Ichigo Kurosaki — sword fighter with dark shihakusho and large zanpakuto.
 */

/* global IchigoCharacter, BaseCharacter, CharacterRenderer, ANIM, GAME_CONFIG */

class IchigoRenderer extends CharacterRenderer {
  constructor(scene, x, y) { super(scene, x, y); }

  drawBody(gfx, state, frame, flash = false) {
    const P  = GAME_CONFIG.PALETTE;
    const I  = P.ICHIGO;
    const c  = CharacterRenderer.c;
    const R  = CharacterRenderer.rect;
    const C  = CharacterRenderer.circ;
    const T  = CharacterRenderer.tri;
    const OL = P.OUTLINE;

    let legLY=0, legRY=0;
    if (state===ANIM.WALK) { const cf=frame%4; legLY=[0,5,0,-5][cf]; legRY=[0,-5,0,5][cf]; }

    const swordX = state===ANIM.ATTACK_LIGHT ? 30 :
                   state===ANIM.ATTACK_HEAVY ? 40 :
                   state===ANIM.ATTACK_SPEC  ? 35 : 18;
    const swordY = state===ANIM.ATTACK_HEAVY ? -50 :
                   state===ANIM.ATTACK_SPEC  ? -40 : -24;

    const bob = state===ANIM.IDLE ? (frame%2===0?0:-1) : 0;
    const by  = bob;

    // ── Zanpakuto (on back for idle, extended when attacking) ──
    // Blade
    R(gfx, swordX-3, swordY, 5, 72, c(I.sword, flash), c(OL, flash));
    R(gfx, swordX-2, swordY, 3, 70, c(I.swordEdge, flash));  // edge highlight
    // Guard (crossguard)
    R(gfx, swordX-10, swordY+66, 20, 5, c(0x554433, flash), c(OL, flash));
    // Handle
    R(gfx, swordX-3, swordY+70, 5, 16, c(0x221100, flash), c(OL, flash));
    // Wrapping
    if (!flash) {
      for (let wi=0; wi<3; wi++) {
        gfx.fillStyle(0x332200, 1);
        gfx.fillRect(swordX-2, swordY+72+wi*4, 4, 2);
      }
    }

    // Back arm
    R(gfx, 2, by-14, 7, 20, c(I.robe, flash), c(OL, flash));

    // Legs — long shihakusho-style flowing robe
    R(gfx, -14, by+14+legLY, 12, 26, c(I.robe, flash), c(OL, flash));
    R(gfx,   2, by+14+legRY, 12, 26, c(I.robe, flash), c(OL, flash));
    // Robe highlight (center stripe)
    R(gfx, -2,  by+14, 4, 20, c(I.robeHi, flash));
    // Sandals
    R(gfx, -15, by+36+legLY, 13, 5, c(0x111111, flash));
    R(gfx,   1, by+36+legRY, 13, 5, c(0x111111, flash));

    // Torso — wide shihakusho
    R(gfx, -15, by-20, 30, 34, c(I.robe, flash), c(OL, flash));
    // Collar lapels (V-neck)
    T(gfx, -15,by-20, -4,by-20, -10,by+4, c(I.robeDark, flash));
    T(gfx,  15,by-20,  4,by-20,  10,by+4, c(I.robeDark, flash));
    // Obi belt
    R(gfx, -15, by+10, 30, 6, c(0x111111, flash), c(OL, flash));

    // Front arm + hand
    R(gfx, -20, by-14, 7, 20, c(I.robe, flash), c(OL, flash));
    R(gfx, -22, by+4,  10, 10, c(P.SKIN, flash), c(OL, flash));

    // Head
    C(gfx, -1, by-34, 13, c(P.SKIN, flash), c(OL, flash));

    // Spiky orange hair
    R(gfx, -12, by-48, 22, 16, c(I.hair, flash), c(OL, flash));
    // Front spikes (swept to one side, Ichigo style)
    T(gfx, -8, by-46, -14,by-58, -2, by-46, c(I.hair, flash));
    T(gfx, -2, by-48,  4, by-60,  8, by-46, c(I.hair, flash));
    T(gfx,  6, by-46, 10, by-56, 14, by-44, c(I.hair, flash));
    // Hair highlight
    R(gfx, -4, by-56, 4, 5, c(I.hairHi, flash));
    // Sideburns
    R(gfx, -14, by-38, 6, 6, c(I.hair, flash));

    // Eyes
    if (state!==ANIM.HURT) {
      R(gfx, -9, by-32, 5, 5, c(P.WHITE, flash));
      R(gfx, -7, by-31, 3, 4, c(I.eyes, flash));
      R(gfx,  1, by-32, 5, 5, c(P.WHITE, flash));
      R(gfx,  3, by-31, 3, 4, c(I.eyes, flash));
      // Serious brow furrow
      R(gfx, -10, by-37, 7, 2, c(I.hair, flash));
      R(gfx,   1, by-37, 7, 2, c(I.hair, flash));
    } else {
      R(gfx, -9, by-30, 6, 2, c(OL, flash));
      R(gfx,  1, by-30, 6, 2, c(OL, flash));
    }

    // Bankai glow aura (when in attack_spec, extra glow visual)
    if (state===ANIM.ATTACK_SPEC && !flash) {
      gfx.fillStyle(0x2200aa, 0.3);
      gfx.fillCircle(0, by-10, 30);
      gfx.fillStyle(0x4400ff, 0.15);
      gfx.fillCircle(0, by-10, 42);
    }
  }
}

// ── BLADE Character (Medieval Warrior Pack 3) ─────────────────────────────────
// Identity: LONGEST reach of any character + ONLY projectile + two-hit cleave heavy

class IchigoCharacter extends BaseCharacter {
  constructor(scene, x, y, playerId, input, combat, animMgr) {
    super(scene, x, y, playerId, input, combat, animMgr);
    this.renderer = BaseCharacter.pickRenderer(scene, x, y, 'Ichigo', new IchigoRenderer(scene, x, y));
    this.maxJumps = 2; this.jumpsLeft = 2;
    this._waveCooldown = 0;
    this._spinCooldown = 0;
  }

  doAttack(type, axisX, axisY, airborne) {
    switch (type) {
      case 'light':   this._lightAttack(axisX, axisY, airborne); break;
      case 'heavy':   this._heavyAttack(axisX, axisY, airborne); break;
      case 'special': this._special(axisX, axisY, airborne);     break;
      case 'grab':    this._grab();                               break;
    }
  }

  // BLADE: Longest reach (large offsetX). Double slash ground light. Two-hit cleave heavy.
  _lightAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_LIGHT);
    if (air) {
      // Long aerial slash — biggest aerial range in the game
      this._emitSlash(this.x + this.facing*58, this.y - 6, this.facing>0?-38:218, 0x88bbee, 90);
      this._scheduleHitbox(48, 260, { offsetX:60, offsetY:-6, w:90, h:54,
        damage:9, kbBase:295, kbScale:36,
        kbAngle:ax>=0?24:156, type:'light', particleColor:0x88bbee });
    } else if (ay < 0) {
      this._emitSlash(this.x, this.y - 40, 90, 0x88bbee, 76);
      this._scheduleHitbox(62, 290, { offsetX:0, offsetY:-52, w:56, h:66,
        damage:10, kbBase:320, kbScale:38, kbAngle:88,
        type:'light', particleColor:0x88bbee });
    } else {
      // DOUBLE SLASH — two slashes at different angles, unique to BLADE
      this.renderer.setState(ANIM.ATTACK_LIGHT);
      this._emitSlash(this.x + this.facing*54, this.y - 8, this.facing>0?-40:220, 0x88bbee, 84);
      this.scene.time.delayedCall(55, () => {
        if (this.isDead) return;
        this._addHitbox({ offsetX:58, offsetY:-6, w:86, h:48,
          damage:7, kbBase:240, kbScale:28,
          kbAngle:this.facing>0?18:162, type:'light', particleColor:0x88bbee });
      });
      this.scene.time.delayedCall(190, () => {
        if (this.isDead) return;
        this._emitSlash(this.x + this.facing*50, this.y + 6, this.facing>0?-12:192, 0x88bbee, 76);
        this._addHitbox({ offsetX:56, offsetY:6, w:82, h:44,
          damage:7, kbBase:260, kbScale:30,
          kbAngle:this.facing>0?22:158, type:'light', particleColor:0x88bbee });
      });
      this._attackCooldown = 380;
      this.scene.time.delayedCall(380, () => { this.isAttacking = false; });
    }
  }

  // UNIQUE: Two-hit cleave — wide slash immediately followed by a forward stab
  _heavyAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_HEAVY);
    if (ay < 0) {
      this._emitSlash(this.x, this.y - 48, 90, 0xaaccff, 96);
      this._scheduleHitbox(105, 510, { offsetX:0, offsetY:-62, w:62, h:84,
        damage:18, kbBase:520, kbScale:76, kbAngle:90,
        type:'heavy', particleColor:0x5599cc });
    } else {
      // Hit 1 — wide horizontal cleave (longest horizontal hit in game)
      this._emitSlash(this.x + this.facing*64, this.y, this.facing>0?-28:208, 0xaaccff, 120);
      this.scene.time.delayedCall(90, () => {
        if (this.isDead) return;
        this._addHitbox({ offsetX:68, offsetY:-4, w:100, h:58,
          damage:12, kbBase:360, kbScale:50,
          kbAngle:this.facing>0?20:160, type:'heavy', particleColor:0x88bbee });
      });
      // Hit 2 — forward stab (narrow but deep range)
      this.scene.time.delayedCall(260, () => {
        if (this.isDead) return;
        this._emitSlash(this.x + this.facing*76, this.y, this.facing>0?0:180, 0xaaccff, 72);
        this._addHitbox({ offsetX:80, offsetY:0, w:72, h:36,
          damage:10, kbBase:420, kbScale:60,
          kbAngle:this.facing>0?10:170, type:'heavy', particleColor:0x5599cc });
      });
      this._attackCooldown = 520;
      this.scene.time.delayedCall(520, () => { this.isAttacking = false; });
    }
  }

  _special(ax, ay, air) {
    const now = this.scene.time.now;
    if (ay < 0 && this._spinCooldown < now) {
      this._spinningBlade(); this._spinCooldown = now + 3500;
    } else if (this._waveCooldown < now) {
      this._swordWave(); this._waveCooldown = now + 2200;
    } else {
      this._lightAttack(ax, ay, air);
    }
  }

  _grab() {
    this.renderer.setState(ANIM.ATTACK_LIGHT);
    this._scheduleHitbox(78, 345, { offsetX:52, offsetY:0, w:58, h:46,
      damage:7, kbBase:125, kbScale:20,
      kbAngle:this.facing>0?55:125, type:'grab', particleColor:0x88bbee });
  }

  // UNIQUE: Only projectile in the game — icy blade wave travels full screen
  _swordWave() {
    this._attackCooldown = 580; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    const dir = this.facing;
    const wave = this.scene.add.rectangle(
      this.x + dir*42, this.y - 4, 48, 18, 0x88bbee, 0.92
    ).setDepth(25);
    this._emitSlash(this.x + dir*42, this.y, dir>0?-10:190, 0x88bbee, 76);
    let dist = 0;
    const speed = 600, maxDist = 500;
    const attackId = `${this.playerId}_${this._attackId}`;
    const ticker = this.scene.time.addEvent({ delay:16, repeat:55, callback:() => {
      wave.x += speed * 0.016 * dir; dist += speed * 0.016;
      if (dist > 36) {
        this.combat.addHitbox({ owner:this, id:attackId,
          x:wave.x, y:wave.y, w:56, h:38, damage:14, kbBase:440, kbScale:62,
          kbAngle:dir>0?14:166, type:'special', particleColor:0x88bbee });
      }
      if (dist >= maxDist) {
        this._emitSlash(wave.x, wave.y, 0, 0x88bbee, 68);
        wave.destroy(); ticker.remove(); this.isAttacking = false;
      }
    }});
  }

  // Spinning aerial blade — leaps and slashes in wide arcs
  _spinningBlade() {
    this._attackCooldown = 720; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    const dir = this.facing;
    this.vel.y = -520; this.vel.x = dir * 230;
    [65, 195, 360].forEach((d, i) => {
      this.scene.time.delayedCall(d, () => {
        if (this.isDead) return;
        this._addHitbox({ offsetX:dir*44, offsetY:-8, w:86, h:66,
          damage:9 + i*3, kbBase:310 + i*110, kbScale:42 + i*14, kbAngle:68,
          type:'special', particleColor:0x5599cc });
        this._emitSlash(this.x + dir*44, this.y - 8, 360/3*i, 0xaaccff, 88);
      });
    });
    this.scene.time.delayedCall(720, () => { this.isAttacking = false; });
  }
}

GAME_CONFIG.CHARACTERS['Ichigo'] = IchigoCharacter;
