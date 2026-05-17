/**
 * @file Goku.js
 * Son Goku — power fighter. Spiky black hair, orange gi, blue undershirt.
 */

/* global GokuCharacter, BaseCharacter, CharacterRenderer, ANIM, GAME_CONFIG */

class GokuRenderer extends CharacterRenderer {
  constructor(scene, x, y) { super(scene, x, y); }

  drawBody(gfx, state, frame, flash = false) {
    const P  = GAME_CONFIG.PALETTE;
    const G  = P.GOKU;
    const c  = CharacterRenderer.c;
    const R  = CharacterRenderer.rect;
    const C  = CharacterRenderer.circ;
    const T  = CharacterRenderer.tri;
    const OL = P.OUTLINE;

    let legLY = 0, legRY = 0;
    if (state === ANIM.WALK) {
      const cy = frame % 4;
      legLY = [0,5,0,-5][cy]; legRY = [0,-5,0,5][cy];
    }

    let armExt = 0, armUp = 0;
    if (state === ANIM.ATTACK_LIGHT) { armExt = frame<2?8:4; }
    if (state === ANIM.ATTACK_HEAVY) { armExt = frame<2?14:8; armUp=-4; }
    if (state === ANIM.ATTACK_SPEC)  { armExt = frame<3?10:5; armUp=-2; }

    const bob = state === ANIM.IDLE ? (frame%2===0?0:-1) : 0;
    const by  = bob;

    // Back arm
    R(gfx, 2, by-14, 7, 19, c(G.inner, flash), c(OL, flash));

    // Legs — orange gi with dark trim at knee
    R(gfx, -13, by+14+legLY, 12, 14, c(G.gi, flash), c(OL, flash));
    R(gfx,   2, by+14+legRY, 12, 14, c(G.gi, flash), c(OL, flash));
    R(gfx, -13, by+26+legLY, 12, 10, c(G.giDark, flash));
    R(gfx,   2, by+26+legRY, 12, 10, c(G.giDark, flash));
    // Boots (dark)
    R(gfx, -13, by+32+legLY, 12, 6,  c(0x221100, flash));
    R(gfx,   2, by+32+legRY, 12, 6,  c(0x221100, flash));

    // Torso — orange gi
    R(gfx, -14, by-20, 28, 34, c(G.gi, flash), c(OL, flash));
    // Blue inner shirt visible at chest
    R(gfx, -6,  by-20, 12, 22, c(G.inner, flash));
    // Gi lapels
    T(gfx, -14,by-20, -6,by-20, -10,by-5, c(G.gi, flash));
    T(gfx,  14,by-20,  6,by-20,  10,by-5, c(G.gi, flash));

    // Belt — blue sash
    R(gfx, -14, by+10, 28, 6, c(G.belt, flash), c(OL, flash));

    // Front arm + fist
    R(gfx, -20, by-14+armUp, 7, 19, c(G.inner, flash), c(OL, flash));
    R(gfx, -23-armExt, by-1+armUp, 11, 11, c(P.SKIN, flash), c(OL, flash));

    // Head
    C(gfx, -2, by-34, 14, c(P.SKIN, flash), c(OL, flash));

    // Spiky black hair — iconic 5-spike Goku style
    // Base hair block
    R(gfx, -14, by-48, 26, 18, c(G.hair, flash), c(OL, flash));
    // Spikes pointing mostly upward-back
    T(gfx, -14,by-44, -18,by-58, -8,by-44, c(G.hair, flash));
    T(gfx, -10,by-48, -6, by-62, 0, by-48, c(G.hair, flash));
    T(gfx,  -2,by-48,  4, by-58, 10,by-46, c(G.hair, flash));
    T(gfx,   6,by-46, 12, by-54, 16,by-42, c(G.hair, flash));
    // Hair highlight
    R(gfx, -4, by-58,  4,  6, c(G.hairHi, flash));

    // Side hair (over ears)
    R(gfx, -16, by-38, 6, 8, c(G.hair, flash));
    R(gfx,  10, by-38, 6, 8, c(G.hair, flash));

    // Eyes
    if (state !== ANIM.HURT) {
      R(gfx, -9, by-32, 5, 4, c(P.WHITE, flash));
      R(gfx, -7, by-31, 3, 3, c(G.eyes, flash));
      R(gfx,  2, by-32, 5, 4, c(P.WHITE, flash));
      R(gfx,  4, by-31, 3, 3, c(G.eyes, flash));
      // Brow
      R(gfx, -10, by-36, 6, 2, c(G.hair, flash));
      R(gfx,   1, by-36, 6, 2, c(G.hair, flash));
    } else {
      R(gfx, -9, by-30, 5, 2, c(OL, flash));
      R(gfx,  2, by-30, 5, 2, c(OL, flash));
    }

    // Power aura dots when attacking
    if (state === ANIM.ATTACK_SPEC && !flash) {
      for (let i = 0; i < 4; i++) {
        const ax2 = -24 + i * 4;
        const ay2 = by - 40 + (frame % 3) * 4;
        gfx.fillStyle(0xffff66, 0.7);
        gfx.fillCircle(ax2, ay2, 3);
      }
    }
  }
}

