/**
 * @file Luffy.js
 * Monkey D. Luffy — stretchy fighter with straw hat and red vest.
 */

/* global LuffyCharacter, BaseCharacter, CharacterRenderer, ANIM, GAME_CONFIG */

class LuffyRenderer extends CharacterRenderer {
  constructor(scene, x, y) { super(scene, x, y); }

  drawBody(gfx, state, frame, flash = false) {
    const P  = GAME_CONFIG.PALETTE;
    const L  = P.LUFFY;
    const c  = CharacterRenderer.c;
    const R  = CharacterRenderer.rect;
    const C  = CharacterRenderer.circ;
    const T  = CharacterRenderer.tri;
    const OL = P.OUTLINE;

    let legLY=0, legRY=0;
    if (state===ANIM.WALK) { const cf=frame%4; legLY=[0,5,0,-5][cf]; legRY=[0,-5,0,5][cf]; }

    // Stretch arm extension (Gum-Gum style)
    let stretchArmLen = 0;
    if (state===ANIM.ATTACK_LIGHT) stretchArmLen = frame<2 ? 18 : 8;
    if (state===ANIM.ATTACK_HEAVY) stretchArmLen = frame<2 ? 26 : 12;
    if (state===ANIM.ATTACK_SPEC)  stretchArmLen = frame<3 ? 40 : 20;

    const bob = state===ANIM.IDLE ? (frame%2===0?0:-1) : 0;
    const by  = bob;

    // Back arm
    R(gfx, 2, by-14, 6, 18, c(P.SKIN, flash), c(OL, flash));

    // Shorts (blue)
    R(gfx, -13, by+14+legLY, 12, 24, c(L.shorts, flash), c(OL, flash));
    R(gfx,   2, by+14+legRY, 12, 24, c(L.shorts, flash), c(OL, flash));
    R(gfx, -13, by+24+legLY, 12, 8,  c(L.shortsDark, flash));
    R(gfx,   2, by+24+legRY, 12, 8,  c(L.shortsDark, flash));
    // Bare feet
    R(gfx, -14, by+36+legLY, 13, 6, c(P.SKIN, flash), c(OL, flash));
    R(gfx,   1, by+36+legRY, 13, 6, c(P.SKIN, flash), c(OL, flash));

    // Torso — white shirt
    R(gfx, -13, by-20, 26, 34, c(L.shirt, flash), c(OL, flash));
    // Red vest over shirt
    R(gfx, -13, by-20, 8,  34, c(L.vest, flash), c(OL, flash));
    R(gfx,   5, by-20, 8,  34, c(L.vest, flash), c(OL, flash));
    // Vest shadow
    R(gfx, -13, by+8,  8,  6,  c(L.vestDark, flash));
    R(gfx,   5, by+8,  8,  6,  c(L.vestDark, flash));
    // Belt
    R(gfx, -13, by+10, 26, 5, c(0x222222, flash), c(OL, flash));

    // Front arm + stretchy fist
    const armSegments = stretchArmLen > 0 ? 3 : 1;
    for (let s=0; s<armSegments; s++) {
      const segX = -22 - s*(stretchArmLen/armSegments);
      R(gfx, segX, by-12, 7, 14, c(P.SKIN, flash), c(OL, flash));
    }
    // Fist
    C(gfx, -20 - stretchArmLen, by-6, 9, c(P.SKIN, flash), c(OL, flash));

    // Head
    C(gfx, -1, by-34, 14, c(P.SKIN, flash), c(OL, flash));

    // Straw hat — iconic wide brim
    R(gfx, -22, by-46, 42, 6,  c(L.hatBrim, flash), c(OL, flash));   // brim
    R(gfx, -14, by-56, 26, 14, c(L.hat, flash), c(OL, flash));        // dome
    R(gfx, -14, by-46, 26, 5,  c(L.hat, flash));                      // base
    // Hat band (red)
    R(gfx, -14, by-44, 26, 3, c(0xcc1111, flash));
    // Hat highlight
    R(gfx, -8, by-56, 8, 4, c(0xdcb860, flash));

    // Dark hair peeking out under hat
    R(gfx, -12, by-44, 22, 10, c(L.hair, flash), c(OL, flash));
    // Side hair
    R(gfx, -14, by-38, 6, 8, c(L.hair, flash));
    R(gfx,   8, by-38, 6, 8, c(L.hair, flash));

    // Eyes
    if (state!==ANIM.HURT) {
      R(gfx, -9, by-32, 5, 5, c(P.WHITE, flash));
      R(gfx, -7, by-31, 3, 3, c(L.eyes, flash));
      R(gfx,  2, by-32, 5, 5, c(P.WHITE, flash));
      R(gfx,  4, by-31, 3, 3, c(L.eyes, flash));
      // Grin / determined expression
      if (state===ANIM.ATTACK_LIGHT || state===ANIM.ATTACK_SPEC) {
        R(gfx, -5, by-23, 10, 3, c(0x222222, flash));  // open grin
        R(gfx, -5, by-22, 10, 2, c(P.WHITE, flash));
      }
    } else {
      R(gfx, -9, by-31, 5, 2, c(OL, flash));
      R(gfx,  2, by-31, 5, 2, c(OL, flash));
    }

    // Scar under left eye
    if (!flash) {
      gfx.fillStyle(L.scar, 1);
      gfx.fillRect(-1, by-28, 2, 4);
    }

    // Gear Second steam effect
    if (state===ANIM.ATTACK_SPEC && frame%2===0 && !flash) {
      gfx.fillStyle(0xffffff, 0.25);
      gfx.fillCircle(-5, by+10, 12+frame*2);
    }
  }
}

