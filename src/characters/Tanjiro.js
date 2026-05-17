/**
 * @file Tanjiro.js
 * Tanjiro Kamado — technical fighter with dark-green uniform and hanafuda earrings.
 */

/* global TanjiroCharacter, BaseCharacter, CharacterRenderer, ANIM, GAME_CONFIG */

class TanjiroRenderer extends CharacterRenderer {
  constructor(scene, x, y) { super(scene, x, y); }

  drawBody(gfx, state, frame, flash = false) {
    const P  = GAME_CONFIG.PALETTE;
    const TJ = P.TANJIRO;
    const c  = CharacterRenderer.c;
    const R  = CharacterRenderer.rect;
    const C  = CharacterRenderer.circ;
    const T  = CharacterRenderer.tri;
    const OL = P.OUTLINE;

    let legLY=0, legRY=0;
    if (state===ANIM.WALK) { const cf=frame%4; legLY=[0,5,0,-5][cf]; legRY=[0,-5,0,5][cf]; }

    let swordExt=0, swordAng=0;
    if (state===ANIM.ATTACK_LIGHT) { swordExt=frame<2?12:6; swordAng=frame<2?-20:-10; }
    if (state===ANIM.ATTACK_HEAVY) { swordExt=frame<2?22:10; swordAng=frame<2?-45:-20; }
    if (state===ANIM.ATTACK_SPEC)  { swordExt=frame<3?18:8; swordAng=frame<3?30:15; }

    const bob = state===ANIM.IDLE?(frame%2===0?0:-1):0;
    const by  = bob;

    // ── Nichirin blade (black with red edge for fire forms) ──
    const bladeColor = state===ANIM.ATTACK_SPEC ? 0x8a2200 : TJ.blade;
    const edgeColor  = state===ANIM.ATTACK_SPEC ? 0xff4400 : 0x2a5070;
    // Blade
    const bx = 16 + swordExt;
    const bsy = by - 52 + swordAng;
    R(gfx, bx, bsy, 5, 66, c(bladeColor, flash), c(OL, flash));
    R(gfx, bx+1, bsy, 2, 64, c(edgeColor, flash));
    // Guard
    R(gfx, bx-6, bsy+60, 18, 5, c(0x554433, flash), c(OL, flash));
    // Handle (wrapped in black/green)
    R(gfx, bx+1, bsy+64, 4, 14, c(0x111822, flash), c(OL, flash));
    if (!flash) {
      for (let wi=0;wi<3;wi++) { gfx.fillStyle(0x1a3322,1); gfx.fillRect(bx+1,bsy+65+wi*4,3,2); }
    }

    // Fire / water VFX along blade when attacking
    if (state===ANIM.ATTACK_SPEC && !flash) {
      for (let fi=0;fi<5;fi++) {
        const fy=bsy+fi*12;
        gfx.fillStyle(0xff4400, 0.5-(fi*0.08));
        gfx.fillCircle(bx+2+Math.sin(fi+frame)*4, fy, 5-fi*0.5);
      }
    }

    // Back arm
    R(gfx, 2, by-14, 7, 19, c(TJ.uniform, flash), c(OL, flash));

    // Pants (dark pattern — Taisho-era hakama style)
    R(gfx, -13, by+14+legLY, 12, 26, c(TJ.pants, flash), c(OL, flash));
    R(gfx,   2, by+14+legRY, 12, 26, c(TJ.pants, flash), c(OL, flash));
    if (!flash) {
      // Checkered pattern lines on pants
      for (let pi=0;pi<3;pi++) {
        gfx.fillStyle(0x1a1a2e, 1);
        gfx.fillRect(-13, by+18+pi*6+legLY, 12, 2);
        gfx.fillRect(2, by+18+pi*6+legRY, 12, 2);
      }
    }
    // Sandal straps
    R(gfx, -14, by+37+legLY, 13, 5, c(0x111111, flash));
    R(gfx,   1, by+37+legRY, 13, 5, c(0x111111, flash));

    // Torso — dark green uniform
    R(gfx, -14, by-20, 28, 34, c(TJ.uniform, flash), c(OL, flash));
    // Checkered pattern (simplified as vertical stripes)
    if (!flash) {
      for (let ci=0;ci<4;ci++) {
        gfx.fillStyle(TJ.uniformPat, 1);
        gfx.fillRect(-14+ci*7, by-20, 3, 34);
      }
    }
    // Collar (white)
    R(gfx, -6, by-20, 12, 16, c(P.WHITE, flash));
    T(gfx, -6,by-20, 0,by-6, 6,by-20, c(TJ.uniform, flash));

    // Haori / jacket border (dark trim)
    R(gfx, -14, by+10, 28, 5, c(TJ.uniformDk, flash));

    // Front arm
    R(gfx, -20, by-14, 7, 19, c(TJ.uniform, flash), c(OL, flash));
    R(gfx, -22, by+3, 10, 10, c(P.SKIN, flash), c(OL, flash));

    // Head
    C(gfx, -1, by-34, 13, c(P.SKIN, flash), c(OL, flash));

    // Hair — dark with burgundy red at front
    R(gfx, -12, by-48, 22, 16, c(TJ.hair, flash), c(OL, flash));
    // Front red tips
    R(gfx, -8, by-48, 14, 8, c(TJ.hairTip, flash));
    // Hair spikes
    T(gfx, -10,by-46, -14,by-58, -4,by-46, c(TJ.hair, flash));
    T(gfx, -4, by-48,  0, by-60,  4, by-46, c(TJ.hair, flash));
    T(gfx,  2, by-46,  8, by-54, 12, by-44, c(TJ.hair, flash));
    // Side hair
    R(gfx, -14, by-38, 6, 8, c(TJ.hair, flash));

    // Eyes
    if (state!==ANIM.HURT) {
      R(gfx, -9, by-32, 5, 5, c(P.WHITE, flash));
      R(gfx, -7, by-31, 3, 4, c(TJ.eyes, flash));
      R(gfx,  1, by-32, 5, 5, c(P.WHITE, flash));
      R(gfx,  3, by-31, 3, 4, c(TJ.eyes, flash));
      // Determined brow
      R(gfx, -10, by-37, 7, 2, c(TJ.hair, flash));
      R(gfx,   1, by-37, 7, 2, c(TJ.hair, flash));
    } else {
      R(gfx, -9, by-30, 5, 2, c(OL, flash));
      R(gfx,  1, by-30, 5, 2, c(OL, flash));
    }

    // Forehead scar
    if (!flash) {
      gfx.fillStyle(TJ.scar, 1);
      gfx.fillRect(-3, by-42, 4, 6);
      gfx.fillRect(-2, by-40, 6, 2);
    }

    // Hanafuda earrings (red circle + green)
    C(gfx, -14, by-30, 5, c(TJ.earR, flash), c(OL, flash));
    C(gfx, -14, by-30, 2, c(TJ.earG, flash));
  }
}