// ── RYU Character (Martial Hero) ──────────────────────────────────────────────
// Identity: SLOWEST but most POWERFUL. 3 jumps. Ground pound creates shockwave.

class GokuCharacter extends BaseCharacter {
  constructor(scene, x, y, playerId, input, combat, animMgr) {
    super(scene, x, y, playerId, input, combat, animMgr);
    this.renderer  = BaseCharacter.pickRenderer(scene, x, y, 'Goku', new GokuRenderer(scene, x, y));
    this.maxJumps  = 3;
    this.jumpsLeft = 3;

    this._upperCooldown = 0;
    this._rushCooldown  = 0;
  }

  doAttack(type, axisX, axisY, airborne) {
    switch (type) {
      case 'light':   this._lightAttack(axisX, axisY, airborne); break;
      case 'heavy':   this._heavyAttack(axisX, axisY, airborne); break;
      case 'special': this._special(axisX, axisY, airborne);     break;
      case 'grab':    this._grab();                               break;
    }
  }

  // RYU: Slowest startup, highest damage per hit. 3-hit jab combo hits hardest.
  _lightAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_LIGHT);
    if (air) {
      this._emitKi(this.x + this.facing*38, this.y, 0xffcc44, 6, 32);
      this._scheduleHitbox(70, 300, { offsetX:40, offsetY:0, w:62, h:48,
        damage:10, kbBase:300, kbScale:38, kbAngle:ax>=0?20:160,
        type:'light', particleColor:0xffcc44 });
    } else if (ay > 0) {
      this._emitKi(this.x + this.facing*28, this.y + 22, 0xffcc44, 6, 30);
      this._scheduleHitbox(80, 320, { offsetX:28, offsetY:26, w:68, h:36,
        damage:11, kbBase:280, kbScale:34,
        kbAngle:this.facing>0?345:195, type:'light', particleColor:0xffcc44 });
    } else {
      // 3-hit combo — slowest startup but each hit does more damage than other chars
      [65, 160, 260].forEach((d, i) => {
        this.scene.time.delayedCall(d, () => {
          if (!this.isDead) {
            this._addHitbox({ offsetX:40, offsetY:0, w:58, h:46,
              damage:6, kbBase:200, kbScale:26,
              kbAngle:this.facing>0?15:165, type:'light', particleColor:0xffcc44 });
            this._emitKi(this.x + this.facing*40, this.y, 0xffcc44, 5, 26);
          }
        });
      });
      this._attackCooldown = 440;
      this.scene.time.delayedCall(440, () => { this.isAttacking = false; });
    }
  }

  // UNIQUE: Ground Pound — leaps and crashes down, shockwaves travel LEFT + RIGHT
  _heavyAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_HEAVY);
    if (ay < 0) {
      // Rising uppercut (up-heavy)
      this._emitFire(this.x, this.y - 34, 12);
      this._scheduleHitbox(100, 480, { offsetX:28, offsetY:-54, w:58, h:70,
        damage:20, kbBase:540, kbScale:80, kbAngle:90,
        type:'heavy', particleColor:0xff8800 });
    } else {
      // Ground Pound — leap up then crash
      this.isAttacking = true; this._attackCooldown = 700;
      this.vel.y = -520; this.vel.x = 0;
      this.scene.time.delayedCall(320, () => {
        if (this.isDead) return;
        this.vel.y = 1100; // crash down
        this.scene.time.delayedCall(220, () => {
          if (this.isDead) return;
          const impactX = this.x, impactY = this.y;
          this._emitFire(impactX, impactY, 16, true);
          this._emitHitParticles(impactX, impactY, 0xff8800, 16, 'heavy');
          // Direct impact hitbox
          this._addHitbox({ offsetX:0, offsetY:10, w:80, h:50,
            damage:22, kbBase:600, kbScale:88, kbAngle:270,
            type:'heavy', particleColor:0xff8800 });
          // SHOCKWAVE — two rectangles travelling left and right
          [-1, 1].forEach(dir => {
            const wave = this.scene.add.rectangle(impactX, impactY + 20, 24, 28, 0xff8800, 0.75).setDepth(26);
            let dist = 0;
            const waveId = `${this.playerId}_${this._attackId}_wave${dir}`;
            const ticker = this.scene.time.addEvent({ delay:16, repeat:22, callback:() => {
              wave.x += dir * 28; dist += 28;
              wave.alpha = 0.75 - dist / 320;
              this.combat.addHitbox({ owner:this, id:waveId,
                x:wave.x, y:wave.y, w:36, h:40, damage:10, kbBase:350, kbScale:50,
                kbAngle:dir > 0 ? 20 : 160, type:'heavy', particleColor:0xff8800 });
              if (dist >= 320) { wave.destroy(); ticker.remove(); }
            }});
          });
        });
      });
      this.scene.time.delayedCall(700, () => { this.isAttacking = false; });
    }
  }

  _special(ax, ay, air) {
    const now = this.scene.time.now;
    if (ay < 0 && this._upperCooldown < now) {
      this._dragonUppercut(); this._upperCooldown = now + 3500;
    } else if (this._rushCooldown < now) {
      this._rushPunch(); this._rushCooldown = now + 1600;
    } else {
      this._lightAttack(ax, ay, air);
    }
  }

  _grab() {
    this.renderer.setState(ANIM.ATTACK_LIGHT);
    this._scheduleHitbox(90, 380, { offsetX:46, offsetY:0, w:54, h:48,
      damage:8, kbBase:130, kbScale:22,
      kbAngle:this.facing>0?50:130, type:'grab', particleColor:0xffcc44 });
  }

  // Charging tackle — plows through with fiery impact
  _rushPunch() {
    this._attackCooldown = 580; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    const dir = this.facing;
    this.vel.x = dir * 820; this.vel.y = -50;
    const trail = this.scene.add.rectangle(this.x, this.y, 60, 14, 0xff8800, 0.55).setDepth(24);
    this.scene.tweens.add({ targets:trail, scaleX:0.1, alpha:0, duration:200,
      onComplete:()=>trail.destroy() });
    this.scene.time.delayedCall(130, () => {
      if (this.isDead) return;
      this._addHitbox({ offsetX:52, offsetY:-4, w:70, h:56,
        damage:16, kbBase:460, kbScale:65,
        kbAngle:dir>0?18:162, type:'special', particleColor:0xff8800 });
      this._emitFire(this.x + dir*52, this.y, 16);
    });
    this.scene.time.delayedCall(580, () => { this.isAttacking = false; });
  }

  // Dragon Uppercut — multi-hit fiery rising fist
  _dragonUppercut() {
    this._attackCooldown = 700; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    this._setInvuln(130);
    const dir = this.facing;
    this.vel.y = -680; this.vel.x = dir * 100;
    [60, 190, 340].forEach((d, i) => {
      this.scene.time.delayedCall(d, () => {
        if (this.isDead) return;
        this._addHitbox({ offsetX:dir*26, offsetY:-34 - i*20, w:60, h:54,
          damage:8 + i*5, kbBase:280 + i*140, kbScale:34 + i*16, kbAngle:88,
          type:'special', particleColor:0xff8800 });
        this._emitFire(this.x + dir*26, this.y - 34 - i*20, 9 + i*3, i === 2);
      });
    });
    this.scene.time.delayedCall(700, () => { this.isAttacking = false; });
  }
}

GAME_CONFIG.CHARACTERS['Goku'] = GokuCharacter;