// ── JIN Character (Martial Hero 2) ────────────────────────────────────────────
// Identity: FASTEST dash + 7-hit barrage (most hits in game) + 3-hit bicycle kick heavy

class LuffyCharacter extends BaseCharacter {
  constructor(scene, x, y, playerId, input, combat, animMgr) {
    super(scene, x, y, playerId, input, combat, animMgr);
    this.renderer      = BaseCharacter.pickRenderer(scene, x, y, 'Luffy', new LuffyRenderer(scene, x, y));
    this.maxJumps      = 2; this.jumpsLeft = 2;
    this._rushCooldown    = 0;
    this._barrageCooldown = 0;
  }

  doAttack(type, axisX, axisY, airborne) {
    switch (type) {
      case 'light':   this._lightAttack(axisX, axisY, airborne); break;
      case 'heavy':   this._heavyAttack(axisX, axisY, airborne); break;
      case 'special': this._special(axisX, axisY, airborne);     break;
      case 'grab':    this._grab();                               break;
    }
  }

  // JIN: Single fast kick (ground). UNIQUE: 3-hit bicycle kick heavy. 7-hit barrage special.
  _lightAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_LIGHT);
    if (air) {
      // Scissor kick — 2 quick hits
      [38, 130].forEach((d, i) => {
        this.scene.time.delayedCall(d, () => {
          if (this.isDead) return;
          this._addHitbox({ offsetX:44, offsetY: i===0?-8:10, w:64, h:40,
            damage:5, kbBase:220, kbScale:26,
            kbAngle:ax>=0?22:158, type:'light', particleColor:0xff3300 });
          this._emitKi(this.x + this.facing*44, this.y + (i===0?-8:10), 0xff3300, 4, 20);
        });
      });
      this._attackCooldown = 280;
      this.scene.time.delayedCall(280, () => { this.isAttacking = false; });
    } else if (ay < 0) {
      this._emitKi(this.x, this.y - 34, 0xff3300, 5, 26);
      this._scheduleHitbox(40, 230, { offsetX:0, offsetY:-42, w:46, h:52,
        damage:8, kbBase:290, kbScale:34, kbAngle:88,
        type:'light', particleColor:0xff3300 });
    } else {
      // Single fast kick — low startup
      this._emitKi(this.x + this.facing*42, this.y + 4, 0xff3300, 3, 18);
      this._scheduleHitbox(38, 260, { offsetX:44, offsetY:4, w:60, h:44,
        damage:6, kbBase:210, kbScale:25,
        kbAngle:this.facing>0?18:162, type:'light', particleColor:0xff3300 });
    }
  }

  // UNIQUE: 3-hit bicycle kick — only character whose heavy naturally chains 3 hits upward
  _heavyAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_HEAVY);
    this._emitKi(this.x + this.facing*40, this.y, 0xcc1100, 8, 44);
    if (ay < 0 || air) {
      // Triple bicycle kick
      [70, 180, 300].forEach((d, i) => {
        this.scene.time.delayedCall(d, () => {
          if (this.isDead) return;
          this._addHitbox({ offsetX:0, offsetY:-32 - i*22, w:54, h:50,
            damage:7 + i*4, kbBase:260 + i*160, kbScale:36 + i*20, kbAngle:86,
            type:'heavy', particleColor:0xff3300 });
          this._emitKi(this.x, this.y - 32 - i*22, 0xff3300, 7, 34);
        });
      });
      this._attackCooldown = 500;
      this.scene.time.delayedCall(500, () => { this.isAttacking = false; });
    } else {
      // Thunderous roundhouse
      this._scheduleHitbox(100, 500, { offsetX:62, offsetY:-4, w:82, h:58,
        damage:18, kbBase:540, kbScale:78,
        kbAngle:this.facing>0?16:164, type:'heavy', particleColor:0xcc1100 });
    }
  }

  _special(ax, ay, air) {
    const now = this.scene.time.now;
    if (ax !== 0 && this._rushCooldown < now) {
      this._flyingKick(); this._rushCooldown = now + 2200;
    } else if (this._barrageCooldown < now) {
      this._kickBarrage(); this._barrageCooldown = now + 3800;
    } else {
      this._lightAttack(ax, ay, air);
    }
  }

  _grab() {
    this.renderer.setState(ANIM.ATTACK_LIGHT);
    this._scheduleHitbox(65, 320, { offsetX:56, offsetY:0, w:72, h:44,
      damage:5, kbBase:92, kbScale:14,
      kbAngle:this.facing>0?58:122, type:'grab', particleColor:0xff3300 });
  }

  // FASTEST dash in the game — highest launch velocity
  _flyingKick() {
    this._attackCooldown = 560; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    this._setInvuln(100);
    const dir = this.facing;
    this.vel.x = dir * 980; this.vel.y = -120;
    const trail = this.scene.add.rectangle(this.x, this.y, 56, 12, 0xff3300, 0.55).setDepth(24);
    this.scene.tweens.add({ targets:trail, scaleX:0.05, alpha:0, duration:160,
      onComplete:()=>trail.destroy() });
    this.scene.time.delayedCall(120, () => {
      if (this.isDead) return;
      this._addHitbox({ offsetX:54, offsetY:0, w:74, h:54,
        damage:15, kbBase:490, kbScale:68,
        kbAngle:dir>0?22:158, type:'special', particleColor:0xff3300 });
      this._emitKi(this.x + dir*54, this.y, 0xff3300, 14, 54);
    });
    this.scene.time.delayedCall(560, () => { this.isAttacking = false; });
  }

  // UNIQUE: 7-hit kick barrage — most hits of any single move in the game
  _kickBarrage() {
    this._attackCooldown = 820; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    for (let i = 0; i < 7; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const yOff = [-4, 10, -14, 6, -8, 14, 0][i];
      this.scene.time.delayedCall(i * 95 + 50, () => {
        if (this.isDead) return;
        this._addHitbox({ offsetX:48, offsetY:yOff, w:54, h:40,
          damage:4, kbBase:140, kbScale:18,
          kbAngle:this.facing>0?14:166, type:'light', particleColor:0xff3300 });
        this._emitKi(this.x + this.facing*48, this.y + yOff, 0xff3300, 4, 20);
      });
    }
    this.scene.time.delayedCall(820, () => { this.isAttacking = false; });
  }
}

GAME_CONFIG.CHARACTERS['Luffy'] = LuffyCharacter;