// ── ZARA Character (Fantasy Warrior) ─────────────────────────────────────────
// Identity: 360° whirlwind (only move that hits BEHIND) + aerial dive slam

class TanjiroCharacter extends BaseCharacter {
  constructor(scene, x, y, playerId, input, combat, animMgr) {
    super(scene, x, y, playerId, input, combat, animMgr);
    this.renderer    = BaseCharacter.pickRenderer(scene, x, y, 'Tanjiro', new TanjiroRenderer(scene, x, y));
    this.maxJumps    = 2; this.jumpsLeft = 2;
    this._whirlCooldown = 0;
    this._surgeCooldown = 0;
  }

  doAttack(type, axisX, axisY, airborne) {
    switch (type) {
      case 'light':   this._lightAttack(axisX, axisY, airborne); break;
      case 'heavy':   this._heavyAttack(axisX, axisY, airborne); break;
      case 'special': this._special(axisX, axisY, airborne);     break;
      case 'grab':    this._grab();                               break;
    }
  }

  // ZARA: 2-hit slash ground. Down+air = DIVE SLAM. Only character who hits behind with whirlwind.
  _lightAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_LIGHT);
    if (air && ay > 0) {
      // UNIQUE: Aerial dive slash — crashes down diagonally
      this._emitSlash(this.x + this.facing*30, this.y + 20, this.facing>0?40:140, 0x44ee88, 80);
      this.vel.y = 700; this.vel.x = this.facing * 200;
      this._scheduleHitbox(40, 340, { offsetX:28, offsetY:30, w:56, h:60,
        damage:12, kbBase:360, kbScale:52, kbAngle:280,
        type:'light', particleColor:0x44ee88 });
    } else if (air) {
      this._emitSlash(this.x + this.facing*50, this.y - 4, this.facing>0?-32:212, 0x44ee88, 78);
      this._scheduleHitbox(50, 255, { offsetX:52, offsetY:-4, w:70, h:50,
        damage:8, kbBase:278, kbScale:33,
        kbAngle:ax>=0?22:158, type:'light', particleColor:0x44ee88 });
    } else if (ay < 0) {
      this._emitSlash(this.x, this.y - 36, 90, 0x44ee88, 68);
      this._scheduleHitbox(60, 278, { offsetX:0, offsetY:-46, w:52, h:58,
        damage:9, kbBase:296, kbScale:36, kbAngle:86,
        type:'light', particleColor:0x44ee88 });
    } else {
      // 2-hit slash combo
      [52, 168].forEach((d, i) => {
        this.scene.time.delayedCall(d, () => {
          if (!this.isDead) {
            this._addHitbox({ offsetX:54, offsetY:-4, w:74, h:50,
              damage:5, kbBase:200, kbScale:24,
              kbAngle:this.facing>0?22:158, type:'light', particleColor:0x44ee88 });
            this._emitSlash(this.x + this.facing*54, this.y - 4,
              this.facing>0 ? (i===0?-32:-8) : (i===0?212:188), 0x44ee88, 66);
          }
        });
      });
      this._attackCooldown = 340;
      this.scene.time.delayedCall(340, () => { this.isAttacking = false; });
    }
  }

  // Wide sweeping slash (ground) | overhead cleave (up)
  _heavyAttack(ax, ay, air) {
    this.renderer.setState(ANIM.ATTACK_HEAVY);
    this._emitSlash(this.x + this.facing*58, this.y, this.facing>0?-44:224, 0x22cc66, 116);
    this._emitKi(this.x + this.facing*46, this.y, 0x22cc66, 10, 48);
    if (ay < 0) {
      this._emitSlash(this.x, this.y - 46, 90, 0x22cc66, 92);
      this._scheduleHitbox(100, 500, { offsetX:0, offsetY:-60, w:56, h:80,
        damage:17, kbBase:510, kbScale:74, kbAngle:90,
        type:'heavy', particleColor:0x22aa55 });
    } else {
      this._scheduleHitbox(114, 530, { offsetX:60, offsetY:-6, w:84, h:62,
        damage:19, kbBase:555, kbScale:80,
        kbAngle:this.facing>0?15:165, type:'heavy', particleColor:0x22aa55 });
    }
  }

  _special(ax, ay, air) {
    const now = this.scene.time.now;
    if (ay < 0 && this._surgeCooldown < now) {
      this._risingArc(); this._surgeCooldown = now + 3800;
    } else if (this._whirlCooldown < now) {
      this._whirlwindSlash(); this._whirlCooldown = now + 3000;
    } else {
      this._lightAttack(ax, ay, air);
    }
  }

  _grab() {
    this.renderer.setState(ANIM.ATTACK_LIGHT);
    this._scheduleHitbox(73, 345, { offsetX:46, offsetY:0, w:54, h:48,
      damage:6, kbBase:108, kbScale:18,
      kbAngle:this.facing>0?50:130, type:'grab', particleColor:0x44ee88 });
  }

  // UNIQUE: TRUE 360° whirlwind — 5 hits covering all directions including BEHIND
  _whirlwindSlash() {
    this._attackCooldown = 800; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    const attackId = `${this.playerId}_${this._attackId}`;
    // 5 evenly spaced hits around full circle — no escape direction
    const angles = [0, 72, 144, 216, 288];
    angles.forEach((deg, i) => {
      this.scene.time.delayedCall(70 + i * 120, () => {
        if (this.isDead) return;
        const rad = Phaser.Math.DegToRad(deg);
        const reach = 62;
        const hx = this.x + Math.cos(rad) * reach;
        const hy = this.y + Math.sin(rad) * reach - 8;
        this.combat.addHitbox({ owner:this, id:attackId,
          x:hx, y:hy, w:80, h:62, damage:7, kbBase:270, kbScale:36,
          kbAngle:(deg + 270) % 360, type:'special', particleColor:0x44ee88 });
        this._emitSlash(hx, hy, deg, 0x44ee88, 84);
      });
    });
    this.scene.time.delayedCall(800, () => { this.isAttacking = false; });
  }

  // Rising arc slash — 3-hit leaping green blade
  _risingArc() {
    this._attackCooldown = 700; this.isAttacking = true;
    this.renderer.setState(ANIM.ATTACK_SPEC);
    const dir = this.facing;
    this.vel.y = -600; this.vel.x = dir * 150;
    [65, 185, 320].forEach((d, i) => {
      this.scene.time.delayedCall(d, () => {
        if (this.isDead) return;
        this._addHitbox({ offsetX:dir*32, offsetY:-30 - i*22, w:72, h:56,
          damage:7 + i*5, kbBase:260 + i*140, kbScale:32 + i*18, kbAngle:86,
          type:'special', particleColor:0x44ee88 });
        this._emitSlash(this.x + dir*32, this.y - 30 - i*22, 90, 0x44ee88, 76);
        this._emitKi(this.x + dir*32, this.y - 30 - i*22, 0x44ee88, 6, 30);
      });
    });
    this.scene.time.delayedCall(700, () => { this.isAttacking = false; });
  }
}

GAME_CONFIG.CHARACTERS['Tanjiro'] = TanjiroCharacter;
